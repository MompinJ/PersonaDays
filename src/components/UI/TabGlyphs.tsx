// TabGlyphs.tsx — glifos de navegacion (lenguaje angular P3R) como componentes
// react-native-svg. Misma tecnica Mask que src/components/Stats/StatGlyphs.tsx.
// Cuando active=true se anade el corte diagonal "Shard" (capa negra), igual que
// los iconos de stats. Color = personaje (currentColor via prop color).
import React from 'react';
import Svg, { Mask, Rect, Path, SvgProps } from 'react-native-svg';

const SHARD = 'M40,-2 L46.5,-2 L11,50 L4.5,50 Z';

type Layer = ['w' | 'b', string];

// poligono regular (cx,cy,r,n lados, rotacion en grados)
const poly = (cx: number, cy: number, r: number, n: number, rotDeg: number) => {
  const rad = (d: number) => (d * Math.PI) / 180;
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = rad(rotDeg) + (i * Math.PI * 2) / n;
    d += (i === 0 ? 'M' : 'L') + (cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1) + ' ';
  }
  return d + 'Z';
};
const circle = (cx: number, cy: number, r: number) => poly(cx, cy, r, 28, -90);
const rect = (x: number, y: number, w: number, h: number) =>
  'M' + x + ',' + y + ' L' + (x + w) + ',' + y + ' L' + (x + w) + ',' + (y + h) + ' L' + x + ',' + (y + h) + ' Z';

// Capas base de cada glifo (copiadas de tabs-lib.js). w = pinta, b = recorta.
const TABS: Record<string, Layer[]> = {
  home: [
    ['w', 'M24,5 L44,22 L39,22 L39,43 L9,43 L9,22 L4,22 Z'],
    ['b', 'M20,43 L20,31 L28,31 L28,43 Z'],
  ],
  phone: [
    ['w', 'M15,4 L33,4 L33,44 L15,44 Z'],
    ['b', 'M18.5,9 L29.5,9 L29.5,37 L18.5,37 Z'],
    ['b', rect(21, 6, 6, 1.7)],
    ['b', circle(24, 40.5, 1.8)],
  ],
  stats: [
    ['w', poly(24, 24, 21, 5, -90)],
    ['b', poly(24, 24, 16, 5, -90)],
    ['w', poly(24, 24, 8.5, 5, -90)],
  ],
  missions: [
    ['w', poly(24, 24, 21, 8, 22.5)],
    ['b', poly(24, 24, 14, 8, 22.5)],
    ['w', poly(24, 24, 6, 8, 22.5)],
  ],
  economy: [
    ['w', poly(24, 24, 21, 8, 22.5)],
    ['b', 'M12,11 L16.8,11 L25.5,26 L21,26 Z'],
    ['b', 'M31.2,11 L36,11 L27,26 L23,26 Z'],
    ['b', rect(21.5, 24, 5, 15)],
    ['b', rect(15, 27.5, 18, 3)],
    ['b', rect(15, 32.5, 18, 3)],
  ],
  profile: [
    ['w', 'M24,15.5 L31,12.5 L43,15 L41,23 L36,31 L26,29 L24,32.5 L22,29 L12,31 L7,23 L5,15 L17,12.5 Z'],
    ['b', 'M28,21.5 L32,19.5 L36,21.5 L32,23.5 Z'],
    ['b', 'M12,21.5 L16,19.5 L20,21.5 L16,23.5 Z'],
  ],
};

export type TabKey = keyof typeof TABS;

interface TabGlyphProps extends SvgProps {
  tab: string;
  size?: number;
  color?: string;
  active?: boolean;
}

let UID = 0;

export const TabGlyph = ({ tab, size = 28, color = 'currentColor', active = false, ...rest }: TabGlyphProps) => {
  const base = TABS[tab];
  if (!base) return null;
  const layers: Layer[] = active ? [...base, ['b', SHARD]] : base;
  const maskId = `tab_${tab}_${active ? 'a' : 'i'}_${UID++}`;
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

export default TabGlyph;
