import React, { useCallback, useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { db } from '../../database';
import { useTheme } from '../../themes/useTheme';
import { MissionType } from '../../types';

export const ManageMissionsScreen = () => {
  const navigation = useNavigation<any>();
  const colors = useTheme();
  const [misiones, setMisiones] = useState<any[]>([]);
  const [availableStats, setAvailableStats] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<string>('TODAS');
  const [filterStat, setFilterStat] = useState<number | null>(null);
  const [filterDay, setFilterDay] = useState<number | null>(null);

  // Cargar cada vez que la pantalla entra en foco para evitar datos cacheados
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const load = async () => {
        try {
          console.log('ManageMissionsScreen: cargando misiones maestras desde DB...');
          const rows: any[] = await db.getAllAsync(
            'SELECT m.*, m.dias_repeticion, m.frecuencia_repeticion, im.id_stat FROM misiones m LEFT JOIN impacto_mision im ON m.id_mision = im.id_mision WHERE m.activa = 1 ORDER BY m.tipo ASC, m.nombre ASC'
          );
          console.log('ManageMissionsScreen: rows fetched:', rows ? rows.length : 0);
          if (isActive) setMisiones(rows || []);

          const stats: any[] = await db.getAllAsync('SELECT * FROM stats ORDER BY nombre ASC');
          console.log('ManageMissionsScreen: stats fetched:', stats ? stats.length : 0);
          if (isActive) setAvailableStats(stats || []);
        } catch (e) {
          console.error('Error cargando misiones maestras o stats:', e);
        }
      };
      load();
      return () => { isActive = false; };
    }, [])
  );

  const filteredMissions = useMemo(() => {
    return misiones.filter(m => {
      // 1. Filtro Tipo
      const matchTipo = filterType === 'TODAS' ? true : (m.tipo === filterType);

      // 2. Filtro Stat (por id_stat)
      const matchStat = filterStat === null ? true : (m.id_stat === filterStat);

      // 3. Filtro Día (lógica estricta)
      let matchDay = true;
      if (filterDay !== null) {
        try {
          const diasRaw = m.dias_repeticion;
          if (diasRaw && String(diasRaw).trim().length > 0) {
            // REGla de oro: si hay dias explícitos, respetarlos estrictamente
            const diasArray = String(diasRaw).split(',').map((d: string) => d.trim()).filter(Boolean);
            matchDay = diasArray.includes(String(filterDay));
          } else {
            // Fallback cuando NO hay dias explícitos
            if (m.frecuencia_repeticion === 'EVERY_DAY' || m.tipo === MissionType.DIARIA) {
              matchDay = true;
            } else {
              matchDay = false;
            }
          }
        } catch (e) {
          console.error('Error evaluando dias_repeticion para misión:', m.id_mision, e);
          matchDay = false;
        }
      }

      return matchTipo && matchStat && matchDay;
    });
  }, [misiones, filterType, filterStat, filterDay]);

  const onSelectType = (t: string) => {
    console.log('ManageMissionsScreen: set filterType ->', t);
    setFilterType(t);
  };
  const onSelectStat = (id: number | null) => {
    console.log('ManageMissionsScreen: set filterStat ->', id);
    setFilterStat(id);
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={[styles.item, { borderColor: colors.primary }]} onPress={() => {
      console.log('ManageMissionsScreen: navegando a CreateMission con missionToEdit id:', item.id_mision);
      navigation.navigate('CreateMission', { missionToEdit: item });
    }}>
      <View style={styles.row}>
        <Text style={[styles.title, { color: colors.text }]}>{item.nombre}</Text>
        <View style={[styles.chip, { borderColor: colors.primary }]}>
          <Text style={{ color: colors.text, fontSize: 12 }}>{item.tipo}</Text>
        </View>
      </View>
      <Text style={{ color: colors.textDim, fontSize: 12 }}>{item.frecuencia_repeticion || item.frecuencia || 'Una vez'}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <Text style={[styles.header, { color: colors.primary }]}>GESTIONAR MISIONES</Text>

      {/* Fila 1: Tipos */}
      <View style={{ paddingHorizontal: 12, marginBottom: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8 }}>
          <TouchableOpacity onPress={() => onSelectType('TODAS')} style={[styles.chip, filterType === 'TODAS' ? { backgroundColor: colors.primary } : { borderColor: colors.text }]}>
            <Text style={[styles.chipText, filterType === 'TODAS' && { color: colors.textInverse }]}>TODAS</Text>
          </TouchableOpacity>
          {Object.values(MissionType).map((t) => (
            <TouchableOpacity key={t} onPress={() => onSelectType(t)} style={[styles.chip, filterType === t ? { backgroundColor: colors.primary } : { borderColor: colors.text }]}>
              <Text style={[styles.chipText, filterType === t && { color: colors.textInverse }]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Fila 2: Stats */}
      <View style={{ paddingHorizontal: 12, marginBottom: 12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8 }}>
          <TouchableOpacity onPress={() => onSelectStat(null)} style={[styles.chip, filterStat === null ? { backgroundColor: colors.primary } : { borderColor: colors.text }]}>
            <Text style={[styles.chipText, filterStat === null && { color: colors.textInverse }]}>TODAS</Text>
          </TouchableOpacity>
          {availableStats.map((s) => (
            <TouchableOpacity key={s.id_stat} onPress={() => onSelectStat(s.id_stat)} style={[styles.chip, filterStat === s.id_stat ? { backgroundColor: colors.primary } : { borderColor: colors.text }]}>
              <Text style={[styles.chipText, filterStat === s.id_stat && { color: colors.textInverse }]}>{s.nombre}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Fila 3: Días de la semana */}
      <View style={{ paddingHorizontal: 12, marginBottom: 12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8, alignItems: 'center' }}>
          <TouchableOpacity onPress={() => setFilterDay(null)} style={[styles.chip, filterDay === null ? { backgroundColor: colors.primary } : { borderColor: colors.text }]}>
            <Text style={[styles.chipText, filterDay === null && { color: colors.textInverse }]}>TODAS</Text>
          </TouchableOpacity>
          {['D','L','M','M','J','V','S'].map((label, idx) => (
            <TouchableOpacity key={idx} onPress={() => setFilterDay(idx)} style={[styles.dayBtn, filterDay === idx ? { backgroundColor: colors.primary } : { borderColor: colors.text }]}>
              <Text style={[{ color: filterDay === idx ? colors.textInverse : colors.text, fontWeight: '700' }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredMissions}
        keyExtractor={(i) => i.id_mision ? i.id_mision.toString() : Math.random().toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50 },
  header: { fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 10 },
  item: { padding: 12, borderWidth: 1, borderRadius: 8, marginBottom: 10, backgroundColor: 'transparent' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontWeight: '700', fontSize: 16 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 10, backgroundColor: 'transparent' },
  chipText: { color: '#fff', fontWeight: '700' },
  dayBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginRight: 8 }
});
