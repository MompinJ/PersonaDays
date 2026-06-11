// CategoryIcon.tsx — icono de una categoría de Finanzas.
//
// Forma = identidad de la app: viene de la dirección "Shard" (un corte
// diagonal). Por defecto se inclina 12° (skewX) para el look P3R.
// Color = identidad del contenido: si no pasas `color`, usa el color propio
// de la categoría (regla de dualidad). El SVG usa currentColor.
import React from 'react';
import { View } from 'react-native';
import { CATEGORIES, type CategoryKey } from './categories';

export interface CategoryIconProps {
  category: CategoryKey;
  size?: number;
  /** Color del glifo. Por defecto = el color propio de la categoría.
   *  Pasa theme.primary si quieres teñirlo con el protagonista activo. */
  color?: string;
  /** Inclinación en grados. 12 = "Shard inclinado". 0 = derecho (listas
   *  densas, tab bar). */
  skew?: number;
}

export function CategoryIcon({ category, size = 24, color, skew = 12 }: CategoryIconProps) {
  const meta = CATEGORIES[category];
  const Icon = meta.Icon;
  const glyph = <Icon width={size} height={size} color={color ?? meta.color} />;
  if (!skew) return glyph;
  // El contenedor lleva la inclinación; el glifo nace derecho a 0°.
  return <View style={{ transform: [{ skewX: `${-skew}deg` }] }}>{glyph}</View>;
}

export default CategoryIcon;
