import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../themes/useTheme';
import { db } from '../../database';
import AddTransactionModal from '../../components/Economy/AddTransactionModal';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const categoryIcons: any = {
  Comida: 'fast-food',
  Ocio: 'film',
  Transporte: 'bus',
  Deudas: 'wallet',
  Salud: 'medkit',
  Ingresos: 'cash'
};

export const EconomyScreen = () => {
  const colors = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [ingresos, setIngresos] = useState(0);
  const [gastos, setGastos] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);

  const load = async () => {
    try {
      const rows: any[] = await db.getAllAsync('SELECT * FROM finanzas ORDER BY fecha DESC');
      setTransactions(rows || []);
      const sums: any[] = await db.getAllAsync("SELECT SUM(CASE WHEN tipo='INGRESO' THEN monto ELSE 0 END) as ingresos, SUM(CASE WHEN tipo='GASTO' THEN monto ELSE 0 END) as gastos FROM finanzas");
      const ing = sums && sums[0] && sums[0].ingresos ? sums[0].ingresos : 0;
      const gas = sums && sums[0] && sums[0].gastos ? sums[0].gastos : 0;
      setIngresos(ing);
      setGastos(gas);
    } catch (e) {
      console.error('Error cargando finanzas', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const renderItem = ({ item }: any) => {
    const positive = item.tipo === 'INGRESO';
    const sign = positive ? '+' : '-';
    const color = positive ? '#2ecc71' : '#e74c3c';
    const icon = categoryIcons[item.categoria] || 'pricetag';
    const fecha = item.fecha ? new Date(item.fecha).toLocaleString() : '';

    return (
      <View style={styles.itemRow}>
        <View style={[styles.iconCircle, { backgroundColor: colors.card }]}>
          <MaterialCommunityIcons name={icon as any} size={20} color={colors.text} />
        </View>
        <View style={styles.itemCenter}>
          <Text style={[styles.desc, { color: colors.text }]}>{item.descripcion || 'Sin descripción'}</Text>
          <Text style={[styles.date, { color: colors.textDim }]}>{fecha}</Text>
        </View>
        <View style={styles.amountWrap}>
          <Text style={[styles.amount, { color }]}>{sign}${Math.abs(item.monto).toFixed(2)}</Text>
        </View>
      </View>
    );
  };

  const balance = ingresos - gastos;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.topHeader}>
        <Text style={[styles.titleText, { color: colors.text, fontFamily: colors.fonts?.title }]}>FINANZAS</Text>
        <TouchableOpacity onPress={() => navigation.navigate('ManageCategories')} style={{ padding: 6 }}>
          <MaterialCommunityIcons name="tune-vertical" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <Text style={[styles.balanceLabel, { color: balance >= 0 ? '#2ecc71' : '#e74c3c' }]}>{balance >= 0 ? '+' : '-'}${Math.abs(balance).toFixed(2)}</Text>
        <Text style={[styles.breakdown, { color: colors.textDim }]}>Ingresos: ${ingresos.toFixed(2)} | Gastos: ${gastos.toFixed(2)}</Text>
      </View>

      <FlatList data={transactions} keyExtractor={(i) => String(i.id_finanza)} renderItem={renderItem} inverted={true} contentContainerStyle={{ paddingTop: 100, paddingBottom: 20, paddingHorizontal: 10 }} />

      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]} onPress={() => setModalVisible(true)}>
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </TouchableOpacity>

      <AddTransactionModal visible={modalVisible} onClose={() => setModalVisible(false)} onSaved={load} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  topHeader: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 8 },
  titleText: { fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  header: { padding: 18, alignItems: 'center' },
  balanceLabel: { fontSize: 36, fontWeight: '900' },
  breakdown: { marginTop: 6 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee' },
  iconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itemCenter: { flex: 1 },
  desc: { fontWeight: '700' },
  date: { fontSize: 12, marginTop: 2 },
  amountWrap: { width: 110, alignItems: 'flex-end' },
  amount: { fontWeight: '900', fontSize: 16 },
  fab: { position: 'absolute', right: 18, bottom: 28, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' }
});

export default EconomyScreen;
