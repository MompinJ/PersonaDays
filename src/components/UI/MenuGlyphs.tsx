// MenuGlyphs.tsx — iconos del menu del Telefono (calendario, arcos, notas,
// galeria, correo, ajustes) como componentes react-native-svg. Misma tecnica
// Mask que TabGlyphs/StatGlyphs. Color = tema. active anade el corte Shard.
import React from 'react';
import Svg, { Mask, Rect, Path, SvgProps } from 'react-native-svg';

const SHARD = 'M40,-2 L46.5,-2 L11,50 L4.5,50 Z';
type Layer = ['w' | 'b', string];

const MENU: Record<string, Layer[]> = {
  calendario: [
    ['w', 'M7,11 L41,11 L41,42 L7,42 Z'],
    ['b', 'M10.5,21 L37.5,21 L37.5,38.5 L10.5,38.5 Z'],
    ['w', 'M14,5.5 L18,5.5 L18,13.5 L14,13.5 Z'],
    ['w', 'M30,5.5 L34,5.5 L34,13.5 L30,13.5 Z'],
    ['w', 'M30.5,30.0 L24.0,36.5 L17.5,30.0 L24.0,23.5 Z'],
  ],
  arcos: [
    ['w', 'M8,42 L8,26 L11,19 L17,13 L24,11 L31,13 L37,19 L40,26 L40,42 L32,42 L32,27 L30,22 L26,18 L24,17 L22,18 L18,22 L16,27 L16,42 Z'],
    ['w', 'M24,2 L25.6,5.4 L29,7 L25.6,8.6 L24,12 L22.4,8.6 L19,7 L22.4,5.4 Z'],
  ],
  notas: [
    ['w', 'M10,7 L31,7 L40,16 L40,42 L10,42 Z'],
    ['b', 'M31,7 L40,16 L31,16 Z'],
    ['b', 'M15,22 L33,22 L33,24.6 L15,24.6 Z'],
    ['b', 'M15,28 L33,28 L33,30.6 L15,30.6 Z'],
    ['b', 'M15,34 L27,34 L27,36.6 L15,36.6 Z'],
  ],
  galeria: [
    ['w', 'M7,10 L41,10 L41,38 L7,38 Z'],
    ['b', 'M10,13 L38,13 L38,35 L10,35 Z'],
    ['w', 'M11,35 L20,23 L25,29 L31,20 L37,35 Z'],
    ['w', 'M16,15 L16.96,17.04 L19,18 L16.96,18.96 L16,21 L15.04,18.96 L13,18 L15.04,17.04 Z'],
  ],
  correo: [
    ['w', 'M7,13 L41,13 L41,35 L7,35 Z'],
    ['b', 'M7,13 L24,27 L41,13 L41,16.8 L24,30.8 L7,16.8 Z'],
  ],
  ajustes: [
    ['w', 'M10.75,9 L13.25,9 L13.25,39 L10.75,39 Z'],
    ['w', 'M22.75,9 L25.25,9 L25.25,39 L22.75,39 Z'],
    ['w', 'M34.75,9 L37.25,9 L37.25,39 L34.75,39 Z'],
    ['w', 'M18.5,16.0 L12.0,22.5 L5.5,16.0 L12.0,9.5 Z'],
    ['w', 'M30.5,30.0 L24.0,36.5 L17.5,30.0 L24.0,23.5 Z'],
    ['w', 'M42.5,22.0 L36.0,28.5 L29.5,22.0 L36.0,15.5 Z'],
  ],
};

export type MenuKey = keyof typeof MENU;

interface MenuGlyphProps extends SvgProps {
  name: string;
  size?: number;
  color?: string;
  active?: boolean;
}

let UID = 0;

export const MenuGlyph = ({ name, size = 38, color = 'currentColor', active = false, ...rest }: MenuGlyphProps) => {
  const base = MENU[name];
  if (!base) return null;
  const layers: Layer[] = active ? [...base, ['b', SHARD]] : base;
  const maskId = `menu_${name}_${active ? 'a' : 'i'}_${UID++}`;
  return (
    <Svg viewBox="0 0 48 48" width={size} height={size} color={color} {...rest}>
      <Mask id={maskId} maskUnits="userSpaceOnUse" x={0} y={0} width={48} height={48}>
        <Rect width={48} height={48} fill="#000" />
        {layers.map((l, i) => (
          <Path key={i} d={l[1]} fill={l[0] === 'w' ? '#fff' : '#000'} />
        ))}
      </Mask>
      <Rect width={48} height={48} fill="currentColor" mask={`url(#${maskId})`} />
    </Svg>
  );
};

export default MenuGlyph;
