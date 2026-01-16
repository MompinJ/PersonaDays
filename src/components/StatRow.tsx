import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatViewData } from '../hooks/usePlayerStats';
import { useTheme } from '../themes/useTheme';

interface Props {
  data: StatViewData;
  colorTema: string; // El color del tema (Azul Makoto, Rosa Kotone, etc.)
}

export const StatRow = ({ data, colorTema }: Props) => {
  const theme = useTheme();
  // Calculamos porcentaje para la barra usando experiencia_actual / xpNecesaria
  // xpNeeded = baseXP (100) * dificultad (si existe)
  const xpBase = 100;
  const xpNeeded = Math.max(1, Math.round(xpBase * (data.dificultad || 1)));
  const xpPercent = Math.min((data.experiencia_actual / xpNeeded) * 100, 100);

  return (
    <View style={styles.container}>
      {/* Círculo del Nivel (Estilo Rank) */}
      <View style={[styles.rankCircle, { borderColor: colorTema, backgroundColor: theme.surface }]}>
        <Text style={[styles.rankText, { color: colorTema, fontFamily: theme.fonts?.bold }]}>{data.nivel_actual}</Text>
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.headerRow}>
          <Text style={[styles.statName, { color: theme.text, fontFamily: theme.fonts?.bold }]}>{data.nombre_stat}</Text>
          {data.cuenta_prestigio > 0 && (
            <Text style={[styles.prestige, { color: theme.primary, fontFamily: theme.fonts?.bold }]}>★ {data.cuenta_prestigio}</Text>
          )}
        </View>

        {/* Barra de Progreso "Inclinada" estilo Persona */}
        <View style={[styles.progressBarBackground, { backgroundColor: theme.surface }]}> 
          <View 
            style={[
              styles.progressBarFill, 
              { 
                width: `${xpPercent}%`, 
                backgroundColor: colorTema || theme.primary
              }
            ]} 
          />
        </View>
        <Text style={[styles.xpText, { color: theme.textDim, fontFamily: theme.fonts?.body }]}>{data.experiencia_actual} / {xpNeeded} XP</Text>
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
    marginBottom: 4,
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