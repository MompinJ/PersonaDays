import { db } from '../database';
import { calculateLevelFromXP } from '../utils/levelingUtils';
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
export const MISSION_XP = { EASY: 50, MEDIUM: 100, HARD: 150 } as const;

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

    const impactos: any[] = await db.getAllAsync('SELECT * FROM impacto_mision WHERE id_mision = ?', [missionId]);
    for (const imp of impactos || []) {
      const valor = imp.valor_impacto || 0;
      const statId = imp.id_stat;

      // Nivel y nombre ANTES de aplicar (para detectar subida de nivel)
      let prevLevel = 1;
      let statName = '';
      const prev: any[] = await db.getAllAsync(
        'SELECT js.experiencia_actual as xp, s.nombre as nombre FROM stats s LEFT JOIN jugador_stat js ON js.id_stat = s.id_stat AND js.id_jugador = ? WHERE s.id_stat = ?',
        [playerId, statId]
      );
      if (prev && prev.length > 0) {
        prevLevel = calculateLevelFromXP(prev[0].xp || 0).level;
        statName = prev[0].nombre || '';
      }

      // Bonus de arcanos: la XP base de este impacto se escala segun los arcanos
      // equipados y el contexto (stat de este impacto + dificultad/tipo/racha).
      const ctx: XPContext = { ...baseCtx, statKey: statKeyFromName(statName) };
      const valorBonus = computeXPGain(valor, ctx, equippedIds);

      // 1) Añadir XP (ya con bonus) al stat impactado
      await db.runAsync(
        'UPDATE jugador_stat SET experiencia_actual = experiencia_actual + ? WHERE id_stat = ? AND id_jugador = ?',
        [valorBonus, statId, playerId]
      );
      totalExpGained += valorBonus;

      // 2) Recalcular nivel del stat desde su XP total
      const rows: any[] = await db.getAllAsync(
        'SELECT experiencia_actual FROM jugador_stat WHERE id_stat = ? AND id_jugador = ?',
        [statId, playerId]
      );
      if (rows && rows.length > 0) {
        const totalXP = rows[0].experiencia_actual || 0;
        const lvl = calculateLevelFromXP(totalXP);
        await db.runAsync(
          'UPDATE jugador_stat SET nivel_actual = ? WHERE id_stat = ? AND id_jugador = ?',
          [lvl.level, statId, playerId]
        );
        if (lvl.level > prevLevel && statName) leveledUp.push({ name: statName, level: lvl.level });

        // 3) Herencia: el stat padre recibe la mitad de la XP
        const pr: any[] = await db.getAllAsync('SELECT id_stat_padre FROM stats WHERE id_stat = ?', [statId]);
        if (pr && pr.length > 0 && pr[0].id_stat_padre) {
          const idPadre = pr[0].id_stat_padre;
          const xpPadre = Math.floor(valorBonus / 2);
          if (xpPadre > 0) {
            const parentJs: any[] = await db.getAllAsync(
              'SELECT experiencia_actual FROM jugador_stat WHERE id_stat = ? AND id_jugador = ?',
              [idPadre, playerId]
            );
            if (parentJs && parentJs.length > 0) {
              await db.runAsync(
                'UPDATE jugador_stat SET experiencia_actual = experiencia_actual + ? WHERE id_stat = ? AND id_jugador = ?',
                [xpPadre, idPadre, playerId]
              );
            } else {
              await db.runAsync(
                'INSERT INTO jugador_stat (id_jugador, id_stat, nivel_actual, experiencia_actual, nivel_maximo) VALUES (?, ?, ?, ?, ?)',
                [playerId, idPadre, 1, xpPadre, 99]
              );
            }
            totalExpGained += xpPadre;

            const rowsParent: any[] = await db.getAllAsync(
              'SELECT experiencia_actual FROM jugador_stat WHERE id_stat = ? AND id_jugador = ?',
              [idPadre, playerId]
            );
            if (rowsParent && rowsParent.length > 0) {
              const lvlPadre = calculateLevelFromXP(rowsParent[0].experiencia_actual || 0);
              await db.runAsync(
                'UPDATE jugador_stat SET nivel_actual = ? WHERE id_stat = ? AND id_jugador = ?',
                [lvlPadre.level, idPadre, playerId]
              );
            }
          }
        }
      }
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

      // Recalcular la XP con bonus (espejo de completeMission)
      const ctx: XPContext = { ...baseCtx, statKey: statKeyFromName(imp.nombre_stat) };
      const valorBonus = computeXPGain(valor, ctx, equippedIds);

      await db.runAsync(
        'UPDATE jugador_stat SET experiencia_actual = MAX(0, experiencia_actual - ?) WHERE id_stat = ? AND id_jugador = ?',
        [valorBonus, statId, playerId]
      );
      const after: any[] = await db.getAllAsync(
        'SELECT experiencia_actual FROM jugador_stat WHERE id_stat = ? AND id_jugador = ?',
        [statId, playerId]
      );
      if (after && after.length > 0) {
        const lvl = calculateLevelFromXP(after[0].experiencia_actual || 0);
        await db.runAsync(
          'UPDATE jugador_stat SET nivel_actual = ? WHERE id_stat = ? AND id_jugador = ?',
          [lvl.level, statId, playerId]
        );
      }

      // Revertir la XP heredada al stat padre
      const pr: any[] = await db.getAllAsync('SELECT id_stat_padre FROM stats WHERE id_stat = ?', [statId]);
      if (pr && pr.length > 0 && pr[0].id_stat_padre) {
        const idPadre = pr[0].id_stat_padre;
        const xpPadre = Math.floor(valorBonus / 2);
        if (xpPadre > 0) {
          await db.runAsync(
            'UPDATE jugador_stat SET experiencia_actual = MAX(0, experiencia_actual - ?) WHERE id_stat = ? AND id_jugador = ?',
            [xpPadre, idPadre, playerId]
          );
          const pAfter: any[] = await db.getAllAsync(
            'SELECT experiencia_actual FROM jugador_stat WHERE id_stat = ? AND id_jugador = ?',
            [idPadre, playerId]
          );
          if (pAfter && pAfter.length > 0) {
            const lvlP = calculateLevelFromXP(pAfter[0].experiencia_actual || 0);
            await db.runAsync(
              'UPDATE jugador_stat SET nivel_actual = ? WHERE id_stat = ? AND id_jugador = ?',
              [lvlP.level, idPadre, playerId]
            );
          }
        }
      }
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
