// Capa de datos de Finanzas. Antes los queries vivian sueltos dentro de las
// pantallas; aqui se centralizan para que el desglose, la lista y el modal
// compartan exactamente las mismas reglas de negocio.
//
// CONCEPTO CLAVE - liquidaciones:
// Un movimiento puede tener "partes" que sabes que van a volver. NO implica una
// persona ni una deuda: puede ser un amigo que te transfiere lo suyo del cine,
// pero tambien la luz que pagas sabiendo que tu papa te pasa ese dinero, o un
// gasto de trabajo que te reembolsan. Por eso 'contraparte' es un concepto
// libre y opcional ("papa - luz", "reembolso viaje"), no un nombre obligatorio.
// Varias filas colgando del mismo gasto cubren la cuenta de grupo.
//
//   bruto     = lo que salio de tu bolsillo en el momento
//   esperado  = suma de las partes que tienen que volver
//   cobrado   = suma de lo que YA volvio
//   pendiente = esperado - cobrado  (lo que sigue fuera)
//   neto      = bruto - cobrado     (lo que ese movimiento te ha costado de verdad)
//
// El neteo se aplica en la fecha del movimiento padre, no en la del abono: la
// pregunta que responde es "cuanto me costo el cine", no "que dia entro el dinero".

import { db } from '../database';

export type TipoMovimiento = 'INGRESO' | 'GASTO';

export interface FinancialCategory {
  id_categoria: number;
  nombre: string;
  icono: string;
  color: string;
  tipo: TipoMovimiento;
}

export interface Liquidacion {
  id_liquidacion: number;
  id_finanza: number;
  contraparte: string | null;   // concepto libre de la parte; puede ir vacio
  monto: number;
  monto_pagado: number;
  fecha_pago: string | null;
  nota: string | null;
}

export interface Transaction {
  id_finanza: number;
  tipo: TipoMovimiento;
  monto: number;
  id_categoria: number | null;
  categoria: string | null;
  cat_color: string | null;
  cat_icono: string | null;
  descripcion: string | null;
  fecha: string;
  // Derivados de las liquidaciones
  esperado: number;
  cobrado: number;
  pendiente: number;
  neto: number;
  partes: number;
}

export interface PeriodSummary {
  ingresosBrutos: number;
  gastosBrutos: number;
  ingresosNetos: number;
  gastosNetos: number;
  balance: number;       // ingresosNetos - gastosNetos
  movimientos: number;
  porCobrar: number;     // deuda viva generada en el periodo
}

export interface CategoryBreakdown {
  id_categoria: number | null;
  nombre: string;
  color: string | null;
  icono: string | null;
  bruto: number;
  neto: number;
  movimientos: number;
  promedio: number;
}

export interface MonthPoint {
  mes: string;           // 'YYYY-MM'
  ingresos: number;
  gastos: number;
}

export interface Receivable extends Liquidacion {
  pendiente: number;
  descripcion: string | null;
  fecha: string;
  tipo: TipoMovimiento;
  categoria: string | null;
  cat_color: string | null;
}

// Fecha en el formato que usa la columna `fecha` ('YYYY-MM-DD HH:MM:SS'),
// en hora local. new Date().toISOString() daria UTC y correria los movimientos
// de la noche al dia siguiente.
export const toDbDate = (d: Date = new Date()): string => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

// Fragmento comun: resuelve la categoria (por FK, con respaldo al nombre de
// texto para movimientos previos a la v5) y agrega las liquidaciones.
const FROM_WITH_JOINS = `
  FROM finanzas f
  LEFT JOIN financial_categories c ON c.id_categoria = f.id_categoria
  LEFT JOIN (
    SELECT id_finanza,
           SUM(monto) AS esperado,
           SUM(monto_pagado) AS cobrado,
           COUNT(*) AS partes
      FROM finanza_liquidaciones
     GROUP BY id_finanza
  ) l ON l.id_finanza = f.id_finanza
`;

const SELECT_TX = `
  SELECT f.id_finanza, f.tipo, f.monto, f.id_categoria, f.descripcion, f.fecha,
         COALESCE(c.nombre, f.categoria) AS categoria,
         c.color AS cat_color,
         c.icono AS cat_icono,
         COALESCE(l.esperado, 0) AS esperado,
         COALESCE(l.cobrado, 0) AS cobrado,
         COALESCE(l.esperado, 0) - COALESCE(l.cobrado, 0) AS pendiente,
         f.monto - COALESCE(l.cobrado, 0) AS neto,
         COALESCE(l.partes, 0) AS partes
  ${FROM_WITH_JOINS}
`;

// ---------------------------------------------------------------- CATEGORIAS

export const getCategories = async (tipo?: TipoMovimiento): Promise<FinancialCategory[]> => {
  const sql = tipo
    ? 'SELECT * FROM financial_categories WHERE tipo = ? ORDER BY nombre ASC'
    : 'SELECT * FROM financial_categories ORDER BY tipo, nombre ASC';
  const rows: any[] = await db.getAllAsync(sql, tipo ? [tipo] : []);
  return (rows || []) as FinancialCategory[];
};

// Cuantos movimientos usa cada categoria. Lo consume la pantalla de categorias
// para avisar antes de borrar y para ordenar por uso.
export const getCategoryUsage = async (): Promise<Record<number, number>> => {
  const rows: any[] = await db.getAllAsync(
    'SELECT id_categoria, COUNT(*) AS n FROM finanzas WHERE id_categoria IS NOT NULL GROUP BY id_categoria'
  );
  const map: Record<number, number> = {};
  (rows || []).forEach((r) => { map[r.id_categoria] = r.n; });
  return map;
};

export const createCategory = async (cat: Omit<FinancialCategory, 'id_categoria'>): Promise<number> => {
  const res: any = await db.runAsync(
    'INSERT INTO financial_categories (nombre, icono, color, tipo) VALUES (?, ?, ?, ?)',
    [cat.nombre.trim(), cat.icono, cat.color, cat.tipo]
  );
  return res?.lastInsertRowId;
};

// Editar una categoria existente. Como los movimientos apuntan por id, el
// historico hereda el nombre/color/icono nuevos sin tocar nada mas; solo hay
// que refrescar la columna de respaldo 'categoria' (texto) para que siga
// coincidiendo si alguien lee la tabla en crudo.
export const updateCategory = async (id: number, cat: Omit<FinancialCategory, 'id_categoria'>): Promise<void> => {
  await db.runAsync(
    'UPDATE financial_categories SET nombre = ?, icono = ?, color = ?, tipo = ? WHERE id_categoria = ?',
    [cat.nombre.trim(), cat.icono, cat.color, cat.tipo, id]
  );
  await db.runAsync('UPDATE finanzas SET categoria = ? WHERE id_categoria = ?', [cat.nombre.trim(), id]);
};

// Borrar una categoria. Si tiene movimientos hay que decir a donde van:
// reasignarlos a otra categoria, o dejarlos sin categoria conservando el
// nombre viejo como texto (para que el movimiento no pierda su etiqueta).
export const deleteCategory = async (id: number, reassignTo?: number | null): Promise<void> => {
  if (reassignTo) {
    const dest: any = await db.getFirstAsync('SELECT nombre FROM financial_categories WHERE id_categoria = ?', [reassignTo]);
    await db.runAsync('UPDATE finanzas SET id_categoria = ?, categoria = ? WHERE id_categoria = ?', [reassignTo, dest?.nombre ?? null, id]);
  } else {
    await db.runAsync('UPDATE finanzas SET id_categoria = NULL WHERE id_categoria = ?', [id]);
  }
  await db.runAsync('DELETE FROM financial_categories WHERE id_categoria = ?', [id]);
};

// --------------------------------------------------------------- MOVIMIENTOS

export const getTransactions = async (limit?: number): Promise<Transaction[]> => {
  const rows: any[] = await db.getAllAsync(
    `${SELECT_TX} ORDER BY f.fecha DESC${limit ? ` LIMIT ${limit}` : ''}`
  );
  return (rows || []) as Transaction[];
};

export const getTransactionsBetween = async (start: string, end: string): Promise<Transaction[]> => {
  const rows: any[] = await db.getAllAsync(
    `${SELECT_TX} WHERE f.fecha >= ? AND f.fecha < ? ORDER BY f.fecha DESC`,
    [start, end]
  );
  return (rows || []) as Transaction[];
};

export const getTransaction = async (id: number): Promise<Transaction | null> => {
  const row: any = await db.getFirstAsync(`${SELECT_TX} WHERE f.id_finanza = ?`, [id]);
  return (row || null) as Transaction | null;
};

export const createTransaction = async (tx: {
  tipo: TipoMovimiento;
  monto: number;
  id_categoria: number | null;
  descripcion: string;
  fecha?: string;
}): Promise<number> => {
  const cat: any = tx.id_categoria
    ? await db.getFirstAsync('SELECT nombre FROM financial_categories WHERE id_categoria = ?', [tx.id_categoria])
    : null;
  const res: any = await db.runAsync(
    'INSERT INTO finanzas (tipo, monto, categoria, id_categoria, descripcion, fecha) VALUES (?, ?, ?, ?, ?, ?)',
    [tx.tipo, tx.monto, cat?.nombre ?? null, tx.id_categoria, tx.descripcion, tx.fecha ?? toDbDate()]
  );
  return res?.lastInsertRowId;
};

export const updateTransaction = async (id: number, tx: {
  tipo: TipoMovimiento;
  monto: number;
  id_categoria: number | null;
  descripcion: string;
  fecha: string;
}): Promise<void> => {
  const cat: any = tx.id_categoria
    ? await db.getFirstAsync('SELECT nombre FROM financial_categories WHERE id_categoria = ?', [tx.id_categoria])
    : null;
  await db.runAsync(
    'UPDATE finanzas SET tipo = ?, monto = ?, categoria = ?, id_categoria = ?, descripcion = ?, fecha = ? WHERE id_finanza = ?',
    [tx.tipo, tx.monto, cat?.nombre ?? null, tx.id_categoria, tx.descripcion, tx.fecha, id]
  );
};

// Borra el movimiento y sus partes. El ON DELETE CASCADE solo actua si las
// foreign keys estan activas en la conexion, asi que borramos los hijos a mano
// para no depender de ello.
export const deleteTransaction = async (id: number): Promise<void> => {
  await db.runAsync('DELETE FROM finanza_liquidaciones WHERE id_finanza = ?', [id]);
  await db.runAsync('DELETE FROM finanzas WHERE id_finanza = ?', [id]);
};

// -------------------------------------------------------------- LIQUIDACIONES

export const getLiquidaciones = async (idFinanza: number): Promise<Liquidacion[]> => {
  const rows: any[] = await db.getAllAsync(
    'SELECT * FROM finanza_liquidaciones WHERE id_finanza = ? ORDER BY id_liquidacion ASC',
    [idFinanza]
  );
  return (rows || []) as Liquidacion[];
};

// Reemplaza en bloque las partes de un movimiento (el modal las edita como una
// lista). Conserva lo ya abonado de las filas que sobreviven.
export const setLiquidaciones = async (
  idFinanza: number,
  partes: { id_liquidacion?: number; contraparte: string | null; monto: number; monto_pagado?: number; fecha_pago?: string | null; nota?: string | null }[]
): Promise<void> => {
  const conservar: number[] = partes.map((p) => p.id_liquidacion).filter((id): id is number => typeof id === 'number');
  if (conservar.length > 0) {
    await db.runAsync(
      `DELETE FROM finanza_liquidaciones WHERE id_finanza = ? AND id_liquidacion NOT IN (${conservar.map(() => '?').join(',')})`,
      [idFinanza, ...conservar]
    );
  } else {
    await db.runAsync('DELETE FROM finanza_liquidaciones WHERE id_finanza = ?', [idFinanza]);
  }
  for (const p of partes) {
    if (p.id_liquidacion) {
      await db.runAsync(
        'UPDATE finanza_liquidaciones SET contraparte = ?, monto = ?, monto_pagado = ?, fecha_pago = ?, nota = ? WHERE id_liquidacion = ?',
        [p.contraparte, p.monto, p.monto_pagado ?? 0, p.fecha_pago ?? null, p.nota ?? null, p.id_liquidacion]
      );
    } else {
      await db.runAsync(
        'INSERT INTO finanza_liquidaciones (id_finanza, contraparte, monto, monto_pagado, fecha_pago, nota) VALUES (?, ?, ?, ?, ?, ?)',
        [idFinanza, p.contraparte, p.monto, p.monto_pagado ?? 0, p.fecha_pago ?? null, p.nota ?? null]
      );
    }
  }
};

// Abona a una parte. Sin monto, liquida lo que falte. Nunca deja pagar de mas
// ni deja el abono en negativo.
export const abonar = async (idLiquidacion: number, monto?: number): Promise<void> => {
  const row: any = await db.getFirstAsync('SELECT monto, monto_pagado FROM finanza_liquidaciones WHERE id_liquidacion = ?', [idLiquidacion]);
  if (!row) return;
  const falta = Math.max(0, (row.monto || 0) - (row.monto_pagado || 0));
  const abono = Math.min(monto == null ? falta : Math.max(0, monto), falta);
  const nuevo = (row.monto_pagado || 0) + abono;
  const saldado = nuevo >= (row.monto || 0) - 0.005;
  await db.runAsync(
    'UPDATE finanza_liquidaciones SET monto_pagado = ?, fecha_pago = ? WHERE id_liquidacion = ?',
    [nuevo, saldado ? toDbDate() : null, idLiquidacion]
  );
};

// Deshace los abonos de una parte (volver a marcarla como pendiente).
export const desabonar = async (idLiquidacion: number): Promise<void> => {
  await db.runAsync('UPDATE finanza_liquidaciones SET monto_pagado = 0, fecha_pago = NULL WHERE id_liquidacion = ?', [idLiquidacion]);
};

// Todas las partes que aun no han vuelto por completo, con el contexto de su
// movimiento padre.
export const getReceivables = async (): Promise<Receivable[]> => {
  const rows: any[] = await db.getAllAsync(`
    SELECT q.*, q.monto - q.monto_pagado AS pendiente,
           f.descripcion, f.fecha, f.tipo,
           COALESCE(c.nombre, f.categoria) AS categoria,
           c.color AS cat_color
      FROM finanza_liquidaciones q
      JOIN finanzas f ON f.id_finanza = q.id_finanza
      LEFT JOIN financial_categories c ON c.id_categoria = f.id_categoria
     WHERE q.monto - q.monto_pagado > 0.005
     ORDER BY f.fecha DESC
  `);
  return (rows || []) as Receivable[];
};

// ------------------------------------------------------------------ ANALISIS

export const getPeriodSummary = async (start: string, end: string): Promise<PeriodSummary> => {
  const row: any = await db.getFirstAsync(`
    SELECT
      COALESCE(SUM(CASE WHEN f.tipo = 'INGRESO' THEN f.monto ELSE 0 END), 0) AS ingresosBrutos,
      COALESCE(SUM(CASE WHEN f.tipo = 'GASTO'   THEN f.monto ELSE 0 END), 0) AS gastosBrutos,
      COALESCE(SUM(CASE WHEN f.tipo = 'INGRESO' THEN f.monto - COALESCE(l.cobrado, 0) ELSE 0 END), 0) AS ingresosNetos,
      COALESCE(SUM(CASE WHEN f.tipo = 'GASTO'   THEN f.monto - COALESCE(l.cobrado, 0) ELSE 0 END), 0) AS gastosNetos,
      COUNT(*) AS movimientos,
      COALESCE(SUM(COALESCE(l.esperado, 0) - COALESCE(l.cobrado, 0)), 0) AS porCobrar
    ${FROM_WITH_JOINS}
    WHERE f.fecha >= ? AND f.fecha < ?
  `, [start, end]);
  const r = row || {};
  return {
    ingresosBrutos: r.ingresosBrutos || 0,
    gastosBrutos: r.gastosBrutos || 0,
    ingresosNetos: r.ingresosNetos || 0,
    gastosNetos: r.gastosNetos || 0,
    balance: (r.ingresosNetos || 0) - (r.gastosNetos || 0),
    movimientos: r.movimientos || 0,
    porCobrar: r.porCobrar || 0,
  };
};

export const getBreakdownByCategory = async (
  start: string,
  end: string,
  tipo: TipoMovimiento = 'GASTO'
): Promise<CategoryBreakdown[]> => {
  const rows: any[] = await db.getAllAsync(`
    SELECT f.id_categoria,
           COALESCE(c.nombre, f.categoria, 'Sin categoría') AS nombre,
           c.color, c.icono,
           SUM(f.monto) AS bruto,
           SUM(f.monto - COALESCE(l.cobrado, 0)) AS neto,
           COUNT(*) AS movimientos
    ${FROM_WITH_JOINS}
    WHERE f.tipo = ? AND f.fecha >= ? AND f.fecha < ?
    GROUP BY COALESCE(CAST(f.id_categoria AS TEXT), f.categoria, 'Sin categoría')
    ORDER BY neto DESC
  `, [tipo, start, end]);
  return (rows || []).map((r) => ({
    id_categoria: r.id_categoria ?? null,
    nombre: r.nombre,
    color: r.color ?? null,
    icono: r.icono ?? null,
    bruto: r.bruto || 0,
    neto: r.neto || 0,
    movimientos: r.movimientos || 0,
    promedio: r.movimientos ? (r.neto || 0) / r.movimientos : 0,
  }));
};

// Serie mensual (neta) para la grafica de evolucion.
export const getMonthlySeries = async (start: string, end: string): Promise<MonthPoint[]> => {
  const rows: any[] = await db.getAllAsync(`
    SELECT substr(f.fecha, 1, 7) AS mes,
           COALESCE(SUM(CASE WHEN f.tipo = 'INGRESO' THEN f.monto - COALESCE(l.cobrado, 0) ELSE 0 END), 0) AS ingresos,
           COALESCE(SUM(CASE WHEN f.tipo = 'GASTO'   THEN f.monto - COALESCE(l.cobrado, 0) ELSE 0 END), 0) AS gastos
    ${FROM_WITH_JOINS}
    WHERE f.fecha >= ? AND f.fecha < ?
    GROUP BY mes
    ORDER BY mes ASC
  `, [start, end]);
  return (rows || []) as MonthPoint[];
};

export const getTopExpenses = async (start: string, end: string, limit = 5): Promise<Transaction[]> => {
  const rows: any[] = await db.getAllAsync(
    `${SELECT_TX} WHERE f.tipo = 'GASTO' AND f.fecha >= ? AND f.fecha < ? ORDER BY neto DESC LIMIT ?`,
    [start, end, limit]
  );
  return (rows || []) as Transaction[];
};

// Fecha del movimiento mas antiguo: define el limite del periodo "TODO".
export const getFirstTransactionDate = async (): Promise<string | null> => {
  const row: any = await db.getFirstAsync('SELECT MIN(fecha) AS f FROM finanzas');
  return row?.f ?? null;
};
