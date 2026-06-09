// EventFlashContext — flashes de eventos estilo Persona ("slam"): un banner
// inclinado que entra de golpe, aguanta y sale, con un destello de color de
// fondo. Para momentos clave: mision completada, subir de nivel, recompensa.
// Global (como AlertContext). pointerEvents none: nunca bloquea la UI.
import React, { createContext, useContext, useState, useRef, useCallback, useEffect, ReactNode } from 'react';
import { View, Text, StyleSheet, Animated, Easing, useWindowDimensions } from 'react-native';
import { useTheme } from '../themes/useTheme';
import { getContrastText } from '../utils/colorUtils';

export type FlashKind = 'complete' | 'levelup' | 'reward';

export interface FlashData {
  kind?: FlashKind;
  title: string;
  subtitle?: string;
  xp?: number;
  yen?: number;
}

const EventFlashContext = createContext<{ flash: (d: FlashData) => void }>({ flash: () => {} });
export const useEventFlash = () => useContext(EventFlashContext);

const HOLD = 1000; // ms que aguanta el banner antes de salir

export const EventFlashProvider = ({ children }: { children: ReactNode }) => {
  const queue = useRef<FlashData[]>([]);
  const [current, setCurrent] = useState<FlashData | null>(null);

  const showNext = useCallback(() => {
    setCurrent(queue.current.shift() ?? null);
  }, []);

  const flash = useCallback((d: FlashData) => {
    queue.current.push(d);
    setCurrent((cur) => (cur ? cur : (queue.current.shift() ?? null)));
  }, []);

  return (
    <EventFlashContext.Provider value={{ flash }}>
      {children}
      {current ? <FlashOverlay data={current} onDone={showNext} /> : null}
    </EventFlashContext.Provider>
  );
};

const FlashOverlay = ({ data, onDone }: { data: FlashData; onDone: () => void }) => {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const slam = useRef(new Animated.Value(0)).current;
  const flashBg = useRef(new Animated.Value(0)).current;

  const kind = data.kind || 'reward';
  const accent = kind === 'levelup' ? theme.secondary : kind === 'complete' ? theme.success : theme.primary;
  const ink = getContrastText(accent);

  useEffect(() => {
    slam.setValue(0);
    flashBg.setValue(0);
    Animated.parallel([
      Animated.spring(slam, { toValue: 1, friction: 6, tension: 85, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(flashBg, { toValue: 1, duration: 110, useNativeDriver: true }),
        Animated.timing(flashBg, { toValue: 0, duration: 360, useNativeDriver: true }),
      ]),
    ]).start();

    const t = setTimeout(() => {
      Animated.timing(slam, { toValue: 2, duration: 230, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => onDone());
    }, HOLD);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const translateX = slam.interpolate({ inputRange: [0, 1, 2], outputRange: [-width * 0.55, 0, width * 0.6] });
  const opacity = slam.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 1, 0] });
  const scale = slam.interpolate({ inputRange: [0, 1, 2], outputRange: [0.82, 1, 1.06] });
  const bgOpacity = flashBg.interpolate({ inputRange: [0, 1], outputRange: [0, 0.16] });

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: accent, opacity: bgOpacity }]} />

      <Animated.View style={{ alignItems: 'center', transform: [{ translateX }, { scale }], opacity }}>
        <View style={[styles.banner, { backgroundColor: accent }]}>
          <Text style={[styles.title, { color: ink, fontFamily: theme.fonts?.title }]} numberOfLines={1}>{data.title}</Text>
        </View>

        {data.subtitle ? (
          <Text style={[styles.subtitle, { color: theme.text, fontFamily: theme.fonts?.heading }]} numberOfLines={1}>{data.subtitle}</Text>
        ) : null}

        {(data.xp || data.yen) ? (
          <View style={styles.rewards}>
            {data.xp ? <Text style={[styles.reward, { color: accent, fontFamily: theme.fonts?.display }]}>+{data.xp} XP</Text> : null}
            {data.yen ? <Text style={[styles.reward, { color: theme.text, fontFamily: theme.fonts?.display, marginLeft: 18 }]}>+¥{data.yen}</Text> : null}
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  banner: {
    paddingVertical: 12, paddingHorizontal: 34, transform: [{ skewX: '-12deg' }],
    shadowColor: '#000', shadowOffset: { width: 6, height: 6 }, shadowOpacity: 0.4, shadowRadius: 0, elevation: 8,
  },
  title: { fontSize: 34, letterSpacing: 1, textTransform: 'uppercase', transform: [{ skewX: '12deg' }] },
  subtitle: { fontSize: 17, letterSpacing: 2, marginTop: 8, textTransform: 'uppercase' },
  rewards: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  reward: { fontSize: 30, lineHeight: 32 },
});

export default EventFlashProvider;
