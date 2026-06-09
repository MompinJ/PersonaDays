import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAlert } from '../../../context/AlertContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/types';
import { useTheme } from '../../../themes/useTheme';
import ManageArcModal from '../../../components/Arcs/ManageArcModal';
import { useGame } from '../../../context/GameContext';
import { usePlayerStats } from '../../../hooks/usePlayerStats';
import { finalizeArcWithRewards, hasActiveSubArcs } from '../../../services/arcService';
import { useEventFlash } from '../../../context/EventFlashContext';
import { db } from '../../../database';
import { PersonaShard } from '../../../components/UI/PersonaShard';
import { PersonaCount } from '../../../components/UI/PersonaCount';
import { getContrastText } from '../../../utils/colorUtils';

type Props = NativeStackScreenProps<RootStackParamList, 'ArcDetail'>;

export const ArcDetailScreen = ({ route, navigation }: Props) => {
  const { arc } = route.params || { arc: null };
  const theme = useTheme();
  const [showModal, setShowModal] = useState(false);
  const { player, refreshUser } = useGame();
  const { refreshStats } = usePlayerStats();
  const { showAlert } = useAlert();
  const { flash } = useEventFlash();

  const [progress, setProgress] = useState(0);
  const [statName, setStatName] = useState<string | null>(null);

  useEffect(() => {
    if (!arc) return;
    const load = async () => {
      try {
        const res: any[] = await db.getAllAsync(
          `SELECT count(*) as total, sum(case when completada=1 then 1 else 0 end) as comp FROM misiones WHERE id_arco = ?`,
          [arc.id_arco]
        );
        const total = res?.[0]?.total || 0;
        const comp = res?.[0]?.comp || 0;
        setProgress(total === 0 ? 0 : Math.round((comp / total) * 100));
        if (arc.id_stat_relacionado) {
          const s: any[] = await db.getAllAsync('SELECT nombre FROM stats WHERE id_stat = ?', [arc.id_stat_relacionado]);
          setStatName(s?.[0]?.nombre || null);
        }
      } catch (e) {
        console.error('Error cargando detalle del arco:', e);
      }
    };
    load();
  }, [arc]);

  if (!arc) return null;

  const now = new Date();
  const start = new Date(arc.fecha_inicio);
  const end = arc.fecha_fin ? new Date(arc.fecha_fin) : null;
  const state = (end && now > end) ? 'COMPLETADO' : (now >= start && (!end || now <= end) ? 'ACTIVO' : 'PENDIENTE');
  const stateColor = state === 'ACTIVO' ? theme.primary : state === 'COMPLETADO' ? theme.success : theme.secondary;
  const stateLabel = state === 'ACTIVO' ? 'EN CURSO' : state === 'COMPLETADO' ? 'COMPLETADO' : 'PROGRAMADO';

  const handleFinishArc = async () => {
    if (!arc) return;
    try {
      if (await hasActiveSubArcs(arc)) {
        showAlert('NO PUEDES FINALIZAR ESTE ARCO', 'Debes completar primero el sub-arco activo antes de cerrar el capítulo principal.');
        return;
      }
    } catch (e: any) {
      console.error('Error comprobando sub-arcos activos:', e);
      showAlert('ERROR', 'No se pudo comprobar sub-arcos activos. ' + (e?.message || ''));
      return;
    }
    showAlert('FINALIZAR ARCO', '¿Estás seguro de que deseas cerrar este capítulo?', [
      { text: 'CANCELAR', style: 'cancel' },
      { text: 'FINALIZAR', onPress: async () => {
        try {
          const { grantedXP } = await finalizeArcWithRewards(arc, player);
          try { refreshStats && refreshStats(); } catch (e) {}
          try { refreshUser && refreshUser(); } catch (e) {}
          navigation.goBack();
          // Flash celebratorio (en vez de un alert): se muestra sobre la pantalla de Arcos
          flash({ kind: 'complete', title: 'CAPÍTULO CERRADO', subtitle: arc?.nombre, xp: grantedXP > 0 ? grantedXP : undefined });
        } catch (err: any) {
          console.error('Error finalizando arco:', err);
          showAlert('ERROR', 'No se pudo finalizar el arco. ' + (err?.message || ''));
        }
      } },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 20 : 56 }]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={26} color={theme.primary} />
        </TouchableOpacity>
        <View style={[styles.badge, { backgroundColor: stateColor }]}>
          <Text style={[styles.badgeText, { color: getContrastText(stateColor), fontFamily: theme.fonts?.heading }]}>{stateLabel}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <PersonaShard label={arc.nombre} height={52} fontSize={28} font={theme.fonts?.title} color={stateColor} />

        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={16} color={theme.textDim} />
          <Text style={[styles.dateText, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>
            {arc.fecha_inicio}{end ? '  →  ' + arc.fecha_fin : '  →  EN CURSO'}
          </Text>
        </View>

        {arc.descripcion ? (
          <Text style={[styles.desc, { color: theme.text, fontFamily: theme.fonts?.body }]}>{arc.descripcion}</Text>
        ) : null}

        <View style={{ marginTop: 18 }}><PersonaShard label="PROGRESO" /></View>
        <View style={styles.progressBlock}>
          <PersonaCount value={progress} pad={2} color={stateColor} fontSize={76} />
          <Text style={[styles.pct, { color: stateColor, fontFamily: theme.fonts?.display }]}>%</Text>
        </View>
        <View style={[styles.progressBar, { backgroundColor: theme.inactive }]}>
          <View style={{ width: `${progress}%`, height: '100%', backgroundColor: stateColor }} />
        </View>

        {statName ? (
          <>
            <View style={{ marginTop: 22 }}><PersonaShard label="ATRIBUTO QUE NUTRE" /></View>
            <View style={[styles.statTag, { borderColor: theme.primary }]}>
              <MaterialCommunityIcons name="star-four-points" size={16} color={theme.primary} style={styles.unskew} />
              <Text style={[styles.statText, { color: theme.text, fontFamily: theme.fonts?.heading }]}>{String(statName).toUpperCase()}</Text>
            </View>
          </>
        ) : null}

        <Text style={[styles.zen, { color: theme.textDim, fontFamily: theme.fonts?.body }]}>
          Modo Zen. Aquí vivirán las notas y fotos de este capítulo.
        </Text>
      </ScrollView>

      {state !== 'COMPLETADO' && (
        <View style={styles.footer}>
          <TouchableOpacity onPress={() => setShowModal(true)} activeOpacity={0.85} style={[styles.skewBtn, { borderColor: theme.primary, borderWidth: 1.5 }]}>
            <Text style={[styles.skewBtnText, { color: theme.primary, fontFamily: theme.fonts?.heading }]}>EDITAR</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleFinishArc} activeOpacity={0.9} style={[styles.skewBtn, styles.finalizeBtn, { backgroundColor: theme.error }]}>
            <Text style={[styles.skewBtnText, { color: getContrastText(theme.error), fontFamily: theme.fonts?.heading }]}>FINALIZAR ARCO</Text>
          </TouchableOpacity>
        </View>
      )}

      <ManageArcModal visible={showModal} arc={arc} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
  backBtn: { padding: 4 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, transform: [{ skewX: '-12deg' }] },
  badgeText: { fontSize: 12, letterSpacing: 1, transform: [{ skewX: '12deg' }] },

  dateRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  dateText: { marginLeft: 8, fontSize: 13, letterSpacing: 0.5 },
  desc: { fontSize: 14, lineHeight: 20, marginTop: 12 },

  progressBlock: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 4 },
  pct: { fontSize: 36, marginLeft: 4, marginBottom: 8 },
  progressBar: { height: 16, transform: [{ skewX: '-20deg' }], borderRadius: 2, overflow: 'hidden', marginTop: 6 },

  statTag: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1.5, transform: [{ skewX: '-12deg' }] },
  statText: { marginLeft: 8, fontSize: 14, letterSpacing: 0.5, transform: [{ skewX: '12deg' }] },
  unskew: { transform: [{ skewX: '12deg' }] },

  zen: { fontSize: 13, fontStyle: 'italic', textAlign: 'center', marginTop: 40 },

  footer: { position: 'absolute', left: 18, right: 18, bottom: 26, flexDirection: 'row', gap: 12 },
  skewBtn: { paddingVertical: 15, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center', transform: [{ skewX: '-12deg' }] },
  finalizeBtn: { flex: 1 },
  skewBtnText: { fontSize: 15, letterSpacing: 1, textTransform: 'uppercase', transform: [{ skewX: '12deg' }] },
});
