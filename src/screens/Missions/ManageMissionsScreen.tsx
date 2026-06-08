import React, { useCallback, useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView, Animated, Easing } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../database';
import { useTheme } from '../../themes/useTheme';
import { MissionType } from '../../types';
import { PressableScale } from '../../components/UI/PressableScale';

export const ManageMissionsScreen = () => {
  const navigation = useNavigation<any>();
  const colors = useTheme();
  const [misiones, setMisiones] = useState<any[]>([]);
  const [availableStats, setAvailableStats] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<string>('TODAS');
  const [filterStat, setFilterStat] = useState<number | null>(null);
  const [filterDay, setFilterDay] = useState<number | null>(null);

  // Animacion de entrada (una sola vez)
  const intro = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(intro, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);

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

  const onSelectType = (t: string) => setFilterType(t);
  const onSelectStat = (id: number | null) => setFilterStat(id);

  // Chip inclinado reutilizable (estilo Persona)
  const Chip = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.chip, { borderColor: colors.primary, backgroundColor: active ? colors.primary : colors.surface }]}
    >
      <Text style={[styles.chipText, { color: active ? colors.textInverse : colors.textDim, fontFamily: colors.fonts?.heading }]}>{label}</Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: any }) => {
    const repite = item.frecuencia_repeticion && item.frecuencia_repeticion !== 'ONE_OFF';
    return (
      <PressableScale
        containerStyle={styles.itemWrap}
        style={[styles.item, { backgroundColor: colors.surface, borderColor: colors.border }]}
        scaleTo={0.97}
        onPress={() => navigation.navigate('CreateMission', { missionToEdit: item })}
      >
        <View style={[styles.itemAccent, { backgroundColor: colors.primary }]} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.itemTitle, { color: colors.text, fontFamily: colors.fonts?.title }]} numberOfLines={1}>{item.nombre}</Text>
          <View style={styles.itemMeta}>
            <Ionicons name={repite ? 'repeat' : 'flash-outline'} size={13} color={colors.textDim} />
            <Text style={{ color: colors.textDim, fontSize: 12, marginLeft: 4 }}>{repite ? 'Repetida' : 'Una vez'}</Text>
          </View>
        </View>
        <View style={[styles.typeChip, { borderColor: colors.primary }]}>
          <Text style={[styles.typeChipText, { color: colors.primary, fontFamily: colors.fonts?.heading }]}>{item.tipo}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textDim} style={{ marginLeft: 6 }} />
      </PressableScale>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.headerRow}>
        <View style={[styles.titleAccent, { backgroundColor: colors.primary }]} />
        <Text style={[styles.header, { color: colors.text, fontFamily: colors.fonts?.title }]}>GESTIONAR</Text>
      </View>

      <Animated.View
        style={{
          flex: 1,
          opacity: intro,
          transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
        }}
      >
        {/* Fila 1: Tipos */}
        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
            <Chip label="TODAS" active={filterType === 'TODAS'} onPress={() => onSelectType('TODAS')} />
            {Object.values(MissionType).map((t) => (
              <Chip key={t} label={t} active={filterType === t} onPress={() => onSelectType(t)} />
            ))}
          </ScrollView>
        </View>

        {/* Fila 2: Stats */}
        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
            <Chip label="TODAS" active={filterStat === null} onPress={() => onSelectStat(null)} />
            {availableStats.map((s) => (
              <Chip key={s.id_stat} label={String(s.nombre).toUpperCase()} active={filterStat === s.id_stat} onPress={() => onSelectStat(s.id_stat)} />
            ))}
          </ScrollView>
        </View>

        {/* Fila 3: Días de la semana */}
        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filterContent, { alignItems: 'center' }]}>
            <Chip label="TODOS" active={filterDay === null} onPress={() => setFilterDay(null)} />
            {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((label, idx) => {
              const active = filterDay === idx;
              return (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.85}
                  onPress={() => setFilterDay(idx)}
                  style={[styles.dayBtn, { borderColor: colors.primary, backgroundColor: active ? colors.primary : colors.surface }]}
                >
                  <Text style={{ color: active ? colors.textInverse : colors.textDim, fontWeight: '700', fontFamily: colors.fonts?.heading }}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <FlatList
          data={filteredMissions}
          keyExtractor={(i) => (i.id_mision ? i.id_mision.toString() : Math.random().toString())}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingTop: 8 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="file-tray-outline" size={48} color={colors.textDim} />
              <Text style={{ color: colors.textDim, marginTop: 12, fontFamily: colors.fonts?.bold }}>Sin misiones con esos filtros</Text>
            </View>
          }
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50 },

  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, marginBottom: 12 },
  titleAccent: { width: 7, height: 28, marginRight: 12, transform: [{ skewX: '-20deg' }] },
  header: { fontSize: 26, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2 },

  filterRow: { paddingHorizontal: 12, marginBottom: 6 },
  filterContent: { paddingVertical: 6, paddingHorizontal: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1.5, marginRight: 10, transform: [{ skewX: '-12deg' }] },
  chipText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, transform: [{ skewX: '12deg' }] },
  dayBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', marginRight: 8 },

  itemWrap: { marginBottom: 12 },
  item: { flexDirection: 'row', alignItems: 'center', padding: 14, paddingLeft: 20, borderRadius: 8, borderWidth: 1, overflow: 'hidden' },
  itemAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 7, transform: [{ skewX: '-12deg' }], marginLeft: -2 },
  itemTitle: { fontWeight: '700', fontSize: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  itemMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  typeChip: { paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderRadius: 4, marginLeft: 8 },
  typeChipText: { fontSize: 10, letterSpacing: 0.5 },

  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
});
