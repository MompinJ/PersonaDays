import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
  getPeriodSummary, getBreakdownByCategory, getMonthlySeries, getTopExpenses,
  getReceivables, getTransactionsBetween, getLiquidacionesFor,
  Liquidacion,
} from './economyService';

// Exporta el desglose financiero como un .md: un reporte autocontenido, en tono
// neutro y sin pedir nada a nadie. Abre con las notas de lectura (que es bruto,
// que es neto, por que un reembolso no cuenta como ingreso) para que los
// numeros no se malinterpreten fuera de la app, sigue con los agregados y
// cierra con el detalle movimiento por movimiento.

export type ExportResult = { ok: true; path: string } | { ok: false; reason: string };

export type ExportRange = {
  start: string;
  end: string;
  prevStart?: string | null;
  prevEnd?: string | null;
  titulo: string;
  compara?: string | null;
};

const pad = (n: number) => (n < 10 ? '0' + n : '' + n);
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// Entero plano, sin separadores de miles: mas facil de parsear para la IA y sin
// ambiguedad de locale (1.200 seria 1.2 en ingles).
const n = (v: number) => String(Math.round(v || 0));

// Las celdas de una tabla Markdown se rompen con un '|' del usuario, y un salto
// de linea en la descripcion partiria la fila.
const cell = (v?: string | null) => (v || '—').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim() || '—';

const fecha = (s?: string | null) => (s ? s.slice(0, 10) : '—');

const stampArchivo = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
};

const hoyLegible = () => {
  const d = new Date();
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
};

const pct = (parte: number, total: number) => (total > 0 ? ((parte / total) * 100).toFixed(1) : '0.0');

// Dias transcurridos del periodo, acotados a hoy.
const diasDe = (start: string, end: string) => {
  const a = new Date(start.replace(' ', 'T')).getTime();
  const b = Math.min(new Date(end.replace(' ', 'T')).getTime(), Date.now());
  return Math.max(1, Math.round((b - a) / 86400000));
};

/** Construye el Markdown. Separado de la exportacion para poder probarlo. */
export const buildFinanceMarkdown = async (r: ExportRange): Promise<string> => {
  // La evolucion siempre cubre los ultimos 6 meses, aunque el periodo elegido
  // sea un solo mes: la tendencia es justo lo que una IA necesita para opinar.
  const ahora = new Date();
  const desde6 = new Date(ahora.getFullYear(), ahora.getMonth() - 5, 1);
  const hasta6 = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1);
  const fmtBound = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01 00:00:00`;

  const [resumen, gastosCat, ingresosCat, serie, top, deudas, movs] = await Promise.all([
    getPeriodSummary(r.start, r.end),
    getBreakdownByCategory(r.start, r.end, 'GASTO'),
    getBreakdownByCategory(r.start, r.end, 'INGRESO'),
    getMonthlySeries(fmtBound(desde6), fmtBound(hasta6)),
    getTopExpenses(r.start, r.end, 10),
    getReceivables(),
    getTransactionsBetween(r.start, r.end),
  ]);

  const prev = r.prevStart && r.prevEnd ? await getPeriodSummary(r.prevStart, r.prevEnd) : null;
  const catsPrev = r.prevStart && r.prevEnd ? await getBreakdownByCategory(r.prevStart, r.prevEnd, 'GASTO') : [];

  // Las partes de todos los movimientos de golpe, agrupadas por movimiento.
  const partesLista = await getLiquidacionesFor(movs.map((m) => m.id_finanza));
  const partesPorMov: Record<number, Liquidacion[]> = {};
  partesLista.forEach((l) => { (partesPorMov[l.id_finanza] = partesPorMov[l.id_finanza] || []).push(l); });

  const dias = diasDe(r.start, r.end);
  const totalGastos = resumen.gastosNetos;
  const tasaAhorro = resumen.ingresosNetos > 0
    ? ((resumen.ingresosNetos - resumen.gastosNetos) / resumen.ingresosNetos) * 100
    : null;

  const L: string[] = [];

  L.push(`# Desglose financiero — ${r.titulo}`);
  L.push('');
  L.push(`Generado el ${hoyLegible()} desde PersonaDays.`);
  L.push(`Periodo analizado: **${fecha(r.start)}** a **${fecha(r.end)}** (${dias} días).`);
  L.push('Todos los montos están en yenes (¥) y son enteros.');
  L.push('');

  // --- Contexto para la IA: sin esto malinterpreta los reembolsos ---
  L.push('## Notas de lectura');
  L.push('');
  L.push('Un movimiento puede llevar **partes recuperables**: dinero que salió de la cuenta pero');
  L.push('que estaba destinado a regresar (la parte de otra persona en una cuenta compartida, un');
  L.push('reembolso, un servicio que cubre alguien más). Por eso cada movimiento tiene tres cifras:');
  L.push('');
  L.push('- **Bruto**: el importe que salió en el momento.');
  L.push('- **Recuperado**: la parte de ese importe que ya regresó.');
  L.push('- **Neto = bruto − recuperado**: el costo efectivo del movimiento.');
  L.push('');
  L.push('Salvo indicación contraria, **los totales de este reporte son netos**.');
  L.push('Una recuperación no se contabiliza como ingreso: reduce el costo del gasto original y');
  L.push('por tanto no infla los ingresos del periodo. El descuento se imputa en la fecha del');
  L.push('gasto, no en la fecha en que entró el dinero.');
  L.push('');

  // --- Resumen ---
  L.push('## Resumen del periodo');
  L.push('');
  L.push('| Concepto | Monto |');
  L.push('| --- | ---: |');
  L.push(`| Ingresos (netos) | ${n(resumen.ingresosNetos)} |`);
  L.push(`| Gastos (netos) | ${n(resumen.gastosNetos)} |`);
  L.push(`| **Balance** | **${n(resumen.balance)}** |`);
  L.push(`| Gastos brutos (antes de recuperaciones) | ${n(resumen.gastosBrutos)} |`);
  L.push(`| Gasto promedio por día | ${n(resumen.gastosNetos / dias)} |`);
  L.push(`| Número de movimientos | ${resumen.movimientos} |`);
  if (tasaAhorro != null) L.push(`| Tasa de ahorro | ${tasaAhorro.toFixed(1)}% |`);
  if (resumen.porCobrar > 0) L.push(`| Pendiente de recuperar (generado en el periodo) | ${n(resumen.porCobrar)} |`);
  L.push('');

  // --- Comparativa ---
  if (prev && r.compara) {
    const delta = resumen.gastosNetos - prev.gastosNetos;
    const dPct = prev.gastosNetos > 0 ? (delta / prev.gastosNetos) * 100 : null;
    L.push(`## Comparación contra ${r.compara.toLowerCase()}`);
    L.push('');
    L.push('| Concepto | Periodo actual | Periodo anterior | Diferencia |');
    L.push('| --- | ---: | ---: | ---: |');
    L.push(`| Ingresos | ${n(resumen.ingresosNetos)} | ${n(prev.ingresosNetos)} | ${n(resumen.ingresosNetos - prev.ingresosNetos)} |`);
    L.push(`| Gastos | ${n(resumen.gastosNetos)} | ${n(prev.gastosNetos)} | ${n(delta)}${dPct != null ? ` (${dPct > 0 ? '+' : ''}${dPct.toFixed(1)}%)` : ''} |`);
    L.push(`| Balance | ${n(resumen.balance)} | ${n(prev.balance)} | ${n(resumen.balance - prev.balance)} |`);
    L.push('');
  }

  // --- Gastos por categoria ---
  L.push('## Gastos por categoría');
  L.push('');
  if (gastosCat.length === 0) {
    L.push('_Sin gastos en este periodo._');
  } else {
    const antes: Record<string, number> = {};
    catsPrev.forEach((c) => { antes[c.nombre] = c.neto; });
    const hayPrev = catsPrev.length > 0;
    L.push(`| Categoría | Neto | % del gasto | Movimientos | Promedio | Bruto |${hayPrev ? ' Periodo anterior | Variación |' : ''}`);
    L.push(`| --- | ---: | ---: | ---: | ---: | ---: |${hayPrev ? ' ---: | ---: |' : ''}`);
    gastosCat.forEach((c) => {
      let extra = '';
      if (hayPrev) {
        const a = antes[c.nombre] || 0;
        const v = a > 0 ? `${((c.neto - a) / a) * 100 > 0 ? '+' : ''}${(((c.neto - a) / a) * 100).toFixed(1)}%` : 'nueva';
        extra = ` ${n(a)} | ${v} |`;
      }
      L.push(`| ${cell(c.nombre)} | ${n(c.neto)} | ${pct(c.neto, totalGastos)}% | ${c.movimientos} | ${n(c.promedio)} | ${n(c.bruto)} |${extra}`);
    });
  }
  L.push('');

  // --- Ingresos por categoria ---
  L.push('## Ingresos por categoría');
  L.push('');
  if (ingresosCat.length === 0) {
    L.push('_Sin ingresos en este periodo._');
  } else {
    L.push('| Categoría | Monto | % del ingreso | Movimientos |');
    L.push('| --- | ---: | ---: | ---: |');
    ingresosCat.forEach((c) => {
      L.push(`| ${cell(c.nombre)} | ${n(c.neto)} | ${pct(c.neto, resumen.ingresosNetos)}% | ${c.movimientos} |`);
    });
  }
  L.push('');

  // --- Evolucion (6 meses, con los vacios en cero para no ocultar los huecos) ---
  const porMes: Record<string, { ingresos: number; gastos: number }> = {};
  serie.forEach((m) => { porMes[m.mes] = m; });
  const meses: { mes: string; ingresos: number; gastos: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    meses.push({ mes: key, ...(porMes[key] || { ingresos: 0, gastos: 0 }) });
  }
  if (meses.some((m) => m.ingresos > 0 || m.gastos > 0)) {
    L.push('## Evolución de los últimos 6 meses');
    L.push('');
    L.push('Cifras netas. Incluye meses fuera del periodo analizado, como contexto de tendencia.');
    L.push('');
    L.push('| Mes | Ingresos | Gastos | Balance |');
    L.push('| --- | ---: | ---: | ---: |');
    meses.forEach((m) => L.push(`| ${m.mes} | ${n(m.ingresos)} | ${n(m.gastos)} | ${n(m.ingresos - m.gastos)} |`));
    L.push('');
  }

  // --- Top ---
  if (top.length > 0) {
    L.push('## Gastos más grandes');
    L.push('');
    L.push('| # | Fecha | Concepto | Categoría | Neto | Bruto |');
    L.push('| ---: | --- | --- | --- | ---: | ---: |');
    top.forEach((t, i) => {
      L.push(`| ${i + 1} | ${fecha(t.fecha)} | ${cell(t.descripcion)} | ${cell(t.categoria)} | ${n(t.neto)} | ${n(t.monto)} |`);
    });
    L.push('');
  }

  // --- Pendiente de recuperar ---
  if (deudas.length > 0) {
    const totalPend = deudas.reduce((s, d) => s + d.pendiente, 0);
    L.push('## Pendiente de recuperar');
    L.push('');
    L.push(`Importes que salieron de la cuenta y todavía no regresan. Total: **${n(totalPend)}**.`);
    L.push('Son saldos a favor del titular, no deudas contraídas por él.');
    L.push('Esta lista no está acotada al periodo: recoge todo lo que sigue pendiente, sea de');
    L.push('la fecha que sea.');
    L.push('');
    L.push('| Concepto | Movimiento | Fecha | Esperado | Ya volvió | Falta |');
    L.push('| --- | --- | --- | ---: | ---: | ---: |');
    deudas.forEach((d) => {
      L.push(`| ${cell(d.contraparte)} | ${cell(d.descripcion)} | ${fecha(d.fecha)} | ${n(d.monto)} | ${n(d.monto_pagado)} | ${n(d.pendiente)} |`);
    });
    L.push('');
  }

  // --- Detalle ---
  L.push('## Todos los movimientos del periodo');
  L.push('');
  if (movs.length === 0) {
    L.push('_Sin movimientos._');
  } else {
    L.push('| Fecha | Tipo | Concepto | Categoría | Bruto | Recuperado | Neto | Partes |');
    L.push('| --- | --- | --- | --- | ---: | ---: | ---: | --- |');
    movs.forEach((m) => {
      const ps = partesPorMov[m.id_finanza] || [];
      const detalle = ps.length === 0
        ? '—'
        : ps.map((x) => `${cell(x.contraparte)}: ${n(x.monto_pagado)}/${n(x.monto)}`).join('; ');
      L.push(`| ${fecha(m.fecha)} | ${m.tipo === 'INGRESO' ? 'Ingreso' : 'Gasto'} | ${cell(m.descripcion)} | ${cell(m.categoria)} | ${n(m.monto)} | ${n(m.cobrado)} | ${n(m.neto)} | ${detalle} |`);
    });
    L.push('');
    L.push('En la columna **Partes**, `nombre: 150/300` significa que de una parte de 300 ya volvieron 150.');
  }
  L.push('');

  L.push('---');
  L.push('');
  L.push(`Reporte generado automáticamente por PersonaDays a partir de ${movs.length} movimientos registrados.`);
  L.push('');

  return L.join('\n');
};

/** Genera el .md y abre la hoja de compartir. */
export const exportFinanceMarkdown = async (r: ExportRange): Promise<ExportResult> => {
  try {
    const md = await buildFinanceMarkdown(r);
    const slug = r.titulo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const path = `${FileSystem.cacheDirectory}finanzas-${slug || 'desglose'}-${stampArchivo()}.md`;
    await FileSystem.deleteAsync(path, { idempotent: true });
    await FileSystem.writeAsStringAsync(path, md, { encoding: FileSystem.EncodingType.UTF8 });

    if (!(await Sharing.isAvailableAsync())) {
      return { ok: false, reason: 'Compartir no está disponible en este dispositivo.' };
    }
    await Sharing.shareAsync(path, {
      mimeType: 'text/markdown',
      dialogTitle: 'Desglose financiero',
      UTI: 'net.daringfireball.markdown',
    });
    return { ok: true, path };
  } catch (e: any) {
    console.error('Error exportando desglose:', e);
    return { ok: false, reason: e?.message || 'Error al exportar.' };
  }
};
