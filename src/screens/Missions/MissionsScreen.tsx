import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView, LayoutAnimation, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from '../../components/UI/PressableScale';
import { PersonaShard } from '../../components/UI/PersonaShard';
import { getContrastText } from '../../utils/colorUtils';
import { useFocusEffect } from '@react-navigation/native'; // Hook para saber cuando entras a la pantalla
import { db } from '../../database'; // Tu conexión DB
import { Mision, MissionType, MissionFrequency } from '../../types'; // Tus tipos
import { calculateLevelFromXP } from '../../utils/levelingUtils';
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

  // Animacion de entrada (una sola vez al montar)
  const intro = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(intro, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);

 // Mostrar misiones
  const cargarMisiones = async () => {
    try {
      // Seleccionar misiones con posible impacto y nombre de stat
      const query = `SELECT m.*, s.nombre as nombre_stat, im.valor_impacto FROM misiones m LEFT JOIN impacto_mision im ON m.id_mision = im.id_mision LEFT JOIN stats s ON im.id_stat = s.id_stat WHERE m.activa = 1 AND m.tipo = ? AND m.completada = 0 ORDER BY m.id_mision DESC`;
      const resultados = await db.getAllAsync<any>(query, [filtroActual]);
      setMisiones(resultados as Mision[]);
      console.log('Misiones cargadas con stats:', resultados ? resultados.length : 0);
    } catch (error) {
      console.error('Error al cargar misiones:', error);
    }
  };

  // Marcar como completada una mision (con logs y desaparición suave)
  const toogleMission = async (id: number) => {
    // acumuladores fuera del try para que estén disponibles en todo el handler
    let totalExpGained = 0; // acumulador para el log
    let logInserted = false;

    try {
      const mision = misiones.find(m => m.id_mision === id);
      if (!mision) return;

      // Evitar doble-toggle
      if (mision.completada) {
        console.log('Misión ya completada (en memoria):', id);
        return;
      }

      // Marcar como completada en la BD (guardar fecha de completado)
      await db.runAsync("UPDATE misiones SET completada = ?, fecha_completada = datetime('now') WHERE id_mision = ?", [1, id]);
      console.log('Misión marcada como completada en BD (con fecha):', id);

      // Obtener y aplicar impactos
      try {
        const impactos: any[] = await db.getAllAsync('SELECT * FROM impacto_mision WHERE id_mision = ?', [id]);
        if (!impactos || impactos.length === 0) {
          console.log('No hay impacto para la misión:', id);
        } else {
          for (const impacto of impactos) {
            console.log('Impacto encontrado:', impacto);
            const valor = impacto.valor_impacto || 0;
            const statId = impacto.id_stat;
            console.log('Sumando XP:', valor, 'al stat:', statId);

            // 1) Añadir XP total
            await db.runAsync(
              'UPDATE jugador_stat SET experiencia_actual = experiencia_actual + ? WHERE id_stat = ? AND id_jugador = ?',
              [valor, statId, player?.id_jugador]
            );

            totalExpGained += valor;

            console.log('XP Principal aplicada:', valor, 'al stat:', statId);

            // 2) Obtener el nuevo total y recalcular nivel de forma pura
            try {
              const rows: any[] = await db.getAllAsync('SELECT experiencia_actual FROM jugador_stat WHERE id_stat = ? AND id_jugador = ?', [statId, player?.id_jugador]);
              if (rows && rows.length > 0) {
                const totalXP = rows[0].experiencia_actual || 0;
                const lvlInfo = calculateLevelFromXP(totalXP);
                console.log('Nivel recalculado:', lvlInfo.level, 'XP en nivel:', lvlInfo.currentLevelXP, 'meta:', lvlInfo.xpToNextLevel);
                await db.runAsync('UPDATE jugador_stat SET nivel_actual = ? WHERE id_stat = ? AND id_jugador = ?', [lvlInfo.level, statId, player?.id_jugador]);

                // --- HERENCIA: comprobar si el stat tiene padre y aplicar XP heredada ---
                try {
                  const pr: any[] = await db.getAllAsync('SELECT id_stat_padre FROM stats WHERE id_stat = ?', [statId]);
                  if (pr && pr.length > 0 && pr[0].id_stat_padre) {
                    const idPadre = pr[0].id_stat_padre;
                    const xpPadre = Math.floor((valor || 0) / 2);
                    if (xpPadre > 0 && player && player.id_jugador) {
                      console.log('XP Principal aplicada:', valor, 'al stat:', statId);

                      // Verificar si existe jugador_stat para el padre
                      const parentJs: any[] = await db.getAllAsync('SELECT experiencia_actual FROM jugador_stat WHERE id_stat = ? AND id_jugador = ?', [idPadre, player.id_jugador]);
                      if (parentJs && parentJs.length > 0) {
                        await db.runAsync('UPDATE jugador_stat SET experiencia_actual = experiencia_actual + ? WHERE id_stat = ? AND id_jugador = ?', [xpPadre, idPadre, player.id_jugador]);
                      } else {
                        // Insertar registro si no existe
                        await db.runAsync('INSERT INTO jugador_stat (id_jugador, id_stat, nivel_actual, experiencia_actual, nivel_maximo) VALUES (?, ?, ?, ?, ?)', [player.id_jugador, idPadre, 1, xpPadre, 99]);
                      }

                      totalExpGained += xpPadre;

                      // Recalcular nivel del padre
                      const rowsParent: any[] = await db.getAllAsync('SELECT experiencia_actual FROM jugador_stat WHERE id_stat = ? AND id_jugador = ?', [idPadre, player.id_jugador]);
                      if (rowsParent && rowsParent.length > 0) {
                        const totalXPPadre = rowsParent[0].experiencia_actual || 0;
                        const lvlPadre = calculateLevelFromXP(totalXPPadre);
                        await db.runAsync('UPDATE jugador_stat SET nivel_actual = ? WHERE id_stat = ? AND id_jugador = ?', [lvlPadre.level, idPadre, player.id_jugador]);
                        console.log('XP Heredada aplicada:', xpPadre, 'al stat padre:', idPadre);
                      }
                    }
                  } else {
                    console.log('Stat no tiene padre, omitiendo herencia para stat:', statId);
                  }
                } catch (erp) {
                  console.error('Error aplicando herencia de XP:', erp);
                }
              }
            } catch (e) {
              console.error('Error recalculando nivel desde XP total:', e);
            }
          }

          // Refrescar vistas
          try { refreshStats && refreshStats(); } catch(e) { console.log('refreshStats error', e); }
          try { refreshUser && refreshUser(); } catch(e) { console.log('refreshUser error', e); }

        }
      } catch (impErr) {
        console.error('Error aplicando impacto de misión:', impErr);
      }

      // Asegurar que exista un log aunque no hubiera impactos
      try {
        const totalYenes = (mision && mision.recompensa_yenes) ? mision.recompensa_yenes : 0;
        // Obtener el id del arco activo en el momento de completado (si existe)
        let activeArcId: number | null = null;
        try {
          const arcRows: any[] = await db.getAllAsync("SELECT id_arco FROM arcos WHERE estado = 'ACTIVO' LIMIT 1;");
          if (arcRows && arcRows.length > 0) activeArcId = arcRows[0].id_arco;
        } catch (arcErr) {
          console.error('Error consultando arco activo para logs:', arcErr);
        }

        await db.runAsync(
          `INSERT INTO logs (id_mision, fecha_completada, exp_ganada, yenes_ganados, id_arco) VALUES (?, datetime('now', 'localtime'), ?, ?, ?);`,
          [id, totalExpGained, totalYenes, activeArcId]
        );
        console.log('Log insertado (fallback) para misión:', id, 'exp:', totalExpGained, 'yenes:', totalYenes, 'id_arco:', activeArcId);
      } catch (logErr) {
        console.error('Error insertando log de misión (fallback):', logErr);
      }

      // Animación y eliminación local inmediata de la misión
      try { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); } catch(e) { /* ignore */ }
      setMisiones(prev => prev.filter(m => m.id_mision !== id));

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
      console.log('--- PANTALLA MISIONES EN FOCO (Ejecución Única) ---');
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
          }
        } catch (error) {
          console.error('Error al cargar misiones (focus):', error);
        }
      };

      fetchByType();

      return () => { isActive = false; };
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
      <Animated.View
        style={{
          flex: 1,
          opacity: intro,
          transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
        }}
      >
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
          contentContainerStyle={{ paddingBottom: 90, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        />
      </Animated.View>

      {/* Botones flotantes: historial, gestionar y crear */}
      <PressableScale containerStyle={styles.fabPosSmall} style={[styles.secondaryFabSmall, { backgroundColor: theme.surface, borderColor: theme.primary }]} onPress={() => navigation.navigate('CompletedMissions')}>
        <Ionicons name="time-outline" size={18} color={theme.text} />
      </PressableScale>
      <PressableScale containerStyle={styles.fabPosMid} style={[styles.secondaryFab, { backgroundColor: theme.surface, borderColor: theme.primary }]} onPress={() => navigation.navigate('ManageMissions')}>
        <Ionicons name="cog" size={20} color={theme.text} />
      </PressableScale>
      <PressableScale containerStyle={styles.fabPos} style={[styles.fab, { backgroundColor: theme.primary, shadowColor: theme.primary }]} onPress={irACrearMision}>
        <Ionicons name="add" size={32} color={theme.textInverse} />
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

  // Botones Flotantes (posicion en el Pressable, visual en el inner animado)
  fabPos: { position: 'absolute', bottom: 20, right: 20 },
  fabPosMid: { position: 'absolute', bottom: 92, right: 22 },
  fabPosSmall: { position: 'absolute', bottom: 144, right: 24 },
  fab: {
    width: 60, height: 60, borderRadius: 30,
    justifyContent: 'center', alignItems: 'center',
    elevation: 8, shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  secondaryFab: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  secondaryFabSmall: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
});
