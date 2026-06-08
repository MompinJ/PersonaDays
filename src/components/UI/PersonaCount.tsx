import React from 'react';
import { Text, TextStyle, StyleProp } from 'react-native';
import { useTheme } from '../../themes/useTheme';

interface Props {
  value: number;
  pad?: number;        // total de digitos mostrados (default 2)
  color?: string;      // color del valor significativo (default theme.primary)
  dimColor?: string;   // color de los ceros a la izquierda (default theme.textDim)
  fontSize?: number;
  font?: string;       // familia (default theme.fonts.display - Big Shoulders)
  style?: StyleProp<TextStyle>;
}

// Numero estilo Persona 3 Reload: los ceros a la izquierda van tenues/outline
// y el valor real en color solido. Ej: value=1, pad=2 -> "0" tenue + "1" solido.
export const PersonaCount = ({
  value,
  pad = 2,
  color,
  dimColor,
  fontSize = 40,
  font,
  style,
}: Props) => {
  const theme = useTheme();
  const raw = String(Math.max(0, Math.floor(value || 0)));
  const padded = raw.padStart(pad, '0');
  const sigStart = padded.length - raw.length; // donde empieza el valor real
  const fam = font || theme.fonts?.display;
  const solid = color || theme.primary;
  const dim = dimColor || theme.textDim;

  return (
    <Text style={[{ fontSize, fontFamily: fam, includeFontPadding: false }, style]}>
      {padded.split('').map((ch, i) => {
        const isLeadingZero = i < sigStart;
        return (
          <Text key={i} style={{ color: isLeadingZero ? dim : solid, opacity: isLeadingZero ? 0.3 : 1 }}>
            {ch}
          </Text>
        );
      })}
    </Text>
  );
};

export default PersonaCount;
