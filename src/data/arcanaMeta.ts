// arcanaMeta.ts — metadata VISUAL de los 22 arcanos que NO vive en la tabla
// `arcanos` (esa tiene simbolo/nombre/stat_asociado/efecto_descripcion). Aqui
// solo el color jewel propio de cada carta, el nombre EN (referencia tarot) y
// la linea de flavor del modal de detalle. El id = rango (0..21).

export interface ArcanaVisual {
  color: string;  // jewel-tone propio de la carta (regla de dualidad: contenido = su color)
  en: string;     // nombre EN (referencia tarot/Persona)
  flavor: string; // esencia mistica (solo modal de detalle)
}

export const ARCANA_META: Record<number, ArcanaVisual> = {
  0:  { color: '#E9D27A', en: 'THE FOOL',         flavor: 'Infinitas posibilidades, cero ataduras.' },
  1:  { color: '#9B6BE0', en: 'THE MAGICIAN',     flavor: 'La voluntad que da forma a lo real.' },
  2:  { color: '#7FB2E8', en: 'THE PRIESTESS',    flavor: 'El saber oculto tras el velo.' },
  3:  { color: '#5FBF98', en: 'THE EMPRESS',      flavor: 'Abundancia que nutre y florece.' },
  4:  { color: '#D5564B', en: 'THE EMPEROR',      flavor: 'Estructura, mando y dominio.' },
  5:  { color: '#D8B24A', en: 'THE HIEROPHANT',   flavor: 'La tradición que guía el camino.' },
  6:  { color: '#EC93B6', en: 'THE LOVERS',       flavor: 'La elección que une dos destinos.' },
  7:  { color: '#6E92CC', en: 'THE CHARIOT',      flavor: 'Avanza; la victoria sigue al impulso.' },
  8:  { color: '#3FB0A6', en: 'JUSTICE',          flavor: 'Equilibrio exacto de causa y efecto.' },
  9:  { color: '#B6A06A', en: 'THE HERMIT',       flavor: 'En el silencio se halla la verdad.' },
  10: { color: '#E0BC4E', en: 'WHEEL OF FORTUNE', flavor: 'La rueda gira para quien se atreve.' },
  11: { color: '#E08A3C', en: 'STRENGTH',         flavor: 'Fuerza serena que doma a la bestia.' },
  12: { color: '#54C4BC', en: 'THE HANGED MAN',   flavor: 'Rendirse para ver desde otro ángulo.' },
  13: { color: '#C7CDD4', en: 'DEATH',            flavor: 'Todo final es una transformación.' },
  14: { color: '#8FCFD4', en: 'TEMPERANCE',       flavor: 'La mezcla justa que armoniza.' },
  15: { color: '#B23A60', en: 'THE DEVIL',        flavor: 'Poder atado a un precio.' },
  16: { color: '#E25A38', en: 'THE TOWER',        flavor: 'Lo que cae deja sitio a lo nuevo.' },
  17: { color: '#5FCDE6', en: 'THE STAR',         flavor: 'Esperanza que nunca se apaga.' },
  18: { color: '#A99BD8', en: 'THE MOON',         flavor: 'Bajo la luna, lo incierto revela.' },
  19: { color: '#F0B43E', en: 'THE SUN',          flavor: 'La claridad que todo lo ilumina.' },
  20: { color: '#B07EE0', en: 'JUDGEMENT',        flavor: 'El llamado que despierta y renueva.' },
  21: { color: '#D9C66A', en: 'THE WORLD',        flavor: 'El ciclo completo. Todo converge.' },
};

export const arcanaColor = (id: number): string => ARCANA_META[id]?.color ?? '#D9B24A';

// Estado visual de una carta POSEIDA (loadout). No incluye shop/level: esos
// viven en la tienda, no en la coleccion.
export type ArcanaCardState = 'active' | 'locked' | 'available' | 'cooldown';

// Carta lista para pintar: une la fila de la tabla `arcanos` (rom/name/stat/
// efecto), la metadata visual (color/en/flavor) y el estado del overview.
export interface ArcanaCard {
  id: number;
  rom: string;          // numeral romano (simbolo)
  name: string;         // nombre ES (nombre_arcano)
  en: string;
  statEs: string;       // stat_asociado tal cual ('Conocimiento', 'Comodín', 'Todos')
  efecto: string;       // efecto_descripcion (frase a mostrar)
  flavor: string;
  color: string;        // jewel
  state: ArcanaCardState;
  slot: number | null;
  bloqueadoHasta: string | null;
  disponibleDesde: string | null;
}

export interface ArcanaOverviewItem {
  id_arcano: number;
  equipped: boolean;
  slot: number | null;
  locked: boolean;
  bloqueadoHasta: string | null;
  enCooldown: boolean;
  disponibleDesde: string | null;
}

/** Deriva el estado visual a partir del overview del servicio. */
export const deriveArcanaState = (o: ArcanaOverviewItem): ArcanaCardState => {
  if (o.equipped) return o.locked ? 'locked' : 'active';
  if (o.enCooldown) return 'cooldown';
  return 'available';
};

// Formatea una fecha 'yyyy-mm-dd' a "lunes 15 jun" (es). Devuelve '' si no hay.
const DOW = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MON = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const formatArcanaDate = (iso: string | null): string => {
  if (!iso) return '';
  const parts = String(iso).slice(0, 10).split('-').map((n) => parseInt(n, 10));
  if (parts.length < 3 || parts.some(isNaN)) return String(iso);
  const [y, m, d] = parts;
  const dt = new Date(y, m - 1, d);
  return `${DOW[dt.getDay()]} ${d} ${MON[m - 1]}`;
};

// Dias restantes (>=0) desde hoy hasta una fecha 'yyyy-mm-dd'.
export const daysUntil = (iso: string | null): number => {
  if (!iso) return 0;
  const parts = String(iso).slice(0, 10).split('-').map((n) => parseInt(n, 10));
  if (parts.length < 3 || parts.some(isNaN)) return 0;
  const target = new Date(parts[0], parts[1] - 1, parts[2]).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.max(0, Math.round((target - today) / 86400000));
};
