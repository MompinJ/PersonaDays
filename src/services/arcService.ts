import { db } from '../database';
import { calculateLevelFromXP } from '../utils/levelingUtils';

// Servicio centralizado para la lógica de Arcos.
// Antes esta lógica estaba duplicada en ArcsScreen (swipe) y ArcDetailScreen,
// y esta última NO otorgaba XP al finalizar. Centralizar evita esa inconsistencia.

export interface FinalizeArcResult {
  grantedXP: number;
}

// El cyan era el color_hex por defecto viejo. Si un arco lo tiene (o no tiene color),
// usamos el color del personaje en vez de un azul hardcodeado que no sigue el tema.
export const LEGACY_ARC_COLOR = '#00D4FF';
export const arcDisplayColor = (arc: any, themePrimary: string): string => {
  const c = arc?.color_hex;
  if (!c || String(c).toLowerCase() === LEGACY_ARC_COLOR.toLowerCase()) return themePrimary;
  return c;
};

/**
 * Comprueba si un arco tiene sub-arcos activos (que impedirían finalizarlo).
 * Solo aplica a arcos padre (id_arco_padre == null).
 */
export const hasActiveSubArcs = async (arc: any): Promise<boolean> => {
  if (!arc || arc.id_arco_padre != null) return false;
  const res: any[] = await db.getAllAsync(
    'SELECT count(*) as c FROM arcos WHERE id_arco_padre = ? AND estado = ?',
    [arc.id_arco, 'ACTIVO']
  );
  const count = (res && res.length > 0 && res[0].c) ? res[0].c : 0;
  return count > 0;
};

/**
 * Finaliza un arco dentro de una transacción:
 *  1. Marca el arco como COMPLETADO y fija fecha_fin.
 *  2. Suma toda la XP de las misiones completadas del arco al stat relacionado.
 *  3. Recalcula el nivel del stat.
 *
 * Devuelve la XP otorgada. Lanza si algo falla (con ROLLBACK).
 */
export const finalizeArcWithRewards = async (arc: any, player: any): Promise<FinalizeArcResult> => {
  await db.execAsync('BEGIN TRANSACTION;');
  try {
    await db.runAsync(
      "UPDATE arcos SET estado = 'COMPLETADO', fecha_fin = date('now','localtime') WHERE id_arco = ?",
      [arc.id_arco]
    );

    let grantedXP = 0;

    if (arc.id_stat_relacionado && player && player.id_jugador) {
      const res: any[] = await db.getAllAsync(
        'SELECT sum(recompensa_exp) as s FROM misiones WHERE id_arco = ? AND completada = 1',
        [arc.id_arco]
      );
      const totalXP = (res && res.length > 0 && res[0].s) ? res[0].s : 0;

      if (totalXP > 0) {
        grantedXP = totalXP;

        const jsRows: any[] = await db.getAllAsync(
          'SELECT experiencia_actual FROM jugador_stat WHERE id_stat = ? AND id_jugador = ?',
          [arc.id_stat_relacionado, player.id_jugador]
        );

        if (jsRows && jsRows.length > 0) {
          await db.runAsync(
            'UPDATE jugador_stat SET experiencia_actual = experiencia_actual + ? WHERE id_stat = ? AND id_jugador = ?',
            [totalXP, arc.id_stat_relacionado, player.id_jugador]
          );
        } else {
          await db.runAsync(
            'INSERT INTO jugador_stat (id_jugador, id_stat, nivel_actual, experiencia_actual, nivel_maximo) VALUES (?, ?, ?, ?, ?)',
            [player.id_jugador, arc.id_stat_relacionado, 1, totalXP, 99]
          );
        }

        // Recalcular nivel a partir de la XP total acumulada
        const afterRows: any[] = await db.getAllAsync(
          'SELECT experiencia_actual FROM jugador_stat WHERE id_stat = ? AND id_jugador = ?',
          [arc.id_stat_relacionado, player.id_jugador]
        );
        if (afterRows && afterRows.length > 0) {
          const totalAfter = afterRows[0].experiencia_actual || 0;
          const lvl = calculateLevelFromXP(totalAfter);
          await db.runAsync(
            'UPDATE jugador_stat SET nivel_actual = ? WHERE id_stat = ? AND id_jugador = ?',
            [lvl.level, arc.id_stat_relacionado, player.id_jugador]
          );
        }
      }
    }

    await db.execAsync('COMMIT;');
    return { grantedXP };
  } catch (err) {
    try { await db.execAsync('ROLLBACK;'); } catch (e) { /* noop */ }
    throw err;
  }
};
