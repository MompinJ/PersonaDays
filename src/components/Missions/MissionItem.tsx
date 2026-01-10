import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
// Usamos el Swipeable Clásico (Estable)
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { Mision, MissionFrequency } from '../../types';
import { useTheme } from '../../themes/useTheme';

interface Props {
  mision: Mision;
  onSwipeLeft: (id: number) => void;
  onPress: (mision: Mision) => void;
}

export const MissionItem = ({ mision, onSwipeLeft, onPress }: Props) => {
  const colors = useTheme();

  const getExpirationColor = () => {
    if (!mision.fecha_expiracion) return colors.textDim;
    const hoy = new Date();
    const exp = new Date(mision.fecha_expiracion);
    const diffTime = exp.getTime() - hoy.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return '#FF4444';
    if (diffDays <= 1) return '#FFAA00';
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

    return (
      <View style={[styles.actionContainer, { backgroundColor: colors.primary }]}>
        <Animated.Text style={[styles.actionText, { transform: [{ scale }] }]}>
          COMPLETAR
        </Animated.Text>
        <Ionicons name="checkmark-circle" size={30} color="white" />
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
          <Text style={[styles.title, { color: colors.text }]}>{mision.nombre}</Text>

          <View style={styles.metaRow}>
            {mision.fecha_expiracion && (
              <Text style={[styles.metaText, { color: getExpirationColor(), fontWeight: 'bold' }]}>
                {fechaTexto}
              </Text>
            )}
            {mision.frecuencia_repeticion !== MissionFrequency.ONE_OFF && (
               <Ionicons name="repeat" size={14} color={colors.textDim} style={{ marginLeft: 8 }} />
            )}
          </View>
        </View>

        <View style={styles.rewardContainer}>
          <Text style={[styles.xpText, { color: colors.primary }]}>+{mision.recompensa_exp} XP</Text>
          {mision.recompensa_yenes > 0 && (
             <Text style={[styles.yenText, { color: colors.textDim }]}>¥{mision.recompensa_yenes}</Text>
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
  title: { fontSize: 17, fontWeight: 'bold', marginBottom: 4 },
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
    fontWeight: 'bold',
    marginRight: 10,
    fontSize: 14
  }
});
