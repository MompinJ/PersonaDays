import { db } from '../database';
import { MAX_SLOTS, SLOT_PRICES, ARCANA_LOCK_DAYS, arcanaUnlockLevel, arcanaPrice } from '../data/arcanaEffects';

// Servicio de arcanos: propiedad (compra), slots y equipar/desequipar con los
// dos temporizadores:
//   - Bloqueo de commitment: al equipar, no se puede quitar en ARCANA_LOCK_DAYS dias.
//   - Cooldown semanal: al quitarlo (tras el bloqueo), queda en espera hasta el
//     proximo lunes (no se puede re-equipar esta semana).
// Ambos se evaluan de forma lazy con fechas locales de SQLite, sin job de reset.

export type ActionResult = { ok: true } | { ok: false; reason: string };

// Modificador SQLite para "el proximo lunes estricto" (si hoy es lunes -> +7 dias).
const NEXT_MONDAY = "date('now','localtime','+1 day','weekday 1')";

/** Ids de arcanos actualmente equipados (sus efectos estan activos). */
export const getEquippedArcanaIds = async (playerId: number): Promise<number[]> => {
  const rows: any[] = await db.getAllAsync(
    'SELECT id_arcano FROM jugador_arcanos_slots WHERE id_jugador = ? ORDER BY numero_slot',
    [playerId]
  );
  return (rows || []).map((r) => r.id_arcano);
};

/**
 * Estado de arcanos del jugador para la UI: cada arcano poseido con si esta
 * equipado (y en que slot), su bloqueo y su cooldown. Tambien cuantos slots
 * tiene desbloqueados.
 */
export const getPlayerArcanaOverview = async (playerId: number) => {
  const slotsRow: any = await db.getFirstAsync(
    'SELECT slots_desbloqueados FROM jugadores WHERE id_jugador = ?',
    [playerId]
  );
  const slotsDesbloqueados = slotsRow?.slots_desbloqueados ?? 1;

  const owned: any[] = await db.getAllAsync(
    `SELECT ja.id_arcano,
            ja.disponible_desde,
            s.numero_slot,
            date(s.fecha_equipado, ?) as bloqueado_hasta,
            date('now','localtime') as hoy
     FROM jugador_arcanos ja
     LEFT JOIN jugador_arcanos_slots s
       ON s.id_jugador = ja.id_jugador AND s.id_arcano = ja.id_arcano
     WHERE ja.id_jugador = ?`,
    [`+${ARCANA_LOCK_DAYS} days`, playerId]
  );

  const arcanos = (owned || []).map((r) => {
    const equipped = r.numero_slot != null;
    const locked = equipped && r.hoy < r.bloqueado_hasta;
    const enCooldown = !equipped && r.disponible_desde != null && r.hoy < r.disponible_desde;
    return {
      id_arcano: r.id_arcano,
      equipped,
      slot: r.numero_slot ?? null,
      locked,                       // no se puede quitar todavia
      bloqueadoHasta: equipped ? r.bloqueado_hasta : null,
      enCooldown,                   // no se puede re-equipar todavia
      disponibleDesde: r.disponible_desde ?? null,
    };
  });

  return { slotsDesbloqueados, maxSlots: MAX_SLOTS, arcanos };
};

/** Compra un arcano: gate de nivel + gate de yenes. Transaccional. */
export const buyArcano = async (playerId: number, arcanoId: number): Promise<ActionResult> => {
  const p: any = await db.getFirstAsync('SELECT nivel_jugador, yenes FROM jugadores WHERE id_jugador = ?', [playerId]);
  if (!p) return { ok: false, reason: 'Jugador no encontrado' };

  const yaPosee: any = await db.getFirstAsync(
    'SELECT 1 FROM jugador_arcanos WHERE id_jugador = ? AND id_arcano = ?',
    [playerId, arcanoId]
  );
  if (yaPosee) return { ok: false, reason: 'Ya posees este arcano' };

  const nivelReq = arcanaUnlockLevel(arcanoId);
  if ((p.nivel_jugador || 1) < nivelReq) return { ok: false, reason: `Requiere nivel de jugador ${nivelReq}` };

  const precio = arcanaPrice(arcanoId);
  if ((p.yenes || 0) < precio) return { ok: false, reason: 'Yenes insuficientes' };

  await db.execAsync('BEGIN TRANSACTION;');
  try {
    await db.runAsync('UPDATE jugadores SET yenes = yenes - ? WHERE id_jugador = ?', [precio, playerId]);
    await db.runAsync(
      "INSERT INTO jugador_arcanos (id_jugador, id_arcano, fecha_compra, disponible_desde) VALUES (?, ?, datetime('now','localtime'), NULL)",
      [playerId, arcanoId]
    );
    await db.execAsync('COMMIT;');
    return { ok: true };
  } catch (err) {
    try { await db.execAsync('ROLLBACK;'); } catch (e) { /* noop */ }
    throw err;
  }
};

/** Compra el siguiente slot (2 o 3). Transaccional. */
export const buyNextSlot = async (playerId: number): Promise<ActionResult> => {
  const p: any = await db.getFirstAsync('SELECT slots_desbloqueados, yenes FROM jugadores WHERE id_jugador = ?', [playerId]);
  if (!p) return { ok: false, reason: 'Jugador no encontrado' };

  const next = (p.slots_desbloqueados || 1) + 1;
  if (next > MAX_SLOTS) return { ok: false, reason: 'Ya tienes el maximo de slots' };

  const precio = SLOT_PRICES[next];
  if (!precio) return { ok: false, reason: 'Slot no comprable' };
  if ((p.yenes || 0) < precio) return { ok: false, reason: 'Yenes insuficientes' };

  await db.execAsync('BEGIN TRANSACTION;');
  try {
    await db.runAsync('UPDATE jugadores SET yenes = yenes - ?, slots_desbloqueados = ? WHERE id_jugador = ?', [precio, next, playerId]);
    await db.execAsync('COMMIT;');
    return { ok: true };
  } catch (err) {
    try { await db.execAsync('ROLLBACK;'); } catch (e) { /* noop */ }
    throw err;
  }
};

/**
 * Equipa un arcano poseido en un slot. Si el slot esta ocupado por un arcano
 * NO bloqueado, lo desequipa (mandandolo a cooldown) y pone el nuevo.
 */
export const equipArcano = async (playerId: number, arcanoId: number, slot: number): Promise<ActionResult> => {
  const p: any = await db.getFirstAsync('SELECT slots_desbloqueados FROM jugadores WHERE id_jugador = ?', [playerId]);
  if (!p) return { ok: false, reason: 'Jugador no encontrado' };
  if (slot < 1 || slot > (p.slots_desbloqueados || 1)) return { ok: false, reason: 'Slot no desbloqueado' };

  const own: any = await db.getFirstAsync(
    "SELECT disponible_desde, date('now','localtime') as hoy FROM jugador_arcanos WHERE id_jugador = ? AND id_arcano = ?",
    [playerId, arcanoId]
  );
  if (!own) return { ok: false, reason: 'No posees este arcano' };
  if (own.disponible_desde && own.hoy < own.disponible_desde) {
    return { ok: false, reason: `En cooldown hasta ${own.disponible_desde}` };
  }

  const yaEquipado: any = await db.getFirstAsync(
    'SELECT 1 FROM jugador_arcanos_slots WHERE id_jugador = ? AND id_arcano = ?',
    [playerId, arcanoId]
  );
  if (yaEquipado) return { ok: false, reason: 'Ese arcano ya esta equipado' };

  const occ: any = await db.getFirstAsync(
    `SELECT id_arcano, date(fecha_equipado, ?) as bloqueado_hasta, date('now','localtime') as hoy
     FROM jugador_arcanos_slots WHERE id_jugador = ? AND numero_slot = ?`,
    [`+${ARCANA_LOCK_DAYS} days`, playerId, slot]
  );
  if (occ && occ.hoy < occ.bloqueado_hasta) {
    return { ok: false, reason: 'El arcano en ese slot esta bloqueado' };
  }

  await db.execAsync('BEGIN TRANSACTION;');
  try {
    if (occ) {
      // Sacar el ocupante (desbloqueado) -> a cooldown
      await db.runAsync('DELETE FROM jugador_arcanos_slots WHERE id_jugador = ? AND numero_slot = ?', [playerId, slot]);
      await db.runAsync(
        `UPDATE jugador_arcanos SET disponible_desde = ${NEXT_MONDAY} WHERE id_jugador = ? AND id_arcano = ?`,
        [playerId, occ.id_arcano]
      );
    }
    await db.runAsync(
      "INSERT INTO jugador_arcanos_slots (id_jugador, id_arcano, numero_slot, fecha_equipado) VALUES (?, ?, ?, datetime('now','localtime'))",
      [playerId, arcanoId, slot]
    );
    await db.execAsync('COMMIT;');
    return { ok: true };
  } catch (err) {
    try { await db.execAsync('ROLLBACK;'); } catch (e) { /* noop */ }
    throw err;
  }
};

/** Desequipa el arcano de un slot. Falla si sigue bloqueado. Lo manda a cooldown. */
export const unequipArcano = async (playerId: number, slot: number): Promise<ActionResult> => {
  const row: any = await db.getFirstAsync(
    `SELECT id_arcano, date(fecha_equipado, ?) as bloqueado_hasta, date('now','localtime') as hoy
     FROM jugador_arcanos_slots WHERE id_jugador = ? AND numero_slot = ?`,
    [`+${ARCANA_LOCK_DAYS} days`, playerId, slot]
  );
  if (!row) return { ok: false, reason: 'Slot vacio' };
  if (row.hoy < row.bloqueado_hasta) return { ok: false, reason: `Bloqueado hasta ${row.bloqueado_hasta}` };

  await db.execAsync('BEGIN TRANSACTION;');
  try {
    await db.runAsync('DELETE FROM jugador_arcanos_slots WHERE id_jugador = ? AND numero_slot = ?', [playerId, slot]);
    await db.runAsync(
      `UPDATE jugador_arcanos SET disponible_desde = ${NEXT_MONDAY} WHERE id_jugador = ? AND id_arcano = ?`,
      [playerId, row.id_arcano]
    );
    await db.execAsync('COMMIT;');
    return { ok: true };
  } catch (err) {
    try { await db.execAsync('ROLLBACK;'); } catch (e) { /* noop */ }
    throw err;
  }
};
