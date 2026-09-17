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
  emporio: [
    ['w', 'M5,12 L43,12 L46,24 L2,24 Z'],
    ['w', 'M7,24 L41,24 L41,44 L7,44 Z'],
    ['b', 'M2,24 L8,24 L5,19 Z'],
    ['b', 'M8,24 L14.3,24 L11.1,19 Z'],
    ['b', 'M14.3,24 L20.6,24 L17.4,19 Z'],
    ['b', 'M20.6,24 L26.9,24 L23.7,19 Z'],
    ['b', 'M26.9,24 L33.1,24 L29.9,19 Z'],
    ['b', 'M33.1,24 L39.4,24 L36.2,19 Z'],
    ['b', 'M39.4,24 L46,24 L42.7,19 Z'],
    ['b', 'M22.5,12 L25.5,12 L25.5,24 L22.5,24 Z'],
    ['b', 'M19,31 L24,27 L29,31 L29,44 L19,44 Z'],
  ],
  tendencias: [
    ['w', 'M7,8 L9.5,8 L9.5,40 L7,40 Z'],        // eje Y
    ['w', 'M7,37.5 L41,37.5 L41,40 L7,40 Z'],     // eje X
    ['w', 'M13,28 L19,28 L19,37.5 L13,37.5 Z'],   // barra 1
    ['w', 'M22,21 L28,21 L28,37.5 L22,37.5 Z'],   // barra 2
    ['w', 'M31,13 L37,13 L37,37.5 L31,37.5 Z'],   // barra 3
  ],
  diario: [
    // Libreta con lomo anillado y un trazo de escritura dentro.
    ['w', 'M13,6 L40,6 L40,42 L13,42 Z'],
    ['b', 'M17,12 L36,12 L36,14.4 L17,14.4 Z'],
    ['b', 'M17,19 L36,19 L36,21.4 L17,21.4 Z'],
    ['b', 'M17,26 L30,26 L30,28.4 L17,28.4 Z'],
    ['w', 'M8,9 L12,9 L12,13 L8,13 Z'],
    ['w', 'M8,17 L12,17 L12,21 L8,21 Z'],
    ['w', 'M8,25 L12,25 L12,29 L8,29 Z'],
    ['w', 'M8,33 L12,33 L12,37 L8,37 Z'],
    ['w', 'M38,30 L44,36 L34,46 L28,40 Z'],
    ['b', 'M30.5,40.5 L33.5,43.5 L30,45 Z'],
  ],
  biblioteca: [
    // Pantalla con boton de play (anime) montada sobre un libro abierto (manga).
    ['w', 'M6,6 L42,6 L42,29 L6,29 Z'],
    ['b', 'M9.5,9.5 L38.5,9.5 L38.5,25.5 L9.5,25.5 Z'],
    ['w', 'M20.5,13 L29.5,17.5 L20.5,22 Z'],
    ['w', 'M4,33 L23,33 L23,44 L4,44 Z'],
    ['w', 'M25,33 L44,33 L44,44 L25,44 Z'],
    ['b', 'M7,36 L20,36 L20,38 L7,38 Z'],
    ['b', 'M7,40 L16,40 L16,42 L7,42 Z'],
    ['b', 'M28,36 L41,36 L41,38 L28,38 Z'],
    ['b', 'M28,40 L37,40 L37,42 L28,42 Z'],
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
