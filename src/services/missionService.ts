import { db } from '../database';
import { grantXpToStat } from './statService';
import { recalcPlayerLevel, updateStreakOnActivity, getCurrentStreak } from './playerService';
import { computeXPGain, statKeyFromName } from '../data/arcanaEffects';
import type { Difficulty, XPContext } from '../data/arcanaEffects';
import { getEquippedArcanaIds } from './arcanaService';

// Servicio centralizado de la logica de misiones.
// Antes "completar" vivia en MissionsScreen y "revertir" en CompletedMissionsScreen,
// como dos copias a mano del mismo calculo (XP, nivel, herencia padre/hijo) que
// tenian que ser espejo perfecto... y habian dejado de serlo. Aqui hay una sola
// fuente de verdad, y ambas operaciones corren dentro de una transaccion.

// Recompensa de XP por dificultad. Ratio 1:2:3 (una dificil = tres faciles).
// Calibrado para ~1 nivel/semana en mid-game con ~15-20 misiones/dia (modelo
// de habitos): a mayor volumen de misiones, la XP por mision se mantiene baja.
export const MISSION_XP = { EASY: 60, MEDIUM: 120, HARD: 180 } as const;

// Deriva la dificultad desde la XP base de la mision (no se guarda como tal).
const difficultyFromXP = (xp: number): Difficulty =>
  xp <= MISSION_XP.EASY ? 'EASY' : xp <= MISSION_XP.MEDIUM ? 'MEDIUM' : 'HARD';

export interface CompleteMissionResult {
  totalExpGained: number;
  totalYenes: number;
  missionName: string;
  leveledUp: { name: string; level: number }[];
  streak: number;          // racha tras completar
  streakIncreased: boolean; // true si la racha subio hoy (dia consecutivo o primera del dia)
}

/**
 * Completa una mision dentro de una transaccion:
 *  1. Marca completada y fija fecha_completada.
 *  2. Aplica el impacto de XP al stat, recalcula su nivel y detecta subidas.
 *  3. Herencia: si el stat tiene padre, le pasa la mitad de la XP.
 *  4. Inserta el log (con el arco activo si existe).
 *  5. Recalcula el nivel del jugador.
 *
 * Devuelve los datos para el flash, o null si la mision no existe o ya estaba
 * completada (evita doble-toggle). Lanza con ROLLBACK si algo falla.
 *
 * Los yenes se otorgan al jugador (moneda de la tienda de arcanos) y se
 * registran en el log.
 */
export const completeMission = async (
  missionId: number,
  player: any
): Promise<CompleteMissionResult | null> => {
  if (!player || !player.id_jugador) throw new Error('completeMission: jugador no valido');
  const playerId = player.id_jugador;

  await db.execAsync('BEGIN TRANSACTION;');
  try {
    const mRows: any[] = await db.getAllAsync('SELECT * FROM misiones WHERE id_mision = ?', [missionId]);
    if (!mRows || mRows.length === 0) { await db.execAsync('ROLLBACK;'); return null; }
    const mision = mRows[0];
    if (mision.completada) { await db.execAsync('ROLLBACK;'); return null; }

    await db.runAsync(
      "UPDATE misiones SET completada = 1, fecha_completada = datetime('now') WHERE id_mision = ?",
      [missionId]
    );

    // Racha: se actualiza ANTES de calcular XP para que el bonus de arcano
    // que dependa de la racha (El Carro) ya vea el valor de hoy.
    const streakResult = await updateStreakOnActivity(playerId);

    // Contexto compartido para el bonus de arcanos (igual para todos los
    // impactos de la mision salvo el stat, que varia por impacto).
    const equippedIds = await getEquippedArcanaIds(playerId);
    const baseCtx = {
      difficulty: difficultyFromXP(mision.recompensa_exp || 0),
      missionType: mision.tipo,
      streak: streakResult.streak,
    };

    let totalExpGained = 0;
    const leveledUp: { name: string; level: number }[] = [];

    const impactos: any[] = await db.getAllAsync(
      'SELECT im.*, s.nombre AS nombre_stat FROM impacto_mision im LEFT JOIN stats s ON s.id_stat = im.id_stat WHERE im.id_mision = ?',
      [missionId]
    );
    for (const imp of impactos || []) {
      const valor = imp.valor_impacto || 0;
      const statId = imp.id_stat;

      // Bonus de arcanos: la XP base de este impacto se escala segun los arcanos
      // equipados y el contexto (stat de este impacto + dificultad/tipo/racha).
      const ctx: XPContext = { ...baseCtx, statKey: statKeyFromName(imp.nombre_stat) };
      const valorBonus = computeXPGain(valor, ctx, equippedIds);

      // Aplica XP al stat (recalcula nivel) y hereda la mitad al padre.
      const res = await grantXpToStat(playerId, statId, valorBonus, { cascadeParentHalf: true });
      totalExpGained += res.xpApplied + res.parentApplied;
      if (res.leveledUp && res.statName) leveledUp.push({ name: res.statName, level: res.level });
    }

    // 4) Log con el arco activo en el momento de completar (si existe)
    const totalYenes = mision.recompensa_yenes || 0;
    let activeArcId: number | null = null;
    const arcRows: any[] = await db.getAllAsync("SELECT id_arco FROM arcos WHERE estado = 'ACTIVO' LIMIT 1;");
    if (arcRows && arcRows.length > 0) activeArcId = arcRows[0].id_arco;
    await db.runAsync(
      "INSERT INTO logs (id_mision, fecha_completada, exp_ganada, yenes_ganados, id_arco) VALUES (?, datetime('now','localtime'), ?, ?, ?);",
      [missionId, totalExpGained, totalYenes, activeArcId]
    );

    // 5) Otorgar yenes al jugador (moneda de la tienda de arcanos)
    if (totalYenes > 0) {
      await db.runAsync('UPDATE jugadores SET yenes = yenes + ? WHERE id_jugador = ?', [totalYenes, playerId]);
    }

    // 6) Recalcular nivel del jugador
    await recalcPlayerLevel(playerId);

    await db.execAsync('COMMIT;');
    return {
      totalExpGained,
      totalYenes,
      missionName: mision.nombre,
      leveledUp,
      streak: streakResult.streak,
      streakIncreased: streakResult.increased,
    };
  } catch (err) {
    try { await db.execAsync('ROLLBACK;'); } catch (e) { /* noop */ }
    throw err;
  }
};

/**
 * Revierte una mision completada dentro de una transaccion. Espejo exacto de
 * completeMission: resta la XP (ya con bonus de arcanos) del stat y la heredada
 * al padre, recalcula niveles, vuelve a marcarla pendiente y recalcula el nivel
 * del jugador. Resta los yenes otorgados (clamp a 0).
 *
 * El bonus de arcanos se RECALCULA aqui con el loadout y la racha actuales, no
 * se guarda. Es exacto porque revertir solo aplica a misiones completadas HOY
 * (CompletedMissionsScreen filtra por fecha), y el loadout esta bloqueado 3 dias
 * y la racha es estable dentro del mismo dia -> mismo contexto que al completar.
 *
 * Lanza con ROLLBACK si algo falla.
 */
export const revertMission = async (missionId: number, player: any): Promise<boolean> => {
  if (!player || !player.id_jugador) throw new Error('revertMission: jugador no valido');
  const playerId = player.id_jugador;

  await db.execAsync('BEGIN TRANSACTION;');
  try {
    const mRows: any[] = await db.getAllAsync('SELECT * FROM misiones WHERE id_mision = ?', [missionId]);
    const mision = (mRows && mRows.length > 0) ? mRows[0] : null;

    // Mismo contexto de bonus que en completeMission (ver doc arriba).
    const equippedIds = await getEquippedArcanaIds(playerId);
    const baseCtx = {
      difficulty: difficultyFromXP(mision?.recompensa_exp || 0),
      missionType: mision?.tipo,
      streak: await getCurrentStreak(playerId),
    };

    const impactos: any[] = await db.getAllAsync(
      'SELECT im.*, s.nombre as nombre_stat FROM impacto_mision im LEFT JOIN stats s ON s.id_stat = im.id_stat WHERE im.id_mision = ?',
      [missionId]
    );
    for (const imp of impactos || []) {
      const valor = imp.valor_impacto || 0;
      const statId = imp.id_stat;

      // Recalcular la XP con bonus (espejo de completeMission) y restarla, con la
      // misma cascada al padre. grantXpToStat con delta negativo es simetrico.
      const ctx: XPContext = { ...baseCtx, statKey: statKeyFromName(imp.nombre_stat) };
      const valorBonus = computeXPGain(valor, ctx, equippedIds);
      await grantXpToStat(playerId, statId, -valorBonus, { cascadeParentHalf: true });
    }

    // Revertir los yenes otorgados al completar (clamp a 0, simetria)
    const yenes = (mision && mision.recompensa_yenes) ? mision.recompensa_yenes : 0;
    if (yenes > 0) {
      await db.runAsync('UPDATE jugadores SET yenes = MAX(0, yenes - ?) WHERE id_jugador = ?', [yenes, playerId]);
    }

    await db.runAsync('UPDATE misiones SET completada = 0, fecha_completada = NULL WHERE id_mision = ?', [missionId]);

    await recalcPlayerLevel(playerId);

    await db.execAsync('COMMIT;');
    return true;
  } catch (err) {
    try { await db.execAsync('ROLLBACK;'); } catch (e) { /* noop */ }
    throw err;
  }
};
