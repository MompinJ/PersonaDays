// StatGlyphs.tsx — los 5 iconos de atributos sociales como componentes
// react-native-svg (sin depender de svg-transformer). Forma "Shard": cada
// glifo lleva un corte diagonal (la franja negra en la mascara).
//
// Color = personaje: se controla con la prop `color` (currentColor). Nunca
// hardcodear el color del glifo; pasarlo desde el tema.
import React from 'react';
import Svg, { Mask, Rect, Path, SvgProps } from 'react-native-svg';

// Corte diagonal compartido (la firma "Shard").
const SHARD_CUT = 'M40,-2 L46.5,-2 L11,50 L4.5,50 Z';

export const StatKnowledge: React.FC<SvgProps> = (props) => (
  <Svg viewBox="0 0 48 48" {...props}>
    <Mask id="knowledge_B" maskUnits="userSpaceOnUse" x={0} y={0} width={48} height={48}>
      <Rect width={48} height={48} fill="#000" />
      <Path d="M5,16 L23,12 L23,41 L5,37 Z" fill="#fff" />
      <Path d="M25,12 L43,16 L43,37 L25,41 Z" fill="#fff" />
      <Path d={SHARD_CUT} fill="#000" />
    </Mask>
    <Rect width={48} height={48} fill="currentColor" mask="url(#knowledge_B)" />
  </Svg>
);

export const StatGuts: React.FC<SvgProps> = (props) => (
  <Svg viewBox="0 0 48 48" {...props}>
    <Mask id="guts_B" maskUnits="userSpaceOnUse" x={0} y={0} width={48} height={48}>
      <Rect width={48} height={48} fill="#000" />
      <Path d="M24,4 L30,15 L27,18.5 L33,28 L32,37 L27,44 L24,39 L21,44 L16,37 L15,28 L21,18.5 L18,15 Z" fill="#fff" />
      <Path d={SHARD_CUT} fill="#000" />
    </Mask>
    <Rect width={48} height={48} fill="currentColor" mask="url(#guts_B)" />
  </Svg>
);

export const StatProficiency: React.FC<SvgProps> = (props) => (
  <Svg viewBox="0 0 48 48" {...props}>
    <Mask id="proficiency_B" maskUnits="userSpaceOnUse" x={0} y={0} width={48} height={48}>
      <Rect width={48} height={48} fill="#000" />
      <Path d="M19.4,3.5 L28.6,3.5 L26.3,9.7 L32.5,12.3 L35.3,6.3 L41.7,12.7 L35.7,15.5 L38.3,21.7 L44.5,19.4 L44.5,28.6 L38.3,26.3 L35.7,32.5 L41.7,35.3 L35.3,41.7 L32.5,35.7 L26.3,38.3 L28.6,44.5 L19.4,44.5 L21.7,38.3 L15.5,35.7 L12.7,41.7 L6.3,35.3 L12.3,32.5 L9.7,26.3 L3.5,28.6 L3.5,19.4 L9.7,21.7 L12.3,15.5 L6.3,12.7 L12.7,6.3 L15.5,12.3 L21.7,9.7 Z" fill="#fff" />
      <Path d={SHARD_CUT} fill="#000" />
      <Path d="M30.0,21.5 L30.0,26.5 L26.5,30.0 L21.5,30.0 L18.0,26.5 L18.0,21.5 L21.5,18.0 L26.5,18.0 Z" fill="#000" />
    </Mask>
    <Rect width={48} height={48} fill="currentColor" mask="url(#proficiency_B)" />
  </Svg>
);

export const StatKindness: React.FC<SvgProps> = (props) => (
  <Svg viewBox="0 0 48 48" {...props}>
    <Mask id="kindness_B" maskUnits="userSpaceOnUse" x={0} y={0} width={48} height={48}>
      <Rect width={48} height={48} fill="#000" />
      <Path d="M24,16 L18,10 L9,11 L4,19 L7,27 L24,43 L41,27 L44,19 L39,11 L30,10 Z" fill="#fff" />
      <Path d={SHARD_CUT} fill="#000" />
    </Mask>
    <Rect width={48} height={48} fill="currentColor" mask="url(#kindness_B)" />
  </Svg>
);

export const StatCharm: React.FC<SvgProps> = (props) => (
  <Svg viewBox="0 0 48 48" {...props}>
    <Mask id="charm_B" maskUnits="userSpaceOnUse" x={0} y={0} width={48} height={48}>
      <Rect width={48} height={48} fill="#000" />
      <Path d="M24,3 L28,19 L45,24 L28,29 L24,45 L20,29 L3,24 L20,19 Z" fill="#fff" />
      <Path d={SHARD_CUT} fill="#000" />
    </Mask>
    <Rect width={48} height={48} fill="currentColor" mask="url(#charm_B)" />
  </Svg>
);
