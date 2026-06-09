// stats.ts — fuente unica de verdad de los 5 atributos sociales.
// Conecta cada StatKey con su label e icono (componente react-native-svg).
import type React from 'react';
import type { SvgProps } from 'react-native-svg';

import {
  StatKnowledge,
  StatGuts,
  StatProficiency,
  StatKindness,
  StatCharm,
} from './StatGlyphs';

export type StatKey =
  | 'conocimiento'
  | 'coraje'
  | 'destreza'
  | 'gentileza'
  | 'carisma';

export interface StatMeta {
  key: StatKey;
  es: string; // label ES en MAYUSCULAS
  en: string; // label EN (referencia Persona)
  Icon: React.FC<SvgProps>;
}

export const STATS: Record<StatKey, StatMeta> = {
  conocimiento: { key: 'conocimiento', es: 'CONOCIMIENTO', en: 'KNOWLEDGE',   Icon: StatKnowledge },
  coraje:       { key: 'coraje',       es: 'CORAJE',       en: 'GUTS',        Icon: StatGuts },
  destreza:     { key: 'destreza',     es: 'DESTREZA',     en: 'PROFICIENCY', Icon: StatProficiency },
  gentileza:    { key: 'gentileza',    es: 'GENTILEZA',    en: 'KINDNESS',    Icon: StatKindness },
  carisma:      { key: 'carisma',      es: 'CARISMA',      en: 'CHARM',       Icon: StatCharm },
};

// Orden canonico del pentagono (Knowledge -> Guts -> Proficiency -> Kindness -> Charm).
export const STAT_ORDER: StatKey[] = [
  'conocimiento',
  'coraje',
  'destreza',
  'gentileza',
  'carisma',
];

// Normaliza un nombre (minusculas, sin acentos) para mapear contra StatKey.
const DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g');
const normalize = (s: string) =>
  s.normalize('NFD').replace(DIACRITICS, '').toLowerCase().trim();

// Resuelve la StatKey a partir del nombre del stat en la DB.
// Devuelve null si no es uno de los 5 atributos base (p.ej. un habito custom).
export const resolveStatKey = (nombre?: string | null): StatKey | null => {
  if (!nombre) return null;
  const n = normalize(nombre);
  return (n in STATS) ? (n as StatKey) : null;
};
