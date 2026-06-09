// stats.ts — fuente única de verdad de los 5 atributos sociales.
// Conecta cada StatKey con su label e icono SVG (dirección "Shard").
//
// El `key` está pensado para mapear contra el id de stat en SQLite
// (tabla `stats` / `jugador_stat`). Ajusta los valores a tus ids reales.
import type React from 'react';
import type { SvgProps } from 'react-native-svg';

import StatKnowledge from './icons/StatKnowledge.svg';
import StatGuts from './icons/StatGuts.svg';
import StatProficiency from './icons/StatProficiency.svg';
import StatKindness from './icons/StatKindness.svg';
import StatCharm from './icons/StatCharm.svg';

export type StatKey =
  | 'conocimiento'
  | 'coraje'
  | 'destreza'
  | 'gentileza'
  | 'carisma';

export interface StatMeta {
  key: StatKey;
  es: string; // label ES en MAYÚSCULAS
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

// Orden canónico del pentágono (Knowledge → Guts → Proficiency → Kindness → Charm).
export const STAT_ORDER: StatKey[] = [
  'conocimiento',
  'coraje',
  'destreza',
  'gentileza',
  'carisma',
];
