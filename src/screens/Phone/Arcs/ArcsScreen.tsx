import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView, Animated, Easing, InteractionManager } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { ListSkeleton } from '../../../components/UI/Skeleton';
import { useTheme } from '../../../themes/useTheme';
import { PersonaShard } from '../../../components/UI/PersonaShard';
import { PressableScale } from '../../../components/UI/PressableScale';
import { db } from '../../../database';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import ArcCard from '../../../components/Arcs/ArcCard';
import ManageArcModal from '../../../components/Arcs/ManageArcModal';
import { useGame } from '../../../context/GameContext';
import { useAlert } from '../../../context/AlertContext';
import { finalizeArcWithRewards } from '../../../services/arcService';
import { useEventFlash } from '../../../context/EventFlashContext';
import { usePlayerStats } from '../../../hooks/usePlayerStats';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/types';

export const ArcsScreen = () => {
  const theme = useTheme();
  const { height } = useWindowDimensions();
  const heroHeight = height * 0.75;
  const [arcs, setArcs] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingArc, setEditingArc] = useState<any | null>(null);
  const [firstLoad, setFirstLoad] = useState(true);

  const loadArcs = async () => {
    try {
      const rows: any[] = await db.getAllAsync('SELECT * FROM arcos ORDER BY fecha_inicio DESC');
      if (!rows) setArcs([]);
      else setArcs(rows);
    } catch (e) {
      console.error('Error cargando arcos:', e);
    } finally {
      setFirstLoad(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(loadArcs);
      return () => task.cancel();
    }, [])
  );

  const { player, refreshUser } = useGame();
  const { refreshStats } = usePlayerStats();
  const { showAlert } = useAlert();
  const { flash } = useEventFlash();
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
      onPress={() => navigation.navigate('ArcDetail', { arc: item })}
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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}> 
      <View style={styles.headerWrap}>
        <PersonaShard label="ARCOS" height={54} fontSize={30} font={theme.fonts?.title} />
      </View>

      <View style={styles.tabsRow}>
        {(['ACTIVOS', 'HISTORIAL'] as const).map((tab) => {
          const on = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              activeOpacity={0.85}
              onPress={() => setActiveTab(tab)}
              style={[styles.tabBtn, { borderColor: theme.primary, backgroundColor: on ? theme.primary : theme.surface }]}
            >
              <Text style={[styles.tabText, { color: on ? theme.textInverse : theme.textDim, fontFamily: theme.fonts?.heading }]}>{tab}</Text>
            </TouchableOpacity>
          );
        })}
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
                          const { grantedXP } = await finalizeArcWithRewards(arc, player);
                          try { swipeableRef.current && swipeableRef.current.close(); } catch(e){}
                          try { refreshStats && refreshStats(); } catch(e){}
                          try { refreshUser && refreshUser(); } catch(e){}
                          loadArcs();
                          flash({ kind: 'complete', title: 'CAPÍTULO CERRADO', subtitle: arc?.nombre, xp: grantedXP > 0 ? grantedXP : undefined });
                        } catch (err) {
                          console.error('Error finalizando arco:', err);
                          try { swipeableRef.current && swipeableRef.current.close(); } catch(e){}
                          showAlert('Error', 'No se pudo finalizar el arco.');
                        }
                      } }
                    ]);
                  }}
                  containerStyle={{ borderRadius: 14, overflow: 'hidden', height: '100%' }}
                >
                  <ArcCard arc={arc} mode="HERO" style={{ flex: 1 }} onPress={() => navigation.navigate('ArcDetail', { arc })} />
                </Swipeable>

              </View>
            );
          }

          // Default: no active arcs -> show empty state
          return (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="book-open-page-variant-outline" size={56} color={theme.textDim} />
              <Text style={[styles.emptyText, { color: theme.textDim, fontFamily: theme.fonts?.bold }]}>Sin arco activo</Text>
              <Text style={[styles.emptySub, { color: theme.textDim, fontFamily: theme.fonts?.body }]}>Inicia un nuevo capítulo de tu vida</Text>
            </View>
          );
        })()
      ) : firstLoad && arcs.length === 0 ? (
        <View style={{ paddingHorizontal: 10, paddingTop: 8 }}><ListSkeleton rows={4} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id_arco ? String(i.id_arco) : Math.random().toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="trophy-outline" size={56} color={theme.textDim} />
              <Text style={[styles.emptyText, { color: theme.textDim, fontFamily: theme.fonts?.bold }]}>Sin capítulos cerrados</Text>
              <Text style={[styles.emptySub, { color: theme.textDim, fontFamily: theme.fonts?.body }]}>Aquí se guardarán tus arcos completados</Text>
            </View>
          }
        />
      )}

      {activeArcs.length === 0 && activeTab === 'ACTIVOS' ? (
        <PressableScale containerStyle={styles.fabPos} style={[styles.fab, { backgroundColor: theme.primary, shadowColor: theme.primary }]} onPress={onCreate}>
          <Ionicons name="add" size={30} color={theme.textInverse} />
        </PressableScale>
      ) : null}

      <ManageArcModal visible={showModal} arc={editingArc} onClose={() => { setShowModal(false); }} onSaved={onSaved} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50 },
  headerWrap: { paddingHorizontal: 18, marginBottom: 14, marginTop: 4 },
  tabsRow: { flexDirection: 'row', paddingHorizontal: 18, gap: 12, marginBottom: 12 },
  tabBtn: { paddingVertical: 8, paddingHorizontal: 22, borderWidth: 1.5, transform: [{ skewX: '-12deg' }] },
  tabText: { fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', transform: [{ skewX: '12deg' }] },
  fabPos: { position: 'absolute', bottom: 24, right: 24 },
  fab: { width: 62, height: 62, borderRadius: 31, justifyContent: 'center', alignItems: 'center', elevation: 10, shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  emptyText: { fontSize: 16, marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  emptySub: { fontSize: 13, marginTop: 4, textAlign: 'center' },
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
