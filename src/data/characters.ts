import { CharacterTheme } from '../types';
import { ImageSourcePropType } from 'react-native';

export interface CharacterProfile {
  id: CharacterTheme;
  name: string;
  quote: string;
  image: ImageSourcePropType;
  description: string;
}

// Placeholder image (replace with real art in assets/characters/)
const placeholder = require('../../assets/characters/placeholder.png');

export const CHARACTERS: CharacterProfile[] = [
  {
    id: CharacterTheme.MAKOTO,
    name: 'Makoto Yuki',
    quote: "Don't worry, I'm here.",
    image: placeholder,
    description: 'Liderazgo calmado y versátil.'
  },
  {
    id: CharacterTheme.KOTONE,
    name: 'Kotone Shiomi',
    quote: "Let's go!",
    image: placeholder,
    description: 'Energía positiva y determinación.'
  },
  {
    id: CharacterTheme.YUKARI,
    name: 'Yukari Takeba',
    quote: "I won't miss!",
    image: placeholder,
    description: 'Precisión y corazón.'
  },
  {
    id: CharacterTheme.AKIHIKO,
    name: 'Akihiko Sanada',
    quote: "I've been waiting for this!",
    image: placeholder,
    description: 'Fuerza y espíritu de lucha.'
  },
  {
    id: CharacterTheme.MITSURU,
    name: 'Mitsuru Kirijo',
    quote: 'Tres bien!',
    image: placeholder,
    description: 'Elegancia y ejecución perfecta.'
  },
  {
    id: CharacterTheme.AIGIS,
    name: 'Aigis',
    quote: 'I will protect you.',
    image: placeholder,
    description: 'Lealtad inquebrantable.'
  },
  {
    id: CharacterTheme.FUUKA,
    name: 'Fuuka Yamagishi',
    quote: "I'll be your support.",
    image: placeholder,
    description: 'Análisis y apoyo constante.'
  },
  {
    id: CharacterTheme.KEN,
    name: 'Ken Amada',
    quote: "I'll do my best!",
    image: placeholder,
    description: 'Potencial y justicia.'
  },
  {
    id: CharacterTheme.KOROMARU,
    name: 'Koromaru',
    quote: 'Arf!',
    image: placeholder,
    description: 'Valentía y lealtad canina.'
  },
  {
    id: CharacterTheme.SHINJIRO,
    name: 'Shinjiro Aragaki',
    quote: 'Tch. Fine.',
    image: placeholder,
    description: 'Resiliencia dura.'
  }
];
