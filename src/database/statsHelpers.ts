import { db } from './database';
import { recalcPlayerLevel } from '../services/playerService';

export const createCustomStat = async (
  nombre: string,
  descripcion: string,
  idPadre: number | null,
  nivelMaximo: number
) => {
  if (!nombre) throw new Error('El nombre es obligatorio');

  try {
    // 1. Determinar ID del jugador. Esta pantalla solo es alcanzable con un
    // jugador creado (el onboarding lo garantiza); si no existe, abortamos
    // antes de insertar nada en lugar de fabricar un jugador fantasma.
    const players: any = await db.getAllAsync('SELECT id_jugador FROM jugadores LIMIT 1');
    const playerId = players && players.length > 0 ? players[0].id_jugador : null;
    if (!playerId) {
      console.error('createCustomStat: no existe jugador; completa el onboarding primero.');
      return false;
    }

    // 2. Insertamos la definición del Stat vinculada al PADRE (si viene)
    const resultStat: any = await db.runAsync(
      `INSERT INTO stats (nombre, descripcion, tipo, dificultad, id_stat_padre) VALUES (?, ?, 'CUSTOM', 1.0, ?);`,
      [nombre.trim(), descripcion || '', idPadre]
    );

    const newStatId = resultStat && resultStat.lastInsertRowId ? resultStat.lastInsertRowId : null;

    if (!newStatId) {
      console.error('No se pudo obtener id del stat creado');
      return false;
    }

    // 3. Vinculamos al jugador encontrado/creado con el nuevo stat y nivel máximo personalizado
    await db.runAsync(
      `INSERT INTO jugador_stat (id_jugador, id_stat, nivel_actual, experiencia_actual, nivel_maximo) VALUES (?, ?, 1, 0, ?);`,
      [playerId, newStatId, nivelMaximo]
    );

    // El nivel del jugador depende de la suma de niveles de stats: la nueva suma +1
    try { await recalcPlayerLevel(playerId); } catch (e) { /* noop */ }

    console.log(`✅ Stat Custom creada: ${nombre} (ID: ${newStatId}) para jugador ${playerId}`);
    return true;
  } catch (error) {
    console.error('Error creando stat:', error);
    return false;
  }
};
