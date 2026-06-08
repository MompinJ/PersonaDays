import React, { useCallback, useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Animated, Easing, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../themes/useTheme';
import { db } from '../../database';
import AddTransactionModal from '../../components/Economy/AddTransactionModal';
import SpendingDonut, { DonutSlice } from '../../components/Economy/SpendingDonut';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getContrastText } from '../../utils/colorUtils';
import { PersonaShard } from '../../components/UI/PersonaShard';

// Formatea un monto como Yenes (enteros, separador de miles) para ser consistente
// con el resto de la app (misiones, recompensas).
const formatYen = (n: number) => Math.round(n || 0).toLocaleString('es-MX');

type CategoryInfo = { icono: string; color: string };

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
  const [transactions, setTransactions] = useState<any[]>([]);
  const [ingresos, setIngresos] = useState(0);
  const [gastos, setGastos] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [catMap, setCatMap] = useState<Record<string, CategoryInfo>>({});
  const [monthSlices, setMonthSlices] = useState<DonutSlice[]>([]);
  const [monthTotal, setMonthTotal] = useState(0);

  const { label: monthLabel } = getMonthBounds();

  // Animacion de entrada (una sola vez al montar) y feedback del FAB
  const intro = useRef(new Animated.Value(0)).current;
  const fabScale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(intro, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const load = async () => {
    try {
      const rows: any[] = await db.getAllAsync('SELECT * FROM finanzas ORDER BY fecha DESC');
      setTransactions(rows || []);

      const cats: any[] = await db.getAllAsync('SELECT nombre, icono, color FROM financial_categories');
      const map: Record<string, CategoryInfo> = {};
      (cats || []).forEach((c) => { map[c.nombre] = { icono: c.icono, color: c.color }; });
      setCatMap(map);

      const sums: any[] = await db.getAllAsync("SELECT SUM(CASE WHEN tipo='INGRESO' THEN monto ELSE 0 END) as ingresos, SUM(CASE WHEN tipo='GASTO' THEN monto ELSE 0 END) as gastos FROM finanzas");
      setIngresos(sums?.[0]?.ingresos || 0);
      setGastos(sums?.[0]?.gastos || 0);

      // Gasto del mes agrupado por categoria (para el donut)
      const { start, end } = getMonthBounds();
      const byCat: any[] = await db.getAllAsync(
        "SELECT categoria, SUM(monto) as total FROM finanzas WHERE tipo='GASTO' AND fecha >= ? AND fecha < ? GROUP BY categoria ORDER BY total DESC",
        [start, end]
      );
      const rowsCat = byCat || [];
      const totalMes = rowsCat.reduce((s, r) => s + (r.total || 0), 0);
      setMonthTotal(totalMes);

      // Top 5 + "Otros" para no saturar el donut (regla: no pie/donut con >5-6 categorias)
      const TOP = 5;
      const slices: DonutSlice[] = rowsCat.slice(0, TOP).map((r) => ({
        label: r.categoria || 'Sin categoría',
        value: r.total || 0,
        color: map[r.categoria]?.color || theme.primary,
      }));
      if (rowsCat.length > TOP) {
        const restoTotal = rowsCat.slice(TOP).reduce((s, r) => s + (r.total || 0), 0);
        if (restoTotal > 0) slices.push({ label: 'Otros', value: restoTotal, color: theme.textDim });
      }
      setMonthSlices(slices);
    } catch (e) {
      console.error('Error cargando finanzas', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const balance = ingresos - gastos;
  const balancePositive = balance >= 0;

  // --- Sub-render: etiqueta de seccion inclinada estilo Persona ---
  const SectionTag = ({ text }: { text: string }) => (
    <View style={styles.sectionTagWrap}>
      <PersonaShard label={text} />
    </View>
  );

  // --- Sub-render: cabecera (hero de balance + donut del mes) ---
  const ListHeader = () => (
    <View>
      {/* HERO BALANCE */}
      <View style={[styles.heroCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={[styles.heroAccent, { backgroundColor: theme.primary }]} />
        <Text style={[styles.heroLabel, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>BALANCE TOTAL</Text>
        <Text
          style={[styles.heroBalance, { color: balancePositive ? theme.success : theme.error, fontFamily: theme.fonts?.display }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {balancePositive ? '+' : '-'}¥{formatYen(Math.abs(balance))}
        </Text>

        <View style={styles.heroSplitRow}>
          <View style={styles.heroSplitItem}>
            <MaterialCommunityIcons name="arrow-up-bold" size={16} color={theme.success} />
            <View style={{ marginLeft: 6 }}>
              <Text style={[styles.heroSplitLabel, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>INGRESOS</Text>
              <Text style={[styles.heroSplitValue, { color: theme.text, fontFamily: theme.fonts?.display }]}>¥{formatYen(ingresos)}</Text>
            </View>
          </View>
          <View style={[styles.heroDivider, { backgroundColor: theme.border }]} />
          <View style={styles.heroSplitItem}>
            <MaterialCommunityIcons name="arrow-down-bold" size={16} color={theme.error} />
            <View style={{ marginLeft: 6 }}>
              <Text style={[styles.heroSplitLabel, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>GASTOS</Text>
              <Text style={[styles.heroSplitValue, { color: theme.text, fontFamily: theme.fonts?.display }]}>¥{formatYen(gastos)}</Text>
            </View>
          </View>
        </View>
      </View>

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
                    <Text style={[styles.legendLabel, { color: theme.text }]} numberOfLines={1}>{s.label}</Text>
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

  const renderItem = ({ item }: any) => {
    const positive = item.tipo === 'INGRESO';
    const sign = positive ? '+' : '-';
    const amountColor = positive ? theme.success : theme.error;
    const cat = catMap[item.categoria];
    const icon = cat?.icono || 'tag';
    const circleColor = cat?.color || theme.inactive;
    const fecha = item.fecha
      ? new Date(item.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
      : '';

    return (
      <View style={[styles.itemRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={[styles.itemAccent, { backgroundColor: circleColor }]} />
        <View style={[styles.iconCircle, { backgroundColor: circleColor }]}>
          <MaterialCommunityIcons name={icon as any} size={20} color={getContrastText(cat?.color)} />
        </View>
        <View style={styles.itemCenter}>
          <Text style={[styles.desc, { color: theme.text, fontFamily: theme.fonts?.bold }]} numberOfLines={1}>
            {item.descripcion || 'Sin descripción'}
          </Text>
          <Text style={[styles.date, { color: theme.textDim }]}>
            {(item.categoria || '—') + '  ·  ' + fecha}
          </Text>
        </View>
        <Text style={[styles.amount, { color: amountColor, fontFamily: theme.fonts?.display }]}>
          {sign}¥{formatYen(Math.abs(item.monto))}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.topHeader}>
        <PersonaShard label="FINANZAS" height={54} fontSize={30} font={theme.fonts?.title} />
        <TouchableOpacity onPress={() => navigation.navigate('ManageCategories')} style={styles.headerBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="tune-vertical" size={22} color={theme.text} />
        </TouchableOpacity>
      </View>

      <Animated.View
        style={{
          flex: 1,
          opacity: intro,
          transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
        }}
      >
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
          contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
        />
      </Animated.View>

      <Pressable
        onPress={() => setModalVisible(true)}
        onPressIn={() => Animated.spring(fabScale, { toValue: 0.88, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(fabScale, { toValue: 1, friction: 4, useNativeDriver: true }).start()}
        style={styles.fabWrap}
      >
        <Animated.View style={[styles.fab, { backgroundColor: theme.primary, shadowColor: theme.primary, transform: [{ scale: fabScale }] }]}>
          <MaterialCommunityIcons name="plus" size={28} color={theme.textInverse} />
        </Animated.View>
      </Pressable>

      <AddTransactionModal visible={modalVisible} onClose={() => setModalVisible(false)} onSaved={load} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  topHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 8, paddingBottom: 10 },
  titleWrap: { flexDirection: 'row', alignItems: 'center' },
  titleAccent: { width: 6, height: 26, marginRight: 10, transform: [{ skewX: '-20deg' }] },
  titleText: { fontSize: 26, fontWeight: '900', letterSpacing: 2 },
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

  // Section tag inclinada
  sectionTagWrap: { marginBottom: 12 },
  sectionTag: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 5, transform: [{ skewX: '-20deg' }] },
  sectionTagText: { fontSize: 13, fontWeight: '900', letterSpacing: 1.5, transform: [{ skewX: '20deg' }] },

  // Chart
  chartCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 18 },
  chartRow: { flexDirection: 'row', alignItems: 'center' },
  legend: { flex: 1, marginLeft: 12 },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  legendDot: { width: 12, height: 12, borderRadius: 3, marginRight: 8, transform: [{ skewX: '-20deg' }] },
  legendLabel: { flex: 1, fontSize: 13, fontWeight: '600' },
  legendValue: { fontSize: 13, fontWeight: '800', marginLeft: 8 },
  chartEmpty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 30 },

  // Transaction rows
  itemRow: { flexDirection: 'row', alignItems: 'center', padding: 12, paddingLeft: 16, borderRadius: 12, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  itemAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  iconCircle: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itemCenter: { flex: 1 },
  desc: { fontSize: 15, fontWeight: '700' },
  date: { fontSize: 12, marginTop: 2 },
  amount: { fontWeight: '900', fontSize: 16, marginLeft: 8 },

  // Empty states
  listEmpty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50 },
  emptyText: { fontSize: 15, fontWeight: '700', marginTop: 12 },
  emptySub: { fontSize: 13, marginTop: 4 },

  // FAB
  fabWrap: { position: 'absolute', right: 18, bottom: 28 },
  fab: { width: 58, height: 58, borderRadius: 29, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 6 },
});

export default EconomyScreen;
