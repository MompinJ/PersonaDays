import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, LayoutAnimation } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePlayerStats } from '../../hooks/usePlayerStats';
import { useTheme } from '../../themes/useTheme';
import { StatRow } from '../../components/Stats/StatRow';
import { StatRadarChart } from '../../components/Stats/StatRadarChart';
import { AddStatButton } from '../../components/Stats/AddStatButton';
import { CreateStatModalNew as CreateStatModal } from '../../components/Stats/CreateStatModalNew';
import { SelectGraphStatsModal } from '../../components/Stats/SelectGraphStatsModal';
import { StatDetailModal } from '../../components/Stats/StatDetailModal';

const STORAGE_KEY = 'USER_GRAPH_CONFIG';

export const StatsScreen = () => {
  const { stats, loading, refreshStats } = usePlayerStats();
  const [isModalVisible, setModalVisible] = useState(false);

  const [isGraphModalVisible, setGraphModalVisible] = useState(false);
  const [visibleStatIds, setVisibleStatIds] = useState<number[]>([]); // Vacío = default

  const colors = useTheme();



  useFocusEffect(
    useCallback(() => {
      try { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); } catch(e) { /* ignore */ }
      refreshStats && refreshStats();
      return () => { /* cleanup if needed */ };
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

  if (loading && stats.length === 0) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={{ color: colors.text, fontFamily: colors.fonts?.body }}>Analizando potencial...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }] }>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text, fontFamily: colors.fonts?.title, textTransform: 'uppercase', letterSpacing: 1.5 }]}>PARAMETERS</Text>
        <View style={[styles.headerLine, { backgroundColor: colors.primary }]} />
      </View>

      <FlatList
        data={stats}
        keyExtractor={(item) => item.id_stat.toString()}
        ListHeaderComponent={
          <View>
                {stats.length > 5 && (
              <View style={{ alignItems: 'flex-end', paddingRight: 20 }}>
                <TouchableOpacity onPress={() => setGraphModalVisible(true)}>
                            <Text style={{ color: colors.primary, fontSize: 10, textDecorationLine: 'underline', fontFamily: colors.fonts?.bold, textTransform: 'uppercase', letterSpacing: 1 }}>
                    ⚙ CONFIGURAR GRÁFICO
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
            <Text style={[styles.listLabel, { color: colors.textDim, fontFamily: colors.fonts?.bold, textTransform: 'uppercase' }]}>DETALLE DE HABILIDADES</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity activeOpacity={0.9} onPress={() => { setSelectedStat(item); setDetailModalVisible(true); }}>
            <StatRow data={item} colorTema={colors.primary} />
          </TouchableOpacity>
        )}
        ListFooterComponent={
          <AddStatButton onPress={handleCreateStat} color={colors.primary} />
        }
        contentContainerStyle={styles.listContent}
        onRefresh={refreshStats}
        refreshing={loading}
      />

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
  listLabel: {
    color: '#666',
    fontSize: 12,
    marginLeft: 20,
    marginBottom: 10,
    marginTop: 10,
    letterSpacing: 1,
  },
  listContent: {
    paddingBottom: 40,
  },
});
