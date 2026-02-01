import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useTheme } from '../../themes/useTheme';
import { db } from '../../database';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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
  const { height } = useWindowDimensions();
  const heroHeight = height * 0.75;
  const [arcs, setArcs] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingArc, setEditingArc] = useState<any | null>(null);

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
  const swipeableRef = useRef<any>(null);

  const onCreate = () => {
    const activeCount = arcs.filter(a => getState(a) === 'ACTIVO').length;
    if (activeCount > 0) {
      showAlert('Límite Alcanzado', 'Solo puede existir 1 Arco Activo en este momento.');
      return;
    }
    setEditingArc(null);
    setShowModal(true);
  };
  const onSaved = () => { setShowModal(false); loadArcs(); };

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

  const activeArcs = arcs.filter(a => getState(a) === 'ACTIVO');

  const renderItem = ({ item }: { item: any }) => (
    <ArcCard
      arc={item}
    />
  );

  const renderCompleteAction = (progress: any, dragX: any) => {
    const scale = dragX.interpolate({ inputRange: [0, 120], outputRange: [0.8, 1], extrapolate: 'clamp' });
    return (
      <View style={{ width: 150, minWidth: 120, height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' }}>
        <Animated.View style={{ alignItems: 'center', justifyContent: 'center', transform: [{ scale }] }}>
          <MaterialCommunityIcons name="check" size={36} color={theme.primary} />
          <Animated.Text numberOfLines={1} style={[actionStyles.actionText, { color: theme.primary, transform: [{ scale }], fontFamily: theme.fonts?.bold, fontSize: 16, textAlign: 'center' }]}>FINALIZAR</Animated.Text>
        </Animated.View>
      </View>
    );
  };

  const finalizeArc = (arc: any) => {
    showAlert('Finalizar Arco', `¿Deseas finalizar el arco "${arc.nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Finalizar',
        style: 'destructive',
        onPress: async () => {
          try {
            await db.execAsync('BEGIN TRANSACTION;');
            await db.runAsync("UPDATE arcos SET estado = 'COMPLETADO', fecha_fin = date('now','localtime') WHERE id_arco = ?", [arc.id_arco]);
            console.log('✅ Arco finalizado. ID:', arc.id_arco);
            showAlert('CAPÍTULO CERRADO', 'El arco ha sido completado y movido al historial. ¡Buen trabajo!');

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
          if (activeArcs.length === 1) {
            const arc = activeArcs[0];
            return (
              <View style={{ height: heroHeight, width: '100%', padding: 16, marginTop: 20 }}>
                <Swipeable
                  ref={swipeableRef}
                  renderLeftActions={renderCompleteAction}
                  childrenContainerStyle={{ height: '100%' }}
                  onSwipeableOpen={() => {
                    showAlert('FINALIZAR ARCO', '¿Has completado esta etapa de tu vida? Esta acción es irreversible.', [
                      { text: 'CANCELAR', style: 'cancel', onPress: () => { swipeableRef.current && swipeableRef.current.close(); } },
                      { text: 'SÍ, FINALIZAR', style: 'destructive', onPress: async () => {
                        try {
                          await db.execAsync('BEGIN TRANSACTION;');
                          await db.runAsync("UPDATE arcos SET estado = 'COMPLETADO', fecha_fin = date('now','localtime') WHERE id_arco = ?", [arc.id_arco]);
                          console.log('✅ Arco finalizado. ID:', arc.id_arco);
                          try { swipeableRef.current && swipeableRef.current.close(); } catch(e){}
                          showAlert('CAPÍTULO CERRADO', 'El arco ha sido completado y movido al historial. ¡Buen trabajo!');

                          if (arc.id_stat_relacionado && player && player.id_jugador) {
                            const res: any[] = await db.getAllAsync('SELECT sum(recompensa_exp) as s FROM misiones WHERE id_arco = ? AND completada = 1', [arc.id_arco]);
                            const totalXP = (res && res.length > 0 && res[0].s) ? res[0].s : 0;
                            if (totalXP > 0) {
                              const jsRows: any[] = await db.getAllAsync('SELECT experiencia_actual FROM jugador_stat WHERE id_stat = ? AND id_jugador = ?', [arc.id_stat_relacionado, player.id_jugador]);
                              if (jsRows && jsRows.length > 0) {
                                await db.runAsync('UPDATE jugador_stat SET experiencia_actual = experiencia_actual + ? WHERE id_stat = ? AND id_jugador = ?', [totalXP, arc.id_stat_relacionado, player.id_jugador]);
                              } else {
                                await db.runAsync('INSERT INTO jugador_stat (id_jugador, id_stat, nivel_actual, experiencia_actual, nivel_maximo) VALUES (?, ?, ?, ?, ?)', [player.id_jugador, arc.id_stat_relacionado, 1, totalXP, 99]);
                              }

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
                      } }
                    ]);
                  }}
                  containerStyle={{ borderRadius: 14, overflow: 'hidden', height: '100%' }}
                >
                  <ArcCard arc={arc} mode="HERO" style={{ flex: 1 }} />
                </Swipeable>

              </View>
            );
          }

          // Default: no active arcs -> show empty state
          return (
            <View style={styles.emptyContainer}>
              <Text style={{ color: theme.textDim, textAlign: 'center' }}>No hay arcos activos.</Text>
            </View>
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

      {activeArcs.length === 0 && activeTab === 'ACTIVOS' ? (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.primary }]}
          onPress={onCreate}
        >
          <Ionicons name="add" size={28} color={theme.textInverse} />
        </TouchableOpacity>
      ) : null}

      <ManageArcModal visible={showModal} arc={editingArc} onClose={() => { setShowModal(false); }} onSaved={onSaved} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  title: { fontSize: 18, fontWeight: '900' },
  tabsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  tabBtn: { paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderRadius: 8, marginRight: 8 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', elevation: 10 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

const actionStyles = StyleSheet.create({
  actionContainer: {
    justifyContent: 'center',
    alignItems: 'flex-start',
    width: 100,
    flexDirection: 'row',
    paddingLeft: 40,
    height: '100%'
  },
  actionText: {
    color: 'white',
    marginRight: 10,
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1
  }
});
