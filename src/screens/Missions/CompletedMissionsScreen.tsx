import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { db } from '../../database';
import { useTheme } from '../../themes/useTheme';
import { useGame } from '../../context/GameContext';
import { useAlert } from '../../context/AlertContext';
import { usePlayerStats } from '../../hooks/usePlayerStats';
import { MissionItem } from '../../components/Missions/MissionItem';
import { MissionDetailModal } from '../../components/Missions/MissionDetailModal';
import { calculateLevelFromXP } from '../../utils/levelingUtils';

export const CompletedMissionsScreen = () => {
  const colors = useTheme();
  const { showAlert } = useAlert();
  const navigation = useNavigation<any>();
  const { player, refreshUser } = useGame();
  const { refreshStats } = usePlayerStats();

  const [completed, setCompleted] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = async () => {
        try {
          console.log('CompletedMissions: cargando completadas de hoy...');
          const rows: any[] = await db.getAllAsync(
            `SELECT m.*, im.id_stat, im.valor_impacto, s.nombre as nombre_stat
             FROM misiones m
             LEFT JOIN impacto_mision im ON m.id_mision = im.id_mision
             LEFT JOIN stats s ON im.id_stat = s.id_stat
             WHERE m.completada = 1 AND date(m.fecha_completada) = date('now')
             ORDER BY m.fecha_completada DESC;`
          );
          console.log('CompletedMissions: rows fetched:', rows ? rows.length : 0);
          if (active) setCompleted(rows || []);
        } catch (e) {
          console.error('Error cargando completadas:', e);
        }
      };
      load();
      return () => { active = false; };
    }, [])
  );

  const reload = async () => {
    try {
      const rows: any[] = await db.getAllAsync(
        `SELECT m.*, im.id_stat, im.valor_impacto, s.nombre as nombre_stat
             FROM misiones m
             LEFT JOIN impacto_mision im ON m.id_mision = im.id_mision
             LEFT JOIN stats s ON im.id_stat = s.id_stat
             WHERE m.completada = 1 AND date(m.fecha_completada) = date('now')
             ORDER BY m.fecha_completada DESC;`
      );
      setCompleted(rows || []);
    } catch (e) {
      console.error('Error recargando completadas:', e);
    }
  };

  const handleRevertMission = async (mision: any) => {
    // Keep for manual restore via dialog (triggered elsewhere if needed)
    if (!player) {
      showAlert('Error', 'No hay jugador cargado.');
      return;
    }

    showAlert(
      'Restaurar misión',
      `¿Deseas restaurar la misión "${mision.nombre}" a pendientes? Se restará ${mision.valor_impacto || mision.recompensa_exp || 0} XP y ¥${mision.recompensa_yenes || 0}.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          style: 'destructive',
          onPress: () => { revertNow(mision); }
        }
      ]
    );
  };

  // Revert without confirmation (used on swipe)
  const revertNow = async (mision: any) => {
    if (!player) {
      showAlert('Error', 'No hay jugador cargado.');
      return;
    }

    try {
      await db.execAsync('BEGIN TRANSACTION;');

      // 1) Restar XP en jugador_stat si existe impacto
      try {
        const impactos: any[] = await db.getAllAsync('SELECT * FROM impacto_mision WHERE id_mision = ?', [mision.id_mision]);
        if (impactos && impactos.length > 0) {
          for (const imp of impactos) {
            const valor = imp.valor_impacto || 0;
            const statId = imp.id_stat;
            console.log('Restando XP en jugador_stat:', { playerId: player.id_jugador, statId, valor });
            await db.runAsync(
              'UPDATE jugador_stat SET experiencia_actual = MAX(0, experiencia_actual - ?) WHERE id_stat = ? AND id_jugador = ?',
              [valor, statId, player.id_jugador]
            );

            // Recalcular nivel tras la resta del hijo
            try {
              const rowsAfter: any[] = await db.getAllAsync('SELECT experiencia_actual FROM jugador_stat WHERE id_stat = ? AND id_jugador = ?', [statId, player.id_jugador]);
              if (rowsAfter && rowsAfter.length > 0) {
                const totalXPAfter = rowsAfter[0].experiencia_actual || 0;
                const lvlInfoAfter = calculateLevelFromXP(totalXPAfter);
                await db.runAsync('UPDATE jugador_stat SET nivel_actual = ? WHERE id_stat = ? AND id_jugador = ?', [lvlInfoAfter.level, statId, player.id_jugador]);
              }
            } catch (e) {
              console.error('Error recalculando nivel tras revert (hijo):', e);
              throw e;
            }

            // --- Revertir XP heredada al stat padre, si existe ---
            try {
              const parentRow: any[] = await db.getAllAsync('SELECT id_stat_padre FROM stats WHERE id_stat = ?', [statId]);
              if (parentRow && parentRow.length > 0 && parentRow[0].id_stat_padre) {
                const idPadre = parentRow[0].id_stat_padre;
                const xpPadreToRemove = Math.floor((valor || 0) / 2);
                if (xpPadreToRemove > 0) {
                  console.log('Restando XP heredada al stat padre:', { idPadre, xpPadreToRemove });
                  await db.runAsync(
                    'UPDATE jugador_stat SET experiencia_actual = MAX(0, experiencia_actual - ?) WHERE id_stat = ? AND id_jugador = ?',
                    [xpPadreToRemove, idPadre, player.id_jugador]
                  );

                  // Recalcular nivel del padre
                  const parentAfter: any[] = await db.getAllAsync('SELECT experiencia_actual FROM jugador_stat WHERE id_stat = ? AND id_jugador = ?', [idPadre, player.id_jugador]);
                  if (parentAfter && parentAfter.length > 0) {
                    const totalParentXPAfter = parentAfter[0].experiencia_actual || 0;
                    const lvlParent = calculateLevelFromXP(totalParentXPAfter);
                    await db.runAsync('UPDATE jugador_stat SET nivel_actual = ? WHERE id_stat = ? AND id_jugador = ?', [lvlParent.level, idPadre, player.id_jugador]);
                  }

                  console.log('XP Heredada revertida:', xpPadreToRemove, 'del stat padre:', idPadre);
                }
              } else {
                // No tiene padre -> nada que revertir
              }
            } catch (erp) {
              console.error('Error restando XP heredada al padre durante revert:', erp);
              throw erp;
            }
          }
        } else {
          console.log('No impact found for mission, skipping XP revert');
        }
      } catch (e) {
        console.error('Error restando XP:', e);
        throw e;
      }

      // 2) Restar yenes
      try {
        const yenes = mision.recompensa_yenes || 0;
        if (yenes > 0) {
          console.log('Restando yenes al jugador:', yenes);
          await db.runAsync(
            'UPDATE jugadores SET yenes = CASE WHEN (yenes - ?) < 0 THEN 0 ELSE yenes - ? END WHERE id_jugador = ?',
            [yenes, yenes, player.id_jugador]
          );
        }
      } catch (e) {
        console.error('Error restando yenes:', e);
        throw e;
      }

      // 3) Marcar misión como no completada
      try {
        console.log('Marcando misión como no completada en BD, id:', mision.id_mision);
        await db.runAsync('UPDATE misiones SET completada = 0, fecha_completada = NULL WHERE id_mision = ?', [mision.id_mision]);
      } catch (e) {
        console.error('Error actualizando misión:', e);
        throw e;
      }

      await db.execAsync('COMMIT;');

      // 4) Refrescar UI y datos globales
      try { await refreshStats(); } catch(e){/* ignore */}
      try { await refreshUser(); } catch(e){/* ignore */}
      await reload();
    } catch (err) {
      console.error('Error en transacción de revert:', err);
      try { await db.execAsync('ROLLBACK;'); } catch(e){/* ignore */}
      showAlert('Error', 'No se pudo restaurar la misión.');
    }
  };

  const [selectedMission, setSelectedMission] = useState<any | null>(null);

  const renderItem = ({ item }: { item: any }) => (
    <View style={{ opacity: 0.8 }}>
      <MissionItem mision={item} leftActionLabel={"RESTAURAR"} onSwipeLeft={() => revertNow(item)} onPress={() => setSelectedMission(item)} />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <Text style={[styles.header, { color: colors.primary }]}>HISTORIAL DE HOY</Text>
      <FlatList
        data={completed}
        keyExtractor={(i) => i.id_mision ? i.id_mision.toString() : Math.random().toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={{ color: colors.textDim, textAlign: 'center', marginTop: 40 }}>No hay misiones completadas hoy.</Text>}
      />

      {/* Modal de detalle similar a MissionsScreen */}
      <MissionDetailModal visible={!!selectedMission} mission={selectedMission} onClose={() => setSelectedMission(null)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50 },
  header: { fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 10 }
});
