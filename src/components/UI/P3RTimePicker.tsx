// P3RTimePicker.tsx — selector de hora estilo Persona 3 Reload (variante SHARD).
// Port a React Native de "Recursos raw/P3R TimePicker (Shard)", variante WHEEL
// (ruedas con scroll y banda central), solo modo 24h. Mismo patron que
// P3RDatePicker: pop-up oscuro y angular, color 100% desde useTheme().
//
// Uso (controlado por visible):
//   <P3RTimePicker
//     visible={open}
//     value={hora}                  // 'HH:MM' | null
//     onAccept={(h) => { setHora(h); setOpen(false); }}
//     onCancel={() => setOpen(false)}
//   />
//
// Tambien exporta P3RTimePanel (solo el panel) por si quieres incrustarlo.
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Pressable, Animated, Easing,
} from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { useTheme } from '../../themes/useTheme';
import { getContrastText } from '../../utils/colorUtils';

// ---------------- helpers de hora ----------------
const pad2 = (n: number) => (n < 10 ? '0' + n : '' + n);

// 'HH:MM' -> {h, m}; null si viene vacio o invalido
const parseHHMM = (v?: string | null): { h: number; m: number } | null => {
  if (!v) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(v.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { h, m };
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

// Geometria de la rueda (del prototipo: items de 44, ventana de 220 = 5 items)
const ITEM_H = 44;
const VISIBLE = 5;
const WHEEL_H = ITEM_H * VISIBLE;
const PAD_V = (WHEEL_H - ITEM_H) / 2;

// ---------------- rueda scrolleable ----------------
interface WheelProps {
  items: number[];
  index: number;
  onIndex: (i: number) => void;
}

const Wheel = ({ items, index, onIndex }: WheelProps) => {
  const theme = useTheme();
  const ref = useRef<ScrollView>(null);
  // Ultimo indice reportado por ESTA rueda: distingue cambios del usuario
  // (scroll) de cambios programaticos (boton AHORA), que requieren scrollTo.
  const reported = useRef(index);
  const lock = useRef(false);

  useEffect(() => {
    if (index === reported.current) return;
    reported.current = index;
    lock.current = true;
    ref.current?.scrollTo({ y: index * ITEM_H, animated: true });
    const t = setTimeout(() => { lock.current = false; }, 320);
    return () => clearTimeout(t);
  }, [index]);

  const settle = (y: number) => {
    if (lock.current) return;
    const idx = Math.max(0, Math.min(items.length - 1, Math.round(y / ITEM_H)));
    if (idx !== reported.current) {
      reported.current = idx;
      onIndex(idx);
    }
  };

  return (
    <ScrollView
      ref={ref}
      style={styles.wheel}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_H}
      decelerationRate="fast"
      contentOffset={{ x: 0, y: index * ITEM_H }}
      onLayout={() => ref.current?.scrollTo({ y: reported.current * ITEM_H, animated: false })}
      onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.y)}
      onScrollEndDrag={(e) => settle(e.nativeEvent.contentOffset.y)}
      nestedScrollEnabled
    >
      <View style={{ height: PAD_V }} />
      {items.map((n, i) => {
        const on = i === index;
        return (
          <Pressable key={n} style={styles.wheelItem} onPress={() => onIndex(i)}>
            <Text
              style={[
                styles.wheelTxt,
                { color: on ? theme.text : theme.textDim, fontFamily: theme.fonts?.display },
                on && styles.wheelTxtOn,
              ]}
            >
              {pad2(n)}
            </Text>
          </Pressable>
        );
      })}
      <View style={{ height: PAD_V }} />
    </ScrollView>
  );
};

// ---------------- panel (reutilizable) ----------------
interface PanelProps {
  value?: string | null;          // 'HH:MM' o null
  onAccept?: (hora: string) => void;
  onCancel?: () => void;
}

export const P3RTimePanel = ({ value, onAccept, onCancel }: PanelProps) => {
  const theme = useTheme();
  const accent = theme.primary;
  const accent2 = theme.secondary;
  const inkInverse = getContrastText(accent);

  const init = parseHHMM(value) || { h: new Date().getHours(), m: new Date().getMinutes() };
  const [t, setT] = useState(init);

  const goNow = () => {
    const now = new Date();
    setT({ h: now.getHours(), m: now.getMinutes() });
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.surface }]}>
      {/* ---- cabecera shard (mismo layout que P3RDatePicker) ---- */}
      <View style={[styles.head, { backgroundColor: theme.background }]}>
        <View style={styles.headTop}>
          <View style={[styles.shard, { backgroundColor: accent }]}>
            <Text style={[styles.shardTime, { color: inkInverse, fontFamily: theme.fonts?.title }]} numberOfLines={1}>
              {pad2(t.h)}:{pad2(t.m)}
            </Text>
          </View>
          <Text style={[styles.headLbl, { color: accent2, fontFamily: theme.fonts?.display }]}>24H</Text>
        </View>
        <View style={[styles.stripe, { backgroundColor: accent2 }]} />
      </View>

      {/* ---- ruedas ---- */}
      <View style={styles.wheels}>
        {/* banda central */}
        <View
          pointerEvents="none"
          style={[styles.band, { borderColor: accent, backgroundColor: accent + '1F' }]}
        />
        <Wheel items={HOURS} index={t.h} onIndex={(i) => setT(prev => ({ ...prev, h: i }))} />
        <Text style={[styles.colon, { color: accent2, fontFamily: theme.fonts?.display }]}>:</Text>
        <Wheel items={MINUTES} index={t.m} onIndex={(i) => setT(prev => ({ ...prev, m: i }))} />
        {/* desvanecido superior/inferior (equivalente al mask del prototipo) */}
        <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%">
          <Defs>
            <LinearGradient id="fadeTop" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={theme.surface} stopOpacity={1} />
              <Stop offset="100%" stopColor={theme.surface} stopOpacity={0} />
            </LinearGradient>
            <LinearGradient id="fadeBot" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={theme.surface} stopOpacity={0} />
              <Stop offset="100%" stopColor={theme.surface} stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height={PAD_V * 0.6} fill="url(#fadeTop)" />
          <Rect x="0" y={WHEEL_H - PAD_V * 0.6 + 12} width="100%" height={PAD_V * 0.6} fill="url(#fadeBot)" />
        </Svg>
      </View>

      {/* ---- pie ---- */}
      <View style={styles.foot}>
        <TouchableOpacity onPress={goNow} activeOpacity={0.8} style={[styles.act, styles.actGhost, { borderColor: theme.border }]}>
          <Text style={[styles.actTxt, { color: theme.textDim, fontFamily: theme.fonts?.heading }]}>AHORA</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={onCancel} activeOpacity={0.8} style={styles.act}>
          <Text style={[styles.actTxt, { color: accent, fontFamily: theme.fonts?.heading }]}>CANCELAR</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onAccept && onAccept(`${pad2(t.h)}:${pad2(t.m)}`)}
          activeOpacity={0.9}
          style={[styles.act, styles.actSolid, { backgroundColor: accent, shadowColor: accent }]}
        >
          <Text style={[styles.actTxt, { color: inkInverse, fontFamily: theme.fonts?.heading }]}>ACEPTAR</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

interface PickerProps extends PanelProps {
  visible: boolean;
}

// ---------------- modal completo (overlay + pop) ----------------
export const P3RTimePicker = ({ visible, value, onAccept, onCancel }: PickerProps) => {
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      pop.setValue(0);
      Animated.timing(pop, { toValue: 1, duration: 260, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Animated.View
          style={{ width: '100%', maxWidth: 320, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) }], opacity: pop }}
        >
          {/* el Pressable interno corta la propagacion para que tocar el panel no cierre */}
          <Pressable onPress={() => {}}>
            {/* key fuerza estado fresco del panel en cada apertura */}
            {visible ? <P3RTimePanel value={value} onAccept={onAccept} onCancel={onCancel} /> : null}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

export default P3RTimePicker;

const styles = StyleSheet.create({
  overlay: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20,
    backgroundColor: 'rgba(4,8,18,0.78)',
  },
  card: { overflow: 'hidden', elevation: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.6, shadowRadius: 24 },

  // cabecera (mismos valores que P3RDatePicker)
  head: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 24, overflow: 'hidden' },
  headTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shard: {
    paddingHorizontal: 22, paddingVertical: 8, transform: [{ skewX: '-12deg' }],
    shadowColor: '#000', shadowOffset: { width: 6, height: 7 }, shadowOpacity: 0.4, shadowRadius: 0, elevation: 6,
  },
  shardTime: { fontSize: 30, letterSpacing: 1, includeFontPadding: false, transform: [{ skewX: '12deg' }] },
  headLbl: { fontSize: 26, letterSpacing: 1, transform: [{ skewX: '-8deg' }], includeFontPadding: false, opacity: 0.9 },
  stripe: { position: 'absolute', left: -20, right: -20, bottom: 12, height: 8, transform: [{ skewX: '-12deg' }, { rotate: '-3deg' }], opacity: 0.85 },

  // ruedas
  wheels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 18 },
  band: {
    // marginTop: la banda se baja 11dp respecto al centro geometrico para
    // enmarcar el glifo del numero seleccionado (32px), que con
    // includeFontPadding:false se asienta mas abajo que el centro de la rueda.
    position: 'absolute', left: 14, right: 14, top: '50%', height: ITEM_H, marginTop: -ITEM_H / 2 + 11,
    borderTopWidth: 1.5, borderBottomWidth: 1.5, transform: [{ skewX: '-10deg' }], zIndex: 2,
  },
  wheel: { height: WHEEL_H, minWidth: 72, flexGrow: 0 },
  wheelItem: { height: ITEM_H, alignItems: 'center', justifyContent: 'center', transform: [{ skewX: '-9deg' }] },
  wheelTxt: { fontSize: 26, letterSpacing: 1, includeFontPadding: false, transform: [{ skewX: '9deg' }] },
  wheelTxtOn: { fontSize: 32 },
  colon: { fontSize: 34, includeFontPadding: false, transform: [{ skewX: '-8deg' }], zIndex: 3, marginHorizontal: 6, marginTop: -4 },

  // pie (mismos valores que P3RDatePicker)
  foot: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 18 },
  act: { paddingHorizontal: 16, paddingVertical: 10, marginLeft: 9, transform: [{ skewX: '-10deg' }] },
  actGhost: { borderWidth: 1.5, marginLeft: 0 },
  actSolid: { paddingHorizontal: 22, elevation: 4, shadowOffset: { width: 3, height: 4 }, shadowOpacity: 0.5, shadowRadius: 0 },
  actTxt: { fontSize: 17, letterSpacing: 1.5, includeFontPadding: false, transform: [{ skewX: '10deg' }] },
});
