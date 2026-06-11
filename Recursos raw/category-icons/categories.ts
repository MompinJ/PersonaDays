// categories.ts — fuente única de verdad de las 20 categorías de Finanzas.
// Conecta cada CategoryKey con su label, color e icono SVG.
//
// El `key` está pensado para mapear contra el id/slug de categoría en SQLite
// (tabla `categorias`). Coincide con el nombre del MaterialCommunityIcon
// original, así que migrar datos existentes es directo.
import type React from 'react';
import type { SvgProps } from 'react-native-svg';

// Dirección "Shard" (un corte diagonal P3R) — la recomendada para la app.
// Si prefieres el sólido limpio, cambia la carpeta a ./icons/monolito.
import Food from './icons/shard/food.svg';
import Bus from './icons/shard/bus.svg';
import Car from './icons/shard/car.svg';
import Cart from './icons/shard/cart.svg';
import Shopping from './icons/shard/shopping.svg';
import Gamepad from './icons/shard/gamepad-variant.svg';
import Movie from './icons/shard/movie.svg';
import Home from './icons/shard/home.svg';
import Hospital from './icons/shard/hospital-box.svg';
import School from './icons/shard/school.svg';
import Book from './icons/shard/book-open-variant.svg';
import Gift from './icons/shard/gift.svg';
import Cash from './icons/shard/cash.svg';
import Card from './icons/shard/credit-card.svg';
import Bank from './icons/shard/bank.svg';
import Tools from './icons/shard/tools.svg';
import Airplane from './icons/shard/airplane.svg';
import Paw from './icons/shard/paw.svg';
import Tshirt from './icons/shard/tshirt-crew.svg';
import Cocktail from './icons/shard/glass-cocktail.svg';

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
  | 'glass-cocktail';

export interface CategoryMeta {
  key: CategoryKey;
  es: string;          // label sugerido en ES
  /** Color propio de la categoría (regla de dualidad: el contenido usa su
   *  color, no theme.primary). Es solo un DEFAULT — si el usuario eligió un
   *  color en la BD, ese gana. */
  color: string;
  Icon: React.FC<SvgProps>;
}

export const CATEGORIES: Record<CategoryKey, CategoryMeta> = {
  food:               { key: 'food',               es: 'Comida',          color: '#FF6B3D', Icon: Food },
  bus:                { key: 'bus',                es: 'Transporte',      color: '#3D8BFF', Icon: Bus },
  car:                { key: 'car',                es: 'Auto / Gasolina', color: '#21D4E6', Icon: Car },
  cart:               { key: 'cart',               es: 'Compras',         color: '#FFB13D', Icon: Cart },
  shopping:           { key: 'shopping',           es: 'Bolsas',          color: '#FF5BA0', Icon: Shopping },
  'gamepad-variant':  { key: 'gamepad-variant',    es: 'Videojuegos',     color: '#9B7BFF', Icon: Gamepad },
  movie:              { key: 'movie',              es: 'Entretenimiento', color: '#FF4D6D', Icon: Movie },
  home:               { key: 'home',               es: 'Hogar / Renta',   color: '#4ECB71', Icon: Home },
  'hospital-box':     { key: 'hospital-box',       es: 'Salud',           color: '#FF3B5C', Icon: Hospital },
  school:             { key: 'school',             es: 'Educación',       color: '#FFD23D', Icon: School },
  'book-open-variant':{ key: 'book-open-variant',  es: 'Libros / Estudio',color: '#5AC8FF', Icon: Book },
  gift:               { key: 'gift',               es: 'Regalos',         color: '#FF7AD9', Icon: Gift },
  cash:               { key: 'cash',               es: 'Efectivo',        color: '#4ECB71', Icon: Cash },
  'credit-card':      { key: 'credit-card',        es: 'Tarjeta',         color: '#6E8BFF', Icon: Card },
  bank:               { key: 'bank',               es: 'Banco',           color: '#21D4E6', Icon: Bank },
  tools:              { key: 'tools',              es: 'Herramientas',    color: '#AEB7C8', Icon: Tools },
  airplane:           { key: 'airplane',           es: 'Viajes',          color: '#3DD6C0', Icon: Airplane },
  paw:                { key: 'paw',                es: 'Mascotas',        color: '#FF9B3D', Icon: Paw },
  'tshirt-crew':      { key: 'tshirt-crew',        es: 'Ropa',            color: '#B07BFF', Icon: Tshirt },
  'glass-cocktail':   { key: 'glass-cocktail',     es: 'Bebidas / Salidas',color: '#FF5BA0', Icon: Cocktail },
};

// Orden canónico (= el de la tabla original de categorías).
export const CATEGORY_ORDER: CategoryKey[] = [
  'food', 'bus', 'car', 'cart', 'shopping', 'gamepad-variant', 'movie',
  'home', 'hospital-box', 'school', 'book-open-variant', 'gift', 'cash',
  'credit-card', 'bank', 'tools', 'airplane', 'paw', 'tshirt-crew',
  'glass-cocktail',
];

/** Resuelve una key contra el icono, con fallback seguro a `cash`. */
export function getCategory(key: string): CategoryMeta {
  return CATEGORIES[key as CategoryKey] ?? CATEGORIES.cash;
}
