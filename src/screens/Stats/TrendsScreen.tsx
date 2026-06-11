import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, Easing } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { db } from '../../database';
import { useTheme } from '../../themes/useTheme';
import { PersonaShard } from '../../components/UI/PersonaShard';
import { PersonaCount } from '../../components/UI/PersonaCount';

// Pantalla de TENDENCIAS: visualiza la tabla `logs` (cada mision completada).
// Antes nada mostraba ese historial. v1: resumen + heatmap de constancia
// (ultimas 12 semanas) + barras de los ultimos 7 dias.

const pad = (n: number) => (n < 10 ? '0' + n : '' + n);
const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const DOW = ['L', 'M', 'X', 'J', 'V', 'S', 'D']; // lunes-primero

interface DayInfo { c: number; xp: number; }

const WEEKS = 12;

export const TrendsScreen = () => {
  const theme = useTheme();
  const [total, setTotal] = useState(0);
  const [xpTotal, setXpTotal] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [bestDay, setBestDay] = useState(0);
  const [byDay, setByDay] = useState<Record<string, DayInfo>>({});
  const fade = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = async () => {
        try {
          const res: any = await db.getFirstAsync('SELECT count(*) as total, COALESCE(sum(exp_ganada),0) as xp FROM logs');
          const rows: any[] = await db.getAllAsync(
            'SELECT date(fecha_completada) as d, count(*) as c, COALESCE(sum(exp_ganada),0) as xp FROM logs GROUP BY d ORDER BY d'
          );
          const pl: any = await db.getFirstAsync('SELECT racha FROM jugadores LIMIT 1');
          if (!active) return;

          const map: Record<string, DayInfo> = {};
          let best = 0;
          for (const r of rows || []) {
            map[r.d] = { c: r.c, xp: r.xp };
            if (r.c > best) best = r.c;
          }
          // mejor racha: corrida mas larga de dias consecutivos con actividad
          const days = (rows || []).map(r => r.d).sort();
          let run = 0, maxRun = 0;
          let prev: string | null = null;
          for (const d of days) {
            if (prev && toKey(addDays(new Date(prev + 'T00:00:00'), 1)) === d) run += 1;
            else run = 1;
            if (run > maxRun) maxRun = run;
            prev = d;
          }

          setTotal(res?.total || 0);
          setXpTotal(res?.xp || 0);
          setStreak(pl?.racha || 0);
          setBestStreak(maxRun);
          setBestDay(best);
          setByDay(map);

          fade.setValue(0);
          Animated.timing(fade, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
        } catch (e) {
          console.error('Error cargando tendencias:', e);
        }
      };
      load();
      return () => { active = false; };
    }, [])
  );

  // ---- heatmap: 12 semanas x 7 dias (lunes-primero), col 11 = semana actual ----
  const today = new Date();
  const todayDow = (today.getDay() + 6) % 7; // 0=Lun..6=Dom
  const thisMonday = addDays(today, -todayDow);
  const cellColor = (c: number) => {
    if (!c) return theme.surface;
    const op = c >= 4 ? 'FF' : c === 3 ? 'B3' : c === 2 ? '80' : '4D';
    return theme.primary + op;
  };

  const grid: { key: string; c: number; future: boolean }[][] = [];
  for (let col = 0; col < WEEKS; col++) {
    const weekMon = addDays(thisMonday, -(WEEKS - 1 - col) * 7);
    const colCells: { key: string; c: number; future: boolean }[] = [];
    for (let row = 0; row < 7; row++) {
      const d = addDays(weekMon, row);
      const key = toKey(d);
      colCells.push({ key, c: byDay[key]?.c || 0, future: d > today });
    }
    grid.push(colCells);
  }

  // ---- barras ultimos 7 dias ----
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(today, -(6 - i));
    return { key: toKey(d), dow: DOW[(d.getDay() + 6) % 7], info: byDay[toKey(d)] };
  });
  const maxC = Math.max(1, ...last7.map(x => x.info?.c || 0));

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.headerWrap}>
        <PersonaShard label="TENDENCIAS" height={50} fontSize={28} font={theme.fonts?.title} />
      </View>

      <Animated.View style={{ flex: 1, opacity: fade }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* RESUMEN */}
          <View style={styles.summaryRow}>
            <SummaryTile label="MISIONES" value={total} accent={theme.primary} skew={-10} />
            <SummaryTile label="XP TOTAL" value={xpTotal} accent={theme.secondary} skew={9} />
          </View>
          <View style={styles.summaryRow}>
            <SummaryTile label="RACHA" value={streak} suffix="d" accent={theme.success || theme.primary} skew={10} />
            <SummaryTile label="MEJOR RACHA" value={bestStreak} suffix="d" accent={theme.secondary} skew={-9} />
          </View>

          {/* HEATMAP DE CONSTANCIA */}
          <View style={[styles.sectionTag, { marginTop: 22 }]}><PersonaShard label="CONSTANCIA · 12 SEMANAS" variant="ghost" height={22} fontSize={11} /></View>
          <View style={styles.heatWrap}>
            <View style={styles.heatDows}>
              {DOW.map((d, i) => (
                <Text key={i} style={[styles.heatDow, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>{d}</Text>
              ))}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.heatGrid}>
              {grid.map((col, ci) => (
                <View key={ci} style={styles.heatCol}>
                  {col.map((cell, ri) => (
                    <View
                      key={ri}
                      style={[
                        styles.heatCell,
                        { backgroundColor: cell.future ? 'transparent' : cellColor(cell.c), borderColor: theme.border },
                        cell.c > 0 && { borderColor: theme.primary },
                      ]}
                    />
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
          <View style={styles.legend}>
            <Text style={[styles.legendTxt, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>MENOS</Text>
            {[0, 1, 2, 3, 4].map(n => (
              <View key={n} style={[styles.legendCell, { backgroundColor: cellColor(n), borderColor: theme.border }]} />
            ))}
            <Text style={[styles.legendTxt, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>MÁS</Text>
          </View>

          {/* BARRAS ULTIMOS 7 DIAS */}
          <View style={[styles.sectionTag, { marginTop: 24 }]}><PersonaShard label="ÚLTIMOS 7 DÍAS" variant="ghost" height={22} fontSize={11} color={theme.secondary} /></View>
          <View style={styles.barsRow}>
            {last7.map((d, i) => (
              <Bar key={d.key} dow={d.dow} count={d.info?.c || 0} max={maxC} accent={i === 6 ? theme.primary : theme.secondary} theme={theme} delay={i * 70} />
            ))}
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
};

// Tile de resumen (paralelogramo con numero gigante)
const SummaryTile = ({ label, value, suffix, accent, skew }: { label: string; value: number; suffix?: string; accent: string; skew: number }) => {
  const theme = useTheme();
  return (
    <View style={[styles.tile, { borderColor: accent, backgroundColor: theme.surface, transform: [{ skewX: `${skew}deg` }] }]}>
      <View style={[styles.tileAccent, { backgroundColor: accent }]} />
      <View style={{ transform: [{ skewX: `${-skew}deg` }] }}>
        <Text style={[styles.tileLabel, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>{label}</Text>
        <View style={styles.tileValueRow}>
          <PersonaCount value={value} pad={value < 10 ? 2 : 1} color={accent} fontSize={36} />
          {suffix ? <Text style={[styles.tileSuffix, { color: accent, fontFamily: theme.fonts?.display }]}>{suffix}</Text> : null}
        </View>
      </View>
    </View>
  );
};

// Barra vertical animada
const Bar = ({ dow, count, max, accent, theme, delay }: { dow: string; count: number; max: number; accent: string; theme: any; delay: number }) => {
  const h = useRef(new Animated.Value(0)).current;
  useFocusEffect(
    useCallback(() => {
      h.setValue(0);
      Animated.timing(h, { toValue: count / max, duration: 600, delay, easing: Easing.out(Easing.back(1.3)), useNativeDriver: false }).start();
      return () => {};
    }, [count, max])
  );
  const heightInterp = h.interpolate({ inputRange: [0, 1], outputRange: ['2%', '100%'] });
  return (
    <View style={styles.barCol}>
      <Text style={[styles.barCount, { color: count > 0 ? accent : theme.textDim, fontFamily: theme.fonts?.display }]}>{count}</Text>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, { height: heightInterp, backgroundColor: accent, shadowColor: accent }]} />
      </View>
      <Text style={[styles.barDow, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>{dow}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 50 },
  headerWrap: { marginBottom: 12, marginTop: 4 },
  sectionTag: { marginBottom: 12 },

  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  tile: { flex: 1, borderWidth: 1.5, paddingVertical: 12, paddingHorizontal: 16, paddingLeft: 20, overflow: 'hidden' },
  tileAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 7 },
  tileLabel: { fontSize: 11, letterSpacing: 1.4, marginBottom: 2 },
  tileValueRow: { flexDirection: 'row', alignItems: 'flex-end' },
  tileSuffix: { fontSize: 18, marginLeft: 2, marginBottom: 4 },

  heatWrap: { flexDirection: 'row', alignItems: 'center' },
  heatDows: { marginRight: 6, justifyContent: 'space-between', height: 7 * 16 },
  heatDow: { fontSize: 9, height: 16, lineHeight: 13, letterSpacing: 0.5 },
  heatGrid: { flexDirection: 'row', gap: 3, paddingRight: 8 },
  heatCol: { gap: 3 },
  heatCell: { width: 13, height: 13, borderWidth: 1, transform: [{ skewX: '-8deg' }] },

  legend: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, paddingLeft: 22 },
  legendTxt: { fontSize: 9, letterSpacing: 1, marginHorizontal: 4 },
  legendCell: { width: 12, height: 12, borderWidth: 1, transform: [{ skewX: '-8deg' }] },

  barsRow: { flexDirection: 'row', justifyContent: 'space-between', height: 150, paddingHorizontal: 6 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barCount: { fontSize: 16, marginBottom: 4 },
  barTrack: { width: 18, flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(255,255,255,0.04)' },
  barFill: { width: '100%', transform: [{ skewX: '-8deg' }], shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 6, elevation: 3 },
  barDow: { fontSize: 11, marginTop: 6, letterSpacing: 1 },
});

export default TrendsScreen;
