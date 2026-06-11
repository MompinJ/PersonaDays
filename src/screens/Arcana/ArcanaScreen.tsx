import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Pressable, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGame } from '../../context/GameContext';
import { useAlert } from '../../context/AlertContext';
import { useFocusEntrance } from '../../hooks/useFocusEntrance';
import { db } from '../../database';
import { getPlayerArcanaOverview, equipArcano, unequipArcano } from '../../services/arcanaService';
import { SLOT_PRICES, MAX_SLOTS } from '../../data/arcanaEffects';
import { ARCANA_META, arcanaColor, deriveArcanaState, daysUntil, type ArcanaCard } from '../../data/arcanaMeta';
import { PersonaShard } from '../../components/UI/PersonaShard';
import { PressableScale } from '../../components/UI/PressableScale';
import { getContrastText } from '../../utils/colorUtils';
import { CutCard, StatEmblem } from '../../components/Arcana/ArcanaBits';
import { ArcanaDetailModal } from '../../components/Arcana/ArcanaDetailModal';
import { MenuGlyph } from '../../components/UI/MenuGlyphs';

const { width: SW } = Dimensions.get('window');
const H_PAD = 16;
const COLS = 3;
const GRID_GAP = 10;
const CARD_W = Math.floor((SW - H_PAD * 2 - GRID_GAP * (COLS - 1)) / COLS);
const CARD_H = Math.round(CARD_W * 1.5);
const SLOT_GAP = 8;
const SLOT_W = Math.floor((SW - H_PAD * 2 - SLOT_GAP * (MAX_SLOTS - 1)) / MAX_SLOTS);
const SLOT_H = 96;

const fmt = (n: number) => Math.round(n || 0).toLocaleString('es-MX');

export const ArcanaScreen = () => {
  const { theme, player } = useGame();
  const navigation = useNavigation<any>();
  const { showAlert } = useAlert();
  const { style: introStyle } = useFocusEntrance(18, 440);

  const playerId = player?.id_jugador;
  const [overview, setOverview] = useState<any>(null);
  const [metaMap, setMetaMap] = useState<Record<number, any>>({});
  const [nivel, setNivel] = useState(player?.nivel_jugador ?? 1);
  const [yenes, setYenes] = useState(player?.yenes ?? 0);
  const [selected, setSelected] = useState<ArcanaCard | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!playerId) return;
    try {
      const ov = await getPlayerArcanaOverview(playerId);
      const rows: any[] = await db.getAllAsync('SELECT id_arcano, simbolo, nombre_arcano, stat_asociado, efecto_descripcion FROM arcanos');
      const map: Record<number, any> = {};
      (rows || []).forEach((r) => { map[r.id_arcano] = { rom: r.simbolo, name: r.nombre_arcano, statEs: r.stat_asociado, efecto: r.efecto_descripcion }; });
      const p: any = await db.getFirstAsync('SELECT nivel_jugador, yenes FROM jugadores WHERE id_jugador = ?', [playerId]);
      setOverview(ov);
      setMetaMap(map);
      if (p) { setNivel(p.nivel_jugador || 1); setYenes(p.yenes || 0); }
    } catch (e) {
      console.error('Error cargando arcanos:', e);
    }
  }, [playerId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Construir las cartas poseidas
  const cards: ArcanaCard[] = useMemo(() => {
    if (!overview) return [];
    return (overview.arcanos || []).map((o: any) => {
      const dbm = metaMap[o.id_arcano] || {};
      const vm = ARCANA_META[o.id_arcano] || ({} as any);
      return {
        id: o.id_arcano,
        rom: dbm.rom || '',
        name: dbm.name || '',
        en: vm.en || '',
        statEs: dbm.statEs || '',
        efecto: dbm.efecto || '',
        flavor: vm.flavor || '',
        color: vm.color || arcanaColor(o.id_arcano),
        state: deriveArcanaState(o),
        slot: o.slot,
        bloqueadoHasta: o.bloqueadoHasta,
        disponibleDesde: o.disponibleDesde,
      } as ArcanaCard;
    }).sort((a: ArcanaCard, b: ArcanaCard) => a.id - b.id);
  }, [overview, metaMap]);

  const cardById = (id: number) => cards.find((c) => c.id === id) || null;
  const slotCount = overview?.slotsDesbloqueados ?? 1;
  const slots = useMemo(() => Array.from({ length: slotCount }, (_, i) => cards.find((c) => c.slot === i + 1) || null), [slotCount, cards]);

  // Banner de ciclo: bloqueo mas cercano o rotacion
  const cycle = useMemo(() => {
    const locked = cards.filter((c) => c.state === 'locked' && c.bloqueadoHasta);
    if (locked.length) {
      const d = Math.min(...locked.map((c) => daysUntil(c.bloqueadoHasta)));
      return `BLOQUEO · ${d} DÍA${d === 1 ? '' : 'S'}`;
    }
    if (cards.some((c) => c.state === 'cooldown')) return 'ROTA EL LUNES';
    return 'SIN BLOQUEOS';
  }, [cards]);

  // ---- acciones ----
  const doEquip = async (card: ArcanaCard) => {
    if (!playerId) return;
    const free = Array.from({ length: slotCount }, (_, i) => i + 1).find((n) => !cards.some((c) => c.slot === n));
    if (!free) { showAlert('Sin slots libres', 'Quita un arcano equipado o desbloquea más slots para equipar este.'); return; }
    setBusy(true);
    try {
      const res = await equipArcano(playerId, card.id, free);
      if (!res.ok) showAlert('No se pudo equipar', res.reason);
      await load();
      setSelected(null);
    } catch (e) { console.error(e); showAlert('Error', 'No se pudo equipar el arcano.'); }
    setBusy(false);
  };

  const doUnequip = async (card: ArcanaCard) => {
    if (!playerId || card.slot == null) return;
    setBusy(true);
    try {
      const res = await unequipArcano(playerId, card.slot);
      if (!res.ok) showAlert('No se pudo quitar', res.reason);
      await load();
      setSelected(null);
    } catch (e) { console.error(e); showAlert('Error', 'No se pudo quitar el arcano.'); }
    setBusy(false);
  };

  const enPoder = cards.length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background, paddingTop: 6 }]}>
      {/* ===== Header ===== */}
      <View style={styles.header}>
        <PressableScale style={[styles.backBtn, { borderColor: theme.border, backgroundColor: theme.surface }]} onPress={() => navigation.goBack()} scaleTo={0.88}>
          <Ionicons name="chevron-back" size={22} color={theme.primary} />
        </PressableScale>
        <View style={{ flex: 1 }}>
          <PersonaShard label="ARCANOS" height={48} fontSize={26} font={theme.fonts?.title} />
        </View>
        <View style={styles.pills}>
          <View style={[styles.pill, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.pillLab, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>NV</Text>
            <Text style={[styles.pillVal, { color: theme.primary, fontFamily: theme.fonts?.display }]}>{nivel}</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.pillVal, { color: theme.text, fontFamily: theme.fonts?.display }]}>¥{fmt(yenes)}</Text>
          </View>
        </View>
        <PressableScale style={[styles.shopBtn, { backgroundColor: theme.primary }]} onPress={() => navigation.navigate('ArcanaShop')} scaleTo={0.88}>
          <MenuGlyph name="emporio" size={24} color={theme.textInverse} active />
        </PressableScale>
      </View>

      <Animated.View style={[{ flex: 1 }, introStyle]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: H_PAD, paddingBottom: 40 }}>
          {/* ===== Slots ===== */}
          <View style={styles.sectionHead}>
            <PersonaShard label="MIS SLOTS" />
            <View style={styles.cycleRow}>
              <Ionicons name="calendar-outline" size={14} color={theme.primary} />
              <Text style={[styles.cycleText, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>{cycle}</Text>
            </View>
          </View>

          <View style={styles.slotsRow}>
            {Array.from({ length: MAX_SLOTS }, (_, i) => i + 1).map((n) => {
              if (n <= slotCount) {
                const card = slots[n - 1];
                return <Slot key={n} card={card} theme={theme} screenBg={theme.background} onPress={() => card && setSelected(card)} />;
              }
              const price = SLOT_PRICES[n];
              return (
                <TouchableOpacity key={n} activeOpacity={0.85} onPress={() => navigation.navigate('ArcanaShop')}
                  style={[styles.slot, styles.slotLocked, { borderColor: theme.primary }]}>
                  <Ionicons name="add" size={20} color={theme.primary} />
                  <Text style={[styles.slotBuyPrice, { color: theme.primary, fontFamily: theme.fonts?.display }]}>¥{fmt(price)}</Text>
                  <Text style={[styles.slotBuyLab, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>SLOT EXTRA</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ===== Coleccion ===== */}
          <View style={styles.sectionHead}>
            <PersonaShard label="COLECCIÓN" />
            <Text style={[styles.counter, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>{enPoder} / 22 EN PODER</Text>
          </View>

          {cards.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="albums-outline" size={48} color={theme.textDim} />
              <Text style={[styles.emptyT, { color: theme.textDim, fontFamily: theme.fonts?.bold }]}>Aún no tienes arcanos</Text>
              <Text style={[styles.emptyS, { color: theme.textDim, fontFamily: theme.fonts?.body }]}>Consíguelos en la tienda para equiparlos aquí.</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {cards.map((c) => (
                <MiniCard key={c.id} card={c} theme={theme} screenBg={theme.background} onPress={() => setSelected(c)} />
              ))}
            </View>
          )}
        </ScrollView>
      </Animated.View>

      <ArcanaDetailModal
        visible={!!selected}
        card={selected ? cardById(selected.id) : null}
        busy={busy}
        onClose={() => setSelected(null)}
        onEquip={doEquip}
        onUnequip={doUnequip}
      />
    </SafeAreaView>
  );
};

// ---------- Slot de la bandeja ----------
const Slot = ({ card, theme, screenBg, onPress }: any) => {
  if (!card) {
    return (
      <View style={[styles.slot, styles.slotEmpty, { borderColor: theme.border }]}>
        <Ionicons name="add" size={22} color={theme.textDim} />
        <Text style={[styles.slotEmptyLab, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>VACÍO</Text>
      </View>
    );
  }
  const jewel = card.color;
  const locked = card.state === 'locked';
  return (
    <Pressable onPress={onPress} style={{ width: SLOT_W }}>
      <CutCard w={SLOT_W} h={SLOT_H} color={jewel} panelBg={theme.surface} screenBg={screenBg} cut={12} borderWidth={1.5} style={{ shadowColor: jewel, ...softGlow }}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: jewel, opacity: 0.08 }]} />
        <View style={styles.slotInner}>
          <View style={styles.slotTop}>
            <StatEmblem stat={card.statEs} size={18} color={jewel} />
            <Text numberOfLines={1} style={[styles.slotStat, { color: jewel, fontFamily: theme.fonts?.condensed }]}>{card.statEs.toUpperCase()}</Text>
          </View>
          <Text numberOfLines={1} style={[styles.slotName, { color: theme.text, fontFamily: theme.fonts?.title }]}>{card.name.toUpperCase()}</Text>
        </View>
        <Text style={[styles.slotRom, { color: jewel, fontFamily: theme.fonts?.display }]}>{card.rom}</Text>
        <View style={[styles.slotPill, { backgroundColor: locked ? jewel : theme.success }]}>
          <Text style={[styles.slotPillT, { color: getContrastText(locked ? jewel : theme.success), fontFamily: theme.fonts?.condensed }]}>
            {locked ? `${daysUntil(card.bloqueadoHasta)}D` : 'LIBRE'}
          </Text>
        </View>
      </CutCard>
    </Pressable>
  );
};

// ---------- Mini-carta de coleccion ----------
const MiniCard = ({ card, theme, screenBg, onPress }: any) => {
  const jewel = card.color;
  const dim = card.state === 'cooldown';
  return (
    <Pressable onPress={onPress} style={{ marginBottom: GRID_GAP }}>
      <CutCard w={CARD_W} h={CARD_H} color={dim ? theme.textDim : jewel} panelBg={theme.surface} screenBg={screenBg} cut={12} borderWidth={1.5} dim={dim} style={{ shadowColor: jewel, ...softGlow }}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: jewel, opacity: 0.07 }]} />
        <Text style={[styles.miniRom, { color: jewel, fontFamily: theme.fonts?.display }]}>{card.rom}</Text>
        <View style={styles.miniEmblem}>
          <StatEmblem stat={card.statEs} size={34} color={dim ? theme.textDim : jewel} />
        </View>
        <View style={styles.miniFoot}>
          <Text numberOfLines={1} style={[styles.miniName, { color: theme.text, fontFamily: theme.fonts?.title }]}>{card.name.toUpperCase()}</Text>
          <Text numberOfLines={1} style={[styles.miniEff, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>{card.efecto}</Text>
        </View>

        {/* badges de estado */}
        {(card.state === 'active' || card.state === 'locked') && (
          <View style={[styles.miniBadge, { backgroundColor: jewel }]}>
            <Ionicons name={card.state === 'locked' ? 'lock-closed' : 'checkmark'} size={11} color={getContrastText(jewel)} />
            <Text style={[styles.miniBadgeT, { color: getContrastText(jewel), fontFamily: theme.fonts?.condensed }]}>
              {card.state === 'locked' ? `${daysUntil(card.bloqueadoHasta)}D` : 'EQUIP'}
            </Text>
          </View>
        )}
        {card.state === 'available' && (
          <View style={[styles.miniTick, { backgroundColor: theme.success }]}>
            <Ionicons name="checkmark" size={12} color={getContrastText(theme.success)} />
          </View>
        )}
        {card.state === 'cooldown' && (
          <View style={[styles.miniBadge, { backgroundColor: theme.surface, borderColor: theme.textDim, borderWidth: 1 }]}>
            <Ionicons name="time" size={11} color={theme.textDim} />
            <Text style={[styles.miniBadgeT, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>LUN</Text>
          </View>
        )}
      </CutCard>
    </Pressable>
  );
};

const softGlow = { elevation: 6, shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } };

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: H_PAD, paddingBottom: 10, gap: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  shopBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  pills: { alignItems: 'flex-end', gap: 5 },
  pill: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 3, paddingHorizontal: 10, paddingVertical: 4, transform: [{ skewX: '-9deg' }] },
  pillLab: { fontSize: 10, letterSpacing: 1, marginRight: 4 },
  pillVal: { fontSize: 16, includeFontPadding: false },

  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 12 },
  cycleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cycleText: { fontSize: 12, letterSpacing: 1 },
  counter: { fontSize: 12, letterSpacing: 1 },

  // Slots
  slotsRow: { flexDirection: 'row', gap: SLOT_GAP },
  slot: { width: SLOT_W, height: SLOT_H, borderRadius: 3, justifyContent: 'center', alignItems: 'center' },
  slotEmpty: { borderWidth: 1.5, borderStyle: 'dashed' },
  slotEmptyLab: { fontSize: 11, letterSpacing: 1.5, marginTop: 4 },
  slotLocked: { borderWidth: 1.5, borderStyle: 'dashed' },
  slotBuyPrice: { fontSize: 16, marginTop: 2 },
  slotBuyLab: { fontSize: 9, letterSpacing: 1, marginTop: 1 },
  slotInner: { position: 'absolute', left: 10, right: 8, top: 10, bottom: 10, justifyContent: 'space-between' },
  slotTop: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  slotStat: { fontSize: 9, letterSpacing: 0.5, flex: 1 },
  slotName: { fontSize: 13, letterSpacing: 0.3 },
  slotRom: { position: 'absolute', right: 6, bottom: 2, fontSize: 30, opacity: 0.16, includeFontPadding: false },
  slotPill: { position: 'absolute', top: 6, right: 6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2, transform: [{ skewX: '-10deg' }] },
  slotPillT: { fontSize: 10, letterSpacing: 0.5 },

  // Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  miniRom: { position: 'absolute', top: 2, right: 6, fontSize: CARD_W * 0.5, opacity: 0.13, includeFontPadding: false },
  miniEmblem: { position: 'absolute', top: CARD_H * 0.2, left: 0, right: 0, alignItems: 'center' },
  miniFoot: { position: 'absolute', left: 8, right: 8, bottom: 9 },
  miniName: { fontSize: 12.5, letterSpacing: 0.2, transform: [{ skewX: '-5deg' }] },
  miniEff: { fontSize: 9.5, letterSpacing: 0.2, marginTop: 1 },
  miniBadge: { position: 'absolute', top: 6, left: 6, flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 2, transform: [{ skewX: '-10deg' }] },
  miniBadgeT: { fontSize: 9, letterSpacing: 0.5 },
  miniTick: { position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },

  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 50 },
  emptyT: { fontSize: 16, marginTop: 14, letterSpacing: 0.5 },
  emptyS: { fontSize: 13, marginTop: 6, textAlign: 'center', paddingHorizontal: 30 },
});

export default ArcanaScreen;
