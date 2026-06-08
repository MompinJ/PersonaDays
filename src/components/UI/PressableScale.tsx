import React, { useRef } from 'react';
import { Animated, Pressable, ViewStyle, StyleProp } from 'react-native';

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;          // estilo visual (se anima con la escala)
  containerStyle?: StyleProp<ViewStyle>; // estilo del Pressable (ej: posicion absoluta)
  scaleTo?: number;
  disabled?: boolean;
  hitSlop?: number;
}

// Wrapper de pulsacion con feedback de escala tipo resorte (estilo Persona).
// Usa native driver, no bloquea input. Reutilizable en FABs, botones, tarjetas.
export const PressableScale = ({ children, onPress, style, containerStyle, scaleTo = 0.92, disabled, hitSlop }: Props) => {
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={hitSlop}
      style={containerStyle}
      onPressIn={() => Animated.spring(scale, { toValue: scaleTo, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }).start()}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
};

export default PressableScale;
