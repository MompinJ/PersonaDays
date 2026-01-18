import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView, LayoutAnimation } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
        await db.runAsync(
          `INSERT INTO logs (id_mision, fecha_completada, exp_ganada, yenes_ganados) VALUES (?, datetime('now', 'localtime'), ?, ?);`,
          [id, totalExpGained, totalYenes]
        );
        console.log('Log insertado (fallback) para misión:', id, 'exp:', totalExpGained, 'yenes:', totalYenes);
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

  const renderFiltro = (tipo: MissionType) => (
    <TouchableOpacity
      style={[styles.filterChip, { backgroundColor: theme.surface, borderColor: theme.primary },
        filtroActual === tipo && { backgroundColor: theme.primary, borderColor: theme.primary }
      ]}
      onPress={() => setFiltroActual(tipo)}
    >
      <Text style={[styles.filterText, { color: theme.text, fontFamily: theme.fonts?.bold, textTransform: 'uppercase', letterSpacing: 1 }, filtroActual === tipo && { color: theme.textInverse }] }>
        {tipo}
      </Text>
    </TouchableOpacity>
  );
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}> 
      <Text style={[styles.headerTitle, { color: theme.text, fontFamily: theme.fonts?.title, textTransform: 'uppercase', letterSpacing: 1.5 }]}>REQUESTS</Text>

      {/* Zona de Filtros (Scroll Horizontal) */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {renderFiltro(MissionType.DIARIA)}
          {renderFiltro(MissionType.SEMANAL)}
          {renderFiltro(MissionType.ARCO)}
          {renderFiltro(MissionType.EXTRA)}
          {renderFiltro(MissionType.BOSS)}
        </ScrollView>
      </View>

      {/* Lista de Misiones */}
      <FlatList
        data={filteredMissions}
        keyExtractor={(item) => item.id_mision.toString()}
        renderItem={({ item }) => (
          <MissionItem 
            mision={item} 
            // Accion al deslizar:
            onSwipeLeft={(id) => {
              // Vibración o sonido aquí quedaría genial
              toogleMission(id);
            }}
            // Acción al tocar: mostrar modal de detalle
            onPress={(mision) => {
              console.log('Item seleccionado para modal:', mision);
              setSelectedMission(mision);
            }}
          />
        )}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: theme.text, fontFamily: theme.fonts?.body, letterSpacing: 0.25 }]}>No hay misiones de tipo {filtroActual}.</Text>
        }
        contentContainerStyle={{ paddingBottom: 80 }} // Espacio para que no se corte abajo
      />

      {/* Botones flotantes: gestionar y añadir */}
      <TouchableOpacity style={[styles.secondaryFab, { backgroundColor: theme.surface, borderColor: theme.primary }]} onPress={() => navigation.navigate('ManageMissions')}>
          <Ionicons name="cog" size={20} color={theme.text} />
      </TouchableOpacity>
      <TouchableOpacity style={[styles.secondaryFabSmall, { backgroundColor: theme.surface, borderColor: theme.primary }]} onPress={() => navigation.navigate('CompletedMissions')}>
          <Ionicons name="time-outline" size={18} color={theme.text} />
      </TouchableOpacity>
      <TouchableOpacity style={[styles.fab, { backgroundColor: theme.primary, shadowColor: theme.primary }]} onPress={irACrearMision}>
          <Text style={[styles.fabText, { color: theme.textInverse, fontFamily: theme.fonts?.title }]}>+</Text>
      </TouchableOpacity>

        <MissionDetailModal visible={!!selectedMission} mission={selectedMission} onClose={() => setSelectedMission(null)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A1628', padding: 20, paddingTop: 50 },
  headerTitle: { color: '#fff', fontSize: 28, marginBottom: 15, fontFamily: 'serif' },

  // Estilos de los Filtros
  filterContainer: { marginBottom: 20, height: 40 },
  filterChip: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1A2639',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#2D3B55',
  },
  filterChipActive: {
    backgroundColor: '#00D4FF', // Cyan activo
    borderColor: '#00D4FF',
  },
  filterText: { color: '#8892B0', fontSize: 12 },
  filterTextActive: { color: '#0A1628' }, // Texto oscuro sobre fondo cyan

  emptyText: { color: '#8892B0', textAlign: 'center', marginTop: 50, fontStyle: 'italic' },

  // Botón Flotante (FAB)
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#00D4FF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#00D4FF',
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  secondaryFab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1A2639',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  secondaryFabSmall: {
    position: 'absolute',
    bottom: 140,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A2639',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  fabText: { fontSize: 30, color: '#fff', marginTop: -4 }
});
