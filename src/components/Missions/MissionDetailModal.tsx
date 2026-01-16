import React, { useEffect, Fragment } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Mision } from '../../types';
import { useTheme } from '../../themes/useTheme';

interface Props {
  visible: boolean;
  mission: Mision | null;
  onClose: () => void;
}

export const MissionDetailModal = ({ visible, mission, onClose }: Props) => {
  const colors = useTheme();

  useEffect(() => {
    if (visible) {
      console.log('Abriendo detalle de misión:', mission);
    }
  }, [visible, mission]);

  const parseDays = (dias?: string) => {
    if (!dias) return null;
    const map = ['Dom','Lun','Mar','Mie','Jue','Vie','Sab'];
    return dias.split(',').map((d: string) => map[Number(d)]).filter(Boolean).join(', ');
  };

  const m = mission as any;
  const daysLabel = m?.dias_repeticion ? parseDays(m.dias_repeticion) : undefined;
  const frecuencia = m?.frecuencia_repeticion || 'ONE_OFF';

  const fechaExp = m?.fecha_expiracion ? new Date(m.fecha_expiracion) : null;
  const fechaPasada = fechaExp ? (new Date() > fechaExp) : false;
  const fechaTexto = fechaExp ? fechaExp.toLocaleDateString() : null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={[styles.skewCard, { backgroundColor: colors.background, borderColor: colors.primary, shadowColor: colors.primary }]}>
          <View style={[styles.unskewInner, { backgroundColor: colors.surface }]}>
            <ScrollView contentContainerStyle={{ padding: 20 }}>

              <View style={styles.headerRow}>
                <Text style={[styles.title, { color: colors.text, fontFamily: colors.fonts?.title }]}>{mission?.nombre?.toUpperCase() || 'SIN NOMBRE'}</Text>
                {mission && (
                  <View style={[styles.chip, { borderColor: colors.primary }]}>
                    <Text style={[styles.chipText, { color: colors.text, fontFamily: colors.fonts?.bold }]}>{mission.tipo}</Text>
                  </View>
                )}
              </View>

              {mission?.nombre_stat && (
  <View style={{
     backgroundColor: colors.primary,
     padding: 5,
     marginBottom: 10,
     alignSelf: 'flex-start'
  }}>
    <Text style={{
       color: colors.textInverse,
       fontFamily: colors.fonts?.bold,
       textTransform: 'uppercase'
    }}>
       Mejora: {(mission as any).nombre_stat} (+{(mission as any).valor_impacto || '?'} XP)
    </Text>
  </View>
)}

              {/* Frecuencia / Dias */}
              <View style={{ height: 8 }} />
              <View style={styles.metaRow}>
                <Ionicons name="repeat" size={16} color={colors.textDim} />
                <Text style={[styles.metaText, { color: colors.textDim, marginLeft: 8 }]}>
                  {frecuencia === 'ONE_OFF' ? 'Una sola vez' : daysLabel ? daysLabel : 'Repetición configurada'}
                </Text>
              </View>

              {/* Fecha límite */}
              {fechaTexto && (
                <View style={[styles.metaRow, { marginTop: 6 }]}>
                  <Ionicons name="time" size={16} color={fechaPasada ? colors.error : colors.textDim} />
                  <Text style={[styles.metaText, { color: fechaPasada ? colors.error : colors.textDim, marginLeft: 8 }]}>{fechaTexto}{fechaPasada ? ' (Vencida)' : ''}</Text>
                </View>
              )}

              <View style={{ height: 12 }} />

              <Text style={[styles.sectionLabel, { color: colors.textDim, fontFamily: colors.fonts?.bold }]}>Descripción</Text>
              <Text style={[styles.bodyText, { color: colors.text, fontFamily: colors.fonts?.body }]}>{mission?.descripcion || 'Sin detalles adicionales'}</Text>

              <View style={{ height: 20 }} />

              <Text style={[styles.sectionLabel, { color: colors.textDim, fontFamily: colors.fonts?.bold }]}>Recompensas</Text>
              <View style={styles.rewardsRow}>
                <View style={styles.rewardItem}>
                  <Ionicons name="sparkles" size={20} color={colors.primary} />
                  <Text style={[styles.rewardText, { color: colors.text, fontFamily: colors.fonts?.bold }]}> {mission ? `+${mission.recompensa_exp} XP` : '+0 XP'}</Text>
                </View>

                <View style={styles.rewardItem}>
                  <Ionicons name="cash-outline" size={20} color={colors.secondary} />
                  <Text style={[styles.rewardText, { color: colors.text, fontFamily: colors.fonts?.body }]}> {mission ? `¥${mission.recompensa_yenes}` : '¥0'}</Text>
                </View>
              </View>

            </ScrollView>

            <View style={styles.footerWrap}>
              <TouchableOpacity style={[styles.skewBtnWrapper, { backgroundColor: colors.primary, width: '100%' }]} onPress={onClose} activeOpacity={0.9}>
                <View style={styles.unskewBtnInner}>
                  <Text style={[styles.closeText, { color: colors.textInverse, fontFamily: colors.fonts?.bold }]}>CERRAR / VOLVER</Text>
                </View>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  skewCard: {
    width: '90%',
    borderRadius: 2,
    borderWidth: 4,
    padding: 20,
    alignSelf: 'center',
    overflow: 'hidden',
    transform: [{ skewX: '-10deg' }],
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
    shadowOpacity: 0.8,
    elevation: 10,
  },
  unskewInner: {
    transform: [{ skewX: '10deg' }],
    borderRadius: 4,
    overflow: 'hidden'
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 24, textTransform: 'uppercase' },
  chip: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
  chipText: { fontSize: 12 },
  impactRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'transparent', paddingVertical: 6 },
  impactText: { marginLeft: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  metaText: { fontSize: 13 },
  sectionLabel: { fontSize: 12, marginTop: 6, marginBottom: 6, textTransform: 'uppercase' },
  bodyText: { fontSize: 14, lineHeight: 20 },
  rewardsRow: { flexDirection: 'row', justifyContent: 'flex-start', gap: 20, marginTop: 8 },
  rewardItem: { flexDirection: 'row', alignItems: 'center', marginRight: 20 },
  rewardText: { fontSize: 14, marginLeft: 8 },
  footerWrap: { padding: 12 },
  skewBtnWrapper: { alignItems: 'center', borderRadius: 6, transform: [{ skewX: '-15deg' }], paddingVertical: 14, width: '100%' },
  unskewBtnInner: { transform: [{ skewX: '15deg' }], paddingHorizontal: 20, alignItems: 'center' },
  closeText: { fontSize: 16 }
});
