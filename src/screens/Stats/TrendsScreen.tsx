import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, Easing, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../database';
import { useTheme } from '../../themes/useTheme';
import { PersonaShard } from '../../components/UI/PersonaShard';
import { PersonaCount } from '../../components/UI/PersonaCount';

// Pantalla de TENDENCIAS: visualiza la tabla `logs` (cada mision completada).
// Resumen + insights + heatmap de constancia + XP por semana + barras de 7 dias.

const pad = (n: number) => (n < 10 ? '0' + n : '' + n);
const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const DOW = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DOW_FULL = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'];
const MES_ABBR = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

interface DayInfo { c: number; xp: number; }
const HEAT_WEEKS = 12;
const XP_WEEKS = 8;

export const TrendsScreen = () => {
  const theme = useTheme();
  const [total, setTotal] = useState(0);
  const [xpTotal, setXpTotal] = useState(0);
  const [yenesTotal, setYenesTotal] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [byDay, setByDay] = useState<Record<string, DayInfo>>({});
  const [barMetric, setBarMetric] = useState<'c' | 'xp'>('c');
  const fade = useRef(new Animated.Value(0)).current;
  const heatAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = async () => {
        try {
          const res: any = await db.getFirstAsync('SELECT count(*) as total, COALESCE(sum(exp_ganada),0) as xp, COALESCE(sum(yenes_ganados),0) as yenes FROM logs');
          const rows: any[] = await db.getAllAsync(
            'SELECT date(fecha_completada) as d, count(*) as c, COALESCE(sum(exp_ganada),0) as xp FROM logs GROUP BY d ORDER BY d'
          );
          const pl: any = await db.getFirstAsync('SELECT racha FROM jugadores LIMIT 1');
          if (!active) return;

          const map: Record<string, DayInfo> = {};
          for (const r of rows || []) map[r.d] = { c: r.c, xp: r.xp };

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
          setYenesTotal(res?.yenes || 0);
          setStreak(pl?.racha || 0);
          setBestStreak(maxRun);
          setByDay(map);

          fade.setValue(0);
          heatAnim.setValue(0);
          Animated.timing(fade, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
          Animated.timing(heatAnim, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
        } catch (e) {
          console.error('Error cargando tendencias:', e);
        }
      };
      load();
      return () => { active = false; };
    }, [])
  );

  const today = new Date();
  const todayDow = (today.getDay() + 6) % 7;
  const thisMonday = addDays(today, -todayDow);

  const cellColor = (c: number) => {
    if (!c) return theme.surface;
    const op = c >= 4 ? 'FF' : c === 3 ? 'B3' : c === 2 ? '80' : '4D';
    return theme.primary + op;
  };

  // heatmap grid (12 semanas x 7 dias) + etiquetas de mes por columna
  const { grid, monthLabels } = useMemo(() => {
    const g: { c: number; future: boolean }[][] = [];
    const labels: string[] = [];
    let prevMonth = -1;
    for (let col = 0; col < HEAT_WEEKS; col++) {
      const weekMon = addDays(thisMonday, -(HEAT_WEEKS - 1 - col) * 7);
      labels.push(weekMon.getMonth() !== prevMonth ? MES_ABBR[weekMon.getMonth()] : '');
      prevMonth = weekMon.getMonth();
      const cells: { c: number; future: boolean }[] = [];
      for (let row = 0; row < 7; row++) {
        const d = addDays(weekMon, row);
        cells.push({ c: byDay[toKey(d)]?.c || 0, future: d > today });
      }
      g.push(cells);
    }
    return { grid: g, monthLabels: labels };
  }, [byDay]);

  // insights
  const dowCounts = useMemo(() => {
    const arr = [0, 0, 0, 0, 0, 0, 0];
    for (const k of Object.keys(byDay)) {
      const d = new Date(k + 'T00:00:00');
      arr[(d.getDay() + 6) % 7] += byDay[k].c;
    }
    return arr;
  }, [byDay]);
  const activeDays = Object.keys(byDay).length;
  const bestDowIdx = dowCounts.indexOf(Math.max(...dowCounts));
  const avgPerDay = activeDays ? total / activeDays : 0;

  // XP por semana (8 semanas)
  const weekBars = useMemo(() => {
    const out: { label: string; xp: number }[] = [];
    for (let w = 0; w < XP_WEEKS; w++) {
      const weekMon = addDays(thisMonday, -(XP_WEEKS - 1 - w) * 7);
      let xp = 0;
      for (let d = 0; d < 7; d++) xp += byDay[toKey(addDays(weekMon, d))]?.xp || 0;
      out.push({ label: `${weekMon.getDate()}/${weekMon.getMonth() + 1}`, xp });
    }
    return out;
  }, [byDay]);
  const maxWeekXp = Math.max(1, ...weekBars.map(b => b.xp));

  // barras 7 dias
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(today, -(6 - i));
    const info = byDay[toKey(d)];
    return { key: toKey(d), dow: DOW[(d.getDay() + 6) % 7], value: barMetric === 'c' ? (info?.c || 0) : (info?.xp || 0) };
  });
  const max7 = Math.max(1, ...last7.map(x => x.value));

  if (total === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.headerWrap}>
          <PersonaShard label="TENDENCIAS" height={50} fontSize={28} font={theme.fonts?.title} />
        </View>
        <View style={styles.empty}>
          <Ionicons name="trending-up" size={56} color={theme.textDim} />
          <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: theme.fonts?.heading }]}>SIN DATOS AÚN</Text>
          <Text style={[styles.emptySub, { color: theme.textDim, fontFamily: theme.fonts?.body }]}>Completa misiones y aquí verás tu constancia, tu XP y tus rachas.</Text>
        </View>
      </View>
    );
  }

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

          {/* INSIGHTS */}
          <View style={[styles.sectionTag, { marginTop: 22 }]}><PersonaShard label="DATOS" variant="ghost" height={22} fontSize={11} color={theme.secondary} /></View>
          <View style={styles.insightRow}>
            <InsightCard icon="calendar" title="MEJOR DÍA" value={DOW_FULL[bestDowIdx]} sub={`${dowCounts[bestDowIdx]} completadas`} accent={theme.primary} />
            <InsightCard icon="flash" title="PROMEDIO" value={avgPerDay.toFixed(1)} sub="por día activo" accent={theme.secondary} />
            <InsightCard icon="cash" title="YENES" value={`¥${yenesTotal}`} sub="ganados" accent={theme.success || theme.primary} />
          </View>

          {/* HEATMAP DE CONSTANCIA */}
          <View style={[styles.sectionTag, { marginTop: 22 }]}><PersonaShard label="CONSTANCIA · 12 SEMANAS" variant="ghost" height={22} fontSize={11} /></View>
          <View style={styles.heatWrap}>
            <View style={styles.heatDows}>
              <Text style={[styles.heatMonth, { color: 'transparent' }]}>·</Text>
              {DOW.map((d, i) => (
                <Text key={i} style={[styles.heatDow, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>{d}</Text>
              ))}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 8 }}>
              <View>
                <View style={styles.monthRow}>
                  {monthLabels.map((m, ci) => (
                    <Text key={ci} style={[styles.heatMonth, styles.monthCell, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>{m}</Text>
                  ))}
                </View>
                <View style={styles.heatGrid}>
                  {grid.map((col, ci) => {
                    const start = ci / (HEAT_WEEKS + 3);
                    const op = heatAnim.interpolate({ inputRange: [start, Math.min(1, start + 0.3)], outputRange: [0, 1], extrapolate: 'clamp' });
                    const tx = heatAnim.interpolate({ inputRange: [start, Math.min(1, start + 0.3)], outputRange: [10, 0], extrapolate: 'clamp' });
                    return (
                      <Animated.View key={ci} style={[styles.heatCol, { opacity: op, transform: [{ translateY: tx }] }]}>
                        {col.map((cell, ri) => (
                          <View
                            key={ri}
                            style={[
                              styles.heatCell,
                              { backgroundColor: cell.future ? 'transparent' : cellColor(cell.c), borderColor: cell.c > 0 ? theme.primary : theme.border },
                            ]}
                          />
                        ))}
                      </Animated.View>
                    );
                  })}
                </View>
              </View>
            </ScrollView>
          </View>
          <View style={styles.legend}>
            <Text style={[styles.legendTxt, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>MENOS</Text>
            {[0, 1, 2, 3, 4].map(n => (
              <View key={n} style={[styles.legendCell, { backgroundColor: cellColor(n), borderColor: theme.border }]} />
            ))}
            <Text style={[styles.legendTxt, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>MÁS</Text>
          </View>

          {/* XP POR SEMANA */}
          <View style={[styles.sectionTag, { marginTop: 24 }]}><PersonaShard label="XP POR SEMANA" variant="ghost" height={22} fontSize={11} color={theme.secondary} /></View>
          <View style={styles.barsRow}>
            {weekBars.map((b, i) => (
              <Bar key={`w${i}`} label={b.label} value={b.xp} max={maxWeekXp} accent={i === XP_WEEKS - 1 ? theme.primary : theme.secondary} theme={theme} delay={i * 60} compact />
            ))}
          </View>

          {/* ULTIMOS 7 DIAS + toggle */}
          <View style={styles.sevenHead}>
            <View style={styles.sectionTag}><PersonaShard label="ÚLTIMOS 7 DÍAS" variant="ghost" height={22} fontSize={11} color={theme.primary} /></View>
            <View style={[styles.toggle, { borderColor: theme.border }]}>
              {(['c', 'xp'] as const).map(m => (
                <TouchableOpacity key={m} onPress={() => setBarMetric(m)} style={[styles.toggleBtn, barMetric === m && { backgroundColor: theme.primary }]}>
                  <Text style={[styles.toggleTxt, { color: barMetric === m ? theme.textInverse : theme.textDim, fontFamily: theme.fonts?.condensed }]}>{m === 'c' ? 'MIS.' : 'XP'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.barsRow}>
            {last7.map((d, i) => (
              <Bar key={`${barMetric}-${d.key}`} label={d.dow} value={d.value} max={max7} accent={i === 6 ? theme.primary : theme.secondary} theme={theme} delay={i * 70} />
            ))}
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
};

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

const InsightCard = ({ icon, title, value, sub, accent }: { icon: any; title: string; value: string; sub: string; accent: string }) => {
  const theme = useTheme();
  return (
    <View style={[styles.insight, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      <View style={[styles.insightAccent, { backgroundColor: accent }]} />
      <Ionicons name={icon} size={18} color={accent} />
      <Text style={[styles.insightTitle, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>{title}</Text>
      <Text style={[styles.insightValue, { color: theme.text, fontFamily: theme.fonts?.heading }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={[styles.insightSub, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]} numberOfLines={1}>{sub}</Text>
    </View>
  );
};

const Bar = ({ label, value, max, accent, theme, delay, compact }: { label: string; value: number; max: number; accent: string; theme: any; delay: number; compact?: boolean }) => {
  const h = useRef(new Animated.Value(0)).current;
  useFocusEffect(
    useCallback(() => {
      h.setValue(0);
      Animated.timing(h, { toValue: value / max, duration: 600, delay, easing: Easing.out(Easing.back(1.3)), useNativeDriver: false }).start();
      return () => {};
    }, [value, max])
  );
  const heightInterp = h.interpolate({ inputRange: [0, 1], outputRange: ['2%', '100%'] });
  return (
    <View style={styles.barCol}>
      <Text style={[styles.barCount, compact && styles.barCountSm, { color: value > 0 ? accent : theme.textDim, fontFamily: theme.fonts?.display }]} numberOfLines={1}>{value}</Text>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, { height: heightInterp, backgroundColor: accent, shadowColor: accent }]} />
      </View>
      <Text style={[styles.barDow, compact && styles.barDowSm, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]} numberOfLines={1}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 50 },
  headerWrap: { marginBottom: 12, marginTop: 4 },
  sectionTag: { marginBottom: 12 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingBottom: 80 },
  emptyTitle: { fontSize: 20, letterSpacing: 1.5, marginTop: 16 },
  emptySub: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },

  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  tile: { flex: 1, borderWidth: 1.5, paddingVertical: 12, paddingHorizontal: 16, paddingLeft: 20, overflow: 'hidden' },
  tileAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 7 },
  tileLabel: { fontSize: 11, letterSpacing: 1.4, marginBottom: 2 },
  tileValueRow: { flexDirection: 'row', alignItems: 'flex-end' },
  tileSuffix: { fontSize: 18, marginLeft: 2, marginBottom: 4 },

  insightRow: { flexDirection: 'row', gap: 10 },
  insight: { flex: 1, borderWidth: 1.5, paddingVertical: 12, paddingHorizontal: 10, paddingLeft: 13, overflow: 'hidden', alignItems: 'flex-start' },
  insightAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  insightTitle: { fontSize: 9, letterSpacing: 1, marginTop: 6 },
  insightValue: { fontSize: 16, letterSpacing: 0.5, marginTop: 3 },
  insightSub: { fontSize: 9, letterSpacing: 0.5, marginTop: 2 },

  heatWrap: { flexDirection: 'row' },
  heatDows: { marginRight: 6 },
  heatMonth: { fontSize: 9, height: 14, lineHeight: 12 },
  heatDow: { fontSize: 9, height: 16, lineHeight: 13, letterSpacing: 0.5 },
  monthRow: { flexDirection: 'row', gap: 3, height: 14, marginBottom: 0 },
  monthCell: { width: 13, letterSpacing: 0, fontSize: 8 },
  heatGrid: { flexDirection: 'row', gap: 3 },
  heatCol: { gap: 3 },
  heatCell: { width: 13, height: 13, borderWidth: 1, transform: [{ skewX: '-8deg' }] },

  legend: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, paddingLeft: 22 },
  legendTxt: { fontSize: 9, letterSpacing: 1, marginHorizontal: 4 },
  legendCell: { width: 12, height: 12, borderWidth: 1, transform: [{ skewX: '-8deg' }] },

  sevenHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24 },
  toggle: { flexDirection: 'row', borderWidth: 1.5, marginBottom: 12, transform: [{ skewX: '-10deg' }], overflow: 'hidden' },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 4 },
  toggleTxt: { fontSize: 11, letterSpacing: 1, transform: [{ skewX: '10deg' }] },

  barsRow: { flexDirection: 'row', justifyContent: 'space-between', height: 150, paddingHorizontal: 6 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barCount: { fontSize: 16, marginBottom: 4 },
  barCountSm: { fontSize: 11 },
  barTrack: { width: 18, flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(255,255,255,0.04)' },
  barFill: { width: '100%', transform: [{ skewX: '-8deg' }], shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 6, elevation: 3 },
  barDow: { fontSize: 11, marginTop: 6, letterSpacing: 1 },
  barDowSm: { fontSize: 8, letterSpacing: 0 },
});

export default TrendsScreen;
