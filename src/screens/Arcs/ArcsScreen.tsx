import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../themes/useTheme';
import { db } from '../../database';
import { Ionicons } from '@expo/vector-icons';
import ArcCard from '../../components/Arcs/ArcCard';
import ManageArcModal from '../../components/Arcs/ManageArcModal';
import { useGame } from '../../context/GameContext';
import { useAlert } from '../../context/AlertContext';
import { calculateLevelFromXP } from '../../utils/levelingUtils';
import { usePlayerStats } from '../../hooks/usePlayerStats';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';

export const ArcsScreen = () => {
  const theme = useTheme();
  const [arcs, setArcs] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingArc, setEditingArc] = useState<any | null>(null);
  const [parentArc, setParentArc] = useState<any | null>(null);

  const loadArcs = async () => {
    try {
      const rows: any[] = await db.getAllAsync('SELECT * FROM arcos ORDER BY fecha_inicio DESC');
      if (!rows) setArcs([]);
      else setArcs(rows);
    } catch (e) {
      console.error('Error cargando arcos:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadArcs();
    }, [])
  );

  const { player, refreshUser } = useGame();
  const { refreshStats } = usePlayerStats();
  const { showAlert } = useAlert();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [forcedSubArc, setForcedSubArc] = useState(false);

  const onCreate = () => {
    const totalOngoing = arcs.filter(a => {
      const s = getState(a);
      return s !== 'COMPLETADO';
    }).length;

    if (totalOngoing >= 2) {
      showAlert('Límite Alcanzado', 'Solo puedes tener 2 arcos programados o activos simultáneamente.');
      return;
    }

    if (totalOngoing === 1) {
      const ongoing = arcs.find(a => getState(a) !== 'COMPLETADO');
      setEditingArc(null);
      setParentArc(ongoing || null);
      setForcedSubArc(true);
      setShowModal(true);
      return;
    }

    setParentArc(null);
    setForcedSubArc(false);
    setEditingArc(null);
    setShowModal(true);
  };
  const onSaved = () => { setShowModal(false); setParentArc(null); setForcedSubArc(false); loadArcs(); };

  const getState = (arcItem: any) => {
    const now = new Date();
    const start = new Date(arcItem.fecha_inicio);
    const end = arcItem.fecha_fin ? new Date(arcItem.fecha_fin) : null;
    if (end && now > end) return 'COMPLETADO';
    if (now >= start && (!end || now <= end)) return 'ACTIVO';
    return 'PENDIENTE';
  };

  const [activeTab, setActiveTab] = useState<'ACTIVOS' | 'HISTORIAL'>('ACTIVOS');

  const filtered = arcs.filter(a => {
    const s = getState(a);
    if (activeTab === 'ACTIVOS') return s === 'ACTIVO' || s === 'PENDIENTE';
    return s === 'COMPLETADO';
  });

  const renderItem = ({ item }: { item: any }) => (
    <ArcCard
      arc={item}
      onPress={() => navigation.navigate('ArcDetail', { arc: item })}
    />
  );

  const finalizeArc = (arc: any) => {
    showAlert('Finalizar Arco', `¿Deseas finalizar el arco "${arc.nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Finalizar',
        style: 'destructive',
        onPress: async () => {
          try {
            await db.execAsync('BEGIN TRANSACTION;');
            await db.runAsync("UPDATE arcos SET estado = 'COMPLETADO', fecha_fin = date('now') WHERE id_arco = ?", [arc.id_arco]);

            // Otorgar XP acumulada de misiones completadas en este arco al stat relacionado
            if (arc.id_stat_relacionado && player && player.id_jugador) {
              const res: any[] = await db.getAllAsync('SELECT sum(recompensa_exp) as s FROM misiones WHERE id_arco = ? AND completada = 1', [arc.id_arco]);
              const totalXP = (res && res.length > 0 && res[0].s) ? res[0].s : 0;
              if (totalXP > 0) {
                // Añadir o insertar jugador_stat
                const jsRows: any[] = await db.getAllAsync('SELECT experiencia_actual FROM jugador_stat WHERE id_stat = ? AND id_jugador = ?', [arc.id_stat_relacionado, player.id_jugador]);
                if (jsRows && jsRows.length > 0) {
                  await db.runAsync('UPDATE jugador_stat SET experiencia_actual = experiencia_actual + ? WHERE id_stat = ? AND id_jugador = ?', [totalXP, arc.id_stat_relacionado, player.id_jugador]);
                } else {
                  await db.runAsync('INSERT INTO jugador_stat (id_jugador, id_stat, nivel_actual, experiencia_actual, nivel_maximo) VALUES (?, ?, ?, ?, ?)', [player.id_jugador, arc.id_stat_relacionado, 1, totalXP, 99]);
                }

                // Recalcular nivel
                const afterRows: any[] = await db.getAllAsync('SELECT experiencia_actual FROM jugador_stat WHERE id_stat = ? AND id_jugador = ?', [arc.id_stat_relacionado, player.id_jugador]);
                if (afterRows && afterRows.length > 0) {
                  const totalAfter = afterRows[0].experiencia_actual || 0;
                  const lvl = calculateLevelFromXP(totalAfter);
                  await db.runAsync('UPDATE jugador_stat SET nivel_actual = ? WHERE id_stat = ? AND id_jugador = ?', [lvl.level, arc.id_stat_relacionado, player.id_jugador]);
                }
              }
            }

            await db.execAsync('COMMIT;');
            try { refreshStats && refreshStats(); } catch(e){}
            try { refreshUser && refreshUser(); } catch(e){}
            loadArcs();
          } catch (err) {
            console.error('Error finalizando arco:', err);
            try { await db.execAsync('ROLLBACK;'); } catch(e){}
            showAlert('Error', 'No se pudo finalizar el arco.');
          }
        }
      }
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}> 
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.text, fontFamily: theme.fonts?.title }]}>ARCOS</Text>
      </View>

      <View style={styles.tabsRow}>
        <TouchableOpacity onPress={() => setActiveTab('ACTIVOS')} style={[styles.tabBtn, activeTab === 'ACTIVOS' && { borderColor: theme.primary, backgroundColor: theme.primary+'20' }]}>
          <Text style={{ color: activeTab === 'ACTIVOS' ? theme.primary : theme.text }}>{'ACTIVOS'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('HISTORIAL')} style={[styles.tabBtn, activeTab === 'HISTORIAL' && { borderColor: theme.primary, backgroundColor: theme.primary+'20' }]}>
          <Text style={{ color: activeTab === 'HISTORIAL' ? theme.primary : theme.text }}>{'HISTORIAL'}</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'ACTIVOS' ? (
        (() => {
          const activeArcs = arcs.filter(a => getState(a) === 'ACTIVO');
          if (activeArcs.length === 2) {
            return (
              <View style={{ flex: 1 }}>
                <View style={{ flex: 1, padding: 16 }}>
                  <ArcCard arc={activeArcs[0]} onPress={() => navigation.navigate('ArcDetail', { arc: activeArcs[0] })} containerStyle={{height: '100%'}} />
                </View>
                <View style={{ flex: 1, padding: 16 }}>
                  <ArcCard arc={activeArcs[1]} onPress={() => navigation.navigate('ArcDetail', { arc: activeArcs[1] })} containerStyle={{height: '100%'}} />
                </View>
              </View>
            );
          }

          if (activeArcs.length === 1) {
            return (
              <View style={{ padding: 16 }}>
                <ArcCard arc={activeArcs[0]} onPress={() => navigation.navigate('ArcDetail', { arc: activeArcs[0] })} containerStyle={{height: 360}} />
                {/* show other pending below */}
                <FlatList
                  data={filtered.filter(a => getState(a) !== 'ACTIVO')}
                  keyExtractor={(i) => i.id_arco ? String(i.id_arco) : Math.random().toString()}
                  renderItem={renderItem}
                  contentContainerStyle={{ paddingTop: 12 }}
                  ListEmptyComponent={<Text style={{ color: theme.textDim, textAlign: 'center', marginTop: 20 }}>No hay más arcos.</Text>}
                />
              </View>
            );
          }

          // Default: no active arcs -> list all filtered
          return (
            <FlatList
              data={filtered}
              keyExtractor={(i) => i.id_arco ? String(i.id_arco) : Math.random().toString()}
              renderItem={renderItem}
              contentContainerStyle={{ padding: 16 }}
              ListEmptyComponent={<Text style={{ color: theme.textDim, textAlign: 'center', marginTop: 40 }}>No hay arcos activos.</Text>}
            />
          );
        })()
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id_arco ? String(i.id_arco) : Math.random().toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<Text style={{ color: theme.textDim, textAlign: 'center', marginTop: 40 }}>No hay historial de arcos.</Text>}
        />
      )}

      <TouchableOpacity style={[styles.fab, { backgroundColor: theme.primary }]} onPress={onCreate}>
        <Ionicons name="add" size={28} color={theme.textInverse} />
      </TouchableOpacity>

      <ManageArcModal visible={showModal} arc={editingArc} parentArc={parentArc} forcedSubArc={forcedSubArc} onClose={() => { setShowModal(false); setParentArc(null); setForcedSubArc(false); }} onSaved={onSaved} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  title: { fontSize: 18, fontWeight: '900' },
  tabsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  tabBtn: { paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderRadius: 8, marginRight: 8 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', elevation: 10 }
});
