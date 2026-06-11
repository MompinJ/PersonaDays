// PersonaSlash — "slash de enfasis" estilo Persona 3 Reload.
//
// Una barra diagonal fina (o varias) que cruza detras/junto a un titulo o
// numero para darle el corte dinamico de los menus de P3R. Puramente decorativo
// y posicionable en absoluto por el padre (pasa `style` con top/left/right).
//
// `count` dibuja varias barras paralelas escalonadas (las "rayas" del HUD).
import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../../themes/useTheme';

interface Props {
  /** Color de las barras (default theme.secondary). */
  color?: string;
  /** Largo de la barra (default 64). */
  length?: number;
  /** Grosor de cada barra (default 6). */
  thickness?: number;
  /** Angulo de la diagonal en grados (default -24). */
  angle?: number;
  /** Numero de barras paralelas (default 1). */
  count?: number;
  /** Separacion entre barras cuando count > 1 (default 9). */
  gap?: number;
  /** Posicion/overrides (top, left, right, opacity...). */
  style?: StyleProp<ViewStyle>;
}

export const PersonaSlash = ({
  color,
  length = 64,
  thickness = 6,
  angle = -24,
  count = 1,
  gap = 9,
  style,
}: Props) => {
  const theme = useTheme();
  const c = color || theme.secondary;

  return (
    <View style={[styles.wrap, { transform: [{ rotate: `${angle}deg` }] }, style]} pointerEvents="none">
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            width: length,
            height: thickness,
            backgroundColor: c,
            marginTop: i === 0 ? 0 : gap,
            // Las barras secundarias se acortan un poco -> ritmo escalonado.
            opacity: i === 0 ? 1 : 0.55,
            alignSelf: i % 2 === 0 ? 'flex-start' : 'flex-end',
          }}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { position: 'absolute' },
});

export default PersonaSlash;
