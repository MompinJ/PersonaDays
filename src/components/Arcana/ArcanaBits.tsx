// ArcanaBits.tsx — piezas compartidas de la UI de Arcanos (loadout).
//   CutCard    marco angular con esquinas cortadas (Neon P3R), via react-native-svg.
//   StatEmblem glifo del stat del arcano (5 base + comodin/todos).
//   EffectText resalta los porcentajes de la frase de efecto en el color jewel.
import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp, TextStyle } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { StatIcon } from '../Stats/StatIcon';
import { statKeyFromName } from '../../data/arcanaEffects';

// ---- Marco con esquinas cortadas (TR + BL), panel recortado y borde neon ----
interface CutCardProps {
  w: number;
  h: number;
  color: string;          // color del borde neon (jewel del arcano)
  panelBg: string;        // fondo del panel interior
  screenBg: string;       // color del fondo de pantalla (para "cortar" las esquinas)
  cut?: number;
  borderWidth?: number;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  dim?: boolean;          // atenua (cooldown)
}

const framePoints = (w: number, h: number, cut: number, s: number) =>
  [`${s},${s}`, `${w - cut},${s}`, `${w - s},${cut}`, `${w - s},${h - s}`, `${cut},${h - s}`, `${s},${h - cut}`].join(' ');

export const CutCard = ({ w, h, color, panelBg, screenBg, cut = 14, borderWidth = 2, children, style, dim }: CutCardProps) => {
  return (
    <View style={[{ width: w, height: h }, style]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: panelBg, borderRadius: 2, overflow: 'hidden', opacity: dim ? 0.55 : 1 }]}>
        {children}
      </View>
      <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* triangulos del color de fondo que cortan las esquinas TR y BL */}
        <Polygon points={`${w - cut},0 ${w + 2},0 ${w + 2},${cut + 2}`} fill={screenBg} />
        <Polygon points={`0,${h - cut} ${cut},${h + 2} -2,${h + 2}`} fill={screenBg} />
        <Polygon points={framePoints(w, h, cut, borderWidth / 2 + 0.5)} fill="none" stroke={color} strokeWidth={borderWidth} strokeLinejoin="round" opacity={dim ? 0.6 : 1} />
      </Svg>
    </View>
  );
};

// ---- Emblema de stat del arcano ----
export const StatEmblem = ({ stat, size = 38, color }: { stat: string; size?: number; color: string }) => {
  const key = statKeyFromName(stat);
  if (key) return <StatIcon stat={key} size={size} skew={0} color={color} />;
  // comodin / todos: glifo generico
  const norm = (stat || '').toLowerCase();
  const ion = norm.includes('comod') ? 'sparkles' : 'planet';
  return <Ionicons name={ion as any} size={size} color={color} />;
};

// ---- Texto de efecto con los porcentajes resaltados ----
const isPct = (s: string) => /^[+−-]?\d[\d.]*\s?%$/.test(s);
export const EffectText = ({ text, color, style, hiStyle }: { text: string; color: string; style?: StyleProp<TextStyle>; hiStyle?: StyleProp<TextStyle> }) => {
  const parts = String(text || '').split(/([+−-]?\d[\d.]*\s?%)/g);
  return (
    <Text style={style}>
      {parts.map((p, i) => (isPct(p)
        ? <Text key={i} style={[{ color }, hiStyle]}>{p}</Text>
        : <Text key={i}>{p}</Text>))}
    </Text>
  );
};
