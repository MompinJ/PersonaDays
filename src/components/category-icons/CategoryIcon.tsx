// CategoryIcon.tsx — icono de una categoria de Finanzas (variante "Shard" P3R).
//
// Glifo INLINE con react-native-svg (misma tecnica que StatGlyphs/TabGlyphs: un
// <Mask> con Rect negro de base + Paths (#fff pinta, #000 recorta) y un Rect
// final tenido con `color` via el mask). NO usa svg-transformer (los glifos del
// proyecto son componentes inline).
//
// Forma = identidad de la app (corte diagonal Shard, ya incluido en los paths).
// Color = identidad del contenido: si no pasas `color`, usa el color propio de
// la categoria (regla de dualidad). Pasa theme.primary para tenirlo con el
// protagonista activo.
import React, { useRef } from 'react';
import { View } from 'react-native';
import Svg, { Mask, Rect, Path } from 'react-native-svg';
import { CATEGORIES, type CategoryKey } from './categories';
import { CATEGORY_GLYPHS } from './glyphPaths';

// Contador de modulo para ids de mask unicos (evita colisiones entre instancias).
let UID = 0;

export interface CategoryIconProps {
  category: CategoryKey;
  size?: number;
  /** Color del glifo. Por defecto = el color propio de la categoria.
   *  Pasa theme.primary si quieres tenirlo con el protagonista activo. */
  color?: string;
  /** Inclinacion en grados. 12 = "Shard inclinado". 0 = derecho (listas
   *  densas, tab bar). */
  skew?: number;
}

export function CategoryIcon({ category, size = 24, color, skew = 12 }: CategoryIconProps) {
  const meta = CATEGORIES[category];
  const tint = color ?? meta.color;
  const paths = CATEGORY_GLYPHS[category];
  const idRef = useRef<string | null>(null);
  if (idRef.current === null) idRef.current = `cat_${category.replace(/[^a-z]/gi, '')}_${++UID}`;
  const maskId = idRef.current;

  const glyph = (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="48" height="48">
        <Rect width="48" height="48" fill="#000" />
        {paths.map(([d, paint], i) => (
          <Path key={i} d={d} fill={paint ? '#fff' : '#000'} />
        ))}
      </Mask>
      <Rect width="48" height="48" fill={tint} mask={`url(#${maskId})`} />
    </Svg>
  );

  if (!skew) return glyph;
  // El contenedor lleva la inclinacion; el glifo nace derecho a 0.
  return <View style={{ transform: [{ skewX: `${-skew}deg` }] }}>{glyph}</View>;
}

export default CategoryIcon;
