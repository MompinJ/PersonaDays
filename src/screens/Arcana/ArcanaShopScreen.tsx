import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Pressable, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGame } from '../../context/GameContext';
import { useAlert } from '../../context/AlertContext';
import { useFocusEntrance } from '../../hooks/useFocusEntrance';
import { db } from '../../database';
import { buyArcano, buyNextSlot } from '../../services/arcanaService';
import { arcanaPrice, arcanaUnlockLevel, SLOT_PRICES, MAX_SLOTS } from '../../data/arcanaEffects';
import { ARCANA_META, arcanaColor } from '../../data/arcanaMeta';
import { PersonaShard } from '../../components/UI/PersonaShard';
import { PressableScale } from '../../components/UI/PressableScale';
import { getContrastText } from '../../utils/colorUtils';
import { CutCard, StatEmblem } from '../../components/Arcana/ArcanaBits';
import { ArcanaPurchaseModal, type ShopCardData } from '../../components/Arcana/ArcanaPurchaseModal';

const { width: SW } = Dimensions.get('window');
const H_PAD = 16;
const COLS = 3;
const GAP = 10;
const CARD_W = Math.floor((SW - H_PAD * 2 - GAP * (COLS - 1)) / COLS);
const CARD_H = Math.round(CARD_W * 1.5);

const fmt = (n: number) => Math.round(n || 0).toLocaleString('es-MX');

type ShopStatus = 'buy' | 'owned' | 'level';
interface ShopItem extends ShopCardData { lvlReq: number; status: ShopStatus; }

type Filter = 'todos' | 'buy' | 'owned' | 'level';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'todos', label: 'TODOS' },
  { key: 'buy', label: 'COMPRAR' },
  { key: 'owned', label: 'EN PODER' },
  { key: 'level', label: 'BLOQUEADOS' },
];

// Boosts / consumibles: PLACEHOLDERS (mecanica futura, sin logica). Se quitan o
// linkean a la BD cuando el back los defina.
const TEASERS: { id: string; name: string; desc: string; icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap; tint: string }[] = [
  { id: 'yen2x', name: 'DOBLE YENES', desc: 'x2 yenes ganados · 30 min', icon: 'cash', tint: '#E0BC4E' },
  { id: 'xp50', name: 'IMPULSO XP', desc: '+50% XP · 1 hora', icon: 'flash', tint: '#A98CE6' },
  { id: 'breakcd', name: 'ROMPER ESPERA', desc: 'Libera un arcano en cooldown', icon: 'time', tint: '#67C796' },
  { id: 'early', name: 'DESBLOQUEO ANTICIPADO', desc: 'Compra un arcano sin tener el nivel', icon: 'lock-open', tint: '#7FB2E8' },
];

export const ArcanaShopScreen = () => {
  const { theme, player, refreshUser } = useGame();
  const navigation = useNavigation<any>();
  const { showAlert } = useAlert();
  const { style: introStyle } = useFocusEntrance(18, 440);

  const playerId = player?.id_jugador;
  const [rows, setRows] = useState<any[]>([]);
  const [ownedSet, setOwnedSet] = useState<Set<number>>(new Set());
  const [nivel, setNivel] = useState(player?.nivel_jugador ?? 1);
  const [yenes, setYenes] = useState(player?.yenes ?? 0);
  const [slots, setSlots] = useState(1);
  const [filter, setFilter] = useState<Filter>('todos');
  const [confirmCard, setConfirmCard] = useState<ShopCardData | null>(null);
  const [obtained, setObtained] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!playerId) return;
    try {
      const r: any[] = await db.getAllAsync('SELECT id_arcano, simbolo, nombre_arcano, stat_asociado, efecto_descripcion FROM arcanos ORDER BY id_arcano');
      const own: any[] = await db.getAllAsync('SELECT id_arcano FROM jugador_arcanos WHERE id_jugador = ?', [playerId]);
      const p: any = await db.getFirstAsync('SELECT nivel_jugador, yenes, slots_desbloqueados FROM jugadores WHERE id_jugador = ?', [playerId]);
      setRows(r || []);
      setOwnedSet(new Set((own || []).map((o) => o.id_arcano)));
      if (p) { setNivel(p.nivel_jugador || 1); setYenes(p.yenes || 0); setSlots(p.slots_desbloqueados || 1); }
    } catch (e) { console.error('Error cargando tienda:', e); }
  }, [playerId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const items: ShopItem[] = useMemo(() => rows.map((r) => {
    const id = r.id_arcano;
    const vm = ARCANA_META[id] || ({} as any);
    const owned = ownedSet.has(id);
    const lvlReq = arcanaUnlockLevel(id);
    const status: ShopStatus = owned ? 'owned' : (nivel >= lvlReq ? 'buy' : 'level');
    return { id, rom: r.simbolo, name: r.nombre_arcano, en: vm.en || '', statEs: r.stat_asociado, efecto: r.efecto_descripcion, color: vm.color || arcanaColor(id), price: arcanaPrice(id), lvlReq, status };
  }), [rows, ownedSet, nivel]);

  const counts = useMemo(() => ({
    buy: items.filter((i) => i.status === 'buy').length,
    owned: items.filter((i) => i.status === 'owned').length,
    level: items.filter((i) => i.status === 'level').length,
  }), [items]);

  const shown = useMemo(() => (filter === 'todos' ? items : items.filter((i) => i.status === filter)), [items, filter]);

  // ---- compra de arcano ----
  const openBuy = (it: ShopItem) => {
    if (it.status === 'owned') { showAlert('Ya en poder', 'Ya posees este arcano. Equípalo desde tu colección.'); return; }
    if (it.status === 'level') { showAlert('Bloqueado por nivel', `Requiere nivel de jugador ${it.lvlReq}. Te faltan ${Math.max(0, it.lvlReq - nivel)}.`); return; }
    setObtained(false);
    setConfirmCard(it);
  };
  const confirmBuy = async () => {
    if (!playerId || !confirmCard) return;
    setBusy(true);
    try {
      const res = await buyArcano(playerId, confirmCard.id);
      if (!res.ok) { showAlert('No se pudo comprar', res.reason); setBusy(false); return; }
      await refreshUser();
      await load();
      setObtained(true);
    } catch (e) { console.error(e); showAlert('Error', 'No se pudo completar la compra.'); }
    setBusy(false);
  };

  // ---- compra de slot ----
  const buySlot = (n: number, price: number) => {
    showAlert('Comprar slot', `¿Desbloquear el slot ${n} por ¥${fmt(price)}?`, [
      { text: 'CANCELAR', style: 'cancel' },
      { text: 'COMPRAR', onPress: async () => {
        if (!playerId) return;
        const res = await buyNextSlot(playerId);
        if (!res.ok) { showAlert('No se pudo', res.reason); return; }
        await refreshUser(); await load();
      } },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background, paddingTop: 6 }]}>
      {/* Header */}
      <View style={styles.header}>
        <PressableScale style={[styles.backBtn, { borderColor: theme.border, backgroundColor: theme.surface }]} onPress={() => navigation.goBack()} scaleTo={0.88}>
          <Ionicons name="chevron-back" size={22} color={theme.primary} />
        </PressableScale>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { color: theme.primary, fontFamily: theme.fonts?.condensed }]}>EMPORIO · ARCANOS</Text>
          <PersonaShard label="TIENDA" height={46} fontSize={26} font={theme.fonts?.title} />
        </View>
        <View style={[styles.wallet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.wYen, { color: theme.text, fontFamily: theme.fonts?.display }]}>¥{fmt(yenes)}</Text>
          <Text style={[styles.wLvl, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>NIVEL {nivel}</Text>
        </View>
      </View>

      <Animated.View style={[{ flex: 1 }, introStyle]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: H_PAD, paddingBottom: 40 }}>
          {/* ===== Slots de equipo ===== */}
          <View style={styles.sectionHead}>
            <PersonaShard label="SLOTS DE EQUIPO" />
            <Text style={[styles.counter, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>{slots} / {MAX_SLOTS}</Text>
          </View>
          <View style={styles.slotRow}>
            {Array.from({ length: MAX_SLOTS }, (_, i) => i + 1).map((n) => {
              const unlocked = n <= slots;
              const isNext = n === slots + 1;
              const price = SLOT_PRICES[n];
              return (
                <TouchableOpacity key={n} activeOpacity={isNext ? 0.85 : 1} disabled={!isNext}
                  onPress={() => isNext && price && buySlot(n, price)}
                  style={[styles.slotTile, { borderColor: unlocked ? theme.success : isNext ? theme.primary : theme.border, backgroundColor: theme.surface, borderStyle: unlocked ? 'solid' : 'dashed', opacity: !unlocked && !isNext ? 0.55 : 1 }]}>
                  <Ionicons name={unlocked ? 'checkmark-circle' : isNext ? 'add-circle' : 'lock-closed'} size={20} color={unlocked ? theme.success : isNext ? theme.primary : theme.textDim} />
                  <Text style={[styles.slotN, { color: theme.text, fontFamily: theme.fonts?.heading }]}>SLOT {n}</Text>
                  {unlocked
                    ? <Text style={[styles.slotSub, { color: theme.success, fontFamily: theme.fonts?.condensed }]}>ACTIVO</Text>
                    : <Text style={[styles.slotPrice, { color: isNext ? theme.primary : theme.textDim, fontFamily: theme.fonts?.display }]}>¥{fmt(price || 0)}</Text>}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ===== Boosts & consumibles (teaser placeholder) ===== */}
          <View style={styles.sectionHead}>
            <PersonaShard label="BOOSTS & CONSUMIBLES" />
            <Text style={[styles.counter, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>PRONTO</Text>
          </View>
          {TEASERS.map((t) => (
            <View key={t.id} style={[styles.teaser, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={[styles.teaserIco, { borderColor: t.tint }]}>
                <Ionicons name={t.icon} size={20} color={t.tint} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.teaserName, { color: theme.text, fontFamily: theme.fonts?.heading }]}>{t.name}</Text>
                <Text style={[styles.teaserDesc, { color: theme.textDim, fontFamily: theme.fonts?.body }]}>{t.desc}</Text>
              </View>
              <View style={[styles.soonFlag, { borderColor: theme.border }]}>
                <Text style={[styles.soonText, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>PRONTO</Text>
              </View>
            </View>
          ))}

          {/* ===== Catalogo ===== */}
          <View style={styles.sectionHead}>
            <PersonaShard label="CATÁLOGO · 0–XXI" />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {FILTERS.map((f, i) => {
              const active = filter === f.key;
              const sk = [-13, 11, -12, 13][i % 4];
              const acc = i % 2 === 0 ? theme.primary : theme.secondary;
              const n = f.key === 'todos' ? items.length : (counts as any)[f.key];
              return (
                <TouchableOpacity key={f.key} activeOpacity={0.85} onPress={() => setFilter(f.key)}
                  style={[styles.filterChip, { borderColor: acc, backgroundColor: active ? acc : theme.surface, transform: [{ skewX: `${sk}deg` }] }]}>
                  <Text style={[styles.filterText, { color: active ? getContrastText(acc) : theme.textDim, fontFamily: theme.fonts?.heading, transform: [{ skewX: `${-sk}deg` }] }]}>{f.label} {n}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.grid}>
            {shown.map((it) => (
              <ShopCard key={it.id} item={it} theme={theme} screenBg={theme.background} onPress={() => openBuy(it)} />
            ))}
          </View>
        </ScrollView>
      </Animated.View>

      <ArcanaPurchaseModal
        visible={!!confirmCard}
        card={confirmCard}
        saldo={yenes}
        busy={busy}
        obtained={obtained}
        onConfirm={confirmBuy}
        onClose={() => { setConfirmCard(null); setObtained(false); }}
      />
    </SafeAreaView>
  );
};

// ---------- Carta de catalogo ----------
const ShopCard = ({ item, theme, screenBg, onPress }: any) => {
  const jewel = item.color;
  const dim = item.status !== 'buy';
  return (
    <Pressable onPress={onPress} style={{ marginBottom: GAP }}>
      <CutCard w={CARD_W} h={CARD_H} color={dim ? theme.textDim : jewel} panelBg={theme.surface} screenBg={screenBg} cut={12} borderWidth={1.5} dim={item.status === 'level'} style={{ shadowColor: jewel, ...softGlow }}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: jewel, opacity: 0.07 }]} />
        <Text style={[styles.miniRom, { color: jewel, fontFamily: theme.fonts?.display }]}>{item.rom}</Text>
        <View style={styles.miniEmblem}>
          <StatEmblem stat={item.statEs} size={34} color={dim ? theme.textDim : jewel} />
        </View>
        <View style={styles.miniFoot}>
          <Text numberOfLines={1} style={[styles.miniName, { color: theme.text, fontFamily: theme.fonts?.title }]}>{item.name.toUpperCase()}</Text>
        </View>

        {item.status === 'buy' && (
          <View style={[styles.priceChip, { backgroundColor: theme.primary }]}>
            <Text style={[styles.priceChipT, { color: theme.textInverse, fontFamily: theme.fonts?.display }]}>¥{fmt(item.price)}</Text>
          </View>
        )}
        {item.status === 'owned' && (
          <View style={[styles.ownedRib, { backgroundColor: theme.success }]}>
            <Ionicons name="checkmark" size={10} color={getContrastText(theme.success)} />
            <Text style={[styles.ownedRibT, { color: getContrastText(theme.success), fontFamily: theme.fonts?.condensed }]}>EN PODER</Text>
          </View>
        )}
        {item.status === 'level' && (
          <>
            <View style={styles.miniMark}><Ionicons name="lock-closed" size={20} color={theme.textDim} /></View>
            <View style={[styles.priceChip, { backgroundColor: theme.surface, borderColor: theme.textDim, borderWidth: 1 }]}>
              <Text style={[styles.priceChipT, { color: theme.textDim, fontFamily: theme.fonts?.display }]}>NV {item.lvlReq}</Text>
            </View>
          </>
        )}
      </CutCard>
    </Pressable>
  );
};

const softGlow = { elevation: 6, shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } };

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: H_PAD, paddingBottom: 10, gap: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  eyebrow: { fontSize: 11, letterSpacing: 2.5, marginBottom: 2, marginLeft: 2, transform: [{ skewX: '-8deg' }] },
  wallet: { alignItems: 'flex-end', borderWidth: 1.5, borderRadius: 3, paddingHorizontal: 12, paddingVertical: 6, marginTop: 6, transform: [{ skewX: '-9deg' }] },
  wYen: { fontSize: 18, includeFontPadding: false },
  wLvl: { fontSize: 10, letterSpacing: 1, marginTop: 1 },

  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 12 },
  counter: { fontSize: 12, letterSpacing: 1.5 },

  // Slots
  slotRow: { flexDirection: 'row', gap: 8 },
  slotTile: { flex: 1, borderWidth: 1.5, borderRadius: 3, paddingVertical: 12, alignItems: 'center' },
  slotN: { fontSize: 14, letterSpacing: 0.5, marginTop: 6 },
  slotSub: { fontSize: 10, letterSpacing: 1, marginTop: 2 },
  slotPrice: { fontSize: 15, marginTop: 2, includeFontPadding: false },

  // Teaser rows
  teaser: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 3, padding: 12, marginBottom: 10 },
  teaserIco: { width: 40, height: 40, borderRadius: 2, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', marginRight: 12, transform: [{ skewX: '-8deg' }] },
  teaserName: { fontSize: 16, letterSpacing: 0.5 },
  teaserDesc: { fontSize: 12, marginTop: 2 },
  soonFlag: { borderWidth: 1, borderRadius: 2, paddingHorizontal: 8, paddingVertical: 3, transform: [{ skewX: '-10deg' }] },
  soonText: { fontSize: 10, letterSpacing: 1 },

  // Filtros
  filterRow: { paddingVertical: 2, paddingRight: 16, gap: 10, alignItems: 'flex-start' },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1.5, borderRadius: 2 },
  filterText: { fontSize: 13, letterSpacing: 1 },

  // Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 14 },
  miniRom: { position: 'absolute', top: 2, right: 6, fontSize: CARD_W * 0.5, opacity: 0.13, includeFontPadding: false },
  miniEmblem: { position: 'absolute', top: CARD_H * 0.22, left: 0, right: 0, alignItems: 'center' },
  miniFoot: { position: 'absolute', left: 8, right: 8, bottom: 10 },
  miniName: { fontSize: 12.5, letterSpacing: 0.2, transform: [{ skewX: '-5deg' }] },
  miniMark: { position: 'absolute', top: CARD_H * 0.4, left: 0, right: 0, alignItems: 'center' },
  priceChip: { position: 'absolute', bottom: 30, alignSelf: 'center', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 2, transform: [{ skewX: '-10deg' }] },
  priceChipT: { fontSize: 13, includeFontPadding: false },
  ownedRib: { position: 'absolute', top: 8, left: 6, flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2, transform: [{ skewX: '-10deg' }] },
  ownedRibT: { fontSize: 9, letterSpacing: 0.5 },
});

export default ArcanaShopScreen;
