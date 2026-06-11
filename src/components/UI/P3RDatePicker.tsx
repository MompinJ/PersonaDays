// P3RDatePicker.tsx — selector de fecha estilo Persona 3 Reload (variante SHARD).
// Port a React Native del componente de "Recursos raw/P3R DatePicker (Shard)".
// Reemplaza al DateTimePicker nativo: pop-up oscuro, angular, retenido por el tema.
// Color 100% desde useTheme() (cambia con el protagonista). Sin dependencias nuevas.
//
// Uso (controlado por visible):
//   <P3RDatePicker
//     visible={open}
//     value={fecha}                 // Date | null
//     minDate={new Date()}          // opcional
//     maxDate={...}                 // opcional
//     onAccept={(d) => { setFecha(d); setOpen(false); }}
//     onCancel={() => setOpen(false)}
//   />
//
// Tambien exporta P3RCalendarPanel (solo el panel) por si quieres incrustarlo.
import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Pressable, Animated, Easing,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../../themes/useTheme';
import { getContrastText } from '../../utils/colorUtils';

// ---------------- helpers de fecha (ES, lunes-primero) ----------------
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MES_ABBR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const DIA_LETRA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DIA_ABBR = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];

// indice lunes-primero (0=Lun .. 6=Dom) del dia 1 del mes
const firstWeekday = (y: number, m: number) => (new Date(y, m, 1).getDay() + 6) % 7;

// rejilla fija de 42 celdas (6 filas) con Date reales, incluye dias vecinos
function buildGrid(y: number, m: number): Date[] {
  const fw = firstWeekday(y, m);
  const start = new Date(y, m, 1 - fw);
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push(d);
  }
  return cells;
}

const sameDay = (a?: Date | null, b?: Date | null) => !!a && !!b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const inMonth = (d: Date, y: number, m: number) => d.getFullYear() === y && d.getMonth() === m;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const isDisabled = (d: Date, min?: Date | null, max?: Date | null) =>
  (!!min && startOfDay(d) < startOfDay(min)) || (!!max && startOfDay(d) > startOfDay(max));

function yearRange(center: number, back: number, fwd: number): number[] {
  const out: number[] = [];
  for (let y = center - back; y <= center + fwd; y++) out.push(y);
  return out;
}

// chevron angular (svg, currentColor via stroke)
const Chevron = ({ dir = 'right', size = 18, color }: { dir?: 'left' | 'right'; size?: number; color: string }) => {
  const d = dir === 'left' ? 'M15 4l-7 8 7 8' : 'M9 4l7 8-7 8';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={d} fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
};

interface PanelProps {
  value?: Date | null;
  minDate?: Date | null;
  maxDate?: Date | null;
  onAccept?: (d: Date | null) => void;
  onCancel?: () => void;
  onPick?: (d: Date) => void;            // se dispara en cada tap de dia
  hideFooter?: boolean;                  // oculta HOY/CANCELAR/ACEPTAR (modo "navegar")
  marks?: Record<string, string>;        // 'yyyy-mm-dd' -> color (tinte del dia)
}

// clave estable 'yyyy-mm-dd' (local, sin desfase de zona horaria)
const pad2 = (n: number) => (n < 10 ? '0' + n : '' + n);
const dateKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

// ---------------- panel del calendario (reutilizable) ----------------
export const P3RCalendarPanel = ({ value, minDate, maxDate, onAccept, onCancel, onPick, hideFooter, marks }: PanelProps) => {
  const theme = useTheme();
  const accent = theme.primary;
  const accent2 = theme.secondary;
  const inkInverse = getContrastText(accent);

  const today = useMemo(() => new Date(), []);
  const init = value || today;
  const [view, setView] = useState({ y: init.getFullYear(), m: init.getMonth() });
  const [sel, setSel] = useState<Date | null>(value || null);
  const [mode, setMode] = useState<'days' | 'years'>('days');

  // pulso al seleccionar
  const pulse = useRef(new Animated.Value(1)).current;
  const firePulse = () => {
    pulse.setValue(1);
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1.18, duration: 130, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  };

  const prevMonth = () => setView(v => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }));
  const nextMonth = () => setView(v => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }));
  const toggleYears = () => setMode(m => (m === 'years' ? 'days' : 'years'));
  const pickYear = (y: number) => { setView(v => ({ y, m: v.m })); setMode('days'); };

  const pick = (d: Date) => {
    if (isDisabled(d, minDate, maxDate)) return;
    setSel(d);
    setView({ y: d.getFullYear(), m: d.getMonth() });
    firePulse();
    onPick && onPick(d);
  };
  const goToday = () => pick(new Date());

  const headDate = sel
    ? `${DIA_ABBR[(sel.getDay() + 6) % 7]} ${sel.getDate()}`
    : '-- --';

  const cells = useMemo(() => buildGrid(view.y, view.m), [view.y, view.m]);
  const years = useMemo(() => yearRange(today.getFullYear(), 8, 30), [today]);

  return (
    <View style={[styles.card, { backgroundColor: theme.surface }]}>
      {/* ---- cabecera shard ---- */}
      <View style={[styles.head, { backgroundColor: theme.background }]}>
        <View style={styles.headTop}>
          <View style={[styles.shard, { backgroundColor: accent }]}>
            <Text style={[styles.shardDate, { color: inkInverse, fontFamily: theme.fonts?.title }]} numberOfLines={1}>
              {headDate.toUpperCase()}
            </Text>
          </View>
          <TouchableOpacity onPress={toggleYears} activeOpacity={0.7}>
            <Text style={[styles.yearBig, { color: accent2, fontFamily: theme.fonts?.display }]}>{view.y}</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.stripe, { backgroundColor: accent2 }]} />
      </View>

      {mode === 'years' ? (
        // ---- rejilla de años ----
        <ScrollView style={styles.years} contentContainerStyle={styles.yearsContent} showsVerticalScrollIndicator={false}>
          {years.map(y => {
            const isSel = y === view.y;
            const isNow = y === today.getFullYear();
            return (
              <TouchableOpacity
                key={y}
                activeOpacity={0.8}
                onPress={() => pickYear(y)}
                style={[styles.yr, isSel && { backgroundColor: accent, shadowColor: accent }]}
              >
                <Text style={[styles.yrTxt, {
                  fontFamily: theme.fonts?.display,
                  color: isSel ? inkInverse : isNow ? accent2 : theme.textDim,
                }]}>{y}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : (
        // ---- cuerpo: navegacion + rejilla ----
        <View style={styles.body}>
          <View style={styles.monthRow}>
            <TouchableOpacity onPress={prevMonth} activeOpacity={0.7} style={[styles.nav, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.unskew}><Chevron dir="left" color={theme.text} /></View>
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleYears} activeOpacity={0.8}>
              <Text style={[styles.monthLbl, { color: theme.text, fontFamily: theme.fonts?.heading }]}>
                {MESES[view.m].toUpperCase()} <Text style={{ color: accent2 }}>{view.y}</Text>
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={nextMonth} activeOpacity={0.7} style={[styles.nav, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.unskew}><Chevron dir="right" color={theme.text} /></View>
            </TouchableOpacity>
          </View>

          <View style={styles.wk}>
            {DIA_LETRA.map((d, i) => (
              <Text key={i} style={[styles.wkTxt, { color: accent, fontFamily: theme.fonts?.condensed }]}>{d}</Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((d, i) => {
              const out = !inMonth(d, view.y, view.m);
              const dis = isDisabled(d, minDate, maxDate);
              const isSel = sameDay(d, sel);
              const isToday = sameDay(d, today);
              const mark = marks ? marks[dateKey(d)] : undefined;
              const mkColor = isSel ? inkInverse : isToday ? accent2 : out ? theme.inactive : theme.text;
              return (
                <Pressable key={i} style={styles.day} onPress={() => pick(d)} disabled={dis}>
                  <Animated.View
                    style={[
                      styles.mk,
                      mark && !isSel && !isToday && { backgroundColor: mark + '38' },
                      isToday && !isSel && { borderWidth: 1.5, borderColor: accent2 },
                      isSel && { backgroundColor: accent, shadowColor: accent, transform: [{ skewX: '-11deg' }, { scale: pulse }] },
                      dis && { opacity: 0.32 },
                    ]}
                  >
                    <Text style={[styles.mkTxt, { color: mkColor, fontFamily: theme.fonts?.heading }]}>{d.getDate()}</Text>
                  </Animated.View>
                  {mark && !isSel ? <View style={[styles.dot, { backgroundColor: mark }]} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* ---- pie ---- */}
      {!hideFooter && (
        <View style={styles.foot}>
          <TouchableOpacity onPress={goToday} activeOpacity={0.8} style={[styles.act, styles.actGhost, { borderColor: theme.border }]}>
            <Text style={[styles.actTxt, { color: theme.textDim, fontFamily: theme.fonts?.heading }]}>HOY</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={onCancel} activeOpacity={0.8} style={styles.act}>
            <Text style={[styles.actTxt, { color: accent, fontFamily: theme.fonts?.heading }]}>CANCELAR</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onAccept && onAccept(sel)}
            activeOpacity={0.9}
            style={[styles.act, styles.actSolid, { backgroundColor: accent, shadowColor: accent }]}
          >
            <Text style={[styles.actTxt, { color: inkInverse, fontFamily: theme.fonts?.heading }]}>ACEPTAR</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

interface PickerProps extends PanelProps {
  visible: boolean;
}

// ---------------- modal completo (overlay + pop) ----------------
export const P3RDatePicker = ({ visible, value, minDate, maxDate, onAccept, onCancel }: PickerProps) => {
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
          style={{ width: '100%', maxWidth: 340, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) }], opacity: pop }}
        >
          {/* el Pressable interno corta la propagacion para que tocar el panel no cierre */}
          <Pressable onPress={() => {}}>
            <P3RCalendarPanel
              value={value}
              minDate={minDate}
              maxDate={maxDate}
              onAccept={onAccept}
              onCancel={onCancel}
            />
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

export default P3RDatePicker;

const styles = StyleSheet.create({
  overlay: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20,
    backgroundColor: 'rgba(4,8,18,0.78)',
  },
  card: { overflow: 'hidden', elevation: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.6, shadowRadius: 24 },

  // cabecera
  head: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 24, overflow: 'hidden' },
  headTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shard: {
    paddingHorizontal: 22, paddingVertical: 8, transform: [{ skewX: '-12deg' }],
    shadowColor: '#000', shadowOffset: { width: 6, height: 7 }, shadowOpacity: 0.4, shadowRadius: 0, elevation: 6,
  },
  shardDate: { fontSize: 30, letterSpacing: 0.5, includeFontPadding: false, transform: [{ skewX: '12deg' }] },
  yearBig: { fontSize: 32, letterSpacing: 1, transform: [{ skewX: '-8deg' }], includeFontPadding: false },
  stripe: { position: 'absolute', left: -20, right: -20, bottom: 12, height: 8, transform: [{ skewX: '-12deg' }, { rotate: '-3deg' }], opacity: 0.85 },

  // cuerpo
  body: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  monthLbl: { fontSize: 23, letterSpacing: 1.5, transform: [{ skewX: '-8deg' }] },
  nav: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, transform: [{ skewX: '-10deg' }] },
  unskew: { transform: [{ skewX: '10deg' }] },

  wk: { flexDirection: 'row', marginBottom: 6, transform: [{ skewX: '-10deg' }] },
  wkTxt: { flex: 1, textAlign: 'center', fontSize: 14, letterSpacing: 1, paddingVertical: 3 },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  day: { width: `${100 / 7}%`, height: 40, alignItems: 'center', justifyContent: 'center' },
  mk: {
    width: 38, height: 34, alignItems: 'center', justifyContent: 'center', transform: [{ skewX: '-11deg' }],
    shadowOffset: { width: 4, height: 5 }, shadowOpacity: 0, shadowRadius: 0,
  },
  mkTxt: { fontSize: 19, letterSpacing: 0.5, includeFontPadding: false, transform: [{ skewX: '11deg' }] },
  dot: { position: 'absolute', bottom: 2, width: 5, height: 5, borderRadius: 3, transform: [{ skewX: '-11deg' }] },

  // años
  years: { maxHeight: 286 },
  yearsContent: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, paddingVertical: 12 },
  yr: { width: `${100 / 4}%`, paddingVertical: 12, alignItems: 'center', transform: [{ skewX: '-10deg' }] },
  yrTxt: { fontSize: 23, letterSpacing: 0.5, includeFontPadding: false, transform: [{ skewX: '10deg' }] },

  // pie
  foot: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 18 },
  act: { paddingHorizontal: 16, paddingVertical: 10, marginLeft: 9, transform: [{ skewX: '-10deg' }] },
  actGhost: { borderWidth: 1.5, marginLeft: 0 },
  actSolid: { paddingHorizontal: 22, elevation: 4, shadowOffset: { width: 3, height: 4 }, shadowOpacity: 0.5, shadowRadius: 0 },
  actTxt: { fontSize: 17, letterSpacing: 1.5, includeFontPadding: false, transform: [{ skewX: '10deg' }] },
});
