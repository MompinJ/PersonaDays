// StatIcon.tsx — icono de un atributo social.
//
// Forma = identidad de la app: viene de la dirección "Shard" (un corte
// diagonal). Por defecto se inclina 12° (skewX) para el look P3R elegido.
// Color = identidad del personaje: pásalo SIEMPRE desde el tema
// (`theme.primary`, el color de categoría, etc.). El SVG usa currentColor.
import React from 'react';
import { View } from 'react-native';
import { STATS, type StatKey } from './stats';

export interface StatIconProps {
  stat: StatKey;
  size?: number;
  /** Color del glifo. Pásalo desde el tema (currentColor por defecto). */
  color?: string;
  /** Inclinación en grados. 12 = look "Shard inclinado". 0 = derecho (tab bar, listas densas). */
  skew?: number;
}

export function StatIcon({ stat, size = 24, color = 'currentColor', skew = 12 }: StatIconProps) {
  const Icon = STATS[stat].Icon;
  const glyph = <Icon width={size} height={size} color={color} />;
  if (!skew) return glyph;
  // El contenedor lleva la inclinación; el glifo nace derecho a 0°.
  return <View style={{ transform: [{ skewX: `${-skew}deg` }] }}>{glyph}</View>;
}

export default StatIcon;
