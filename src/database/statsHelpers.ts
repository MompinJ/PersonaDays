import { db } from './base_de_datos';

export const createCustomStat = async (
  nombre: string,
  descripcion: string,
  idPadre: number | null,
  nivelMaximo: number
) => {
  if (!nombre) throw new Error('El nombre es obligatorio');

  try {
    // 1. Insertamos la definición del Stat vinculada al PADRE (si viene)
    const resultStat: any = await db.runAsync(
      `INSERT INTO stats (nombre, descripcion, tipo, dificultad, id_stat_padre) VALUES (?, ?, 'CUSTOM', 1.0, ?);`,
      [nombre.trim(), descripcion || '', idPadre]
    );

    const newStatId = resultStat && resultStat.lastInsertRowId ? resultStat.lastInsertRowId : null;

    if (!newStatId) {
      console.error('No se pudo obtener id del stat creado');
      return false;
    }

    // 2. Determinar ID de jugador existente (si hay uno)
    const players: any = await db.getAllAsync('SELECT id_jugador FROM jugadores LIMIT 1');
    let playerId = players && players.length > 0 ? players[0].id_jugador : null;

    // Si no existe jugador (modo dev), creamos uno temporal y también insertamos las stats base en jugador_stat
    if (!playerId) {
      console.log('No se encontró jugador. Creando jugador temporal (DEV)...');
      const fecha = new Date().toISOString();
      const res: any = await db.runAsync(
        `INSERT INTO jugadores (nombre_jugador, nivel_jugador, vida, yenes, character_theme, created_at)
         VALUES (?, ?, ?, ?, ?, ?);`,
        ['Invitado', 1, 10, 5000, 'MAKOTO', fecha]
      );
      playerId = res && res.lastInsertRowId ? res.lastInsertRowId : 1;

      // Intentamos vincular las 5 stats base si existen
      try {
        await db.execAsync(`
          INSERT OR IGNORE INTO jugador_stat (id_jugador, id_stat, nivel_actual, experiencia_actual, nivel_maximo) VALUES
          (${playerId}, 1, 1, 0, 99),
          (${playerId}, 2, 1, 0, 99),
          (${playerId}, 3, 1, 0, 99),
          (${playerId}, 4, 1, 0, 99),
          (${playerId}, 5, 1, 0, 99);
        `);
      } catch (e) {
        // puede fallar si las stats no existen aún; lo ignoramos y procederemos
        console.warn('No fue posible insertar jugador_stat base automáticamente:', e);
      }
    }

    // 3. Vinculamos al jugador encontrado/creado con el nuevo stat y nivel máximo personalizado
    await db.runAsync(
      `INSERT INTO jugador_stat (id_jugador, id_stat, nivel_actual, experiencia_actual, nivel_maximo) VALUES (?, ?, 1, 0, ?);`,
      [playerId, newStatId, nivelMaximo]
    );

    console.log(`✅ Stat Custom creada: ${nombre} (ID: ${newStatId}) para jugador ${playerId}`);
    return true;
  } catch (error) {
    console.error('Error creando stat:', error);
    return false;
  }
};
