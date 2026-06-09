// StatCard.tsx — tarjeta de un atributo: icono grande + nombre + nivel
// (PersonaCount "01") + barra de XP inclinada + raya diagonal secondary.
//
// Color del personaje (theme.primary) en icono, numero y barra; la raya
// usa secondary. Cero colores hardcodeados.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../themes/useTheme';
import { StatIcon } from './StatIcon';
import PersonaCount from '../UI/PersonaCount';
import { STATS, type StatKey } from './stats';

export interface StatCardProps {
  stat: StatKey;
  level: number;
  xp: number;
  xpMax: number;
}

export function StatCard({ stat, level, xp, xpMax }: StatCardProps) {
  const theme = useTheme();
  const pct = Math.max(0, Math.min(1, xpMax > 0 ? xp / xpMax : 0));

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {/* raya diagonal banner, recortada por overflow:hidden de la card */}
      <View style={[styles.stripe, { backgroundColor: theme.secondary }]} />

      <StatIcon stat={stat} size={72} color={theme.primary} skew={12} />

      <Text style={[styles.name, { fontFamily: theme.fonts?.title, color: theme.text }]}>
        {STATS[stat].es}
      </Text>
      <Text style={[styles.sub, { fontFamily: theme.fonts?.condensed, color: theme.textDim }]}>
        {STATS[stat].en}
      </Text>

      <View style={styles.lvRow}>
        <Text style={[styles.lvLbl, { fontFamily: theme.fonts?.condensed, color: theme.textDim }]}>
          LV
        </Text>
        {/* ceros a la izquierda tenues + valor solido */}
        <PersonaCount value={level} pad={2} color={theme.primary} fontSize={56} />
      </View>

      <View style={[styles.xpTrack, { backgroundColor: theme.background, borderColor: theme.border }]}>
        <View style={[styles.xpFill, { width: `${pct * 100}%`, backgroundColor: theme.primary }]} />
      </View>
      <Text style={[styles.xpMeta, { fontFamily: theme.fonts?.condensed, color: theme.textDim }]}>
        {xp.toLocaleString()} / {xpMax.toLocaleString()} XP
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, padding: 24, overflow: 'hidden' }, // sin radio: esquinas afiladas
  stripe: {
    position: 'absolute',
    bottom: -18,
    right: -60,
    width: '160%',
    height: 28,
    opacity: 0.5,
    transform: [{ skewX: '-24deg' }],
  },
  name: { fontSize: 30, marginTop: 14, lineHeight: 30 },
  sub: { fontSize: 12, letterSpacing: 3, marginTop: 2 },
  lvRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 18 },
  lvLbl: { fontSize: 14, letterSpacing: 2, marginRight: 10, marginBottom: 8 },
  xpTrack: {
    height: 14,
    marginTop: 18,
    borderWidth: 1,
    overflow: 'hidden',
    transform: [{ skewX: '-16deg' }],
  },
  xpFill: { height: '100%' },
  xpMeta: { fontSize: 11, letterSpacing: 2, marginTop: 8 },
});

export default StatCard;
