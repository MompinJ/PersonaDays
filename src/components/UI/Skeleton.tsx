// Skeleton — placeholders de carga estilo P3R (barras inclinadas con shimmer).
// Evitan la pantalla en blanco mientras llega el dato. Color del tema.
import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, StyleProp, ViewStyle, DimensionValue } from 'react-native';
import { useTheme } from '../../themes/useTheme';

// Shimmer compartido (un solo loop reutilizado por composicion)
const useShimmer = () => {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 720, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 720, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return pulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.75] });
};

export const SkeletonBar = ({ width = '100%', height = 14, skew = -12, radius = 2, style }: {
  width?: DimensionValue; height?: number; skew?: number; radius?: number; style?: StyleProp<ViewStyle>;
}) => {
  const theme = useTheme();
  const opacity = useShimmer();
  return (
    <Animated.View
      style={[
        { width, height, backgroundColor: theme.surface, borderRadius: radius, opacity, transform: [{ skewX: `${skew}deg` }] },
        style,
      ]}
    />
  );
};

// Tarjeta esqueleto que imita la "fila disruptiva" (inclinada + escalonada)
export const SkeletonCard = ({ index = 0 }: { index?: number }) => {
  const theme = useTheme();
  const opacity = useShimmer();
  const sk = -8;
  const stagger = [0, 16, 8, 20, 12][index % 5];
  const rot = [-1.3, 1, -1, 1.3, -0.5][index % 5];
  const accent = index % 2 === 0 ? theme.primary : theme.secondary;
  return (
    <View style={{ marginLeft: stagger, marginRight: 24 - stagger, marginBottom: 16 }}>
      <Animated.View
        style={[
          styles.card,
          { backgroundColor: theme.surface, borderColor: theme.border, opacity, transform: [{ rotate: `${rot}deg` }, { skewX: `${sk}deg` }] },
        ]}
      >
        <View style={[styles.cardAccent, { backgroundColor: accent }]} />
        <View style={[styles.cardInner, { transform: [{ skewX: `${-sk}deg` }] }]}>
          <View style={{ flex: 1 }}>
            <View style={[styles.line, { backgroundColor: theme.border, width: '62%', height: 16 }]} />
            <View style={[styles.line, { backgroundColor: theme.border, width: '34%', height: 10, marginTop: 8 }]} />
          </View>
          <View style={[styles.line, { backgroundColor: theme.border, width: 48, height: 22 }]} />
        </View>
      </Animated.View>
    </View>
  );
};

// Lista de tarjetas esqueleto
export const ListSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <View style={{ paddingTop: 4 }}>
    {Array.from({ length: rows }).map((_, i) => <SkeletonCard key={i} index={i} />)}
  </View>
);

// Fila esqueleto estilo StatRow (circulo de nivel + barra)
export const SkeletonStatRow = ({ index = 0 }: { index?: number }) => {
  const theme = useTheme();
  const opacity = useShimmer();
  return (
    <Animated.View style={[styles.statRow, { opacity }]}>
      <View style={[styles.statCircle, { borderColor: theme.border }]} />
      <View style={{ flex: 1 }}>
        <View style={[styles.line, { backgroundColor: theme.border, width: '40%', height: 14 }]} />
        <View style={[styles.statBar, { backgroundColor: theme.surface }]} />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: { paddingVertical: 16, paddingHorizontal: 16, paddingLeft: 24, borderWidth: 1.5 },
  cardAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 9, transform: [{ skewX: '-14deg' }], marginLeft: -3 },
  cardInner: { flexDirection: 'row', alignItems: 'center' },
  line: { borderRadius: 2, transform: [{ skewX: '-12deg' }] },
  statRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingHorizontal: 10 },
  statCircle: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, marginRight: 12 },
  statBar: { height: 8, marginTop: 8, transform: [{ skewX: '-20deg' }] },
});

export default ListSkeleton;
