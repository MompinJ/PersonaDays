import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../themes/useTheme';
import { db } from '../../database';

const ArcCard = ({ arc, onPress, containerStyle, style, mode }: { arc: any; onPress?: () => void; containerStyle?: any; style?: any; mode?: 'HERO' | 'DEFAULT' }) => {
  const theme = useTheme();
  const [progress, setProgress] = useState(0);

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

  const formattedDates = `${arc.fecha_inicio} ${arc.fecha_fin ? '- ' + arc.fecha_fin : ''}`;

  const combinedStyle = [
    styles.card,
    state === 'ACTIVO' && { borderColor: theme.primary, shadowColor: theme.primary, elevation: 12 },
    { backgroundColor: state === 'COMPLETADO' ? `${theme.surface}88` : theme.surface },
    mode === 'HERO' ? styles.heroCard : null,
    containerStyle,
    style
  ];

  return (
    <TouchableOpacity
      style={combinedStyle}
      onPress={onPress}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={[styles.title, { color: theme.text }]}>{arc.nombre}</Text>
        {state === 'ACTIVO' && <Text style={[styles.badge, { backgroundColor: theme.primary, color: theme.textInverse }]}>EN CURSO</Text>}
        {state === 'PENDIENTE' && <Text style={[styles.badgePending]}>PROGRAMADO</Text>}
      </View>


      <Text style={[styles.dates, { color: theme.textDim }]}>{formattedDates}</Text>

      <View style={styles.heroSpace} />

      <View style={styles.progressBarBackground}>
        <View style={[styles.progressBarFill, { width: `${progress}%`, backgroundColor: theme.primary }]} />
      </View>
      <Text style={{ color: theme.textDim, marginTop: 10 }}>{progress}% completado</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: { height: 200, padding: 20, borderWidth: 2, borderRadius: 14, marginBottom: 18, justifyContent: 'space-between', overflow: 'hidden' },
  heroCard: { flex: 1, width: '100%', justifyContent: 'space-between' },
  title: { fontSize: 24, fontWeight: '900' },
  dates: { fontSize: 12, marginTop: 6 },
  heroSpace: { flex: 1 },
  progressBarBackground: { height: 18, backgroundColor: '#192028', borderRadius: 10, marginTop: 12, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 10 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, fontWeight: '700' },
  badgePending: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#444', color: '#ccc' }
});

export default ArcCard;
