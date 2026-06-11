// useHomeSummary — carga TODO el resumen del dia para la HomeScreen en un solo
// sitio: misiones de hoy, atributos base, arco activo y finanzas del mes.
// El screen lo refresca en cada foco (igual que Missions/Stats).
import { useState, useCallback } from 'react';
import { db } from '../database';
import { getCurrentStreak } from '../services/playerService';
import { resolveStatKey, type StatKey } from '../components/Stats/stats';
import { MissionType, MissionFrequency } from '../types';

export interface HomeTodayMissions {
  total: number;                 // misiones diarias programadas para hoy
  done: number;                  // de esas, completadas hoy
  pending: { id: number; nombre: string }[]; // pendientes (para la lista corta)
}

export interface HomeBaseStat {
  key: StatKey;
  nombre: string;
  nivel: number;
}

export interface HomeActiveArc {
  id_arco: number;
  nombre: string;
  color_hex: string;
  pct: number;
  arc: any; // fila completa del arco (para navegar a ArcDetail)
}

export interface HomeFinanzas {
  balance: number;   // ingresos - gastos (historico)
  gastoMes: number;  // gasto del mes en curso
}

export interface HomeSummary {
  streak: number;
  today: HomeTodayMissions;
  baseStats: HomeBaseStat[];
  activeArc: HomeActiveArc | null;
  finanzas: HomeFinanzas;
}

const EMPTY: HomeSummary = {
  streak: 0,
  today: { total: 0, done: 0, pending: [] },
  baseStats: [],
  activeArc: null,
  finanzas: { balance: 0, gastoMes: 0 },
};

// Replica el filtro de "misiones de hoy" de MissionsScreen: una diaria entra si
// sus dias_repeticion incluyen el indice de hoy, o si es EVERY_DAY / sin dias.
const isScheduledToday = (m: any, todayIndex: number): boolean => {
  const diasRaw = m.dias_repeticion;
  if (diasRaw && String(diasRaw).trim().length > 0) {
    const dias = String(diasRaw).split(',').map((d: string) => d.trim()).filter(Boolean);
    return dias.includes(String(todayIndex));
  }
  return m.frecuencia_repeticion === MissionFrequency.EVERY_DAY || !diasRaw || String(diasRaw).trim() === '';
};

export const useHomeSummary = () => {
  const [data, setData] = useState<HomeSummary>(EMPTY);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const players: any[] = await db.getAllAsync('SELECT id_jugador FROM jugadores LIMIT 1');
      if (!players || players.length === 0) { setData(EMPTY); return; }
      const playerId = players[0].id_jugador;

      // --- Misiones de hoy (diarias activas) ---
      const diarias: any[] = await db.getAllAsync(
        'SELECT id_mision, nombre, completada, dias_repeticion, frecuencia_repeticion FROM misiones WHERE tipo = ? AND activa = 1',
        [MissionType.DIARIA]
      );
      const todayIndex = new Date().getDay(); // 0=Dom..6=Sab
      const hoy = (diarias || []).filter(m => isScheduledToday(m, todayIndex));
      const done = hoy.filter(m => m.completada === 1).length;
      const pending = hoy
        .filter(m => m.completada !== 1)
        .map(m => ({ id: m.id_mision as number, nombre: m.nombre as string }));

      // --- Atributos base (5 predefinidos) ---
      const statRows: any[] = await db.getAllAsync(
        `SELECT s.id_stat, s.nombre, COALESCE(js.nivel_actual, 1) as nivel
           FROM stats s
           LEFT JOIN jugador_stat js ON s.id_stat = js.id_stat AND js.id_jugador = ?
          WHERE s.tipo = 'PREDEFINED'
          ORDER BY s.id_stat ASC
          LIMIT 5`,
        [playerId]
      );
      const baseStats: HomeBaseStat[] = (statRows || [])
        .map(r => {
          const key = resolveStatKey(r.nombre);
          return key ? { key, nombre: r.nombre as string, nivel: r.nivel as number } : null;
        })
        .filter(Boolean) as HomeBaseStat[];

      // --- Arco activo (prioriza arco padre) + progreso ---
      let activeArc: HomeActiveArc | null = null;
      const arcRows: any[] = await db.getAllAsync(
        "SELECT * FROM arcos WHERE estado = 'ACTIVO' ORDER BY (id_arco_padre IS NULL) DESC, id_arco DESC LIMIT 1"
      );
      if (arcRows && arcRows.length > 0) {
        const a = arcRows[0];
        const pr: any[] = await db.getAllAsync(
          'SELECT count(*) as total, sum(case when completada=1 then 1 else 0 end) as comp FROM misiones WHERE id_arco = ?',
          [a.id_arco]
        );
        const total = pr?.[0]?.total || 0;
        const comp = pr?.[0]?.comp || 0;
        const pct = total === 0 ? 0 : Math.round((comp / total) * 100);
        activeArc = { id_arco: a.id_arco, nombre: a.nombre, color_hex: a.color_hex, pct, arc: a };
      }

      // --- Finanzas: balance historico + gasto del mes ---
      const fin: any[] = await db.getAllAsync(
        `SELECT
            SUM(CASE WHEN tipo='INGRESO' THEN monto ELSE 0 END) as ingresos,
            SUM(CASE WHEN tipo='GASTO'   THEN monto ELSE 0 END) as gastos
         FROM finanzas`
      );
      const ingresos = fin?.[0]?.ingresos || 0;
      const gastos = fin?.[0]?.gastos || 0;
      const finMes: any[] = await db.getAllAsync(
        `SELECT SUM(monto) as total FROM finanzas
          WHERE tipo='GASTO' AND date(fecha) >= date('now','localtime','start of month')`
      );
      const gastoMes = finMes?.[0]?.total || 0;

      const streak = await getCurrentStreak(playerId);

      setData({
        streak,
        today: { total: hoy.length, done, pending },
        baseStats,
        activeArc,
        finanzas: { balance: ingresos - gastos, gastoMes },
      });
    } catch (e) {
      console.error('Error cargando resumen de Home:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, refresh };
};

export default useHomeSummary;
