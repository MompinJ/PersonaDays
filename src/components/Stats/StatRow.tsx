import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { StatViewData } from '../../hooks/usePlayerStats';
import { useTheme } from '../../themes/useTheme';
import { calculateLevelFromXP } from '../../utils/levelingUtils';
import { StatIcon } from './StatIcon';
import { resolveStatKey, type StatKey } from './stats';

interface Props {
  data: StatViewData;
  colorTema: string; // El color del tema (Azul Makoto, Rosa Kotone, etc.)
  statKey?: StatKey | null; // icono ya resuelto (incluye herencia de hijos); si no, se resuelve por nombre
}

export const StatRow = ({ data, colorTema, statKey }: Props) => {
  const theme = useTheme();
  const iconKey = statKey !== undefined ? statKey : resolveStatKey(data.nombre_stat);
  // Ahora usamos la curva progresiva para calcular nivel y progreso desde la XP total
  const lvlInfo = calculateLevelFromXP(data.experiencia_actual || 0);
  const xpPercent = Math.min(Math.max(lvlInfo.progress * 100, 0), 100);

  // Barra de XP animada: crece desde 0 hasta el porcentaje actual (y re-anima si cambia)
  const fill = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fill, {
      toValue: xpPercent,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // width en % no soporta native driver
    }).start();
  }, [xpPercent]);
  const fillWidth = fill.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

  return (
    <View style={styles.container}>
      {/* Círculo del Nivel (Estilo Rank) */}
      <View style={[styles.rankCircle, { borderColor: colorTema, backgroundColor: theme.surface }]}>
        <Text style={[styles.rankText, { color: colorTema, fontFamily: theme.fonts?.display }]}>{lvlInfo.level}</Text>
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.headerRow}>
          <View style={styles.nameWrap}>
            {iconKey ? <StatIcon stat={iconKey} size={18} skew={0} color={colorTema} /> : null}
            <Text style={[styles.statName, { color: theme.text, fontFamily: theme.fonts?.heading, marginLeft: iconKey ? 8 : 0 }]}>{data.nombre_stat}</Text>
          </View>
          {data.cuenta_prestigio > 0 && (
            <Text style={[styles.prestige, { color: theme.primary, fontFamily: theme.fonts?.bold }]}>★ {data.cuenta_prestigio}</Text>
          )}
        </View>

        {/* Barra de Progreso "Inclinada" estilo Persona */}
        <View style={[styles.progressBarBackground, { backgroundColor: theme.surface }]}>
          <Animated.View
            style={[
              styles.progressBarFill,
              {
                width: fillWidth,
                backgroundColor: colorTema || theme.primary
              }
            ]}
          />
        </View>
        <Text style={[styles.xpText, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>{lvlInfo.currentLevelXP} / {lvlInfo.xpToNextLevel} XP</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  rankCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: 'transparent',
  },
  rankText: {
    fontWeight: '900',
    fontSize: 18,
  },
  infoContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nameWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statName: {
    fontSize: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  prestige: {
  },
  progressBarBackground: {
    height: 8,
    transform: [{ skewX: '-20deg' }], // ESTO LE DA EL TOQUE PERSONA
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
  },
  xpText: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'right',
  },
});