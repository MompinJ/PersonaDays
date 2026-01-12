import { useState, useEffect, useCallback } from 'react';
import { db } from '../database'; // Ajusta la ruta a tu archivo DB
import { JugadorStat, Jugador } from '../types'; // Tus interfaces (ajustado al src/types)

// Tipo combinado para la vista
export interface StatViewData extends JugadorStat {
  nombre_stat: string;
  tipo: 'PREDEFINED' | 'CUSTOM';
  dificultad: number;
}

export const usePlayerStats = () => {
  const [stats, setStats] = useState<StatViewData[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);

      // Buscar jugador actual (el primero disponible)
      const players: any = await db.getAllAsync<Jugador>('SELECT id_jugador FROM jugadores LIMIT 1');
      if (!players || players.length === 0) {
        setStats([]);
        return;
      }

      const playerId = players[0].id_jugador;

      // Usamos LEFT JOIN para mostrar todas las stats (incluso si jugador_stat no existe todavía)
      const result = await db.getAllAsync(
        `SELECT
          s.id_stat,
          s.nombre as nombre_stat,
          s.tipo,
          s.dificultad,
          COALESCE(js.id_jugador_stat, -1) as id_jugador_stat,
          COALESCE(js.id_jugador, ?) as id_jugador,
          COALESCE(js.nivel_actual, 1) as nivel_actual,
          COALESCE(js.experiencia_actual, 0) as experiencia_actual,
          COALESCE(js.nivel_maximo, 99) as nivel_maximo,
          COALESCE(js.cuenta_prestigio, 0) as cuenta_prestigio
        FROM stats s
        LEFT JOIN jugador_stat js ON s.id_stat = js.id_stat AND js.id_jugador = ?
        ORDER BY s.id_stat ASC;`,
        [playerId, playerId]
      );

      setStats(result as StatViewData[]);
    } catch (error) {
      console.error('Error cargando stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Recargar al iniciar
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return { stats, loading, refreshStats: loadStats };
};