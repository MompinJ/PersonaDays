import { db } from '../database';
import { Jugador, CharacterTheme } from '../types';

// Divisor para derivar el nivel del jugador a partir del esfuerzo total.
// nivel_jugador = floor(suma de niveles de TODAS las stats / K).
// K mas bajo = el jugador sube mas rapido. Unica perilla de pacing del nivel.
export const PLAYER_LEVEL_DIVISOR = 5;

/**
 * Recalcula y persiste nivel_jugador a partir de la suma de niveles de todas
 * las stats del jugador (esfuerzo total: cuentan base y custom, es monotono y
 * anadir una stat nueva nunca lo baja).
 *
 * NO abre transaccion propia: pensado para llamarse dentro de una transaccion
 * ya abierta (completar/revertir mision, finalizar arco).
 */
export const recalcPlayerLevel = async (playerId: number): Promise<number> => {
  const rows: any[] = await db.getAllAsync(
    'SELECT COALESCE(SUM(nivel_actual), 0) as suma FROM jugador_stat WHERE id_jugador = ?',
    [playerId]
  );
  const suma = (rows && rows.length > 0 && rows[0].suma) ? rows[0].suma : 0;
  const nivel = Math.max(1, Math.floor(suma / PLAYER_LEVEL_DIVISOR));
  await db.runAsync('UPDATE jugadores SET nivel_jugador = ? WHERE id_jugador = ?', [nivel, playerId]);
  return nivel;
};

export interface StreakResult {
  streak: number;     // racha resultante tras la actividad de hoy
  increased: boolean; // true si la racha subio respecto al valor previo (dia consecutivo o primera vez)
}

/**
 * Actualiza la racha al registrar actividad (completar una mision). Lazy:
 *  - Si ya hubo actividad hoy -> la racha no cambia (no cuenta doble).
 *  - Si la ultima actividad fue ayer -> racha + 1 (dia consecutivo).
 *  - Si fue antes de ayer o nunca -> la racha se rompio -> vuelve a 1.
 *
 * Usa fechas locales de SQLite para alinearse con fecha_completada.
 * NO abre transaccion propia: pensado para llamarse dentro de una ya abierta.
 */
export const updateStreakOnActivity = async (playerId: number): Promise<StreakResult> => {
  const rows: any[] = await db.getAllAsync(
    `SELECT racha,
            date(last_activity_date) as last,
            date('now','localtime') as hoy,
            date('now','localtime','-1 day') as ayer
     FROM jugadores WHERE id_jugador = ?`,
    [playerId]
  );
  if (!rows || rows.length === 0) return { streak: 0, increased: false };

  const { racha, last, hoy, ayer } = rows[0];
  const current = racha || 0;

  // Ya hubo actividad hoy: la racha no cambia
  if (last === hoy) return { streak: current, increased: false };

  // Dia consecutivo extiende; cualquier otro hueco (o primera vez) reinicia a 1
  const nuevo = last === ayer ? current + 1 : 1;

  await db.runAsync(
    "UPDATE jugadores SET racha = ?, last_activity_date = date('now','localtime') WHERE id_jugador = ?",
    [nuevo, playerId]
  );
  return { streak: nuevo, increased: nuevo > current };
};

/**
 * Devuelve la racha efectiva para mostrar/usar en logica (p.ej. bonus de arcano):
 * 0 si esta rota (la ultima actividad fue antes de ayer), si no el valor guardado.
 * Solo lee, no escribe.
 */
export const getCurrentStreak = async (playerId: number): Promise<number> => {
  const rows: any[] = await db.getAllAsync(
    `SELECT racha,
            date(last_activity_date) as last,
            date('now','localtime') as hoy,
            date('now','localtime','-1 day') as ayer
     FROM jugadores WHERE id_jugador = ?`,
    [playerId]
  );
  if (!rows || rows.length === 0) return 0;
  const { racha, last, hoy, ayer } = rows[0];
  if (last === hoy || last === ayer) return racha || 0;
  return 0; // racha rota
};

export const checkPlayerExists = async (): Promise<boolean> => {
    try {
        const resultado = await db.getAllAsync<Jugador>('SELECT * FROM jugadores LIMIT 1');
        return resultado.length > 0;
    } catch (error) {
        console.error("Error en playerService: ", error)
        return false;
    }
};

export const getPlayer = async (): Promise<Jugador | null> => {
    console.log("Creando un nuevo jugador");
    try {
        const resultado = await db.getAllAsync<Jugador>('SELECT * FROM jugadores LIMIT 1');
        if (resultado.length > 0) return resultado[0];
        return null;
    } catch (error) {
        console.error("Error en playerService: ", error)
        return null;
    }
};

export const createPlayer = async (nombre: string, theme?: CharacterTheme): Promise<boolean> => {
  try {
    const fecha = new Date().toISOString();
    const result: any = await db.runAsync(
      `INSERT INTO jugadores (nombre_jugador, nivel_jugador, vida, yenes, character_theme, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nombre, 1, 10, 5000, theme ?? CharacterTheme.MAKOTO, fecha]
    );

    // Intentamos obtener el id del jugador recién creado
    const newPlayerId = result && result.lastInsertRowId ? result.lastInsertRowId : null;

    // Si obtuvimos id, creamos las filas por defecto en jugador_stat para las 5 stats base
    if (newPlayerId) {
      await db.runAsync(`
        INSERT INTO jugador_stat (id_jugador, id_stat, nivel_actual, experiencia_actual, nivel_maximo) VALUES
        (?, 1, 1, 0, 99),
        (?, 2, 1, 0, 99),
        (?, 3, 1, 0, 99),
        (?, 4, 1, 0, 99),
        (?, 5, 1, 0, 99);
      `, [newPlayerId, newPlayerId, newPlayerId, newPlayerId, newPlayerId]);
    }

    return true;
  } catch (error) {
    console.error("Error creando jugador:", error);
    return false;
  }
};


