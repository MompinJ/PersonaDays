import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView, LayoutAnimation, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from '../../components/UI/PressableScale';
import { PersonaShard } from '../../components/UI/PersonaShard';
import { getContrastText } from '../../utils/colorUtils';
import { useFocusEffect } from '@react-navigation/native'; // Hook para saber cuando entras a la pantalla
import { InteractionManager } from 'react-native';
import { useFocusEntrance } from '../../hooks/useFocusEntrance';
import { ListSkeleton } from '../../components/UI/Skeleton';
import { useEventFlash } from '../../context/EventFlashContext';
import { ActionGlyph } from '../../components/UI/ActionGlyphs';
import { db } from '../../database'; // Tu conexión DB
import { Mision, MissionType, MissionFrequency } from '../../types'; // Tus tipos
import { completeMission } from '../../services/missionService';
import { MissionItem } from '../../components/Missions/MissionItem';
import { MissionDetailModal } from '../../components/Missions/MissionDetailModal';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useGame } from '../../context/GameContext';
import { usePlayerStats } from '../../hooks/usePlayerStats';

export const MissionsScreen = () => {
  // 1. Estado para guardar la lista de misiones que vienen de la BD
  const [misiones, setMisiones] = useState<Mision[]>([]);
  const [filtroActual, setFiltroActual] = useState<MissionType>(MissionType.DIARIA);
  const [selectedMission, setSelectedMission] = useState<Mision | null>(null);

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme, player, refreshUser } = useGame();
  const { refreshStats } = usePlayerStats();

  // Entrada animada en CADA foco (no solo al montar)
  const { style: introStyle } = useFocusEntrance(18, 420);
  const [firstLoad, setFirstLoad] = useState(true);
  const { flash } = useEventFlash();

  // Marcar como completada una mision (con logs y desaparición suave)
  const toogleMission = async (id: number) => {
    const mision = misiones.find(m => m.id_mision === id);
    if (!mision) return;

    // Evitar doble-toggle
    if (mision.completada) {
      console.log('Misión ya completada (en memoria):', id);
      return;
    }

    try {
      // Toda la logica (XP, niveles, herencia, log, nivel jugador) vive en el
      // service y corre dentro de una transaccion. Si algo falla, hace ROLLBACK.
      const result = await completeMission(id, player);
      if (!result) return; // no existe o ya estaba completada

      // Refrescar vistas
      try { refreshStats && refreshStats(); } catch(e) { console.log('refreshStats error', e); }
      try { refreshUser && refreshUser(); } catch(e) { console.log('refreshUser error', e); }

      // Animación y eliminación local inmediata de la misión
      try { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); } catch(e) { /* ignore */ }
      setMisiones(prev => prev.filter(m => m.id_mision !== id));

      // FLASH de evento estilo Persona: encargo completado + subidas de nivel (en cola)
      flash({ kind: 'complete', title: 'ENCARGO COMPLETADO', subtitle: result.missionName, xp: result.totalExpGained, yen: result.totalYenes });
      result.leveledUp.forEach((l) => flash({ kind: 'levelup', title: `NIVEL ${l.level}`, subtitle: l.name }));

    } catch (error) {
      console.error('Error completando misión:', error);
    }
  };



  // todo temporal
const irACrearMision = () => {
    navigation.navigate('CreateMission');
  };



  // Función para revisar y reiniciar recurrencias vencidas
  const checkAndResetRecurrence = async () => {
    try {
      // DIARIAS: si completada y fecha_completada < hoy -> reset
      const resDiarias: any = await db.runAsync(
        "UPDATE misiones SET completada = 0, fecha_completada = NULL WHERE tipo = 'DIARIA' AND completada = 1 AND date(fecha_completada) < date('now', 'localtime')"
      );
      console.log('Misiones diarias reiniciadas:', resDiarias && (resDiarias.changes || resDiarias.rowsAffected || 0));

      // SEMANALES: calcular inicio de semana (Lunes) en local
      const today = new Date();
      const day = today.getDay(); // 0..6
      const deltaSinceMonday = (day + 6) % 7; // 0 if Monday
      const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - deltaSinceMonday);
      const mondayStr = monday.toISOString().split('T')[0];

      const resSem: any = await db.runAsync(
        'UPDATE misiones SET completada = 0, fecha_completada = NULL WHERE tipo = ? AND completada = 1 AND date(fecha_completada) < ?',
        [MissionType.SEMANAL, mondayStr]
      );
      console.log('Misiones semanales reiniciadas:', resSem && (resSem.changes || resSem.rowsAffected || 0));
    } catch (e) {
      console.error('Error reseteando recurrencias:', e);
    }
  };

  // 4. Cada vez que entres a esta pestaña, recarga los datos (ejecución única por foco)
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const fetchByType = async () => {
        try {
          // Antes de cargar, revisar recurrencias
          await checkAndResetRecurrence();

          const query = `
  SELECT
    m.*,
    s.nombre as nombre_stat,
    im.valor_impacto
  FROM misiones m
  LEFT JOIN impacto_mision im ON m.id_mision = im.id_mision
  LEFT JOIN stats s ON im.id_stat = s.id_stat
  WHERE m.activa = 1 AND m.completada = 0
  ORDER BY m.completada ASC, m.fecha_creacion DESC;
`;
          const resultados = await db.getAllAsync<Mision>(query);
          if (isActive) {
            try { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); } catch(e) { /* ignore */ }
            setMisiones(resultados);
            setFirstLoad(false);
          }
        } catch (error) {
          console.error('Error al cargar misiones (focus):', error);
          if (isActive) setFirstLoad(false);
        }
      };

      // Diferido: la entrada anima primero, luego consultamos la DB
      const task = InteractionManager.runAfterInteractions(fetchByType);

      return () => { isActive = false; task.cancel(); };
    }, [])
  );


  const filteredMissions = useMemo(() => {
    if (!misiones) return [];
    const todayIndex = new Date().getDay(); // 0=Dom,1=Lun...
    try {
      return misiones.filter(m => {
        // type must match current tab
        if (m.tipo !== filtroActual) return false;

        // If we're on DIARIA tab, enforce day recurrence
        if (filtroActual === MissionType.DIARIA) {
          const diasRaw = m.dias_repeticion;
          if (diasRaw && String(diasRaw).trim().length > 0) {
            const diasArray = String(diasRaw).split(',').map((d: string) => d.trim()).filter(Boolean);
            return diasArray.includes(String(todayIndex));
          }
          // fallback: if no explicit days, or marked EVERY_DAY, show
          if (m.frecuencia_repeticion === MissionFrequency.EVERY_DAY || !diasRaw || String(diasRaw).trim() === '') return true;
          return false;
        }

        // If we're on SEMANAL tab, show all weekly active missions
        if (filtroActual === MissionType.SEMANAL) return true;

        // default: show if type matches
        return true;
      });
    } catch (e) {
      console.error('Error filtrando misiones por tipo/día:', e);
      return misiones;
    }
  }, [misiones, filtroActual]);

  const renderFiltro = (tipo: MissionType, i: number) => {
    const active = filtroActual === tipo;
    const sk = [-15, 12, -16, 13, -12][i % 5];
    const st = [10, 22, 4, 18, 8][i % 5];
    const accent = tipo === MissionType.BOSS ? theme.error : (i % 2 === 0 ? theme.primary : theme.secondary);
    return (
      <TouchableOpacity
        key={tipo}
        activeOpacity={0.85}
        style={[
          styles.filterChip,
          { marginTop: st, backgroundColor: active ? accent : theme.surface, borderColor: accent, transform: [{ skewX: `${sk}deg` }] },
        ]}
        onPress={() => setFiltroActual(tipo)}
      >
        <Text style={[styles.filterText, { color: active ? getContrastText(accent) : theme.textDim, fontFamily: theme.fonts?.heading, transform: [{ skewX: `${-sk}deg` }] }]}>
          {tipo}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.headerWrap}>
        <PersonaShard label="REQUESTS" height={54} fontSize={30} font={theme.fonts?.title} />
      </View>

      {/* Zona de Filtros (Scroll Horizontal) */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20, alignItems: 'flex-start' }}>
          {renderFiltro(MissionType.DIARIA, 0)}
          {renderFiltro(MissionType.SEMANAL, 1)}
          {renderFiltro(MissionType.ARCO, 2)}
          {renderFiltro(MissionType.EXTRA, 3)}
          {renderFiltro(MissionType.BOSS, 4)}
        </ScrollView>
      </View>

      {/* Lista de Misiones */}
      <Animated.View style={[{ flex: 1 }, introStyle]}>
        {firstLoad && misiones.length === 0 ? (
          <View style={{ paddingTop: 8 }}><ListSkeleton rows={5} /></View>
        ) : (
        <FlatList
          data={filteredMissions}
          keyExtractor={(item) => item.id_mision.toString()}
          renderItem={({ item, index }) => (
            <MissionItem
              mision={item}
              index={index}
              onSwipeLeft={(id) => toogleMission(id)}
              onPress={(mision) => setSelectedMission(mision)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="checkmark-done-circle-outline" size={56} color={theme.textDim} />
              <Text style={[styles.emptyText, { color: theme.textDim, fontFamily: theme.fonts?.bold }]}>
                Sin misiones {String(filtroActual).toLowerCase()}
              </Text>
              <Text style={[styles.emptySub, { color: theme.textDim, fontFamily: theme.fonts?.body }]}>
                Pulsa + para crear una nueva
              </Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 160, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        />
        )}
      </Animated.View>

      {/* Botones flotantes: historial, gestionar y crear (glifos P3R, color del tema) */}
      <PressableScale containerStyle={styles.fabPosSmall} style={[styles.secondaryFabSmall, { backgroundColor: theme.surface, borderColor: theme.primary }]} onPress={() => navigation.navigate('CompletedMissions')}>
        <ActionGlyph name="historial" size={22} color={theme.primary} active />
      </PressableScale>
      <PressableScale containerStyle={styles.fabPosMid} style={[styles.secondaryFab, { backgroundColor: theme.surface, borderColor: theme.primary }]} onPress={() => navigation.navigate('ManageMissions')}>
        <ActionGlyph name="gestionar" size={24} color={theme.primary} active />
      </PressableScale>
      <PressableScale containerStyle={styles.fabPos} style={[styles.fab, { backgroundColor: theme.primary, shadowColor: theme.primary }]} onPress={irACrearMision}>
        <ActionGlyph name="agregar" size={32} color={theme.textInverse} active />
      </PressableScale>

      <MissionDetailModal visible={!!selectedMission} mission={selectedMission} onClose={() => setSelectedMission(null)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 50 },

  headerWrap: { marginBottom: 16, marginTop: 2 },

  // Estilos de los Filtros (tabs inclinadas y escalonadas, disruptivas)
  filterContainer: { marginBottom: 14, height: 60 },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    marginRight: 12,
    borderWidth: 1.5,
  },
  filterText: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },

  // Estado vacio
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 70 },
  emptyText: { fontSize: 16, marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  emptySub: { fontSize: 13, marginTop: 4 },

  // Botones Flotantes (elevados por encima de la banda del revolver)
  fabPos: { position: 'absolute', bottom: 162, right: 20 },
  fabPosMid: { position: 'absolute', bottom: 234, right: 22 },
  fabPosSmall: { position: 'absolute', bottom: 286, right: 24 },
  fab: {
    width: 60, height: 60, borderRadius: 30,
    justifyContent: 'center', alignItems: 'center',
    elevation: 8, shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  secondaryFab: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  secondaryFabSmall: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
});
