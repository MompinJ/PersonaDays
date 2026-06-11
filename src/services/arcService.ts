import { db } from '../database';
import { grantXpToStat } from './statService';
import { recalcPlayerLevel } from './playerService';

// Servicio centralizado para la lógica de Arcos.
// Antes esta lógica estaba duplicada en ArcsScreen (swipe) y ArcDetailScreen,
// y esta última NO otorgaba XP al finalizar. Centralizar evita esa inconsistencia.

// Bonus FIJO al completar un arco. Antes se sumaba la XP de todas sus misiones
// completadas, pero esa XP YA se otorgo al completar cada mision una a una:
// volver a sumarla era un doble conteo. Ahora el arco da una recompensa propia
// y distinta, configurable aqui.
export const ARC_COMPLETION_BONUS_XP = 1000;

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
 * Finaliza un arco dentro de una transacción:
 *  1. Marca el arco como COMPLETADO y fija fecha_fin.
 *  2. Otorga un bonus FIJO de XP al stat relacionado (no la suma de misiones,
 *     que ya se contó al completarlas).
 *  3. Recalcula el nivel del stat y el nivel del jugador.
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
      grantedXP = ARC_COMPLETION_BONUS_XP;
      // Mismo pipeline XP->nivel que las misiones (sin cascada al padre: el bonus
      // de arco es propio del stat relacionado).
      await grantXpToStat(player.id_jugador, arc.id_stat_relacionado, ARC_COMPLETION_BONUS_XP);
      // El nivel del jugador depende de la suma de niveles de stats.
      await recalcPlayerLevel(player.id_jugador);
    }

    await db.execAsync('COMMIT;');
    return { grantedXP };
  } catch (err) {
    try { await db.execAsync('ROLLBACK;'); } catch (e) { /* noop */ }
    throw err;
  }
};
