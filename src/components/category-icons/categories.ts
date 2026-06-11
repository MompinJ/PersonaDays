// categories.ts — fuente unica de verdad de las 20 categorias de Finanzas.
// Conecta cada CategoryKey con su label y color. El glifo (inline SVG) vive en
// glyphPaths.ts y lo resuelve CategoryIcon por la misma key.
//
// El `key` mapea contra el campo `icono` de la tabla `financial_categories` en
// SQLite (= nombre del MaterialCommunityIcon original), asi que NO hay migracion
// de datos: el icono guardado sigue funcionando como key.

// Las keys = nombre del MaterialCommunityIcon original (sin cambios de datos).
export type CategoryKey =
  | 'food'
  | 'bus'
  | 'car'
  | 'cart'
  | 'shopping'
  | 'gamepad-variant'
  | 'movie'
  | 'home'
  | 'hospital-box'
  | 'school'
  | 'book-open-variant'
  | 'gift'
  | 'cash'
  | 'credit-card'
  | 'bank'
  | 'tools'
  | 'airplane'
  | 'paw'
  | 'tshirt-crew'
  | 'glass-cocktail'
  | 'dots-horizontal';

export interface CategoryMeta {
  key: CategoryKey;
  es: string;          // label sugerido en ES
  /** Color propio de la categoria (regla de dualidad: el contenido usa su
   *  color, no theme.primary). Es solo un DEFAULT — si el usuario eligio un
   *  color en la BD, ese gana. */
  color: string;
}

export const CATEGORIES: Record<CategoryKey, CategoryMeta> = {
  food:               { key: 'food',               es: 'Comida',           color: '#FF6B3D' },
  bus:                { key: 'bus',                es: 'Transporte',       color: '#3D8BFF' },
  car:                { key: 'car',                es: 'Auto / Gasolina',  color: '#21D4E6' },
  cart:               { key: 'cart',               es: 'Compras',          color: '#FFB13D' },
  shopping:           { key: 'shopping',           es: 'Bolsas',           color: '#FF5BA0' },
  'gamepad-variant':  { key: 'gamepad-variant',    es: 'Videojuegos',      color: '#9B7BFF' },
  movie:              { key: 'movie',              es: 'Entretenimiento',  color: '#FF4D6D' },
  home:               { key: 'home',               es: 'Hogar / Renta',    color: '#4ECB71' },
  'hospital-box':     { key: 'hospital-box',       es: 'Salud',            color: '#FF3B5C' },
  school:             { key: 'school',             es: 'Educación',        color: '#FFD23D' },
  'book-open-variant':{ key: 'book-open-variant',  es: 'Libros / Estudio', color: '#5AC8FF' },
  gift:               { key: 'gift',               es: 'Regalos',          color: '#FF7AD9' },
  cash:               { key: 'cash',               es: 'Efectivo',         color: '#4ECB71' },
  'credit-card':      { key: 'credit-card',        es: 'Tarjeta',          color: '#6E8BFF' },
  bank:               { key: 'bank',               es: 'Banco',            color: '#21D4E6' },
  tools:              { key: 'tools',              es: 'Herramientas',     color: '#AEB7C8' },
  airplane:           { key: 'airplane',           es: 'Viajes',           color: '#3DD6C0' },
  paw:                { key: 'paw',                es: 'Mascotas',         color: '#FF9B3D' },
  'tshirt-crew':      { key: 'tshirt-crew',        es: 'Ropa',             color: '#B07BFF' },
  'glass-cocktail':   { key: 'glass-cocktail',     es: 'Bebidas / Salidas',color: '#FF5BA0' },
  'dots-horizontal':  { key: 'dots-horizontal',    es: 'Otros',            color: '#AEB7C8' },
};

// Orden canonico (= el de la tabla original de categorias).
export const CATEGORY_ORDER: CategoryKey[] = [
  'food', 'bus', 'car', 'cart', 'shopping', 'gamepad-variant', 'movie',
  'home', 'hospital-box', 'school', 'book-open-variant', 'gift', 'cash',
  'credit-card', 'bank', 'tools', 'airplane', 'paw', 'tshirt-crew',
  'glass-cocktail', 'dots-horizontal',
];

/** Resuelve una key contra su meta, con fallback seguro a `cash`. */
export function getCategory(key: string): CategoryMeta {
  return CATEGORIES[key as CategoryKey] ?? CATEGORIES.cash;
}

/** True si la key es una categoria conocida (tiene glifo P3R propio). */
export function isCategoryKey(key: string | null | undefined): key is CategoryKey {
  return !!key && key in CATEGORIES;
}
