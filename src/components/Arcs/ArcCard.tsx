import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../themes/useTheme';
import { db } from '../../database';
import { getContrastText } from '../../utils/colorUtils';
import { PersonaCount } from '../UI/PersonaCount';

const ArcCard = ({ arc, onPress, containerStyle, style, mode }: { arc: any; onPress?: () => void; containerStyle?: any; style?: any; mode?: 'HERO' | 'DEFAULT' }) => {
  const theme = useTheme();
  const [progress, setProgress] = useState(0);
  const isHero = mode === 'HERO';

  useEffect(() => {
    let mounted = true;
    const loadProgress = async () => {
      try {
        const res: any[] = await db.getAllAsync(
          `SELECT count(*) as total, sum(case when completada=1 then 1 else 0 end) as completadas FROM misiones WHERE id_arco = ?`,
          [arc.id_arco]
        );
        if (!mounted) return;
        const total = (res && res.length > 0 && res[0].total) ? res[0].total : 0;
        const comp = (res && res.length > 0 && res[0].completadas) ? res[0].completadas : 0;
        const pct = total === 0 ? 0 : Math.round((comp / total) * 100);
        setProgress(pct);
      } catch (e) {
        console.error('Error calculando progreso del arco:', e);
      }
    };
    loadProgress();
    return () => { mounted = false; };
  }, [arc]);

  const now = new Date();
  const start = new Date(arc.fecha_inicio);
  const end = arc.fecha_fin ? new Date(arc.fecha_fin) : null;
  let state: 'ACTIVO' | 'COMPLETADO' | 'PENDIENTE' = 'PENDIENTE';
  if (end && now > end) state = 'COMPLETADO';
  else if (now >= start && (!end || now <= end)) state = 'ACTIVO';

  const stateColor = state === 'ACTIVO' ? theme.primary : state === 'COMPLETADO' ? theme.success : theme.secondary;
  const stateLabel = state === 'ACTIVO' ? 'EN CURSO' : state === 'COMPLETADO' ? 'COMPLETADO' : 'PROGRAMADO';
  const formattedDates = `${arc.fecha_inicio}${arc.fecha_fin ? '  →  ' + arc.fecha_fin : ''}`;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[styles.card, isHero && styles.heroCard, { backgroundColor: theme.surface, borderColor: stateColor }, containerStyle, style]}
    >
      {/* Acento inclinado segun estado */}
      <View style={[styles.accent, { backgroundColor: stateColor }]} />

      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.text, fontFamily: theme.fonts?.title, fontSize: isHero ? 30 : 22 }]} numberOfLines={2}>
          {arc.nombre}
        </Text>
        <View style={[styles.badge, { backgroundColor: stateColor }]}>
          <Text style={[styles.badgeText, { color: getContrastText(stateColor), fontFamily: theme.fonts?.heading }]}>{stateLabel}</Text>
        </View>
      </View>

      <Text style={[styles.dates, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>{formattedDates}</Text>

      <View style={styles.heroSpace} />

      {/* Progreso: numero grande estilo "01" + barra inclinada */}
      <View style={styles.progressRow}>
        <PersonaCount value={progress} pad={2} color={stateColor} fontSize={isHero ? 60 : 42} />
        <Text style={[styles.pct, { color: stateColor, fontFamily: theme.fonts?.display, fontSize: isHero ? 30 : 22 }]}>%</Text>
        <Text style={[styles.pctLabel, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>COMPLETADO</Text>
      </View>

      <View style={[styles.progressBarBackground, { backgroundColor: theme.inactive }]}>
        <View style={[styles.progressBarFill, { width: `${progress}%`, backgroundColor: stateColor }]} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: { minHeight: 190, padding: 20, paddingLeft: 26, borderWidth: 2, borderRadius: 10, marginBottom: 18, justifyContent: 'space-between', overflow: 'hidden' },
  heroCard: { flex: 1, width: '100%' },
  accent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 9, transform: [{ skewX: '-12deg' }], marginLeft: -3 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5, flex: 1, marginRight: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, transform: [{ skewX: '-12deg' }] },
  badgeText: { fontSize: 11, letterSpacing: 1, transform: [{ skewX: '12deg' }] },
  dates: { fontSize: 12, marginTop: 8, letterSpacing: 0.5 },
  heroSpace: { flex: 1, minHeight: 12 },
  progressRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 8 },
  pct: { marginLeft: 2, marginBottom: 4 },
  pctLabel: { fontSize: 11, letterSpacing: 1, marginLeft: 10, marginBottom: 8 },
  progressBarBackground: { height: 14, transform: [{ skewX: '-20deg' }], borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: '100%' },
});

export default ArcCard;
