import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
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
}

export const MissionItem = ({ mision, onSwipeLeft, onPress, leftActionLabel }: Props) => {
  const colors = useTheme();

  const getExpirationColor = () => {
    if (!mision.fecha_expiracion) return colors.textDim;
    const hoy = new Date();
    const exp = new Date(mision.fecha_expiracion);
    const diffTime = exp.getTime() - hoy.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return colors.error;
    if (diffDays <= 1) return colors.primary;
    return colors.textDim;
  };

  const fechaTexto = mision.fecha_expiracion
    ? new Date(mision.fecha_expiracion).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
    : '';

  // Animación Clásica (Compatible con todo)
  const renderLeftActions = (progress: any, dragX: any) => {
    const scale = dragX.interpolate({
      inputRange: [0, 100],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });

    const label = leftActionLabel || 'COMPLETAR';
    return (
      <View style={[styles.actionContainer, { backgroundColor: colors.primary }]}>
        <Animated.Text style={[styles.actionText, { color: colors.textInverse, transform: [{ scale }], fontFamily: colors.fonts?.bold, textTransform: 'uppercase', letterSpacing: 1 }]}>
          {label}
        </Animated.Text>
        <Ionicons name="checkmark-circle" size={30} color={colors.textInverse} />
      </View>
    );
  };

  return (
    <Swipeable
      renderLeftActions={renderLeftActions}
      onSwipeableOpen={() => onSwipeLeft(mision.id_mision)}
      containerStyle={styles.swipeableContainer}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => onPress(mision)}
        style={[styles.card, { backgroundColor: colors.surface, borderLeftColor: colors.primary }]}
      >
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text, fontFamily: colors.fonts?.title, textTransform: 'uppercase' }]}>{mision.nombre}</Text>

          <View style={styles.metaRow}>
            {mision.fecha_expiracion && (
              <Text style={[styles.metaText, { color: getExpirationColor(), fontFamily: colors.fonts?.bold }]}>
                {fechaTexto}
              </Text>
            )}
            {mision.frecuencia_repeticion !== MissionFrequency.ONE_OFF && (
               <Ionicons name="repeat" size={14} color={colors.textDim} style={{ marginLeft: 8 }} />
            )}
          </View>

          {/* Feedback visual para misiones no-diarias con dias_repeticion */}
          {mision.tipo !== MissionType.DIARIA && mision.dias_repeticion ? (
            (() => {
              const map = ['Dom','Lun','Mar','Mie','Jue','Vie','Sab'];
              const diasArray = String(mision.dias_repeticion).split(',').map((d: string) => d.trim()).filter(Boolean);
              const todayIndex = new Date().getDay();
              const isToday = diasArray.includes(String(todayIndex));
              const formatted = diasArray.map((d: string) => map[Number(d)]).filter(Boolean).join(', ');
              return (
                <View style={{ marginTop: 8 }}>
                  {isToday ? (
                    <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>⚡ RECOMENDADO PARA HOY</Text>
                  ) : (
                    <Text style={{ color: colors.textDim, fontSize: 12 }}>📅 Planificado: {formatted}</Text>
                  )}
                </View>
              );
            })()
          ) : null}

        </View>

        <View style={styles.rewardContainer}>
          <Text style={[styles.xpText, { color: colors.primary, fontFamily: colors.fonts?.bold, textTransform: 'uppercase' }]}>+{mision.recompensa_exp} XP</Text>
          {mision.recompensa_yenes > 0 && (
             <Text style={[styles.yenText, { color: colors.textDim, fontFamily: colors.fonts?.body }]}>¥{mision.recompensa_yenes}</Text>
          )}
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  swipeableContainer: {
    marginBottom: 10,
    overflow: 'hidden',
  },
  card: {
    flexDirection: 'row',
    padding: 18,
    borderRadius: 5,
    borderLeftWidth: 5,
    elevation: 3,
    alignItems: 'center',
  },
  content: { flex: 1 },
  title: { fontSize: 17, marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  metaText: { fontSize: 13 },
  rewardContainer: { alignItems: 'flex-end' },
  xpText: { fontWeight: '900', fontSize: 14 },
  yenText: { fontSize: 12 },
  actionContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
    width: '100%',
    flexDirection: 'row',
    paddingLeft: 20,
    height: '100%',
  },
  actionText: {
    color: 'white',
    marginRight: 10,
    fontSize: 14
  }
});
