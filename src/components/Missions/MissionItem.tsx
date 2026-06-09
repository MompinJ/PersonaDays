import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing } from 'react-native';
// Usamos el Swipeable Clásico (Estable)
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { Mision, MissionFrequency, MissionType } from '../../types';
import { useTheme } from '../../themes/useTheme';
import { getContrastText } from '../../utils/colorUtils';

interface Props {
  mision: Mision;
  onSwipeLeft: (id: number) => void;
  onPress: (mision: Mision) => void;
  // Label for the left swipe action (default: 'COMPLETAR')
  leftActionLabel?: string;
  index?: number; // para la entrada escalonada
}

export const MissionItem = ({ mision, onSwipeLeft, onPress, leftActionLabel, index = 0 }: Props) => {
  const colors = useTheme();
  const m = mision as any;

  // Entrada escalonada (una vez al montar) + feedback de pulsacion
  const entrance = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 320,
      delay: Math.min(index, 8) * 55,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  // Geometria disruptiva (inclinacion + escalonado en zigzag)
  const tipo = String(mision.tipo || 'EXTRA');
  const accent = tipo === 'BOSS' ? colors.error : (index % 2 === 0 ? colors.primary : colors.secondary);
  const sk = -9;
  const stagger = [0, 18, 8, 22, 12][index % 5];
  const rot = [-1.5, 1, -1, 1.5, -0.5][index % 5];
  const tagLabel = m.nombre_stat ? String(m.nombre_stat).toUpperCase() : tipo;

  const getExpirationColor = () => {
    if (!mision.fecha_expiracion) return colors.textDim;
    const hoy = new Date();
    const exp = new Date(mision.fecha_expiracion);
    const diffDays = Math.ceil((exp.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return colors.error;
    if (diffDays <= 1) return colors.primary;
    return colors.textDim;
  };

  const fechaTexto = mision.fecha_expiracion
    ? new Date(mision.fecha_expiracion).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
    : '';

  // Accion de swipe (completar)
  const renderLeftActions = (_progress: any, dragX: any) => {
    const s = dragX.interpolate({ inputRange: [0, 100], outputRange: [0.4, 1], extrapolate: 'clamp' });
    const label = leftActionLabel || 'COMPLETAR';
    return (
      <View style={[styles.actionContainer, { backgroundColor: accent }]}>
        <Animated.View style={{ flexDirection: 'row', alignItems: 'center', transform: [{ scale: s }] }}>
          <Ionicons name="checkmark-circle" size={28} color={getContrastText(accent)} />
          <Text style={[styles.actionText, { color: getContrastText(accent), fontFamily: colors.fonts?.heading }]}>{label}</Text>
        </Animated.View>
      </View>
    );
  };

  // Recurrencia compacta (recomendado hoy / planificado)
  const renderRecurrence = () => {
    if (mision.tipo === MissionType.DIARIA || !mision.dias_repeticion) return null;
    const map = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
    const diasArray = String(mision.dias_repeticion).split(',').map((d: string) => d.trim()).filter(Boolean);
    const todayIndex = new Date().getDay();
    const isToday = diasArray.includes(String(todayIndex));
    const formatted = diasArray.map((d: string) => map[Number(d)]).filter(Boolean).join(', ');
    return (
      <View style={styles.recurrenceRow}>
        <Ionicons name={isToday ? 'flash' : 'calendar-outline'} size={12} color={isToday ? accent : colors.textDim} />
        <Text style={[styles.recurrenceText, { color: isToday ? accent : colors.textDim, fontFamily: colors.fonts?.condensed }]}>
          {isToday ? 'RECOMENDADO HOY' : `${formatted}`}
        </Text>
      </View>
    );
  };

  return (
    <Animated.View
      style={{
        opacity: entrance,
        transform: [{ translateX: entrance.interpolate({ inputRange: [0, 1], outputRange: [-28, 0] }) }],
        marginLeft: stagger,
        marginRight: 24 - stagger,
        marginBottom: 16,
      }}
    >
      <Swipeable
        renderLeftActions={renderLeftActions}
        onSwipeableOpen={() => onSwipeLeft(mision.id_mision)}
        containerStyle={styles.swipeableContainer}
      >
        <Pressable
          onPress={() => onPress(mision)}
          onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start()}
          onPressOut={() => Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }).start()}
        >
          <Animated.View style={[styles.card, { backgroundColor: colors.surface, borderColor: accent, transform: [{ rotate: `${rot}deg` }, { skewX: `${sk}deg` }, { scale }] }]}>
            {/* Acento inclinado lateral */}
            <View style={[styles.accent, { backgroundColor: accent }]} />

            {/* Tag flotante (stat o tipo) estilo LEADER/PARTY */}
            <View style={[styles.typeTag, { backgroundColor: accent }]}>
              <Text style={[styles.typeTagText, { color: getContrastText(accent), fontFamily: colors.fonts?.condensed, transform: [{ skewX: `${-sk}deg` }] }]} numberOfLines={1}>{tagLabel}</Text>
            </View>

            <View style={[styles.inner, { transform: [{ skewX: `${-sk}deg` }] }]}>
              <View style={styles.content}>
                <Text style={[styles.title, { color: colors.text, fontFamily: colors.fonts?.heading }]} numberOfLines={1}>
                  {mision.nombre}
                </Text>

                <View style={styles.metaRow}>
                  {mision.frecuencia_repeticion !== MissionFrequency.ONE_OFF && (
                    <Ionicons name="repeat" size={14} color={colors.textDim} style={{ marginRight: 6 }} />
                  )}
                  {mision.fecha_expiracion && (
                    <View style={styles.dateWrap}>
                      <Ionicons name="time-outline" size={13} color={getExpirationColor()} />
                      <Text style={[styles.metaText, { color: getExpirationColor(), fontFamily: colors.fonts?.condensed }]}>{fechaTexto}</Text>
                    </View>
                  )}
                  {renderRecurrence()}
                </View>
              </View>

              <View style={styles.rewardContainer}>
                <Text style={[styles.xpText, { color: accent, fontFamily: colors.fonts?.display }]}>+{mision.recompensa_exp}</Text>
                <Text style={[styles.xpLabel, { color: colors.textDim, fontFamily: colors.fonts?.condensed }]}>XP</Text>
                {mision.recompensa_yenes > 0 && (
                  <Text style={[styles.yenText, { color: colors.textDim, fontFamily: colors.fonts?.condensed }]}>¥{mision.recompensa_yenes}</Text>
                )}
              </View>
            </View>
          </Animated.View>
        </Pressable>
      </Swipeable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  swipeableContainer: {
    overflow: 'visible',
  },
  card: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    paddingLeft: 24,
    borderWidth: 1.5,
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 9,
    transform: [{ skewX: '-14deg' }],
    marginLeft: -3,
  },
  typeTag: { position: 'absolute', top: -9, left: 16, paddingHorizontal: 9, paddingVertical: 2, maxWidth: 160, transform: [{ skewX: '-12deg' }] },
  typeTagText: { fontSize: 9, letterSpacing: 1.5 },
  inner: { flexDirection: 'row', alignItems: 'center' },
  content: { flex: 1 },
  title: { fontSize: 19, letterSpacing: 0.5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 5 },
  dateWrap: { flexDirection: 'row', alignItems: 'center', marginRight: 8 },
  metaText: { fontSize: 12, marginLeft: 3, letterSpacing: 0.5 },
  recurrenceRow: { flexDirection: 'row', alignItems: 'center' },
  recurrenceText: { fontSize: 11, marginLeft: 5, letterSpacing: 0.5 },
  rewardContainer: { alignItems: 'flex-end', marginLeft: 12 },
  xpText: { fontSize: 30, lineHeight: 32, includeFontPadding: false },
  xpLabel: { fontSize: 10, letterSpacing: 2, marginTop: -2 },
  yenText: { fontSize: 12, marginTop: 4, letterSpacing: 0.5 },
  actionContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    flexDirection: 'row',
    paddingLeft: 20,
    height: '100%',
  },
  actionText: {
    marginLeft: 10,
    fontSize: 15,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
