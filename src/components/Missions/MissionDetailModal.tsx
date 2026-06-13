import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Mision } from '../../types';
import { useTheme } from '../../themes/useTheme';
import { getContrastText } from '../../utils/colorUtils';
import { PersonaShard } from '../UI/PersonaShard';
import { PersonaSlash } from '../UI/PersonaSlash';

interface Props {
  visible: boolean;
  mission: Mision | null;
  onClose: () => void;
  // Si se pasa, se muestra el boton "DEVOLVER A PENDIENTES" (historial de hoy):
  // permite revertir una mision completada por error.
  onRestore?: () => void;
}

export const MissionDetailModal = ({ visible, mission, onClose, onRestore }: Props) => {
  const colors = useTheme();

  // `show` mantiene el modal montado durante la animacion de salida.
  // `displayMission` conserva la ultima mision para que no parpadee al cerrar.
  const [show, setShow] = useState(false);
  const [displayMission, setDisplayMission] = useState<Mision | null>(mission);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      if (mission) setDisplayMission(mission);
      setShow(true);
      anim.setValue(0);
      Animated.spring(anim, { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }).start();
    } else if (show) {
      // Salida rapida: encoge + fade, luego desmonta
      Animated.timing(anim, {
        toValue: 0,
        duration: 150,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setShow(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, mission]);

  const parseDays = (dias?: string) => {
    if (!dias) return null;
    const map = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
    return dias.split(',').map((d: string) => map[Number(d)]).filter(Boolean).join(' · ');
  };

  const m = displayMission as any;
  const daysLabel = m?.dias_repeticion ? parseDays(m.dias_repeticion) : undefined;
  const frecuencia = m?.frecuencia_repeticion || 'ONE_OFF';
  const freqLabel = frecuencia === 'ONE_OFF' ? 'UNA SOLA VEZ' : daysLabel ? daysLabel.toUpperCase() : 'REPETICIÓN ACTIVA';

  const fechaExp = m?.fecha_expiracion ? new Date(m.fecha_expiracion) : null;
  const fechaPasada = fechaExp ? new Date() > fechaExp : false;
  const fechaTexto = fechaExp ? fechaExp.toLocaleDateString() : null;

  const tipo = String(displayMission?.tipo || 'EXTRA');
  const accent = colors.primary;
  const accent2 = colors.secondary;

  return (
    <Modal visible={show} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: anim }]}>
        <Animated.View
          style={{
            width: '100%',
            alignItems: 'center',
            transform: [
              { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }) },
              { rotate: anim.interpolate({ inputRange: [0, 1], outputRange: ['-3deg', '0deg'] }) },
            ],
          }}
        >
          <View style={styles.cardZone}>
            {/* Capa de sombra desplazada -> profundidad "pop" P3R */}
            <View style={[styles.cardShadow, { backgroundColor: accent2 }]} pointerEvents="none" />

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: accent }]}>
              {/* Acento lateral grueso inclinado + raya diagonal arriba */}
              <View style={[styles.cardAccentBar, { backgroundColor: accent }]} pointerEvents="none" />
              <View style={[styles.cardTopStripe, { backgroundColor: accent2 }]} pointerEvents="none" />

              <ScrollView contentContainerStyle={styles.scrollPad} showsVerticalScrollIndicator={false}>

                {/* TITULO: shard angular grande (Anton) */}
                <PersonaShard
                  label={displayMission?.nombre || 'SIN NOMBRE'}
                  height={48}
                  fontSize={23}
                  font={colors.fonts?.title}
                  color={accent}
                  rotate={-3}
                  direction="right"
                  style={styles.titleShard}
                />

                {/* Fila de tags: tipo (solido) + recurrencia (ghost), rotados distinto */}
                <View style={styles.tagRow}>
                  <PersonaShard label={tipo} height={26} fontSize={13} rotate={2} direction="left" />
                  <PersonaShard label={freqLabel} height={26} fontSize={12} variant="ghost" color={accent2} rotate={-2} direction="right" style={{ marginLeft: 10 }} />
                </View>

                {/* MEJORA: stat + numero XP ENORME con slashes detras */}
                {m?.nombre_stat && (
                  <View style={styles.mejoraZone}>
                    <View style={styles.mejoraLeft}>
                      <Text style={[styles.kicker, { color: accent2, fontFamily: colors.fonts?.condensed }]}>MEJORA EL ATRIBUTO</Text>
                      <Text style={[styles.mejoraStat, { color: colors.text, fontFamily: colors.fonts?.heading }]} numberOfLines={1}>
                        {String(m.nombre_stat).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.mejoraXpWrap}>
                      <PersonaSlash color={accent2} count={2} length={86} thickness={6} angle={-22} style={{ top: 2, right: -8 }} />
                      <Text style={[styles.bigNum, { color: accent, fontFamily: colors.fonts?.display }]}>+{m.valor_impacto || 0}</Text>
                      <Text style={[styles.bigNumUnit, { color: colors.textDim, fontFamily: colors.fonts?.condensed }]}>XP</Text>
                    </View>
                  </View>
                )}

                {/* META: recurrencia detallada + fecha, con rombos de acento */}
                <View style={styles.metaWrap}>
                  <View style={styles.metaRow}>
                    <View style={[styles.metaDot, { backgroundColor: accent }]} />
                    <Ionicons name="repeat" size={15} color={colors.textDim} style={styles.metaIcon} />
                    <Text style={[styles.metaText, { color: colors.textDim, fontFamily: colors.fonts?.condensed }]}>{freqLabel}</Text>
                  </View>
                  {fechaTexto && (
                    <View style={[styles.metaRow, { marginTop: 9 }]}>
                      <View style={[styles.metaDot, { backgroundColor: fechaPasada ? colors.error : accent2 }]} />
                      <Ionicons name="time" size={15} color={fechaPasada ? colors.error : colors.textDim} style={styles.metaIcon} />
                      <Text style={[styles.metaText, { color: fechaPasada ? colors.error : colors.textDim, fontFamily: colors.fonts?.condensed }]}>
                        {fechaTexto.toUpperCase()}{fechaPasada ? '  ·  VENCIDA' : ''}
                      </Text>
                    </View>
                  )}
                </View>

                {/* DESCRIPCION */}
                <PersonaShard label="DESCRIPCIÓN" height={24} fontSize={12} variant="ghost" color={accent} rotate={-2} direction="right" style={styles.secLabel} />
                <Text style={[styles.bodyText, { color: colors.text, fontFamily: colors.fonts?.body }]}>
                  {displayMission?.descripcion || 'Sin detalles adicionales'}
                </Text>

                {/* RECOMPENSAS: dos numeros ENORMES con slash detras */}
                <PersonaShard label="RECOMPENSAS" height={26} fontSize={12} color={accent2} rotate={2} direction="left" style={styles.secLabelSolid} />
                <View style={styles.rewardsRow}>
                  <View style={[styles.rewardBlock, { borderColor: accent, transform: [{ rotate: '-1.5deg' }] }]}>
                    <View style={[styles.rewardAccent, { backgroundColor: accent }]} />
                    <PersonaSlash color={accent} count={1} length={64} thickness={5} angle={-22} style={{ top: 6, left: 8, opacity: 0.5 }} />
                    <Text style={[styles.rewardNum, { color: colors.text, fontFamily: colors.fonts?.display }]} numberOfLines={1}>
                      +{displayMission?.recompensa_exp ?? 0}
                    </Text>
                    <Text style={[styles.rewardUnit, { color: accent, fontFamily: colors.fonts?.heading }]}>EXP</Text>
                  </View>

                  <View style={[styles.rewardBlock, { borderColor: accent2, transform: [{ rotate: '1.5deg' }] }]}>
                    <View style={[styles.rewardAccent, { backgroundColor: accent2 }]} />
                    <PersonaSlash color={accent2} count={1} length={64} thickness={5} angle={-22} style={{ top: 6, left: 8, opacity: 0.5 }} />
                    <Text style={[styles.rewardNum, { color: colors.text, fontFamily: colors.fonts?.display }]} numberOfLines={1}>
                      <Text style={{ color: accent2 }}>¥</Text>{displayMission?.recompensa_yenes ?? 0}
                    </Text>
                    <Text style={[styles.rewardUnit, { color: accent2, fontFamily: colors.fonts?.heading }]}>YENES</Text>
                  </View>
                </View>

              </ScrollView>

              {/* FOOTER: botones shard angulares con contra-skew */}
              <View style={styles.footer}>
                {onRestore && (
                  <TouchableOpacity
                    style={[styles.shardBtn, styles.shardGhost, { borderColor: colors.error, transform: [{ rotate: '-1deg' }, { skewX: '-11deg' }] }]}
                    onPress={onRestore}
                    activeOpacity={0.85}
                  >
                    <View style={styles.shardInner}>
                      <Ionicons name="arrow-undo" size={17} color={colors.error} />
                      <Text style={[styles.shardTxt, { color: colors.error, fontFamily: colors.fonts?.title, marginLeft: 9 }]}>DEVOLVER A PENDIENTES</Text>
                    </View>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.shardBtn, styles.shardSolid, { backgroundColor: accent, shadowColor: accent2, transform: [{ rotate: '1deg' }, { skewX: '-11deg' }] }]}
                  onPress={onClose}
                  activeOpacity={0.9}
                >
                  <View style={styles.shardInner}>
                    <Text style={[styles.shardTxt, { color: getContrastText(accent), fontFamily: colors.fonts?.title }]}>CERRAR</Text>
                  </View>
                </TouchableOpacity>
              </View>

            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,6,16,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },

  cardZone: { width: '92%', maxWidth: 420 },
  // Sombra desplazada detras de la card (profundidad P3R)
  cardShadow: { position: 'absolute', left: 10, top: 12, right: -8, bottom: -8, opacity: 0.22, borderRadius: 2, transform: [{ skewX: '-2deg' }] },
  card: {
    borderWidth: 2.5, borderRadius: 2, overflow: 'hidden',
    transform: [{ skewX: '-2deg' }],
    elevation: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.6, shadowRadius: 20,
  },
  cardAccentBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 10, transform: [{ skewX: '-14deg' }], marginLeft: -3, zIndex: 2 },
  cardTopStripe: { position: 'absolute', left: -10, right: -10, top: 14, height: 6, transform: [{ skewX: '-18deg' }, { rotate: '-2deg' }], opacity: 0.8 },
  scrollPad: { paddingTop: 26, paddingBottom: 18, paddingHorizontal: 22 },

  titleShard: { marginBottom: 14, marginLeft: 2 },

  tagRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingLeft: 2 },

  // MEJORA
  mejoraZone: { flexDirection: 'row', alignItems: 'center', marginBottom: 22 },
  mejoraLeft: { flex: 1 },
  kicker: { fontSize: 11, letterSpacing: 2 },
  mejoraStat: { fontSize: 30, letterSpacing: 1, marginTop: 2, transform: [{ skewX: '-6deg' }], includeFontPadding: false },
  mejoraXpWrap: { flexDirection: 'row', alignItems: 'flex-end', paddingLeft: 10 },
  bigNum: { fontSize: 50, lineHeight: 50, includeFontPadding: false, transform: [{ skewX: '-6deg' }] },
  bigNumUnit: { fontSize: 13, letterSpacing: 1.5, marginLeft: 4, marginBottom: 8 },

  // META
  metaWrap: { marginBottom: 22 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  metaDot: { width: 9, height: 9, marginRight: 10, transform: [{ rotate: '45deg' }] },
  metaIcon: { marginRight: 7 },
  metaText: { fontSize: 14, letterSpacing: 1.2 },

  // Section labels
  secLabel: { marginBottom: 10, marginLeft: 2 },
  secLabelSolid: { marginTop: 24, marginBottom: 14, marginLeft: 2 },
  bodyText: { fontSize: 14, lineHeight: 21 },

  // RECOMPENSAS — bloques con numero enorme
  rewardsRow: { flexDirection: 'row', gap: 14 },
  rewardBlock: { flex: 1, borderWidth: 2, borderRadius: 2, paddingVertical: 12, paddingHorizontal: 14, paddingLeft: 18, overflow: 'hidden' },
  rewardAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 7, transform: [{ skewX: '-12deg' }], marginLeft: -2 },
  rewardNum: { fontSize: 40, lineHeight: 42, includeFontPadding: false, transform: [{ skewX: '-5deg' }] },
  rewardUnit: { fontSize: 13, letterSpacing: 2, marginTop: 2 },

  // FOOTER botones shard
  footer: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 16 },
  shardBtn: { paddingVertical: 15, alignItems: 'center', justifyContent: 'center', marginTop: 11, borderRadius: 2 },
  shardSolid: { elevation: 6, shadowOffset: { width: 4, height: 5 }, shadowOpacity: 0.6, shadowRadius: 0 },
  shardGhost: { backgroundColor: 'transparent', borderWidth: 2 },
  shardInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', transform: [{ skewX: '11deg' }] },
  shardTxt: { fontSize: 18, letterSpacing: 1.5 },
});

export default MissionDetailModal;
