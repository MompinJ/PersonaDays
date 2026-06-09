import React, { useCallback, useState, useRef, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Animated, Easing, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { db } from '../../database';
import { useTheme } from '../../themes/useTheme';
import { useGame } from '../../context/GameContext';
import { useAlert } from '../../context/AlertContext';
import { usePlayerStats } from '../../hooks/usePlayerStats';
import { MissionDetailModal } from '../../components/Missions/MissionDetailModal';
import { calculateLevelFromXP } from '../../utils/levelingUtils';
import { PersonaShard } from '../../components/UI/PersonaShard';
import { getContrastText } from '../../utils/colorUtils';

// Fila de mision completada estilo P3R (barra inclinada, escalonada, tag de tipo flotante)
const CompletedRow = ({ item, index, onPress, onRestore }: { item: any; index: number; onPress: () => void; onRestore: () => void }) => {
  const colors = useTheme();
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 360, delay: index * 70, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);

  const tipo = String(item.tipo || 'EXTRA');
  const accent = tipo === 'BOSS' ? colors.error : (index % 2 === 0 ? colors.primary : colors.secondary);
  const sk = -9;
  const stagger = [0, 18, 8, 22, 12][index % 5];
  const rot = [-1.5, 1, -1, 1.5, -0.5][index % 5];
  const xp = item.valor_impacto || item.recompensa_exp || 0;
  const yenes = item.recompensa_yenes || 0;

  const animStyle = {
    opacity: anim,
    transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [-32, 0] }) }],
  };

  return (
    <Animated.View style={[animStyle, { marginLeft: stagger, marginRight: 24 - stagger, marginBottom: 14 }]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        onLongPress={onRestore}
        delayLongPress={350}
        style={[styles.row, { backgroundColor: colors.surface, borderColor: accent, transform: [{ rotate: `${rot}deg` }, { skewX: `${sk}deg` }] }]}
      >
        <View style={[styles.rowAccent, { backgroundColor: accent }]} />

        {/* Tag de tipo flotante en la esquina (estilo LEADER/PARTY/NAVI) */}
        <View style={[styles.typeTag, { backgroundColor: accent }]}>
          <Text style={[styles.typeTagText, { color: getContrastText(accent), fontFamily: colors.fonts?.condensed, transform: [{ skewX: `${-sk}deg` }] }]}>{tipo}</Text>
        </View>

        <View style={[styles.rowInner, { transform: [{ skewX: `${-sk}deg` }] }]}>
          <Ionicons name="checkmark-done" size={24} color={accent} style={{ marginRight: 12 }} />

          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={[styles.rowName, { color: colors.text, fontFamily: colors.fonts?.heading }]}>{item.nombre}</Text>
            {item.nombre_stat ? (
              <View style={[styles.statChip, { borderColor: accent }]}>
                <Text style={[styles.statChipText, { color: accent, fontFamily: colors.fonts?.condensed }]}>{String(item.nombre_stat).toUpperCase()}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.rewardCol}>
            <Text style={[styles.xpValue, { color: accent, fontFamily: colors.fonts?.display }]}>+{xp}</Text>
            <Text style={[styles.xpUnit, { color: colors.textDim, fontFamily: colors.fonts?.condensed }]}>XP</Text>
            {yenes > 0 ? <Text style={[styles.yenValue, { color: colors.textDim, fontFamily: colors.fonts?.condensed }]}>¥{yenes}</Text> : null}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

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

  // Animacion de entrada (una sola vez)
  const intro = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(intro, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);

  const renderItem = ({ item, index }: { item: any; index: number }) => (
    <CompletedRow item={item} index={index} onPress={() => setSelectedMission(item)} onRestore={() => handleRevertMission(item)} />
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.headerWrap}>
        <PersonaShard label="HISTORIAL DE HOY" height={50} fontSize={26} font={colors.fonts?.title} />
      </View>

      <Animated.View
        style={{
          flex: 1,
          opacity: intro,
          transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
        }}
      >
        <FlatList
          data={completed}
          keyExtractor={(i) => i.id_mision ? i.id_mision.toString() : Math.random().toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="moon-outline" size={48} color={colors.textDim} />
              <Text style={{ color: colors.textDim, marginTop: 12, fontFamily: colors.fonts?.bold }}>Nada completado hoy</Text>
              <Text style={{ color: colors.textDim, marginTop: 4, fontSize: 13, fontFamily: colors.fonts?.body }}>Ve a por tu primera misión del día</Text>
            </View>
          }
        />
      </Animated.View>

      {/* Modal de detalle similar a MissionsScreen */}
      <MissionDetailModal visible={!!selectedMission} mission={selectedMission} onClose={() => setSelectedMission(null)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50 },
  headerWrap: { paddingHorizontal: 16, marginBottom: 14, marginTop: 4 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },

  row: { borderWidth: 1.5, paddingVertical: 16, paddingHorizontal: 18, paddingLeft: 24 },
  rowAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 9, transform: [{ skewX: '-14deg' }], marginLeft: -3 },
  typeTag: { position: 'absolute', top: -9, left: 16, paddingHorizontal: 9, paddingVertical: 2, transform: [{ skewX: '-12deg' }] },
  typeTagText: { fontSize: 9, letterSpacing: 1.5 },
  rowInner: { flexDirection: 'row', alignItems: 'center' },
  rowName: { fontSize: 18, letterSpacing: 0.5 },
  statChip: { alignSelf: 'flex-start', borderWidth: 1, paddingHorizontal: 7, paddingVertical: 1, marginTop: 5 },
  statChipText: { fontSize: 9, letterSpacing: 1 },
  rewardCol: { alignItems: 'flex-end', marginLeft: 12 },
  xpValue: { fontSize: 30, lineHeight: 32, includeFontPadding: false },
  xpUnit: { fontSize: 10, letterSpacing: 2, marginTop: -2 },
  yenValue: { fontSize: 12, letterSpacing: 0.5, marginTop: 4 },
});
