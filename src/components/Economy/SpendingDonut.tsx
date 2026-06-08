import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useTheme } from '../../themes/useTheme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface Props {
  data: DonutSlice[];
  total: number;
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;   // texto bajo el monto (ej: "GASTADO")
  centerValue?: string;   // monto grande ya formateado (ej: "¥12,400")
}

// Donut chart de proporciones (gasto por categoria) con barrido animado.
// El "chrome" (pista, textos) usa el tema del personaje; cada slice usa el
// color real de su categoria.
export const SpendingDonut = ({
  data,
  total,
  size = 190,
  strokeWidth = 26,
  centerLabel = 'GASTADO',
  centerValue,
}: Props) => {
  const theme = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeTotal = total > 0 ? total : 1;

  // Animacion de barrido: 0 -> 1. Se reinicia cuando cambia el total o el num. de slices.
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 750,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // las props de SVG no soportan native driver
    }).start();
  }, [total, data.length]);

  // Construimos los slices con su rotacion de inicio acumulada.
  let startFraction = 0;
  const segments = data.map((slice, i) => {
    const fraction = slice.value / safeTotal;
    const sliceLen = fraction * circumference;
    const rotation = -90 + startFraction * 360;
    // El arco "crece" reduciendo su dashoffset de sliceLen -> 0.
    const dashoffset = anim.interpolate({
      inputRange: [0, 1],
      outputRange: [sliceLen, 0],
    });
    startFraction += fraction;
    return (
      <G key={i} rotation={rotation} origin={`${size / 2}, ${size / 2}`}>
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={slice.color || theme.primary}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${sliceLen} ${circumference}`}
          strokeDashoffset={dashoffset}
          strokeLinecap="butt"
        />
      </G>
    );
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        {/* Pista de fondo */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.inactive}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {segments}
      </Svg>

      {/* Centro (aparece con la animacion) */}
      <Animated.View style={[styles.center, { opacity: anim }]} pointerEvents="none">
        {centerValue != null && (
          <Text
            style={[styles.centerValue, { color: theme.text, fontFamily: theme.fonts?.display }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {centerValue}
          </Text>
        )}
        <Text style={[styles.centerLabel, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>
          {centerLabel}
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  centerValue: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  centerLabel: {
    fontSize: 11,
    letterSpacing: 2,
    marginTop: 2,
  },
});

export default SpendingDonut;
