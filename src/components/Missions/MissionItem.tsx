import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing } from 'react-native';
// Usamos el Swipeable Clásico (Estable)
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { Mision, MissionFrequency, MissionType } from '../../types';
import { useTheme } from '../../themes/useTheme';

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
      delay: Math.min(index, 8) * 45,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

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
      <View style={[styles.actionContainer, { backgroundColor: colors.primary }]}>
        <Animated.View style={{ flexDirection: 'row', alignItems: 'center', transform: [{ scale: s }] }}>
          <Ionicons name="checkmark-circle" size={28} color={colors.textInverse} />
          <Text style={[styles.actionText, { color: colors.textInverse, fontFamily: colors.fonts?.heading }]}>{label}</Text>
        </Animated.View>
      </View>
    );
  };

  // Linea de recurrencia (recomendado hoy / planificado) con iconos vectoriales
  const renderRecurrence = () => {
    if (mision.tipo === MissionType.DIARIA || !mision.dias_repeticion) return null;
    const map = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
    const diasArray = String(mision.dias_repeticion).split(',').map((d: string) => d.trim()).filter(Boolean);
    const todayIndex = new Date().getDay();
    const isToday = diasArray.includes(String(todayIndex));
    const formatted = diasArray.map((d: string) => map[Number(d)]).filter(Boolean).join(', ');
    return (
      <View style={styles.recurrenceRow}>
        <Ionicons
          name={isToday ? 'flash' : 'calendar-outline'}
          size={13}
          color={isToday ? colors.primary : colors.textDim}
        />
        <Text style={[styles.recurrenceText, { color: isToday ? colors.primary : colors.textDim, fontFamily: colors.fonts?.condensed }]}>
          {isToday ? 'RECOMENDADO HOY' : `Planificado: ${formatted}`}
        </Text>
      </View>
    );
  };

  return (
    <Animated.View
      style={{
        opacity: entrance,
        transform: [{ translateX: entrance.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }],
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
          <Animated.View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, transform: [{ scale }] }]}>
            {/* Acento inclinado estilo Persona */}
            <View style={[styles.accent, { backgroundColor: colors.primary }]} />

            <View style={styles.content}>
              <Text style={[styles.title, { color: colors.text, fontFamily: colors.fonts?.title }]} numberOfLines={1}>
                {mision.nombre}
              </Text>

              <View style={styles.metaRow}>
                {m.nombre_stat ? (
                  <View style={[styles.statChip, { backgroundColor: colors.primary + '22', borderColor: colors.primary }]}>
                    <Text style={[styles.statChipText, { color: colors.primary, fontFamily: colors.fonts?.heading }]} numberOfLines={1}>
                      {String(m.nombre_stat).toUpperCase()}
                    </Text>
                  </View>
                ) : null}
                {mision.frecuencia_repeticion !== MissionFrequency.ONE_OFF && (
                  <Ionicons name="repeat" size={14} color={colors.textDim} style={{ marginLeft: 8 }} />
                )}
                {mision.fecha_expiracion && (
                  <View style={styles.dateWrap}>
                    <Ionicons name="time-outline" size={13} color={getExpirationColor()} />
                    <Text style={[styles.metaText, { color: getExpirationColor() }]}>{fechaTexto}</Text>
                  </View>
                )}
              </View>

              {renderRecurrence()}
            </View>

            <View style={styles.rewardContainer}>
              <Text style={[styles.xpText, { color: colors.primary, fontFamily: colors.fonts?.display }]}>+{mision.recompensa_exp}</Text>
              <Text style={[styles.xpLabel, { color: colors.primary, fontFamily: colors.fonts?.condensed }]}>XP</Text>
              {mision.recompensa_yenes > 0 && (
                <Text style={[styles.yenText, { color: colors.textDim, fontFamily: colors.fonts?.body }]}>¥{mision.recompensa_yenes}</Text>
              )}
            </View>
          </Animated.View>
        </Pressable>
      </Swipeable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  swipeableContainer: {
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  card: {
    flexDirection: 'row',
    padding: 16,
    paddingLeft: 22,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    overflow: 'hidden',
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 8,
    transform: [{ skewX: '-12deg' }],
    marginLeft: -2,
  },
  content: { flex: 1 },
  title: { fontSize: 18, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  statChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderWidth: 1, maxWidth: 140 },
  statChipText: { fontSize: 10, letterSpacing: 0.5 },
  dateWrap: { flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
  metaText: { fontSize: 12, marginLeft: 3 },
  recurrenceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  recurrenceText: { fontSize: 11, marginLeft: 5, letterSpacing: 0.5 },
  rewardContainer: { alignItems: 'flex-end', marginLeft: 10 },
  xpText: { fontWeight: '900', fontSize: 24, lineHeight: 26 },
  xpLabel: { fontSize: 11, letterSpacing: 1, marginTop: -2 },
  yenText: { fontSize: 12, marginTop: 4 },
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
