import React, { useCallback, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Animated, Easing, InteractionManager, Dimensions, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useGame } from '../../context/GameContext';
import { RootStackParamList } from '../../navigation/types';
import { useFocusEntrance } from '../../hooks/useFocusEntrance';
import { useHomeSummary, type HomeArcanaSlot } from '../../hooks/useHomeSummary';
import { PersonaShard } from '../../components/UI/PersonaShard';
import { PersonaTile } from '../../components/UI/PersonaTile';
import { PersonaSlash } from '../../components/UI/PersonaSlash';
import { PersonaCount } from '../../components/UI/PersonaCount';
import { PressableScale } from '../../components/UI/PressableScale';
import { StatIcon } from '../../components/Stats/StatIcon';
import { CutCard, StatEmblem } from '../../components/Arcana/ArcanaBits';
import { getContrastText } from '../../utils/colorUtils';
import { arcDisplayColor } from '../../services/arcService';

const { width: SCREEN_W } = Dimensions.get('window');
// 3 slots de arcano en fila (mismo maximo que la pantalla de Arcanos).
const ARC_SLOT_GAP = 8;
const ARC_SLOT_W = Math.floor((SCREEN_W - 40 - ARC_SLOT_GAP * 2) / 3);
const ARC_SLOT_H = 84;

// Formatea con separador de miles (¥) sin librerias.
const fmt = (n: number) => Math.round(n).toLocaleString('es-MX');

// Saludo segun la hora local.
const greeting = () => {
  const h = new Date().getHours();
  if (h < 6) return 'BUENAS NOCHES';
  if (h < 12) return 'BUENOS DIAS';
  if (h < 19) return 'BUENAS TARDES';
  return 'BUENAS NOCHES';
};

const WEEKDAYS = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];
const MONTHS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

// Barra de progreso animada (width 0 -> pct%).
const ProgressBar = ({ pct, color, track }: { pct: number; color: string; track: string }) => {
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(w, { toValue: pct, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [pct]);
  return (
    <View style={[styles.barTrack, { backgroundColor: track }]}>
      <Animated.View
        style={[styles.barFill, { backgroundColor: color, width: w.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]}
      />
    </View>
  );
};

// Tarjeta compacta de un arcano equipado (reusa el marco angular de Arcanos).
// slot null = slot desbloqueado pero vacio.
const ArcanaSlotMini = ({ slot, theme, screenBg }: { slot: HomeArcanaSlot | null; theme: any; screenBg: string }) => {
  if (!slot) {
    return (
      <View style={[styles.arcSlotEmpty, { borderColor: theme.border }]}>
        <Ionicons name="add" size={18} color={theme.textDim} />
        <Text style={[styles.arcSlotEmptyLab, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>VACÍO</Text>
      </View>
    );
  }
  const jewel = slot.color;
  return (
    <CutCard w={ARC_SLOT_W} h={ARC_SLOT_H} color={jewel} panelBg={theme.surface} screenBg={screenBg} cut={11} borderWidth={1.5}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: jewel, opacity: 0.08 }]} />
      <Text style={[styles.arcSlotRom, { color: jewel, fontFamily: theme.fonts?.display }]}>{slot.rom}</Text>
      <View style={styles.arcSlotInner}>
        <StatEmblem stat={slot.statEs} size={17} color={jewel} />
        <Text numberOfLines={1} style={[styles.arcSlotName, { color: theme.text, fontFamily: theme.fonts?.title }]}>
          {slot.nombre.toUpperCase()}
        </Text>
      </View>
      <View style={[styles.arcSlotPill, { backgroundColor: slot.locked ? jewel : theme.success }]}>
        <Text style={[styles.arcSlotPillT, { color: getContrastText(slot.locked ? jewel : theme.success), fontFamily: theme.fonts?.condensed }]}>
          {slot.locked ? `${slot.diasRestantes}D` : 'LIBRE'}
        </Text>
      </View>
    </CutCard>
  );
};

export const HomeScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme, player } = useGame();
  const { data, refresh } = useHomeSummary();
  const { style: introStyle } = useFocusEntrance(18, 440);

  const now = new Date();

  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(() => { refresh(); });
      return () => task.cancel();
    }, [refresh])
  );

  const goTab = (tab: string) => navigation.navigate('MainTabs', { screen: tab } as any);

  const { today, baseStats, activeArc, finanzas, streak, arcanaSlots, slotsTotal } = data;
  // Slots a pintar: uno por slot desbloqueado, con su arcano (o vacio).
  const arcSlotsView = Array.from({ length: Math.max(1, slotsTotal) }, (_, i) =>
    arcanaSlots.find((a) => a.slot === i + 1) || null
  );
  const allDone = today.total > 0 && today.done >= today.total;
  const missPct = today.total === 0 ? 0 : Math.round((today.done / today.total) * 100);
  const balancePositive = finanzas.balance >= 0;
  const balanceColor = balancePositive ? theme.success : theme.error;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Animated.View style={introStyle}>

          {/* ===== HERO ===== */}
          <View style={styles.hero}>
            <View style={styles.heroLeft}>
              <Text style={[styles.greeting, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>
                {greeting()}
              </Text>
              <View>
                <PersonaSlash color={theme.secondary} count={2} length={70} thickness={7} angle={-22} style={{ top: 10, left: -6 }} />
                <Text style={[styles.heroName, { color: theme.text, fontFamily: theme.fonts?.title }]} numberOfLines={1}>
                  {(player?.nombre_jugador || 'VIAJERO').toUpperCase()}
                </Text>
              </View>

              {/* Nivel + racha */}
              <View style={styles.levelRow}>
                <View style={styles.levelBlock}>
                  <Text style={[styles.miniLabel, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>NIVEL</Text>
                  <PersonaCount value={player?.nivel_jugador || 1} pad={2} fontSize={44} color={theme.primary} style={{ marginTop: -4 }} />
                </View>
                <View style={[styles.streakChip, { borderColor: streak > 0 ? theme.primary : theme.border, transform: [{ skewX: '-10deg' }] }]}>
                  <View style={{ transform: [{ skewX: '10deg' }], flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="flame" size={16} color={streak > 0 ? theme.primary : theme.textDim} />
                    <Text style={[styles.streakNum, { color: theme.text, fontFamily: theme.fonts?.display }]}>{streak}</Text>
                    <Text style={[styles.streakUnit, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>DIAS</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* HUD de fecha */}
            <View style={styles.dateHud}>
              <View style={[styles.dateStripe, { backgroundColor: theme.secondary }]} />
              <Text style={[styles.dateDay, { color: theme.primary, fontFamily: theme.fonts?.display }]}>{now.getDate()}</Text>
              <Text style={[styles.dateMeta, { color: theme.text, fontFamily: theme.fonts?.heading }]}>{MONTHS[now.getMonth()]}</Text>
              <Text style={[styles.dateWeekday, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>{WEEKDAYS[now.getDay()]}</Text>
            </View>
          </View>

          {/* ===== ARCANOS (slots activos) ===== */}
          <View style={styles.arcanaHeadRow}>
            <PersonaShard label="ARCANOS" />
            <View style={styles.arcanaHeadRight}>
              <Text style={[styles.arcanaHeadCount, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>
                {arcanaSlots.length}/{slotsTotal}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={theme.textDim} />
            </View>
          </View>
          <Pressable onPress={() => navigation.navigate('Arcana')}>
            <View style={styles.arcSlotsRow}>
              {arcSlotsView.map((slot, i) => (
                <ArcanaSlotMini key={i} slot={slot} theme={theme} screenBg={theme.background} />
              ))}
            </View>
            {arcanaSlots.length === 0 && (
              <Text style={[styles.arcHint, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>
                SIN ARCANOS EQUIPADOS · PULSA PARA EQUIPAR
              </Text>
            )}
          </Pressable>

          {/* ===== ACCESOS RAPIDOS ===== */}
          <View style={styles.quickRow}>
            <PressableScale
              containerStyle={styles.quickItem}
              style={[styles.quickTile, { backgroundColor: theme.surface, borderColor: theme.secondary }]}
              onPress={() => navigation.navigate('ListsMenuScreen')}
            >
              <View style={[styles.quickAccent, { backgroundColor: theme.secondary }]} />
              <Ionicons name="document-text" size={20} color={theme.secondary} />
              <Text style={[styles.quickText, { color: theme.text, fontFamily: theme.fonts?.heading }]}>NOTAS</Text>
            </PressableScale>
            <PressableScale
              containerStyle={styles.quickItem}
              style={[styles.quickTile, { backgroundColor: theme.surface, borderColor: theme.primary }]}
              onPress={() => navigation.navigate('Calendar')}
            >
              <View style={[styles.quickAccent, { backgroundColor: theme.primary }]} />
              <Ionicons name="calendar" size={20} color={theme.primary} />
              <Text style={[styles.quickText, { color: theme.text, fontFamily: theme.fonts?.heading }]}>CALENDARIO</Text>
            </PressableScale>
          </View>

          {/* ===== MISIONES DE HOY ===== */}
          <View style={styles.tagWrap}><PersonaShard label="MISIONES DE HOY" /></View>
          <PersonaTile accent={allDone ? theme.success : theme.primary} skew={-4} onPress={() => goTab('Missions')}>
            <View style={styles.missTop}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                <PersonaCount value={today.done} pad={2} fontSize={46} color={allDone ? theme.success : theme.primary} />
                <Text style={[styles.missSlash, { color: theme.textDim, fontFamily: theme.fonts?.display }]}>/{String(today.total).padStart(2, '0')}</Text>
              </View>
              <Text style={[styles.missLabel, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>
                {today.total === 0 ? 'SIN MISIONES HOY' : allDone ? 'DIA COMPLETO' : 'COMPLETADAS HOY'}
              </Text>
            </View>
            <ProgressBar pct={missPct} color={allDone ? theme.success : theme.primary} track={theme.inactive} />
            {/* Lista corta de pendientes */}
            {today.pending.length > 0 && (
              <View style={styles.pendList}>
                {today.pending.slice(0, 3).map((m, i) => (
                  <View key={m.id} style={styles.pendRow}>
                    <View style={[styles.pendBar, { backgroundColor: i % 2 === 0 ? theme.primary : theme.secondary }]} />
                    <Text numberOfLines={1} style={[styles.pendName, { color: theme.text, fontFamily: theme.fonts?.body }]}>{m.nombre}</Text>
                  </View>
                ))}
                {today.pending.length > 3 && (
                  <Text style={[styles.pendMore, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>+{today.pending.length - 3} MAS</Text>
                )}
              </View>
            )}
            {allDone && (
              <View style={styles.pendRow}>
                <Ionicons name="checkmark-done" size={18} color={theme.success} />
                <Text style={[styles.pendName, { color: theme.success, fontFamily: theme.fonts?.bold, marginLeft: 6 }]}>Todo en orden, viajero.</Text>
              </View>
            )}
          </PersonaTile>

          {/* ===== ATRIBUTOS ===== */}
          <View style={styles.tagWrap}><PersonaShard label="ATRIBUTOS" /></View>
          <View style={styles.statsRow}>
            {baseStats.map((s, i) => {
              const acc = i % 2 === 0 ? theme.primary : theme.secondary;
              const stagger = [0, 10, 4, 12, 2][i % 5];
              return (
                <PersonaTile
                  key={s.key}
                  accent={acc}
                  skew={i % 2 === 0 ? -7 : -4}
                  float={5}
                  onPress={() => goTab('Stats')}
                  containerStyle={[styles.statTileWrap, { marginTop: stagger }]}
                  style={styles.statTile}
                >
                  <View style={styles.statInner}>
                    <StatIcon stat={s.key} size={22} skew={0} color={acc} />
                    <Text style={[styles.statLvl, { color: theme.text, fontFamily: theme.fonts?.display }]}>{s.nivel}</Text>
                  </View>
                </PersonaTile>
              );
            })}
          </View>

          {/* ===== ARCO ACTIVO ===== */}
          {activeArc && (
            <>
              <View style={styles.tagWrap}><PersonaShard label="ARCO ACTIVO" /></View>
              {(() => {
                const arcColor = arcDisplayColor(activeArc.arc, theme.primary);
                return (
                  <PersonaTile accent={arcColor} skew={-4} onPress={() => navigation.navigate('Arcs')}>
                    <View style={styles.arcTop}>
                      <Text numberOfLines={1} style={[styles.arcName, { color: theme.text, fontFamily: theme.fonts?.heading }]}>
                        {activeArc.nombre.toUpperCase()}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                        <PersonaCount value={activeArc.dias} pad={2} fontSize={34} color={arcColor} />
                        <Text style={[styles.arcPct, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>{activeArc.dias === 1 ? 'DÍA' : 'DÍAS'}</Text>
                      </View>
                    </View>
                  </PersonaTile>
                );
              })()}
            </>
          )}

          {/* ===== FINANZAS ===== */}
          <View style={styles.tagWrap}><PersonaShard label="FINANZAS" /></View>
          <PersonaTile accent={balanceColor} skew={5} onPress={() => goTab('Economy')}>
            <View style={styles.finRow}>
              <View>
                <Text style={[styles.miniLabel, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>BALANCE</Text>
                <Text style={[styles.finBalance, { color: balanceColor, fontFamily: theme.fonts?.display }]}>
                  {balancePositive ? '+' : '-'}¥{fmt(Math.abs(finanzas.balance))}
                </Text>
              </View>
              <View style={styles.finMesBlock}>
                <Text style={[styles.miniLabel, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>GASTO DEL MES</Text>
                <Text style={[styles.finMes, { color: theme.text, fontFamily: theme.fonts?.display }]}>¥{fmt(finanzas.gastoMes)}</Text>
              </View>
            </View>
          </PersonaTile>

        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingTop: 54, paddingBottom: 170 },

  // Hero
  hero: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  heroLeft: { flex: 1, paddingRight: 12 },
  greeting: { fontSize: 13, letterSpacing: 2, marginBottom: 2 },
  heroName: { fontSize: 40, letterSpacing: 0.5, transform: [{ skewX: '-6deg' }] },
  levelRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  levelBlock: { marginRight: 18 },
  miniLabel: { fontSize: 11, letterSpacing: 1.5 },
  streakChip: { borderWidth: 1.5, borderRadius: 3, paddingHorizontal: 12, paddingVertical: 7 },
  streakNum: { fontSize: 22, marginLeft: 6, includeFontPadding: false },
  streakUnit: { fontSize: 11, letterSpacing: 1, marginLeft: 4, marginBottom: 3 },

  // Date HUD
  dateHud: { alignItems: 'center', paddingLeft: 6, paddingTop: 2 },
  dateStripe: { position: 'absolute', top: 16, right: -8, width: 54, height: 8, transform: [{ rotate: '-24deg' }] },
  dateDay: { fontSize: 56, includeFontPadding: false, lineHeight: 58 },
  dateMeta: { fontSize: 18, letterSpacing: 1, marginTop: -2 },
  dateWeekday: { fontSize: 12, letterSpacing: 2 },

  // Section tag
  tagWrap: { marginTop: 26, marginBottom: 14 },

  // Arcanos (slots activos)
  arcanaHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 12 },
  arcanaHeadRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  arcanaHeadCount: { fontSize: 12, letterSpacing: 1 },
  arcSlotsRow: { flexDirection: 'row', gap: ARC_SLOT_GAP },
  arcSlotEmpty: { width: ARC_SLOT_W, height: ARC_SLOT_H, borderRadius: 3, borderWidth: 1.5, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  arcSlotEmptyLab: { fontSize: 10, letterSpacing: 1.5, marginTop: 3 },
  arcSlotInner: { position: 'absolute', left: 9, right: 8, top: 9, bottom: 9, justifyContent: 'space-between' },
  arcSlotName: { fontSize: 12, letterSpacing: 0.2 },
  arcSlotRom: { position: 'absolute', right: 5, bottom: 0, fontSize: 28, opacity: 0.16, includeFontPadding: false },
  arcSlotPill: { position: 'absolute', top: 6, right: 6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2, transform: [{ skewX: '-10deg' }] },
  arcSlotPillT: { fontSize: 10, letterSpacing: 0.5 },
  arcHint: { fontSize: 11, letterSpacing: 1, marginTop: 10, textAlign: 'center' },

  // Accesos rapidos (Notas / Calendario)
  quickRow: { flexDirection: 'row', gap: 12, marginTop: 14 },
  quickItem: { flex: 1 },
  quickTile: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 3, paddingVertical: 14, paddingHorizontal: 14, paddingLeft: 18, overflow: 'hidden' },
  quickAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 7, transform: [{ skewX: '-12deg' }], marginLeft: -3 },
  quickText: { fontSize: 14, letterSpacing: 1, marginLeft: 10 },

  // Misiones tile
  missTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 },
  missSlash: { fontSize: 26, marginLeft: 2, marginBottom: 4 },
  missLabel: { fontSize: 12, letterSpacing: 1.5, marginBottom: 6 },
  pendList: { marginTop: 12 },
  pendRow: { flexDirection: 'row', alignItems: 'center', marginTop: 7 },
  pendBar: { width: 4, height: 16, marginRight: 9, transform: [{ skewX: '-12deg' }] },
  pendName: { fontSize: 14, flex: 1 },
  pendMore: { fontSize: 11, letterSpacing: 1, marginTop: 8, marginLeft: 13 },

  // Progress bar
  barTrack: { height: 7, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },

  // Atributos
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  statTileWrap: { flex: 1, marginHorizontal: 4 },
  statTile: { paddingVertical: 12, paddingHorizontal: 0, alignItems: 'center' },
  statInner: { alignItems: 'center' },
  statLvl: { fontSize: 24, includeFontPadding: false, marginTop: 4 },

  // Arco
  arcTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 },
  arcName: { fontSize: 19, letterSpacing: 0.5, marginRight: 10, flex: 1 },
  arcPct: { fontSize: 12, letterSpacing: 1, marginLeft: 6, marginBottom: 7 },

  // Finanzas
  finRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  finBalance: { fontSize: 32, includeFontPadding: false, marginTop: 2 },
  finMesBlock: { alignItems: 'flex-end' },
  finMes: { fontSize: 22, includeFontPadding: false, marginTop: 2 },
});
