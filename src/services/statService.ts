import { db } from '../database';
import { calculateLevelFromXP } from '../utils/levelingUtils';
import { recalcPlayerLevel } from './playerService';

// Fuente UNICA de la regla "aplicar XP a un stat -> recalcular nivel".
// Antes esta logica estaba copiada en missionService (completar/revertir) y
// arcService (finalizar), y tenian que ser espejo perfecto a mano (y habian
// dejado de serlo). Centralizarla evita esa clase de bugs.

export interface GrantStatResult {
  statId: number;
  statName: string;
  prevLevel: number;
  level: number;
  leveledUp: boolean;
  xpApplied: number;     // cambio REAL de XP en este stat (puede ser < |delta| si se clampeo a 0)
  parentApplied: number; // cambio REAL de XP en el padre (0 si no hay padre / no se cascada)
}

/**
 * Suma `delta` XP (negativo = revertir) a un stat del jugador, manteniendo
 * SIEMPRE `nivel_actual` en sync con `experiencia_actual` (recalculado desde la
 * XP total). Hace upsert (crea la fila si no existe). Clampa la XP a >= 0.
 *
 * Si `cascadeParentHalf` y el stat tiene padre, aplica al padre la mitad
 * (`floor(|delta|/2)` con el signo de `delta`, para que sumar y restar sean
 * exactamente simetricos). La cascada es de UN nivel (no sube a los abuelos),
 * igual que la logica original.
 */
export const grantXpToStat = async (
  playerId: number,
  statId: number,
  delta: number,
  opts: { cascadeParentHalf?: boolean } = {}
): Promise<GrantStatResult> => {
  // Estado previo: nombre, padre y XP actual (LEFT JOIN -> xp null si no hay fila).
  const rows: any[] = await db.getAllAsync(
    `SELECT s.nombre AS nombre, s.id_stat_padre AS padre, js.experiencia_actual AS xp
       FROM stats s
       LEFT JOIN jugador_stat js ON js.id_stat = s.id_stat AND js.id_jugador = ?
      WHERE s.id_stat = ?`,
    [playerId, statId]
  );
  const row = rows && rows.length > 0 ? rows[0] : null;
  const statName: string = row?.nombre || '';
  const parentId: number | null = row?.padre ?? null;
  const hasRow = row != null && row.xp != null;
  const prevXP = hasRow ? (row.xp || 0) : 0;
  const prevLevel = calculateLevelFromXP(prevXP).level;

  const newXP = Math.max(0, prevXP + delta);
  const level = calculateLevelFromXP(newXP).level;
  if (hasRow) {
    await db.runAsync(
      'UPDATE jugador_stat SET experiencia_actual = ?, nivel_actual = ? WHERE id_stat = ? AND id_jugador = ?',
      [newXP, level, statId, playerId]
    );
  } else {
    await db.runAsync(
      'INSERT INTO jugador_stat (id_jugador, id_stat, nivel_actual, experiencia_actual, nivel_maximo) VALUES (?, ?, ?, ?, ?)',
      [playerId, statId, level, newXP, 99]
    );
  }
  const xpApplied = newXP - prevXP;

  let parentApplied = 0;
  if (opts.cascadeParentHalf && parentId) {
    const mag = Math.floor(Math.abs(delta) / 2);
    const parentDelta = delta < 0 ? -mag : mag;
    if (parentDelta !== 0) {
      const pres = await grantXpToStat(playerId, parentId, parentDelta); // sin cascada -> 1 nivel
      parentApplied = pres.xpApplied;
    }
  }

  return { statId, statName, prevLevel, level, leveledUp: level > prevLevel, xpApplied, parentApplied };
};

/**
 * Repara desincronizaciones `nivel_actual` <-> `experiencia_actual`: recalcula
 * `nivel_actual` desde la XP en TODAS las filas de `jugador_stat`. Idempotente y
 * barato; pensado para correr una vez en cada arranque (`initDatabase`).
 * Origen del bug: seeds viejos sembraban `nivel_actual` alto con XP 0, y como el
 * recalculo solo ocurria al tocar un stat, los stats nunca tocados quedaban con
 * un nivel inventado. Devuelve cuantas filas corrigio.
 */
export const reconcileStatLevels = async (): Promise<number> => {
  const rows: any[] = await db.getAllAsync(
    'SELECT id_jugador, id_stat, experiencia_actual, nivel_actual FROM jugador_stat'
  );
  let fixed = 0;
  for (const r of rows || []) {
    const correct = calculateLevelFromXP(r.experiencia_actual || 0).level;
    if (correct !== r.nivel_actual) {
      await db.runAsync(
        'UPDATE jugador_stat SET nivel_actual = ? WHERE id_jugador = ? AND id_stat = ?',
        [correct, r.id_jugador, r.id_stat]
      );
      fixed++;
    }
  }
  if (fixed > 0) {
    const players: any[] = await db.getAllAsync('SELECT DISTINCT id_jugador FROM jugador_stat');
    for (const p of players || []) await recalcPlayerLevel(p.id_jugador);
  }
  return fixed;
};
