// StatIcon.tsx — icono de un atributo social.
//
// Forma = identidad de la app (direccion "Shard"). Por defecto se inclina
// 12 grados (skewX). Color = identidad del personaje: pasalo SIEMPRE desde
// el tema (`theme.primary`, color de categoria, etc.). El glifo usa currentColor.
import React from 'react';
import { View } from 'react-native';
import { STATS, type StatKey } from './stats';

export interface StatIconProps {
  stat: StatKey;
  size?: number;
  /** Color del glifo. Pasalo desde el tema (currentColor por defecto). */
  color?: string;
  /** Inclinacion en grados. 12 = look "Shard inclinado". 0 = derecho (tab bar, listas densas). */
  skew?: number;
}

export function StatIcon({ stat, size = 24, color = 'currentColor', skew = 12 }: StatIconProps) {
  const Icon = STATS[stat].Icon;
  const glyph = <Icon width={size} height={size} color={color} />;
  if (!skew) return glyph;
  // El contenedor lleva la inclinacion; el glifo nace derecho a 0 grados.
  return <View style={{ transform: [{ skewX: `${-skew}deg` }] }}>{glyph}</View>;
}

export default StatIcon;
