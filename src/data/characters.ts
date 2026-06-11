import { CharacterTheme } from '../types';
import { ImageSourcePropType } from 'react-native';

export interface CharacterProfile {
  id: CharacterTheme;
  name: string;            // nombre completo (compat: ProfileScreen)
  quote: string;
  image: ImageSourcePropType;
  description: string;
  // --- Campos para la carta de seleccion P3R (Character Select) ---
  firstName: string;       // nombre grande de la carta (ej. 'MAKOTO')
  surname: string;         // apellido pequeno (ej. 'YUKI')
  kata: string;            // katakana (fondo gigante + tira vertical)
  arc: string;             // rol / unidad (NO es un arcano)
  tag: string;             // tagline del shard
  descriptor: string;      // descriptor de una linea
}

// Placeholder image (replace with real art in assets/characters/)
const placeholder = require('../../assets/characters/placeholder.png');

// Orden = orden de palettes.ts (Makoto, Kotone, Yukari, Akihiko, Mitsuru,
// Shinjiro, Ken, Koromaru, Fuuka, Junpei, Aigis).
export const CHARACTERS: CharacterProfile[] = [
  {
    id: CharacterTheme.MAKOTO,
    name: 'Makoto Yuki',
    quote: "Don't worry, I'm here.",
    image: placeholder,
    description: 'Liderazgo calmado y versátil.',
    firstName: 'MAKOTO', surname: 'YUKI', kata: 'マコト',
    arc: 'SEES · FIELD LEADER', tag: 'MEMENTO MORI', descriptor: 'WILD CARD',
  },
  {
    id: CharacterTheme.KOTONE,
    name: 'Kotone Shiomi',
    quote: "Let's go!",
    image: placeholder,
    description: 'Energía positiva y determinación.',
    firstName: 'KOTONE', surname: 'SHIOMI', kata: 'コトネ',
    arc: 'SEES · FIELD LEADER', tag: 'CARPE DIEM', descriptor: 'WILD CARD',
  },
  {
    id: CharacterTheme.YUKARI,
    name: 'Yukari Takeba',
    quote: "I won't miss!",
    image: placeholder,
    description: 'Precisión y corazón.',
    firstName: 'YUKARI', surname: 'TAKEBA', kata: 'ユカリ',
    arc: 'SEES · ARCHER', tag: "I WON'T LOSE", descriptor: 'PINK ARGUS',
  },
  {
    id: CharacterTheme.AKIHIKO,
    name: 'Akihiko Sanada',
    quote: "I've been waiting for this!",
    image: placeholder,
    description: 'Fuerza y espíritu de lucha.',
    firstName: 'AKIHIKO', surname: 'SANADA', kata: 'アキヒコ',
    arc: 'SEES · STRIKER', tag: 'BRING IT ON', descriptor: 'THE BOXER',
  },
  {
    id: CharacterTheme.MITSURU,
    name: 'Mitsuru Kirijo',
    quote: 'Trés bien!',
    image: placeholder,
    description: 'Elegancia y ejecución perfecta.',
    firstName: 'MITSURU', surname: 'KIRIJO', kata: 'ミツル',
    arc: 'SEES · COMMANDER', tag: 'EXECUTE', descriptor: 'THE HEIRESS',
  },
  {
    id: CharacterTheme.SHINJIRO,
    name: 'Shinjiro Aragaki',
    quote: 'Tch. Fine.',
    image: placeholder,
    description: 'Resiliencia dura.',
    firstName: 'SHINJIRO', surname: 'ARAGAKI', kata: 'シンジロウ',
    arc: 'SEES · VANGUARD', tag: 'NO REGRETS', descriptor: 'LONE WOLF',
  },
  {
    id: CharacterTheme.KEN,
    name: 'Ken Amada',
    quote: "I'll do my best!",
    image: placeholder,
    description: 'Potencial y justicia.',
    firstName: 'KEN', surname: 'AMADA', kata: 'ケン',
    arc: 'SEES · LANCER', tag: 'NOT A KID', descriptor: 'THE YOUNG LANCE',
  },
  {
    id: CharacterTheme.KOROMARU,
    name: 'Koromaru',
    quote: 'Arf!',
    image: placeholder,
    description: 'Valentía y lealtad canina.',
    firstName: 'KOROMARU', surname: 'SEES K-9', kata: 'コロマル',
    arc: 'SEES · SCOUT', tag: 'LOYAL TO THE END', descriptor: 'THE FAITHFUL',
  },
  {
    id: CharacterTheme.FUUKA,
    name: 'Fuuka Yamagishi',
    quote: "I'll be your support.",
    image: placeholder,
    description: 'Análisis y apoyo constante.',
    firstName: 'FUUKA', surname: 'YAMAGISHI', kata: 'フウカ',
    arc: 'SEES · NAVIGATOR', tag: 'I SEE EVERYTHING', descriptor: 'THE ORACLE',
  },
  {
    id: CharacterTheme.JUNPEI,
    name: 'Junpei Iori',
    quote: 'Bring it, big time!',
    image: placeholder,
    description: 'Corazón y agallas.',
    firstName: 'JUNPEI', surname: 'IORI', kata: 'ジュンペイ',
    arc: 'SEES · STRIKER', tag: 'BRING IT, BIG TIME', descriptor: 'ACE DEFECTIVE',
  },
  {
    id: CharacterTheme.AIGIS,
    name: 'Aigis',
    quote: 'I will protect you.',
    image: placeholder,
    description: 'Lealtad inquebrantable.',
    firstName: 'AIGIS', surname: '7TH UNIT', kata: 'アイギス',
    arc: 'SEES · GUARDIAN', tag: 'I WILL PROTECT YOU', descriptor: 'LAST ANDROID',
  },
];
