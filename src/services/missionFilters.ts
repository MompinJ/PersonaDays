// Logica compartida de "misiones de hoy" para la vista TODAS (Requests) y el
// contador de la Home. Antes el filtro de "hoy" vivia duplicado en MissionsScreen
// (solo DIARIA) y en useHomeSummary; aqui hay una sola fuente de verdad para que
// la lista TODAS y el contador de Home siempre coincidan.
import { MissionType, MissionFrequency } from '../types';

// Indica si una mision esta "programada para hoy" segun su tipo:
// - DIARIA / SEMANAL: por dias_repeticion. Si tiene dias marcados, solo cuenta si
//   hoy esta incluido. Si no tiene dias, una diaria EVERY_DAY o una semanal sin
//   dia fijo se considera disponible hoy.
// - ARCO / EXTRA / BOSS: siempre cuentan (no son fechas fijas; pueden hacerse hoy).
export const isMissionScheduledToday = (m: any, todayIndex: number): boolean => {
  const tipo = m?.tipo;
  if (tipo === MissionType.DIARIA || tipo === MissionType.SEMANAL) {
    const diasRaw = m?.dias_repeticion;
    if (diasRaw && String(diasRaw).trim().length > 0) {
      const dias = String(diasRaw).split(',').map((d: string) => d.trim()).filter(Boolean);
      return dias.includes(String(todayIndex));
    }
    // Sin dias explicitos: diaria cada-dia, o semanal sin dia fijo -> disponible hoy.
    if (tipo === MissionType.DIARIA) {
      return m?.frecuencia_repeticion === MissionFrequency.EVERY_DAY || !diasRaw || String(diasRaw).trim() === '';
    }
    return true; // SEMANAL sin dia fijo
  }
  // ARCO, EXTRA, BOSS
  return true;
};

// Las EXTRA y BOSS van al final de la lista (no se hacen necesariamente hoy).
const isDeferredType = (tipo: any) => tipo === MissionType.EXTRA || tipo === MissionType.BOSS;

// Orden de la vista TODAS: primero las del dia por horario (las que tienen hora,
// ascendente; luego las sin hora) y al final las EXTRA y BOSS.
export const compareTodayMissions = (a: any, b: any): number => {
  const da = isDeferredType(a?.tipo) ? 1 : 0;
  const dbb = isDeferredType(b?.tipo) ? 1 : 0;
  if (da !== dbb) return da - dbb;

  const ha = a?.hora_mision ? 0 : 1;
  const hb = b?.hora_mision ? 0 : 1;
  if (ha !== hb) return ha - hb;

  if (a?.hora_mision && b?.hora_mision && a.hora_mision !== b.hora_mision) {
    return a.hora_mision < b.hora_mision ? -1 : 1;
  }
  // Empate: las mas recientes primero (mismo criterio que el resto de la app).
  const fa = a?.fecha_creacion || '';
  const fb = b?.fecha_creacion || '';
  if (fa !== fb) return fa < fb ? 1 : -1;
  return 0;
};
