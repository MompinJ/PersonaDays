import { db } from '../database';
import { Jugador, CharacterTheme } from '../types';

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

export const createPlayer = async (nombre: string, theme: CharacterTheme): Promise<boolean> => {
  try {
    const fecha = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO jugadores (nombre_jugador, nivel_jugador, vida, yenes, character_theme, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nombre, 1, 10, 5000, theme, fecha]
    );
    return true;
  } catch (error) {
    console.error("Error creando jugador:", error);
    return false;
  }
};


