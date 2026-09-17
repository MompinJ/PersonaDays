import React, { useCallback, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Animated, Pressable, InteractionManager } from 'react-native';
import { useFocusEntrance } from '../../hooks/useFocusEntrance';
import { ListSkeleton, SkeletonBar } from '../../components/UI/Skeleton';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../themes/useTheme';
import TransactionModal from '../../components/Economy/TransactionModal';
import SpendingDonut, { DonutSlice } from '../../components/Economy/SpendingDonut';
import SettleModal from '../../components/Economy/SettleModal';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CategoryIcon, getCategory } from '../../components/category-icons';
import { getContrastText, distinguishColors } from '../../utils/colorUtils';
import { PersonaShard } from '../../components/UI/PersonaShard';
import {
  getTransactions, getBreakdownByCategory, getPeriodSummary, getLiquidaciones,
  getReceivables, Transaction, Liquidacion, Receivable, PeriodSummary,
} from '../../services/economyService';

// Formatea un monto como Yenes (enteros, separador de miles) para ser consistente
// con el resto de la app (misiones, recompensas).
const formatYen = (n: number) => Math.round(n || 0).toLocaleString('es-MX');

// Inicio (inclusive) y fin (exclusivo) del mes actual en formato 'YYYY-MM-DD HH:MM:SS'
// para comparar contra la columna `fecha` (string ISO con espacio).
const getMonthBounds = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const pad = (n: number) => String(n + 1).padStart(2, '0');
  const start = `${y}-${pad(m)}-01 00:00:00`;
  const ny = m === 11 ? y + 1 : y;
  const nm = m === 11 ? 0 : m + 1;
  const end = `${ny}-${pad(nm)}-01 00:00:00`;
  const label = now.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }).toUpperCase();
  return { start, end, label };
};

export const EconomyScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [resumen, setResumen] = useState<PeriodSummary | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState<Transaction | null>(null);
  const [monthSlices, setMonthSlices] = useState<DonutSlice[]>([]);
  const [monthTotal, setMonthTotal] = useState(0);
  const [porCobrar, setPorCobrar] = useState<Receivable[]>([]);
  // Partes cargadas por movimiento: solo se piden al desplegar el arbol.
  const [arbol, setArbol] = useState<Record<number, Liquidacion[]>>({});
  const [abierto, setAbierto] = useState<Record<number, boolean>>({});
  // load() queda capturado por el useFocusEffect de deps vacias, asi que no
  // puede leer `abierto` del estado (veria siempre el del primer render).
  const abiertoRef = useRef<Record<number, boolean>>({});
  abiertoRef.current = abierto;
  // Parte que se esta registrando como devuelta (admite entradas parciales).
  const [cobrando, setCobrando] = useState<{ parte: Liquidacion; concepto: string | null } | null>(null);

  const { label: monthLabel } = getMonthBounds();

  // Entrada animada en CADA foco + feedback del FAB
  const { style: introStyle } = useFocusEntrance(18, 420);
  const fabScale = useRef(new Animated.Value(1)).current;
  const [firstLoad, setFirstLoad] = useState(true);

  const load = async () => {
    try {
      const { start, end } = getMonthBounds();
      const [rows, sum, byCat, deudas] = await Promise.all([
        getTransactions(),
        getPeriodSummary(start, end),
        getBreakdownByCategory(start, end, 'GASTO'),
        getReceivables(),
      ]);
      setTransactions(rows);
      setResumen(sum);
      setPorCobrar(deudas);

      // El donut usa el gasto NETO: si te reembolsaron parte, esa parte no fue
      // tu gasto y no deberia inflar la categoria.
      const conGasto = byCat.filter((c) => c.neto > 0);
      const totalMes = conGasto.reduce((s, c) => s + c.neto, 0);
      setMonthTotal(totalMes);

      // Top 5 + "Otros" para no saturar el donut (regla: no pie/donut con >5-6 categorias)
      const TOP = 5;
      const top = conGasto.slice(0, TOP);
      // Colores derivados en bloque: si dos categorias comparten tono, el
      // grafico les da variantes distinguibles. Leyenda y arcos comparten el
      // mismo array, asi que siempre coinciden.
      const colores = distinguishColors(top.map((c) => c.color || theme.primary), theme.primary);
      const slices: DonutSlice[] = top.map((c, i) => ({ label: c.nombre, value: c.neto, color: colores[i] }));
      if (conGasto.length > TOP) {
        const resto = conGasto.slice(TOP).reduce((s, c) => s + c.neto, 0);
        if (resto > 0) slices.push({ label: 'Otros', value: resto, color: theme.textDim });
      }
      setMonthSlices(slices);

      // Refrescar las ramas ya desplegadas para que reflejen los abonos nuevos.
      const abiertos = Object.keys(abiertoRef.current).filter((k) => abiertoRef.current[Number(k)]).map(Number);
      if (abiertos.length > 0) {
        const cargadas = await Promise.all(abiertos.map((id) => getLiquidaciones(id)));
        setArbol((prev) => {
          const next = { ...prev };
          abiertos.forEach((id, i) => { next[id] = cargadas[i]; });
          return next;
        });
      }
    } catch (e) {
      console.error('Error cargando finanzas', e);
    } finally {
      setFirstLoad(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      // Diferido: la entrada anima primero, luego consultamos la DB
      const task = InteractionManager.runAfterInteractions(load);
      return () => task.cancel();
    }, [])
  );

  const toggleArbol = async (tx: Transaction) => {
    const abrir = !abierto[tx.id_finanza];
    setAbierto((p) => ({ ...p, [tx.id_finanza]: abrir }));
    if (abrir && !arbol[tx.id_finanza]) {
      try {
        const partes = await getLiquidaciones(tx.id_finanza);
        setArbol((p) => ({ ...p, [tx.id_finanza]: partes }));
      } catch (e) {
        console.error('Error cargando partes', e);
      }
    }
  };

  const liquidar = (l: Liquidacion, concepto?: string | null) =>
    setCobrando({ parte: l, concepto: concepto ?? null });

  const abrirEdicion = (tx: Transaction) => { setEditando(tx); setModalVisible(true); };
  const abrirAlta = () => { setEditando(null); setModalVisible(true); };
  const cerrarModal = () => { setModalVisible(false); setEditando(null); };

  const pendienteTotal = porCobrar.reduce((s, r) => s + r.pendiente, 0);

  // --- Sub-render: etiqueta de seccion inclinada estilo Persona ---
  const SectionTag = ({ text }: { text: string }) => (
    <View style={styles.sectionTagWrap}>
      <PersonaShard label={text} />
    </View>
  );

  // --- Sub-render: cabecera (hero del mes + donut + por cobrar) ---
  const ListHeader = () => (
    <View>
      {/* HERO: balance DEL MES. Antes sumaba toda la historia, que no es un
          saldo real (nunca se registro un saldo inicial) y ademas no casaba
          con el donut, que si era mensual. */}
      <View style={[styles.heroCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={[styles.heroAccent, { backgroundColor: theme.primary }]} />
        <Text style={[styles.heroLabel, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>BALANCE DE {monthLabel}</Text>
        <Text
          style={[styles.heroBalance, { color: (resumen?.balance ?? 0) >= 0 ? theme.success : theme.error, fontFamily: theme.fonts?.display }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {(resumen?.balance ?? 0) >= 0 ? '+' : '-'}¥{formatYen(Math.abs(resumen?.balance ?? 0))}
        </Text>

        <View style={styles.heroSplitRow}>
          <View style={styles.heroSplitItem}>
            <MaterialCommunityIcons name="arrow-up-bold" size={16} color={theme.success} />
            <View style={{ marginLeft: 6 }}>
              <Text style={[styles.heroSplitLabel, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>INGRESOS</Text>
              <Text style={[styles.heroSplitValue, { color: theme.text, fontFamily: theme.fonts?.display }]}>¥{formatYen(resumen?.ingresosNetos ?? 0)}</Text>
            </View>
          </View>
          <View style={[styles.heroDivider, { backgroundColor: theme.border }]} />
          <View style={styles.heroSplitItem}>
            <MaterialCommunityIcons name="arrow-down-bold" size={16} color={theme.error} />
            <View style={{ marginLeft: 6 }}>
              <Text style={[styles.heroSplitLabel, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>GASTOS</Text>
              <Text style={[styles.heroSplitValue, { color: theme.text, fontFamily: theme.fonts?.display }]}>¥{formatYen(resumen?.gastosNetos ?? 0)}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.navigate('FinanceReport')}
          style={[styles.heroLink, { borderColor: theme.primary }]}
        >
          <MaterialCommunityIcons name="chart-box-outline" size={15} color={theme.primary} />
          <Text style={[styles.heroLinkText, { color: theme.primary, fontFamily: theme.fonts?.heading }]}>VER DESGLOSE COMPLETO</Text>
        </TouchableOpacity>
      </View>

      {/* POR RECUPERAR: todo lo que salio pero sabes que vuelve */}
      {porCobrar.length > 0 && (
        <>
          <SectionTag text="POR RECUPERAR" />
          <View style={[styles.debtCard, { backgroundColor: theme.surface, borderColor: theme.secondary }]}>
            <View style={styles.debtHead}>
              <Text style={[styles.debtHeadLabel, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>PENDIENTE DE VOLVER</Text>
              <Text style={[styles.debtHeadValue, { color: theme.secondary, fontFamily: theme.fonts?.display }]}>¥{formatYen(pendienteTotal)}</Text>
            </View>
            {porCobrar.slice(0, 5).map((r) => (
              <TouchableOpacity
                key={r.id_liquidacion}
                activeOpacity={0.85}
                onPress={() => liquidar(r, r.descripcion)}
                style={[styles.debtRow, { borderColor: theme.border }]}
              >
                <View style={[styles.debtDot, { backgroundColor: r.cat_color || theme.secondary }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.debtWho, { color: theme.text, fontFamily: theme.fonts?.bold }]} numberOfLines={1}>
                    {r.contraparte || 'Sin concepto'}
                  </Text>
                  <Text style={[styles.debtWhat, { color: theme.textDim }]} numberOfLines={1}>{r.descripcion || 'Sin descripción'}</Text>
                </View>
                <Text style={[styles.debtAmount, { color: theme.secondary, fontFamily: theme.fonts?.display }]}>¥{formatYen(r.pendiente)}</Text>
                <MaterialCommunityIcons name="cash-check" size={18} color={theme.success} style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            ))}
            {porCobrar.length > 5 && (
              <Text style={[styles.debtMore, { color: theme.textDim }]}>y {porCobrar.length - 5} más en el desglose</Text>
            )}
          </View>
        </>
      )}

      {/* DONUT DEL MES */}
      <SectionTag text={monthLabel} />
      <View style={[styles.chartCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {monthTotal > 0 ? (
          <View style={styles.chartRow}>
            <SpendingDonut
              data={monthSlices}
              total={monthTotal}
              size={170}
              centerValue={`¥${formatYen(monthTotal)}`}
              centerLabel="GASTADO"
            />
            <View style={styles.legend}>
              {monthSlices.map((s) => {
                const pct = Math.round((s.value / monthTotal) * 100);
                return (
                  <View key={s.label} style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: s.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.legendLabel, { color: theme.text }]} numberOfLines={1}>{s.label}</Text>
                      <Text style={[styles.legendSub, { color: theme.textDim }]}>¥{formatYen(s.value)}</Text>
                    </View>
                    <Text style={[styles.legendValue, { color: theme.textDim }]}>{pct}%</Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={styles.chartEmpty}>
            <MaterialCommunityIcons name="chart-donut" size={48} color={theme.textDim} />
            <Text style={[styles.emptyText, { color: theme.textDim }]}>Sin gastos este mes</Text>
          </View>
        )}
      </View>

      <SectionTag text="MOVIMIENTOS" />
    </View>
  );

  const renderItem = ({ item }: { item: Transaction }) => {
    const positive = item.tipo === 'INGRESO';
    const amountColor = positive ? theme.success : theme.error;
    const circleColor = item.cat_color || theme.inactive;
    const icon = item.cat_icono || 'tag';
    const fecha = item.fecha
      ? new Date(item.fecha.replace(' ', 'T')).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
      : '';
    const tienePartes = item.partes > 0;
    const netoDistinto = tienePartes && item.cobrado > 0;
    const open = !!abierto[item.id_finanza];
    const ramas = arbol[item.id_finanza] || [];

    return (
      <View style={{ marginBottom: 10 }}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => abrirEdicion(item)}
          style={[styles.itemRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <View style={[styles.itemAccent, { backgroundColor: circleColor }]} />
          <View style={[styles.iconCircle, { backgroundColor: circleColor }]}>
            <CategoryIcon category={getCategory(icon).key} size={20} skew={0} color={getContrastText(item.cat_color || undefined)} />
          </View>
          <View style={styles.itemCenter}>
            <Text style={[styles.desc, { color: theme.text, fontFamily: theme.fonts?.bold }]} numberOfLines={1}>
              {item.descripcion || 'Sin descripción'}
            </Text>
            <Text style={[styles.date, { color: theme.textDim }]}>
              {(item.categoria || '—') + '  ·  ' + fecha}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            {/* Con partes cobradas, el monto original se tacha y manda el neto:
                es lo que ese movimiento te costo de verdad. */}
            {netoDistinto && (
              <Text style={[styles.amountStrike, { color: theme.textDim }]}>¥{formatYen(item.monto)}</Text>
            )}
            <Text style={[styles.amount, { color: amountColor, fontFamily: theme.fonts?.display }]}>
              {positive ? '+' : '-'}¥{formatYen(netoDistinto ? item.neto : item.monto)}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Rama del arbol: las partes que alguien mas debe cubrir */}
        {tienePartes && (
          <>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => toggleArbol(item)}
              style={styles.branchToggle}
            >
              <View style={[styles.branchElbow, { borderColor: theme.border }]} />
              <MaterialCommunityIcons name={open ? 'chevron-down' : 'chevron-right'} size={16} color={theme.secondary} />
              <Text style={[styles.branchToggleText, { color: theme.secondary, fontFamily: theme.fonts?.condensed }]}>
                {item.pendiente > 0.005
                  ? `${item.partes} ${item.partes === 1 ? 'PARTE' : 'PARTES'} · FALTAN ¥${formatYen(item.pendiente)}`
                  : `${item.partes} ${item.partes === 1 ? 'PARTE' : 'PARTES'} · TODO RECUPERADO`}
              </Text>
            </TouchableOpacity>

            {open && ramas.map((l, idx) => {
              const falta = (l.monto || 0) - (l.monto_pagado || 0);
              const saldado = falta <= 0.005;
              const ultima = idx === ramas.length - 1;
              return (
                <View key={l.id_liquidacion} style={styles.branchRow}>
                  <View style={[styles.branchLine, { borderColor: theme.border, height: ultima ? 20 : 44 }]} />
                  <TouchableOpacity
                    activeOpacity={saldado ? 1 : 0.85}
                    onPress={() => !saldado && liquidar(l, item.descripcion)}
                    style={[styles.branchCard, { backgroundColor: theme.surface, borderColor: saldado ? theme.success : theme.border }]}
                  >
                    <MaterialCommunityIcons
                      name={saldado ? 'check-circle' : 'clock-outline'}
                      size={16}
                      color={saldado ? theme.success : theme.secondary}
                    />
                    <Text style={[styles.branchWho, { color: theme.text, fontFamily: theme.fonts?.bold }]} numberOfLines={1}>
                      {l.contraparte || 'Sin concepto'}
                    </Text>
                    <Text style={[styles.branchAmount, { color: saldado ? theme.success : theme.secondary, fontFamily: theme.fonts?.display }]}>
                      {saldado ? `volvió ¥${formatYen(l.monto)}` : `falta ¥${formatYen(falta)}`}
                    </Text>
                    {!saldado && <MaterialCommunityIcons name="cash-check" size={17} color={theme.success} style={{ marginLeft: 6 }} />}
                  </TouchableOpacity>
                </View>
              );
            })}
          </>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.topHeader}>
        <PersonaShard label="FINANZAS" height={54} fontSize={30} font={theme.fonts?.title} />
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => navigation.navigate('FinanceReport')} style={styles.headerBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="chart-box-outline" size={22} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('ManageCategories')} style={styles.headerBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="tune-vertical" size={22} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      <Animated.View style={[{ flex: 1 }, introStyle]}>
        {firstLoad && transactions.length === 0 ? (
          <View style={{ padding: 16, paddingTop: 8 }}>
            <SkeletonBar width="55%" height={48} skew={-14} style={{ marginBottom: 18 }} />
            <SkeletonBar width="100%" height={140} skew={-6} style={{ marginBottom: 24, borderRadius: 4 }} />
            <ListSkeleton rows={4} />
          </View>
        ) : (
        <FlatList
          data={transactions}
          keyExtractor={(i) => String(i.id_finanza)}
          renderItem={renderItem}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            <View style={styles.listEmpty}>
              <MaterialCommunityIcons name="wallet-outline" size={48} color={theme.textDim} />
              <Text style={[styles.emptyText, { color: theme.textDim }]}>Aún no hay movimientos</Text>
              <Text style={[styles.emptySub, { color: theme.textDim }]}>Pulsa + para registrar el primero</Text>
            </View>
          }
          contentContainerStyle={{ padding: 16, paddingBottom: 160 }}
          showsVerticalScrollIndicator={false}
        />
        )}
      </Animated.View>

      <Pressable
        onPress={abrirAlta}
        onPressIn={() => Animated.spring(fabScale, { toValue: 0.88, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(fabScale, { toValue: 1, friction: 4, useNativeDriver: true }).start()}
        style={styles.fabWrap}
      >
        <Animated.View style={[styles.fab, { backgroundColor: theme.primary, shadowColor: theme.primary, transform: [{ scale: fabScale }] }]}>
          <MaterialCommunityIcons name="plus" size={28} color={theme.textInverse} />
        </Animated.View>
      </Pressable>

      <TransactionModal visible={modalVisible} transaction={editando} onClose={cerrarModal} onSaved={load} />

      <SettleModal
        parte={cobrando?.parte ?? null}
        concepto={cobrando?.concepto}
        onClose={() => setCobrando(null)}
        onDone={load}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  topHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 8, paddingBottom: 10 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerBtn: { padding: 6 },

  // Hero balance
  heroCard: { borderRadius: 16, borderWidth: 1, padding: 20, paddingLeft: 24, overflow: 'hidden', marginBottom: 18 },
  heroAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 8 },
  heroLabel: { fontSize: 11, letterSpacing: 2 },
  heroBalance: { fontSize: 44, fontWeight: '900', letterSpacing: 1, marginTop: 2 },
  heroSplitRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  heroSplitItem: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  heroDivider: { width: 1, height: 30, marginHorizontal: 12 },
  heroSplitLabel: { fontSize: 10, letterSpacing: 1.5 },
  heroSplitValue: { fontSize: 16, fontWeight: '800', marginTop: 1 },
  heroLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1.5, borderRadius: 3, paddingVertical: 9, marginTop: 16 },
  heroLinkText: { fontSize: 12, letterSpacing: 1.4 },

  // Por cobrar
  debtCard: { borderRadius: 16, borderWidth: 1.5, padding: 14, marginBottom: 18 },
  debtHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  debtHeadLabel: { fontSize: 10, letterSpacing: 1.6 },
  debtHeadValue: { fontSize: 22 },
  debtRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, paddingVertical: 9 },
  debtDot: { width: 10, height: 10, borderRadius: 3, transform: [{ skewX: '-20deg' }] },
  debtWho: { fontSize: 14 },
  debtWhat: { fontSize: 11, marginTop: 1 },
  debtAmount: { fontSize: 16 },
  debtMore: { fontSize: 11, textAlign: 'center', marginTop: 8 },

  // Section tag inclinada
  sectionTagWrap: { marginBottom: 12 },

  // Chart
  chartCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 18 },
  chartRow: { flexDirection: 'row', alignItems: 'center' },
  legend: { flex: 1, marginLeft: 12 },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  legendDot: { width: 12, height: 12, borderRadius: 3, marginRight: 8, transform: [{ skewX: '-20deg' }] },
  legendLabel: { fontSize: 13, fontWeight: '600' },
  legendSub: { fontSize: 11, marginTop: 1 },
  legendValue: { fontSize: 13, fontWeight: '800', marginLeft: 8 },
  chartEmpty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 30 },

  // Transaction rows
  itemRow: { flexDirection: 'row', alignItems: 'center', padding: 12, paddingLeft: 16, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  itemAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  iconCircle: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itemCenter: { flex: 1 },
  desc: { fontSize: 15, fontWeight: '700' },
  date: { fontSize: 12, marginTop: 2 },
  amount: { fontWeight: '900', fontSize: 16, marginLeft: 8 },
  amountStrike: { fontSize: 11, textDecorationLine: 'line-through', marginBottom: 1 },

  // Arbol de partes
  branchToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 30, marginTop: 6 },
  branchElbow: { width: 14, height: 10, borderLeftWidth: 1.5, borderBottomWidth: 1.5, borderBottomLeftRadius: 4, marginBottom: 5 },
  branchToggleText: { fontSize: 10, letterSpacing: 1.2 },
  branchRow: { flexDirection: 'row', alignItems: 'flex-start', marginLeft: 30 },
  branchLine: { width: 14, borderLeftWidth: 1.5, borderBottomWidth: 1.5, borderBottomLeftRadius: 4, marginTop: -6 },
  branchCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 3, paddingVertical: 8, paddingHorizontal: 11, marginTop: 6, marginLeft: 2 },
  branchWho: { flex: 1, fontSize: 13 },
  branchAmount: { fontSize: 13 },

  // Empty states
  listEmpty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50 },
  emptyText: { fontSize: 15, fontWeight: '700', marginTop: 12 },
  emptySub: { fontSize: 13, marginTop: 4 },

  // FAB
  fabWrap: { position: 'absolute', right: 18, bottom: 162 },
  fab: { width: 58, height: 58, borderRadius: 29, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowOffset: { width: 0, height: 4 }, shadowRadius: 6, shadowOpacity: 0.4 },
});

export default EconomyScreen;
