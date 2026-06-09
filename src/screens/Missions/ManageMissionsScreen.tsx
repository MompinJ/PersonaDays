import React, { useCallback, useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView, Animated, Easing } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../database';
import { useTheme } from '../../themes/useTheme';
import { MissionType } from '../../types';
import { PressableScale } from '../../components/UI/PressableScale';
import { PersonaShard } from '../../components/UI/PersonaShard';
import { getContrastText } from '../../utils/colorUtils';

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

  // Color de acento segun el tipo de mision
  const colorForType = (t: string) => {
    if (t === MissionType.BOSS) return colors.error;
    if (t === MissionType.SEMANAL || t === MissionType.EXTRA) return colors.secondary;
    return colors.primary; // TODAS, DIARIA, ARCO
  };

  // FILA 1 (TIPO): parallelogramos inclinados, color por tipo, zigzag vertical
  const TypeChip = ({ label, active, onPress, i }: { label: string; active: boolean; onPress: () => void; i: number }) => {
    const sk = [-15, 12, -16, 13, -12][i % 5];
    const st = [8, 20, 4, 16, 8][i % 5];
    const accent = colorForType(label);
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[styles.typeChipF, { marginTop: st, borderColor: accent, backgroundColor: active ? accent : colors.surface, transform: [{ skewX: `${sk}deg` }] }]}>
        <Text style={[styles.typeChipFText, { color: active ? getContrastText(accent) : colors.textDim, fontFamily: colors.fonts?.heading, transform: [{ skewX: `${-sk}deg` }] }]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  // FILA 2 (STAT): etiquetas inclinadas al lado opuesto, con punto de acento, fuente condensed
  const StatChip = ({ label, active, onPress, i }: { label: string; active: boolean; onPress: () => void; i: number }) => {
    const sk = [13, -11, 14, -12, 11][i % 5];
    const st = [16, 4, 14, 6, 12][i % 5];
    const accent = i % 2 === 0 ? colors.primary : colors.secondary;
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[styles.statChipF, { marginTop: st, borderColor: accent, backgroundColor: active ? accent + '26' : 'transparent', transform: [{ skewX: `${sk}deg` }] }]}>
        <View style={[styles.statDot, { backgroundColor: active ? accent : colors.inactive, transform: [{ skewX: `${-sk}deg` }] }]} />
        <Text style={[styles.statChipFText, { color: active ? accent : colors.textDim, fontFamily: colors.fonts?.condensed, transform: [{ skewX: `${-sk}deg` }] }]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const repite = item.frecuencia_repeticion && item.frecuencia_repeticion !== 'ONE_OFF';
    const accent = colorForType(item.tipo);
    const sk = -8;
    const stagger = [0, 16, 6, 20, 10][index % 5];
    const rot = [-1.3, 1, -1, 1.3, -0.5][index % 5];
    return (
      <PressableScale
        containerStyle={[styles.itemWrap, { marginLeft: stagger, marginRight: 22 - stagger }]}
        style={[styles.item, { backgroundColor: colors.surface, borderColor: accent, transform: [{ rotate: `${rot}deg` }, { skewX: `${sk}deg` }] }]}
        scaleTo={0.97}
        onPress={() => navigation.navigate('CreateMission', { missionToEdit: item })}
      >
        <View style={[styles.itemAccent, { backgroundColor: accent }]} />
        <View style={[styles.itemInner, { transform: [{ skewX: `${-sk}deg` }] }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.itemTitle, { color: colors.text, fontFamily: colors.fonts?.heading }]} numberOfLines={1}>{item.nombre}</Text>
            <View style={styles.itemMeta}>
              <Ionicons name={repite ? 'repeat' : 'flash-outline'} size={13} color={colors.textDim} />
              <Text style={{ color: colors.textDim, fontSize: 12, marginLeft: 4, fontFamily: colors.fonts?.condensed, letterSpacing: 0.5 }}>{repite ? 'REPETIDA' : 'UNA VEZ'}</Text>
            </View>
          </View>
          <View style={[styles.typeBadge, { backgroundColor: accent }]}>
            <Text style={[styles.typeBadgeText, { color: getContrastText(accent), fontFamily: colors.fonts?.heading }]}>{item.tipo}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={accent} style={{ marginLeft: 8 }} />
        </View>
      </PressableScale>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.headerWrap}>
        <PersonaShard label="GESTIONAR" height={50} fontSize={28} font={colors.fonts?.title} />
      </View>

      <Animated.View
        style={{
          flex: 1,
          opacity: intro,
          transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
        }}
      >
        {/* Fila 1: Tipos (parallelogramos color por tipo, zigzag) */}
        <View style={styles.filterRowTall}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContentTop}>
            <TypeChip label="TODAS" active={filterType === 'TODAS'} onPress={() => onSelectType('TODAS')} i={0} />
            {Object.values(MissionType).map((t, idx) => (
              <TypeChip key={t} label={t} active={filterType === t} onPress={() => onSelectType(t)} i={idx + 1} />
            ))}
          </ScrollView>
        </View>

        {/* Fila 2: Stats (etiquetas con punto, skew opuesto, condensed) */}
        <View style={styles.filterRowTall}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContentTop}>
            <StatChip label="TODAS" active={filterStat === null} onPress={() => onSelectStat(null)} i={0} />
            {availableStats.map((s, idx) => (
              <StatChip key={s.id_stat} label={String(s.nombre).toUpperCase()} active={filterStat === s.id_stat} onPress={() => onSelectStat(s.id_stat)} i={idx + 1} />
            ))}
          </ScrollView>
        </View>

        {/* Fila 3: Días (circulos que rebotan, colores alternos) */}
        <View style={styles.filterRowDays}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filterContentTop, { alignItems: 'flex-start' }]}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setFilterDay(null)}
              style={[styles.todosDay, { marginTop: 10, borderColor: colors.primary, backgroundColor: filterDay === null ? colors.primary : colors.surface, transform: [{ skewX: '-12deg' }] }]}
            >
              <Text style={{ color: filterDay === null ? getContrastText(colors.primary) : colors.textDim, fontFamily: colors.fonts?.heading, fontSize: 12, letterSpacing: 1, transform: [{ skewX: '12deg' }] }}>TODOS</Text>
            </TouchableOpacity>
            {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((label, idx) => {
              const active = filterDay === idx;
              const accent = idx % 2 === 0 ? colors.primary : colors.secondary;
              const bob = [16, 2, 12, 0, 14, 4, 10][idx % 7];
              return (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.85}
                  onPress={() => setFilterDay(idx)}
                  style={[styles.dayBtn, { marginTop: bob, borderColor: accent, backgroundColor: active ? accent : colors.surface }]}
                >
                  <Text style={{ color: active ? getContrastText(accent) : accent, fontFamily: colors.fonts?.heading, fontSize: 14 }}>{label}</Text>
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

  headerWrap: { paddingHorizontal: 16, marginBottom: 10, marginTop: 4 },

  // Filas de filtros (cada una con personalidad propia)
  filterRowTall: { paddingHorizontal: 12, height: 56 },
  filterRowDays: { paddingHorizontal: 12, height: 60, marginBottom: 2 },
  filterContentTop: { paddingHorizontal: 4, alignItems: 'flex-start' },

  // Fila 1: TIPO
  typeChipF: { paddingHorizontal: 15, paddingVertical: 8, borderWidth: 1.5, marginRight: 11 },
  typeChipFText: { fontSize: 12, letterSpacing: 1 },

  // Fila 2: STAT
  statChipF: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, paddingVertical: 7, borderWidth: 1.5, marginRight: 11 },
  statDot: { width: 7, height: 7, borderRadius: 4, marginRight: 7 },
  statChipFText: { fontSize: 12, letterSpacing: 1 },

  // Fila 3: DIAS
  todosDay: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5, marginRight: 12, justifyContent: 'center' },
  dayBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', marginRight: 9 },

  // Tarjetas de mision (inclinadas, escalonadas)
  itemWrap: { marginBottom: 14 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, paddingLeft: 22, borderWidth: 1.5 },
  itemAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, transform: [{ skewX: '-14deg' }], marginLeft: -3 },
  itemInner: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  itemTitle: { fontSize: 18, textTransform: 'uppercase', letterSpacing: 0.5 },
  itemMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  typeBadge: { paddingHorizontal: 9, paddingVertical: 3, marginLeft: 8, transform: [{ skewX: '-10deg' }] },
  typeBadgeText: { fontSize: 10, letterSpacing: 1, transform: [{ skewX: '10deg' }] },

  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
});
