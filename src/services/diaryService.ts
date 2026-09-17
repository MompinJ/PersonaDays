// Diario: una entrada por dia. La fecha es la identidad (UNIQUE en la tabla),
// asi que no hay "crear" ni "elegir cual" — solo se abre el dia y se escribe.
//
// El contenido es Markdown, igual que las Notas, y se lee renderizado.
//
// XP: escribir la entrada de HOY o de AYER otorga XP de Gentileza y Coraje una
// sola vez por dia. Rellenar fechas viejas se permite (el recuerdo vale), pero
// no paga, porque si no bastaria con volcar tres meses atrasados para inflar
// los stats.

import { db } from '../database';
import { getPlayer } from './playerService';
import { grantXpToStat } from './statService';

export const XP_POR_ENTRADA = 3;

/** Stats que alimenta el diario. Cada uno recibe XP_POR_ENTRADA. */
export const STATS_DIARIO = ['Gentileza', 'Coraje'] as const;

/** Escala de animo: 1 pesimo .. 5 excelente. */
export const ANIMOS = [
  { valor: 1, label: 'PÉSIMO', icono: 'emoticon-dead-outline' },
  { valor: 2, label: 'MAL', icono: 'emoticon-sad-outline' },
  { valor: 3, label: 'NORMAL', icono: 'emoticon-neutral-outline' },
  { valor: 4, label: 'BIEN', icono: 'emoticon-happy-outline' },
  { valor: 5, label: 'EXCELENTE', icono: 'emoticon-excited-outline' },
] as const;

export interface Entrada {
  id_entrada: number;
  fecha: string;          // 'YYYY-MM-DD'
  contenido: string;
  animo: number | null;
  xp_otorgado: number;
  created_at: string;
  updated_at: string;
}

export interface ContextoDia {
  misiones: number;
  xp: number;
  gasto: number;
  arco: { nombre: string; color: string } | null;
}

export interface GuardadoResult {
  /** XP aplicada a cada stat (no la suma). */
  xpGanada: number;
  /** Stats que efectivamente recibieron XP. */
  stats: string[];
  /** Stats que ademas subieron de nivel. */
  subieron: string[];
}

const pad = (n: number) => String(n).padStart(2, '0');
export const claveFecha = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const hoyClave = () => claveFecha(new Date());
export const ayerClave = () => { const d = new Date(); d.setDate(d.getDate() - 1); return claveFecha(d); };

/** 'YYYY-MM-DD' -> Date local (new Date(s) lo interpretaria como UTC). */
export const parseClave = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

export const esHoy = (fecha: string) => fecha === hoyClave();

/** Solo hoy y ayer pagan XP; el resto se puede escribir igual, pero sin premio. */
export const fechaPagaXp = (fecha: string) => fecha === hoyClave() || fecha === ayerClave();

export const getEntrada = async (fecha: string): Promise<Entrada | null> => {
  const row: any = await db.getFirstAsync('SELECT * FROM diario WHERE fecha = ?', [fecha]);
  return (row || null) as Entrada | null;
};

export const getEntradas = async (limit = 60): Promise<Entrada[]> => {
  const rows: any[] = await db.getAllAsync('SELECT * FROM diario ORDER BY fecha DESC LIMIT ?', [limit]);
  return (rows || []) as Entrada[];
};

/**
 * Guarda (o crea) la entrada del dia y, si toca, paga la XP de Gentileza.
 * Condiciones para pagar: que ese dia no haya pagado ya, que haya texto de
 * verdad y que la fecha sea de hoy o de ayer.
 */
export const guardarEntrada = async (
  fecha: string,
  contenido: string,
  animo: number | null
): Promise<GuardadoResult> => {
  const ahora = new Date().toISOString();
  const texto = contenido ?? '';
  const previa = await getEntrada(fecha);

  if (previa) {
    await db.runAsync(
      'UPDATE diario SET contenido = ?, animo = ?, updated_at = ? WHERE id_entrada = ?',
      [texto, animo, ahora, previa.id_entrada]
    );
  } else {
    await db.runAsync(
      'INSERT INTO diario (fecha, contenido, animo, xp_otorgado, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)',
      [fecha, texto, animo, ahora, ahora]
    );
  }

  const vacio: GuardadoResult = { xpGanada: 0, stats: [], subieron: [] };
  const yaPago = previa?.xp_otorgado === 1;
  if (yaPago || !texto.trim() || !fechaPagaXp(fecha)) return vacio;

  try {
    const player = await getPlayer();
    if (!player?.id_jugador) return vacio;

    const tocados: string[] = [];
    const subieron: string[] = [];
    for (const nombre of STATS_DIARIO) {
      // Por nombre y no por id fijo: el catalogo se siembra con ids conocidos,
      // pero buscar por nombre sobrevive a que eso cambie.
      const stat: any = await db.getFirstAsync('SELECT id_stat FROM stats WHERE nombre = ? LIMIT 1', [nombre]);
      if (!stat?.id_stat) {
        console.warn(`Stat "${nombre}" no encontrada. No se otorgó su XP del diario.`);
        continue;
      }
      const res = await grantXpToStat(player.id_jugador, stat.id_stat, XP_POR_ENTRADA);
      if (res.xpApplied > 0) tocados.push(nombre);
      if (res.leveledUp) subieron.push(nombre);
    }

    // Solo se marca como pagado si de verdad se otorgo algo; si no, el dia
    // sigue debiendo su XP y puede cobrarla al volver a guardar.
    if (tocados.length === 0) return vacio;
    await db.runAsync('UPDATE diario SET xp_otorgado = 1 WHERE fecha = ?', [fecha]);
    return { xpGanada: XP_POR_ENTRADA, stats: tocados, subieron };
  } catch (e) {
    console.error('Error otorgando XP del diario:', e);
    return vacio;
  }
};

export const borrarEntrada = async (fecha: string): Promise<void> => {
  await db.runAsync('DELETE FROM diario WHERE fecha = ?', [fecha]);
};

/**
 * Dias seguidos escribiendo. Cuenta hacia atras desde hoy; si hoy todavia no
 * hay entrada arranca desde ayer, para no romper la racha a media manana.
 */
export const getRacha = async (): Promise<number> => {
  const rows: any[] = await db.getAllAsync(
    "SELECT fecha FROM diario WHERE TRIM(COALESCE(contenido,'')) <> '' ORDER BY fecha DESC LIMIT 400"
  );
  const set = new Set((rows || []).map((r) => r.fecha));
  if (set.size === 0) return 0;

  const cursor = new Date();
  if (!set.has(claveFecha(cursor))) cursor.setDate(cursor.getDate() - 1);

  let racha = 0;
  while (set.has(claveFecha(cursor))) {
    racha += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return racha;
};

/** Fechas con entrada escrita en un rango; alimenta las marcas del Calendario. */
export const getFechasConEntrada = async (desde: string, hasta: string): Promise<string[]> => {
  const rows: any[] = await db.getAllAsync(
    "SELECT fecha FROM diario WHERE fecha >= ? AND fecha <= ? AND TRIM(COALESCE(contenido,'')) <> ''",
    [desde, hasta]
  );
  return (rows || []).map((r) => r.fecha);
};

export interface ResumenMes {
  /** 'YYYY-MM-DD' -> animo (1..5). Solo los dias que marcaron animo. */
  animos: Record<string, number>;
  /** Dias con texto escrito, lleven animo o no. */
  escritos: number;
  /** Media del animo del mes, o null si nadie marco ninguno. */
  promedio: number | null;
}

/** Lo que alimenta la onda del mes: animo por dia mas un par de cifras. */
export const getResumenMes = async (mes: string): Promise<ResumenMes> => {
  const rows: any[] = await db.getAllAsync(
    "SELECT fecha, animo, TRIM(COALESCE(contenido,'')) <> '' AS escrito FROM diario WHERE substr(fecha,1,7) = ?",
    [mes]
  );
  const animos: Record<string, number> = {};
  let escritos = 0;
  let suma = 0;
  let conAnimo = 0;
  (rows || []).forEach((r) => {
    if (r.escrito) escritos += 1;
    if (r.animo != null) { animos[r.fecha] = r.animo; suma += r.animo; conAnimo += 1; }
  });
  return { animos, escritos, promedio: conAnimo > 0 ? suma / conAnimo : null };
};

/**
 * Lo que la app ya sabe de ese dia: misiones, XP, gasto y arco activo. Es lo
 * que convierte la entrada en una capsula y no en una nota con fecha.
 */
export const getContextoDia = async (fecha: string): Promise<ContextoDia> => {
  const [mis, gas, arco] = await Promise.all([
    db.getFirstAsync(
      'SELECT COUNT(*) AS n, COALESCE(SUM(exp_ganada),0) AS xp FROM logs WHERE date(fecha_completada) = ?',
      [fecha]
    ),
    // Gasto NETO del dia, coherente con Finanzas y el Desglose.
    db.getFirstAsync(
      `SELECT COALESCE(SUM(f.monto - COALESCE(l.cobrado,0)),0) AS total
         FROM finanzas f
         LEFT JOIN (SELECT id_finanza, SUM(monto_pagado) AS cobrado
                      FROM finanza_liquidaciones GROUP BY id_finanza) l
                ON l.id_finanza = f.id_finanza
        WHERE f.tipo = 'GASTO' AND date(f.fecha) = ?`,
      [fecha]
    ),
    db.getFirstAsync(
      `SELECT nombre, color_hex FROM arcos
        WHERE date(fecha_inicio) <= ?
          AND (fecha_fin IS NULL OR date(fecha_fin) >= ?)
        ORDER BY CASE estado WHEN 'ACTIVO' THEN 0 ELSE 1 END, date(fecha_inicio) DESC
        LIMIT 1`,
      [fecha, fecha]
    ),
  ]);

  const m: any = mis || {};
  const g: any = gas || {};
  const a: any = arco || null;
  return {
    misiones: m.n || 0,
    xp: m.xp || 0,
    gasto: g.total || 0,
    arco: a ? { nombre: a.nombre, color: a.color_hex || '#00D4FF' } : null,
  };
};
