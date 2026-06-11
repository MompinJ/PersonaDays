import type { StatKey } from '../components/Stats/stats';
import { MissionType } from '../types';

// Fuente de verdad de la LOGICA de arcanos. La frase en la tabla `arcanos`
// (efecto_descripcion) es solo para mostrarla al jugador; el efecto real que
// se calcula vive aqui como datos. Cada arcano es una lista de reglas y un
// solo pipeline (computeXPGain) las evalua. Sumar un arcano = agregar una fila.

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

// El id del arcano coincide con su rango (0 = El Loco ... 21 = El Mundo).
export type ArcanaCondition =
  | { kind: 'always' }
  | { kind: 'stat'; stat: StatKey }
  | { kind: 'difficulty'; level: Difficulty }
  | { kind: 'missionType'; type: MissionType }
  | { kind: 'streak'; min: number };

export interface EffectRule {
  when: ArcanaCondition;
  pct: number; // porcentaje aditivo; puede ser negativo (El Diablo)
}

// Reglas por id_arcano. Stacking ADITIVO entre arcanos equipados.
export const ARCANA_EFFECTS: Record<number, EffectRule[]> = {
  0:  [{ when: { kind: 'always' }, pct: 2 }],
  1:  [{ when: { kind: 'difficulty', level: 'MEDIUM' }, pct: 10 }],
  2:  [{ when: { kind: 'stat', stat: 'conocimiento' }, pct: 10 }, { when: { kind: 'stat', stat: 'gentileza' }, pct: 5 }],
  3:  [{ when: { kind: 'stat', stat: 'gentileza' }, pct: 15 }],
  4:  [{ when: { kind: 'missionType', type: MissionType.ARCO }, pct: 15 }],
  5:  [{ when: { kind: 'stat', stat: 'conocimiento' }, pct: 15 }],
  6:  [{ when: { kind: 'stat', stat: 'carisma' }, pct: 15 }],
  7:  [{ when: { kind: 'streak', min: 3 }, pct: 5 }],
  8:  [{ when: { kind: 'missionType', type: MissionType.DIARIA }, pct: 5 }],
  9:  [{ when: { kind: 'missionType', type: MissionType.SEMANAL }, pct: 10 }],
  10: [{ when: { kind: 'missionType', type: MissionType.EXTRA }, pct: 30 }],
  11: [{ when: { kind: 'difficulty', level: 'HARD' }, pct: 15 }],
  12: [{ when: { kind: 'stat', stat: 'destreza' }, pct: 7 }, { when: { kind: 'stat', stat: 'gentileza' }, pct: 7 }],
  13: [{ when: { kind: 'stat', stat: 'coraje' }, pct: 15 }],
  14: [{ when: { kind: 'stat', stat: 'gentileza' }, pct: 10 }, { when: { kind: 'stat', stat: 'carisma' }, pct: 5 }],
  15: [{ when: { kind: 'missionType', type: MissionType.SEMANAL }, pct: 30 }, { when: { kind: 'missionType', type: MissionType.DIARIA }, pct: -15 }],
  16: [{ when: { kind: 'difficulty', level: 'EASY' }, pct: 5 }],
  17: [{ when: { kind: 'always' }, pct: 2.5 }],
  18: [{ when: { kind: 'stat', stat: 'gentileza' }, pct: 5 }, { when: { kind: 'stat', stat: 'destreza' }, pct: 5 }, { when: { kind: 'stat', stat: 'coraje' }, pct: 5 }],
  19: [{ when: { kind: 'stat', stat: 'carisma' }, pct: 5 }, { when: { kind: 'stat', stat: 'conocimiento' }, pct: 5 }, { when: { kind: 'stat', stat: 'coraje' }, pct: 5 }],
  20: [{ when: { kind: 'stat', stat: 'gentileza' }, pct: 5 }, { when: { kind: 'stat', stat: 'conocimiento' }, pct: 5 }, { when: { kind: 'stat', stat: 'carisma' }, pct: 5 }],
  21: [{ when: { kind: 'always' }, pct: 8 }], // El Mundo: capstone, mejor todoterreno
};

// --- Economia (constantes tuneables en un solo sitio) ---
export const MAX_SLOTS = 3;
export const ARCANA_LOCK_DAYS = 3; // bloqueo de commitment al equipar
export const SLOT_PRICES: Record<number, number> = { 2: 25000, 3: 75000 };

// rango = id_arcano (0..21). Curva de desbloqueo APLANADA para que sea
// alcanzable (nivel_jugador = suma de niveles de stats / 5, asi que pide
// promediar ese nivel en tus stats):
//   El Loco(0)=1, El Mago(1)=2, Fortuna(X)=10, El Mundo(XXI)=20.
export const arcanaUnlockLevel = (rank: number): number => 1 + Math.round(rank * 0.9);
export const arcanaPrice = (rank: number): number => 5000 + rank * 2500;

// Normaliza el nombre de un stat de la BD a su StatKey (sin acentos, minusculas).
// Mirror ligero de resolveStatKey, aqui para no importar la UI de stats (SVG).
const STAT_KEYS: StatKey[] = ['conocimiento', 'coraje', 'destreza', 'gentileza', 'carisma'];
export const statKeyFromName = (nombre?: string | null): StatKey | null => {
  if (!nombre) return null;
  const n = nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  return (STAT_KEYS as string[]).includes(n) ? (n as StatKey) : null;
};

// --- Pipeline de calculo ---
export interface XPContext {
  statKey: StatKey | null; // stat impactado por la mision (null si es custom/no base)
  difficulty: Difficulty;
  missionType: string; // valor de MissionType
  streak: number;
}

const matches = (c: ArcanaCondition, ctx: XPContext): boolean => {
  switch (c.kind) {
    case 'always': return true;
    case 'stat': return ctx.statKey === c.stat;
    case 'difficulty': return ctx.difficulty === c.level;
    case 'missionType': return ctx.missionType === c.type;
    case 'streak': return ctx.streak >= c.min;
  }
};

/**
 * Suma de porcentajes de todas las reglas (de los arcanos equipados) que
 * matchean el contexto. Aditivo. Puede ser negativo.
 */
export const totalBonusPct = (ctx: XPContext, equippedArcanaIds: number[]): number => {
  let pct = 0;
  for (const id of equippedArcanaIds) {
    const rules = ARCANA_EFFECTS[id];
    if (!rules) continue;
    for (const r of rules) if (matches(r.when, ctx)) pct += r.pct;
  }
  return pct;
};

/**
 * XP final tras aplicar el bonus aditivo de los arcanos equipados.
 * Redondea al entero. Nunca baja de 0 (por si El Diablo deja un neto negativo).
 */
export const computeXPGain = (baseXP: number, ctx: XPContext, equippedArcanaIds: number[]): number => {
  const pct = totalBonusPct(ctx, equippedArcanaIds);
  return Math.max(0, Math.round(baseXP * (1 + pct / 100)));
};
