import { db } from '../database';
import { grantXpToStat } from './statService';
import { recalcPlayerLevel } from './playerService';

// Servicio centralizado para la logica de Arcos.
// Antes esta logica estaba duplicada en ArcsScreen (swipe) y ArcDetailScreen,
// y esta ultima NO otorgaba XP al finalizar. Centralizar evita esa inconsistencia.

// --- XP de cierre escalado por duracion + esfuerzo ---
// Antes el cierre daba un bonus FIJO de 1000 XP: una etapa de 3 dias valia igual
// que una de un anio. Ahora se escala por los dias que duro el arco, pero
// multiplicado por cuanto realmente se hizo (factor de completitud de misiones
// ARCO), para no premiar el solo hecho de alargar el arco. Con tope para evitar
// numeros absurdos en arcos muy largos.
export const ARC_XP_TASA_DIARIA = 25;   // XP por dia de arco
export const ARC_XP_MIN = 250;          // piso (arcos muy cortos)
export const ARC_XP_MAX = 3000;         // techo (arcos muy largos)
export const ARC_XP_FACTOR_MIN = 0.25;  // un arco con poco avance igual paga algo

export interface FinalizeArcResult {
  grantedXP: number;
  arcId: number;
}

// El cyan era el color_hex por defecto viejo. Si un arco lo tiene (o no tiene color),
// usamos el color del personaje en vez de un azul hardcodeado que no sigue el tema.
export const LEGACY_ARC_COLOR = '#00D4FF';
export const arcDisplayColor = (arc: any, themePrimary: string): string => {
  const c = arc?.color_hex;
  if (!c || String(c).toLowerCase() === LEGACY_ARC_COLOR.toLowerCase()) return themePrimary;
  return c;
};

// Fuente UNICA del estado del arco. Antes se derivaba de las fechas en cada
// pantalla (inconsistente: un arco completado con fecha_fin futura se veia mal).
// Ahora manda la columna `estado`; un arco nace ACTIVO y solo pasa a COMPLETADO
// cuando el usuario lo cierra (no hay fecha_fin programada de antemano).
export const getArcState = (arc: any): 'ACTIVO' | 'COMPLETADO' | 'ABANDONADO' =>
  arc?.estado || 'ACTIVO';

// Dias que ha durado el arco. La "barra de progreso" de un arco es una medida de
// TIEMPO (no de misiones): activo -> dias desde fecha_inicio hasta hoy; completado
// -> dias entre inicio y fecha_fin. Minimo 1 (el dia de creacion cuenta como dia 1).
export const arcElapsedDays = (arc: any): number => {
  if (!arc?.fecha_inicio) return 1;
  const start = new Date(arc.fecha_inicio).getTime();
  const end = arc.fecha_fin ? new Date(arc.fecha_fin).getTime() : Date.now();
  return Math.max(1, Math.round((end - start) / 86400000));
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/**
 * Fotografia el estado actual de TODAS las stats del jugador como JSON. Se usa
 * al crear el arco (snapshot_inicio) y al finalizarlo (snapshot_fin) para poder
 * dibujar el radar comparativo inicio-vs-fin. Reutiliza la MISMA query (LEFT JOIN
 * stats/jugador_stat) que usePlayerStats, para que el formato sea identico al que
 * consume el radar.
 */
export const buildStatsSnapshot = async (): Promise<string> => {
  const players: any[] = await db.getAllAsync('SELECT id_jugador FROM jugadores LIMIT 1');
  if (!players || players.length === 0) return JSON.stringify([]);
  const playerId = players[0].id_jugador;

  const rows: any[] = await db.getAllAsync(
    `SELECT
      s.id_stat,
      s.nombre AS nombre,
      COALESCE(js.nivel_actual, 1) AS nivel_actual,
      COALESCE(js.experiencia_actual, 0) AS experiencia_actual,
      COALESCE(js.nivel_maximo, 99) AS nivel_maximo
     FROM stats s
     LEFT JOIN jugador_stat js ON s.id_stat = js.id_stat AND js.id_jugador = ?
     ORDER BY s.id_stat ASC;`,
    [playerId]
  );

  return JSON.stringify(
    (rows || []).map((r) => ({
      id_stat: r.id_stat,
      nombre: r.nombre,
      nivel_actual: r.nivel_actual,
      experiencia_actual: r.experiencia_actual,
      nivel_maximo: r.nivel_maximo,
    }))
  );
};

/**
 * Calcula el XP de cierre de un arco: escala por dias vividos, con tope, y lo
 * multiplica por el factor de completitud de sus misiones ARCO. Si el arco no
 * tiene misiones ARCO, el factor es 1 (se valora la etapa vivida, no se castiga).
 */
const computeArcXp = (dias: number, total: number, completadas: number): number => {
  const factor = total > 0 ? clamp(completadas / total, ARC_XP_FACTOR_MIN, 1) : 1;
  const base = clamp(dias * ARC_XP_TASA_DIARIA, ARC_XP_MIN, ARC_XP_MAX);
  return Math.round(base * factor);
};

/**
 * Finaliza un arco dentro de una transaccion:
 *  1. Toma el snapshot_fin de stats (ANTES del bonus, para que el radar refleje
 *     el crecimiento real y no quede inflado por la XP del cierre).
 *  2. Calcula el XP escalado (dias * tasa, con tope, * factor de completitud).
 *  3. Archiva (activa=0) las misiones ARCO no completadas: cuentan como falladas.
 *  4. Marca el arco COMPLETADO, fija fecha_fin y persiste xp_otorgado/snapshot_fin.
 *  5. Otorga el XP al stat relacionado y recalcula niveles.
 *
 * Devuelve la XP otorgada. Lanza si algo falla (con ROLLBACK).
 */
export const finalizeArcWithRewards = async (arc: any, player: any): Promise<FinalizeArcResult> => {
  // Dias vividos del arco (minimo 1 para no anular el XP de un arco de un dia).
  // En este punto fecha_fin aun es NULL, asi que arcElapsedDays usa hoy como fin.
  const dias = arcElapsedDays(arc);

  await db.execAsync('BEGIN TRANSACTION;');
  try {
    // Completitud de misiones tipo ARCO de este arco.
    const mrows: any[] = await db.getAllAsync(
      "SELECT count(*) AS total, COALESCE(sum(completada),0) AS comp FROM misiones WHERE tipo = 'ARCO' AND id_arco = ?",
      [arc.id_arco]
    );
    const total = mrows?.[0]?.total || 0;
    const completadas = mrows?.[0]?.comp || 0;
    const xp = computeArcXp(dias, total, completadas);

    // Snapshot de fin ANTES de aplicar el bonus.
    const snapshotFin = await buildStatsSnapshot();

    // Las misiones ARCO no completadas se archivan: dejan de estar activas y
    // quedan como "falladas" en el recap del arco.
    await db.runAsync(
      "UPDATE misiones SET activa = 0 WHERE tipo = 'ARCO' AND id_arco = ? AND completada = 0",
      [arc.id_arco]
    );

    await db.runAsync(
      "UPDATE arcos SET estado = 'COMPLETADO', fecha_fin = date('now','localtime'), xp_otorgado = ?, snapshot_fin = ? WHERE id_arco = ?",
      [xp, snapshotFin, arc.id_arco]
    );

    let grantedXP = 0;
    if (arc.id_stat_relacionado && player && player.id_jugador && xp > 0) {
      grantedXP = xp;
      // Mismo pipeline XP->nivel que las misiones (sin cascada al padre: el bonus
      // de arco es propio del stat relacionado).
      await grantXpToStat(player.id_jugador, arc.id_stat_relacionado, xp);
      // El nivel del jugador depende de la suma de niveles de stats.
      await recalcPlayerLevel(player.id_jugador);
    }

    await db.execAsync('COMMIT;');
    return { grantedXP, arcId: arc.id_arco };
  } catch (err) {
    try { await db.execAsync('ROLLBACK;'); } catch (e) { /* noop */ }
    throw err;
  }
};

// --- Lecturas para la pantalla de resultados (ArcResults) ---

export interface ArcGrind {
  diarias: number;
  semanales: number;
}

/**
 * "Grind" del periodo: misiones DIARIA/SEMANAL completadas mientras este arco
 * estuvo activo. logs.id_arco se puebla en missionService.completeMission con el
 * arco activo del momento, asi que filtramos por ahi (mas preciso que por fecha).
 */
export const getArcGrind = async (idArco: number): Promise<ArcGrind> => {
  const rows: any[] = await db.getAllAsync(
    `SELECT m.tipo AS tipo, COUNT(*) AS c
       FROM logs l JOIN misiones m ON m.id_mision = l.id_mision
      WHERE l.id_arco = ? AND m.tipo IN ('DIARIA','SEMANAL')
      GROUP BY m.tipo`,
    [idArco]
  );
  let diarias = 0, semanales = 0;
  for (const r of rows || []) {
    if (r.tipo === 'DIARIA') diarias = r.c;
    else if (r.tipo === 'SEMANAL') semanales = r.c;
  }
  return { diarias, semanales };
};

export interface ArcMissionSummary {
  total: number;
  completadas: number;
  falladas: number;
  items: { id_mision: number; nombre: string; completada: number }[];
}

/** Misiones tipo ARCO del arco con su estado (completadas vs falladas/abandonadas). */
export const getArcMissionSummary = async (idArco: number): Promise<ArcMissionSummary> => {
  const items: any[] = await db.getAllAsync(
    "SELECT id_mision, nombre, completada FROM misiones WHERE tipo = 'ARCO' AND id_arco = ? ORDER BY completada DESC, nombre ASC",
    [idArco]
  );
  const completadas = (items || []).filter((m) => m.completada === 1).length;
  return {
    total: items?.length || 0,
    completadas,
    falladas: (items?.length || 0) - completadas,
    items: items || [],
  };
};

export interface ArcFinance {
  ingresos: number;
  gastos: number;
  categoriaDominante: string | null;
  montoDominante: number;
}

/**
 * Balance financiero del periodo del arco. finanzas no tiene id_arco, asi que se
 * filtra por rango de fechas [fecha_inicio, fecha_fin]. Si el arco sigue activo
 * (sin fecha_fin), se usa hoy como fin.
 */
export const getArcFinance = async (arc: any): Promise<ArcFinance> => {
  const desde = arc.fecha_inicio;
  const hasta = arc.fecha_fin || new Date().toISOString().slice(0, 10);

  const tot: any[] = await db.getAllAsync(
    `SELECT tipo, COALESCE(SUM(monto),0) AS s FROM finanzas
      WHERE date(fecha) BETWEEN date(?) AND date(?) GROUP BY tipo`,
    [desde, hasta]
  );
  let ingresos = 0, gastos = 0;
  for (const r of tot || []) {
    if (r.tipo === 'INGRESO') ingresos = r.s;
    else if (r.tipo === 'GASTO') gastos = r.s;
  }

  const dom: any[] = await db.getAllAsync(
    `SELECT categoria, COALESCE(SUM(monto),0) AS s FROM finanzas
      WHERE tipo = 'GASTO' AND date(fecha) BETWEEN date(?) AND date(?)
      GROUP BY categoria ORDER BY s DESC LIMIT 1`,
    [desde, hasta]
  );
  return {
    ingresos,
    gastos,
    categoriaDominante: dom?.[0]?.categoria || null,
    montoDominante: dom?.[0]?.s || 0,
  };
};
