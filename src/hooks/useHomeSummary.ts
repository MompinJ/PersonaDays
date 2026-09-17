// useHomeSummary — carga TODO el resumen del dia para la HomeScreen en un solo
// sitio: misiones de hoy, atributos base, arco activo y finanzas del mes.
// El screen lo refresca en cada foco (igual que Missions/Stats).
import { useState, useCallback } from 'react';
import { db } from '../database';
import { getCurrentStreak } from '../services/playerService';
import { resolveStatKey, type StatKey } from '../components/Stats/stats';
import { arcElapsedDays } from '../services/arcService';
import { isMissionScheduledToday, compareTodayMissions } from '../services/missionFilters';
import { ARCANA_LOCK_DAYS } from '../data/arcanaEffects';
import { arcanaColor, daysUntil } from '../data/arcanaMeta';

export interface HomeTodayMissions {
  total: number;                 // todas las misiones programadas para hoy (vista TODAS)
  done: number;                  // de esas, completadas hoy
  pending: { id: number; nombre: string }[]; // pendientes (para la lista corta)
}

// Un arcano equipado en un slot activo, con su tiempo de bloqueo restante.
export interface HomeArcanaSlot {
  slot: number;
  id_arcano: number;
  nombre: string;
  rom: string;          // numeral romano (simbolo)
  statEs: string;       // stat asociado
  color: string;        // jewel
  locked: boolean;      // sigue bloqueado (no se puede quitar)
  diasRestantes: number; // dias hasta que se libere (0 si ya esta libre)
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
  dias: number; // dias que lleva el arco (la progresion del arco es TIEMPO)
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
  arcanaSlots: HomeArcanaSlot[]; // arcanos equipados (slots ocupados)
  slotsTotal: number;            // slots desbloqueados (para pintar los vacios)
}

const EMPTY: HomeSummary = {
  streak: 0,
  today: { total: 0, done: 0, pending: [] },
  baseStats: [],
  activeArc: null,
  finanzas: { balance: 0, gastoMes: 0 },
  arcanaSlots: [],
  slotsTotal: 1,
};

export const useHomeSummary = () => {
  const [data, setData] = useState<HomeSummary>(EMPTY);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const players: any[] = await db.getAllAsync('SELECT id_jugador FROM jugadores LIMIT 1');
      if (!players || players.length === 0) { setData(EMPTY); return; }
      const playerId = players[0].id_jugador;

      // --- Misiones de hoy (vista TODAS: cualquier tipo programado para hoy) ---
      // Mismo criterio que la pestaña TODAS de Requests. Una completada cuenta solo
      // si se completo HOY (done_today); asi una semanal/extra hecha otro dia no
      // infla el contador ni reaparece.
      const activas: any[] = await db.getAllAsync(
        `SELECT id_mision, nombre, completada, dias_repeticion, frecuencia_repeticion, tipo, hora_mision, fecha_creacion,
                (CASE WHEN completada = 1 AND date(fecha_completada, 'localtime') = date('now','localtime') THEN 1 ELSE 0 END) AS done_today
           FROM misiones WHERE activa = 1`
      );
      const todayIndex = new Date().getDay(); // 0=Dom..6=Sab
      const hoy = (activas || []).filter(
        m => isMissionScheduledToday(m, todayIndex) && (m.completada !== 1 || m.done_today === 1)
      );
      const done = hoy.filter(m => m.completada === 1).length;
      const pending = hoy
        .filter(m => m.completada !== 1)
        .slice()
        .sort(compareTodayMissions)
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

      // --- Arco activo + progreso ---
      let activeArc: HomeActiveArc | null = null;
      const arcRows: any[] = await db.getAllAsync(
        "SELECT * FROM arcos WHERE estado = 'ACTIVO' ORDER BY id_arco DESC LIMIT 1"
      );
      if (arcRows && arcRows.length > 0) {
        const a = arcRows[0];
        activeArc = { id_arco: a.id_arco, nombre: a.nombre, color_hex: a.color_hex, dias: arcElapsedDays(a), arc: a };
      }

      // --- Arcanos equipados (slots activos) + tiempo de bloqueo ---
      const slotsRow: any = await db.getFirstAsync(
        'SELECT slots_desbloqueados FROM jugadores WHERE id_jugador = ?',
        [playerId]
      );
      const slotsTotal = slotsRow?.slots_desbloqueados ?? 1;
      const equipRows: any[] = await db.getAllAsync(
        `SELECT s.numero_slot, s.id_arcano,
                date(s.fecha_equipado, ?) as bloqueado_hasta,
                date('now','localtime') as hoy,
                a.nombre_arcano, a.simbolo, a.stat_asociado
           FROM jugador_arcanos_slots s
           JOIN arcanos a ON a.id_arcano = s.id_arcano
          WHERE s.id_jugador = ?
          ORDER BY s.numero_slot ASC`,
        [`+${ARCANA_LOCK_DAYS} days`, playerId]
      );
      const arcanaSlots: HomeArcanaSlot[] = (equipRows || []).map((r) => {
        const locked = r.hoy < r.bloqueado_hasta;
        return {
          slot: r.numero_slot,
          id_arcano: r.id_arcano,
          nombre: r.nombre_arcano,
          rom: r.simbolo,
          statEs: r.stat_asociado,
          color: arcanaColor(r.id_arcano),
          locked,
          diasRestantes: locked ? daysUntil(r.bloqueado_hasta) : 0,
        };
      });

      // --- Finanzas: balance historico + gasto del mes ---
      // Ambos van NETOS de liquidaciones, igual que Finanzas y el Desglose: si
      // pagaste 300 y te devolvieron 150, ese movimiento te costo 150. Sin este
      // descuento Home contradecia al resto de la app.
      const fin: any[] = await db.getAllAsync(
        `SELECT
            SUM(CASE WHEN f.tipo='INGRESO' THEN f.monto - COALESCE(l.cobrado,0) ELSE 0 END) as ingresos,
            SUM(CASE WHEN f.tipo='GASTO'   THEN f.monto - COALESCE(l.cobrado,0) ELSE 0 END) as gastos
         FROM finanzas f
         LEFT JOIN (SELECT id_finanza, SUM(monto_pagado) AS cobrado
                      FROM finanza_liquidaciones GROUP BY id_finanza) l
                ON l.id_finanza = f.id_finanza`
      );
      const ingresos = fin?.[0]?.ingresos || 0;
      const gastos = fin?.[0]?.gastos || 0;
      const finMes: any[] = await db.getAllAsync(
        `SELECT SUM(f.monto - COALESCE(l.cobrado,0)) as total
           FROM finanzas f
           LEFT JOIN (SELECT id_finanza, SUM(monto_pagado) AS cobrado
                        FROM finanza_liquidaciones GROUP BY id_finanza) l
                  ON l.id_finanza = f.id_finanza
          WHERE f.tipo='GASTO' AND date(f.fecha) >= date('now','localtime','start of month')`
      );
      const gastoMes = finMes?.[0]?.total || 0;

      const streak = await getCurrentStreak(playerId);

      setData({
        streak,
        today: { total: hoy.length, done, pending },
        baseStats,
        activeArc,
        finanzas: { balance: ingresos - gastos, gastoMes },
        arcanaSlots,
        slotsTotal,
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
