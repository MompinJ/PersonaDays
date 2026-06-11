// PersonaTile — "tile flotante" angular estilo Persona 3 Reload.
//
// Una tarjeta paralelograma (skewX leve) con una CAPA DE SOMBRA desplazada del
// color de acento detras = sensacion de que el tile "flota" sobre el fondo.
// El contenido va contra-inclinado para quedar derecho y legible.
//
// Por que no PressableScale: el doc del sistema dice que NO se mezcla el scale
// de PressableScale con transform skew (el scale pisa el skew). Aqui el feedback
// de pulsacion se hace con un Animated.spring manual que convive con el skew.
import React, { useRef } from 'react';
import { Animated, Pressable, View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../../themes/useTheme';

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  /** Color del borde y de la capa de sombra flotante (default theme.primary). */
  accent?: string;
  /** Inclinacion del paralelogramo en grados (default -5). El contenido se contra-inclina. */
  skew?: number;
  /** Desplazamiento de la sombra flotante en px (default 7). */
  float?: number;
  /** Fondo del tile (default theme.surface). */
  background?: string;
  /** Estilo extra del tile (padding, tamano, etc.). */
  style?: StyleProp<ViewStyle>;
  /** Estilo del contenedor de posicion (p.ej. width en una fila). */
  containerStyle?: StyleProp<ViewStyle>;
}

export const PersonaTile = ({
  children,
  onPress,
  accent,
  skew = -5,
  float = 7,
  background,
  style,
  containerStyle,
}: Props) => {
  const theme = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const acc = accent || theme.primary;
  const bg = background || theme.surface;

  const pressIn = () => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }).start();

  const skewT = { transform: [{ skewX: `${skew}deg` }] };
  const counterSkew = { transform: [{ skewX: `${-skew}deg` }] };

  const body = (
    <Animated.View style={{ transform: [{ scale }] }}>
      {/* Capa de sombra flotante: mismo paralelogramo, desplazado y tenido del acento */}
      <View
        style={[
          styles.shadowLayer,
          skewT,
          { left: float, top: float, backgroundColor: acc, opacity: 0.22 },
        ]}
      />
      {/* Cara del tile */}
      <View style={[styles.face, skewT, { backgroundColor: bg, borderColor: acc }, style]}>
        <View style={counterSkew}>{children}</View>
      </View>
    </Animated.View>
  );

  if (!onPress) return <View style={containerStyle}>{body}</View>;

  return (
    <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} style={containerStyle}>
      {body}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  shadowLayer: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    borderRadius: 3,
  },
  face: {
    borderWidth: 1.5,
    borderRadius: 3,
    paddingVertical: 14,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
});

export default PersonaTile;
