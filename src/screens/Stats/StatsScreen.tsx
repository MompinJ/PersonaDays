import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { usePlayerStats } from '../../hooks/usePlayerStats';
import { useTheme } from '../../themes/useTheme';
import { StatRow } from '../../components/StatRow';
import { StatRadarChart } from '../../components/StatRadarChart';
import { AddStatButton } from '../../components/AddStatButton';
import { CreateStatModalNew as CreateStatModal } from '../../components/CreateStatModalNew';
import { SelectGraphStatsModal } from '../../components/SelectGraphStatsModal';

export const StatsScreen = () => {
  const { stats, loading, refreshStats } = usePlayerStats();
  const [isModalVisible, setModalVisible] = useState(false);

  const [isGraphModalVisible, setGraphModalVisible] = useState(false);
  const [graphStatsIds, setGraphStatsIds] = useState<number[]>([]); // Vacío = default

  const colors = useTheme();

  const handleCreateStat = () => {
    setModalVisible(true);
  };

  const handleSuccess = () => {
    refreshStats();
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
               selectedStatsIds={graphStatsIds.length === 5 ? graphStatsIds : undefined}
               color={colors.primary} 
               size={280} 
            />
            <Text style={[styles.listLabel, { color: colors.textDim, fontFamily: colors.fonts?.bold, textTransform: 'uppercase' }]}>DETALLE DE HABILIDADES</Text>
          </View>
        }
        renderItem={({ item }) => (
          <StatRow data={item} colorTema={colors.primary} />
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
        currentSelection={graphStatsIds.length === 5 ? graphStatsIds : [1,5,3,4,2]}
        onClose={() => setGraphModalVisible(false)}
        onSave={(ids) => setGraphStatsIds(ids)}
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
