// ActionGlyphs.tsx — iconos de los FABs de Misiones (historial, gestionar,
// agregar) como componentes react-native-svg. Misma tecnica Mask que
// TabGlyphs/StatGlyphs. Color = tema (currentColor). active anade el corte Shard.
import React from 'react';
import Svg, { Mask, Rect, Path, SvgProps } from 'react-native-svg';

const SHARD = 'M40,-2 L46.5,-2 L11,50 L4.5,50 Z';
type Layer = ['w' | 'b', string];

const ACTIONS: Record<string, Layer[]> = {
  historial: [
    ['w', 'M42.5,31.7 L31.7,42.5 L16.3,42.5 L5.5,31.7 L5.5,16.3 L16.3,5.5 L31.7,5.5 L42.5,16.3 Z'],
    ['b', 'M37.4,29.5 L29.5,37.4 L18.5,37.4 L10.6,29.5 L10.6,18.5 L18.5,10.6 L29.5,10.6 L37.4,18.5 Z'],
    ['w', 'M22.6,24 L25.4,24 L24,10.5 Z'],
    ['w', 'M24,22.7 L24,25.3 L35,24 Z'],
    ['w', 'M26.2,24.0 L24.0,26.2 L21.8,24.0 L24.0,21.8 Z'],
  ],
  gestionar: [
    ['w', 'M16,9 L8,9 L8,39 L16,39 L16,35 L12,35 L12,13 L16,13 Z'],
    ['w', 'M32,9 L40,9 L40,39 L32,39 L32,35 L36,35 L36,13 L32,13 Z'],
    ['w', 'M18.5,15 L29.5,15 L29.5,18.2 L18.5,18.2 Z'],
    ['w', 'M18.5,22.4 L29.5,22.4 L29.5,25.6 L18.5,25.6 Z'],
    ['w', 'M18.5,29.8 L29.5,29.8 L29.5,33 L18.5,33 Z'],
  ],
  agregar: [
    ['w', 'M24,3 L29,18 L19,18 Z'],
    ['w', 'M24,45 L29,30 L19,30 Z'],
    ['w', 'M3,24 L18,29 L18,19 Z'],
    ['w', 'M45,24 L30,29 L30,19 Z'],
    ['w', 'M28.2,24.0 L24.0,28.2 L19.8,24.0 L24.0,19.8 Z'],
  ],
};

export type ActionKey = keyof typeof ACTIONS;

interface ActionGlyphProps extends SvgProps {
  name: string;
  size?: number;
  color?: string;
  active?: boolean;
}

let UID = 0;

export const ActionGlyph = ({ name, size = 24, color = 'currentColor', active = false, ...rest }: ActionGlyphProps) => {
  const base = ACTIONS[name];
  if (!base) return null;
  const layers: Layer[] = active ? [...base, ['b', SHARD]] : base;
  const maskId = `act_${name}_${active ? 'a' : 'i'}_${UID++}`;
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

export default ActionGlyph;
