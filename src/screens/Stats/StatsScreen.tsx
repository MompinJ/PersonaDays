import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, LayoutAnimation, Animated, InteractionManager } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useFocusEntrance } from '../../hooks/useFocusEntrance';
import { SkeletonStatRow } from '../../components/UI/Skeleton';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePlayerStats } from '../../hooks/usePlayerStats';
import { PressableScale } from '../../components/UI/PressableScale';
import { PersonaShard } from '../../components/UI/PersonaShard';
import { useTheme } from '../../themes/useTheme';
import { StatRow } from '../../components/Stats/StatRow';
import { StatRadarChart } from '../../components/Stats/StatRadarChart';
import { AddStatButton } from '../../components/Stats/AddStatButton';
import { CreateStatModalNew as CreateStatModal } from '../../components/Stats/CreateStatModalNew';
import { SelectGraphStatsModal } from '../../components/Stats/SelectGraphStatsModal';
import { StatDetailModal } from '../../components/Stats/StatDetailModal';
import { resolveStatKey } from '../../components/Stats/stats';

const STORAGE_KEY = 'USER_GRAPH_CONFIG';

export const StatsScreen = () => {
  const { stats, loading, refreshStats } = usePlayerStats();
  const [isModalVisible, setModalVisible] = useState(false);

  const [isGraphModalVisible, setGraphModalVisible] = useState(false);
  const [visibleStatIds, setVisibleStatIds] = useState<number[]>([]); // Vacío = default

  const colors = useTheme();

  // Entrada animada en CADA foco (no solo al montar)
  const { style: introStyle } = useFocusEntrance(16, 450);

  // Carga diferida: deja que la entrada anime primero, luego consulta la DB
  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(() => {
        try { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); } catch(e) { /* ignore */ }
        refreshStats && refreshStats();
      });
      return () => task.cancel();
    }, [refreshStats])
  );

  // Load persisted graph config on mount or when stats change
  useEffect(() => {
    let mounted = true;
    const loadConfig = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const ids = JSON.parse(raw) as number[];
          if (mounted && Array.isArray(ids) && ids.length >= 3) {
            setVisibleStatIds(ids);
            return;
          }
        }

        // No persisted config or invalid: create default from available stats
        if (mounted && stats && stats.length > 0 && visibleStatIds.length === 0) {
          const desired = Math.min(5, Math.max(3, stats.length));
          const fallback = stats.slice(0, desired).map(s => s.id_stat);
          setVisibleStatIds(fallback);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
        }
      } catch (e) {
        console.error('Error loading graph config:', e);
      }
    };
    loadConfig();
    return () => { mounted = false; };
  }, [stats]);



  const handleCreateStat = () => {
    setModalVisible(true);
  };

  const handleSuccess = () => {
    refreshStats();
  };

  const [selectedStat, setSelectedStat] = useState<any | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const onDetailSaved = async () => {
    try {
      await refreshStats();
    } catch (e) {
      console.error('Error refreshing stats after save/delete:', e);
    }
  };

  const showSkeleton = loading && stats.length === 0;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }] }>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <PersonaShard label="PARAMETERS" height={54} fontSize={30} font={colors.fonts?.title} />
      </View>

      <Animated.View style={[{ flex: 1 }, introStyle]}>
        {showSkeleton ? (
          <View style={{ paddingHorizontal: 6, paddingTop: 20 }}>
            <View style={{ alignItems: 'center', marginBottom: 30 }}>
              <View style={{ width: 240, height: 240, borderRadius: 120, borderWidth: 1, borderColor: colors.border, opacity: 0.4 }} />
            </View>
            {Array.from({ length: 5 }).map((_, i) => <SkeletonStatRow key={i} index={i} />)}
          </View>
        ) : (
        <FlatList
          data={stats}
          keyExtractor={(item) => item.id_stat.toString()}
          ListHeaderComponent={
            <View>
              {stats.length > 5 && (
                <View style={{ alignItems: 'flex-end', paddingRight: 20 }}>
                  <TouchableOpacity onPress={() => setGraphModalVisible(true)} style={styles.configLink} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="settings-sharp" size={12} color={colors.primary} />
                    <Text style={{ color: colors.primary, fontSize: 10, fontFamily: colors.fonts?.bold, textTransform: 'uppercase', letterSpacing: 1, marginLeft: 5 }}>
                      Configurar gráfico
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <StatRadarChart
                stats={stats}
                selectedStatsIds={visibleStatIds.length >= 3 ? visibleStatIds : undefined}
                color={colors.primary}
                size={280}
              />
              <View style={{ marginLeft: 20, marginTop: 10, marginBottom: 10 }}>
                <PersonaShard label="DETALLE DE HABILIDADES" variant="ghost" fontSize={12} />
              </View>
            </View>
          }
          renderItem={({ item }) => {
            // Icono: por nombre propio; si es un habito hijo, hereda el del stat padre
            const ownKey = resolveStatKey(item.nombre_stat);
            const parentName = item.id_stat_padre ? stats.find(s => s.id_stat === item.id_stat_padre)?.nombre_stat : null;
            const statKey = ownKey ?? resolveStatKey(parentName);
            return (
              <PressableScale scaleTo={0.98} onPress={() => { setSelectedStat(item); setDetailModalVisible(true); }}>
                <StatRow data={item} colorTema={colors.primary} statKey={statKey} />
              </PressableScale>
            );
          }}
          ListFooterComponent={
            <AddStatButton onPress={handleCreateStat} color={colors.primary} />
          }
          contentContainerStyle={styles.listContent}
          onRefresh={refreshStats}
          refreshing={loading}
          showsVerticalScrollIndicator={false}
        />
        )}
      </Animated.View>

      <CreateStatModal 
        visible={isModalVisible} 
        onClose={() => setModalVisible(false)}
        onSuccess={handleSuccess}
      />

      <SelectGraphStatsModal
        visible={isGraphModalVisible}
        allStats={stats}
        currentSelection={visibleStatIds}
        onClose={() => setGraphModalVisible(false)}
        onSave={async (ids) => {
          try {
            setVisibleStatIds(ids);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
            setGraphModalVisible(false);
          } catch (e) {
            console.error('Error saving graph config:', e);
          }
        }}
      />

      <StatDetailModal
        visible={detailModalVisible}
        stat={selectedStat}
        onClose={() => { setDetailModalVisible(false); setSelectedStat(null); }}
        onSaved={onDetailSaved}
      />

    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingTop: 60,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -1,
  },
  headerLine: {
    height: 4,
    width: '100%',
    marginTop: 5,
    transform: [{ skewX: '-45deg' }]
  }, 
  configLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  listLabel: {
    color: '#666',
    fontSize: 12,
    marginLeft: 20,
    marginBottom: 10,
    marginTop: 10,
    letterSpacing: 1,
  },
  listContent: {
    paddingBottom: 160,
  },
});
