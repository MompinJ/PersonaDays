import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { format, parseISO, isSameDay, addDays } from 'date-fns';
import { db } from '../../../database';
import { useTheme } from '../../../themes/useTheme';
import { Mision } from '../../../types';
import { PersonaShard } from '../../../components/UI/PersonaShard';
import { PersonaModal } from '../../../components/UI/PersonaModal';
import { PersonaCount } from '../../../components/UI/PersonaCount';
import { P3RCalendarPanel } from '../../../components/UI/P3RDatePicker';
import { arcDisplayColor } from '../../../services/arcService';

export const CalendarScreen = () => {
  const theme = useTheme();
  const [markedDates, setMarkedDates] = useState<Record<string, string>>({});
  const [activeArc, setActiveArc] = useState<any>(null);
  const [missions, setMissions] = useState<Mision[]>([]);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayMissions, setDayMissions] = useState<Mision[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  const avatarColor = theme.primary;

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const fetchData = async () => {
        try {
          const arcRes: any = await db.getFirstAsync("SELECT * FROM arcos WHERE estado = 'ACTIVO' ORDER BY id_arco DESC LIMIT 1");
          const missionsRes = await db.getAllAsync<Mision>("SELECT * FROM misiones WHERE activa = 1 AND completada = 0");
          if (isActive) {
            setActiveArc(arcRes);
            setMissions(missionsRes as Mision[]);
            if (arcRes) generateArcMarkings(arcRes);
            else setMarkedDates({});
          }
        } catch (e) { console.error('Error loading calendar data', e); }
      };
      fetchData();
      return () => { isActive = false; };
    }, [])
  );

  const generateArcMarkings = (arc: any) => {
    const start = parseISO(arc.fecha_inicio);
    const end = arc.fecha_fin ? parseISO(arc.fecha_fin) : new Date();
    const markings: Record<string, string> = {};
    let current = start;
    const arcColor = arcDisplayColor(arc, theme.primary);

    // tinte de cada dia del rango del arco (la celda de HOY ya la resalta el panel)
    while (current <= end || isSameDay(current, end)) {
      markings[format(current, 'yyyy-MM-dd')] = arcColor;
      current = addDays(current, 1);
    }
    setMarkedDates(markings);
  };

  const handleDayPress = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const jsDayOfWeek = date.getDay();

    const eventsForDay = missions.filter(m => {
      if (m.tipo === 'DIARIA' || m.frecuencia_repeticion === 'EVERY_DAY') return true;
      if (m.dias_repeticion && String(m.dias_repeticion).trim().length > 0) {
        const daysArray = String(m.dias_repeticion).split(',').map(d => parseInt(d.trim(), 10)).filter(d => !isNaN(d));
        return daysArray.includes(jsDayOfWeek);
      }
      if (m.fecha_expiracion) {
        const missionDatePart = String(m.fecha_expiracion).split('T')[0];
        return missionDatePart === dateStr;
      }
      return false;
    });

    setSelectedDate(dateStr);
    setDayMissions(eventsForDay);
    setModalVisible(true);
  };

  // HUD de fecha (hoy)
  const today = new Date();
  const dayName = today.toLocaleDateString('es-MX', { weekday: 'long' }).toUpperCase();
  const monthName = today.toLocaleDateString('es-MX', { month: 'short' }).toUpperCase();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.headerWrap}>
        <PersonaShard label="CALENDARIO" height={50} fontSize={28} font={theme.fonts?.title} />
      </View>

      {/* HUD de fecha (hoy) + arco activo */}
      <View style={styles.hudRow}>
        <View style={[styles.hudBar, { backgroundColor: avatarColor }]}>
          <Text style={[styles.hudDay, { color: theme.textInverse, fontFamily: theme.fonts?.heading }]}>{dayName}</Text>
          <Text style={[styles.hudMonth, { color: theme.textInverse, fontFamily: theme.fonts?.condensed }]}>{monthName} {today.getFullYear()}</Text>
        </View>
        <View style={[styles.hudCircle, { borderColor: avatarColor }]}>
          <PersonaCount value={today.getMonth() + 1} pad={2} color={avatarColor} fontSize={24} />
        </View>
      </View>

      {activeArc ? (
        <View style={{ marginBottom: 6 }}>
          <PersonaShard label={activeArc.nombre} variant="ghost" fontSize={12} color={arcDisplayColor(activeArc, avatarColor)} />
        </View>
      ) : null}

      <View style={styles.calendarWrapper}>
        {/* Numero del DIA gigante de fondo (estilo P3R) */}
        <Text style={[styles.bgMonth, { color: avatarColor }]} pointerEvents="none">{today.getDate()}</Text>

        <P3RCalendarPanel
          hideFooter
          marks={markedDates}
          onPick={handleDayPress}
        />
      </View>

      <PersonaModal visible={modalVisible} onClose={() => setModalVisible(false)} title={selectedDate || ''}>
        <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
          {dayMissions.length === 0 ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ color: theme.textDim, fontStyle: 'italic', textAlign: 'center', fontFamily: theme.fonts?.body }}>No hay misiones para este día.</Text>
            </View>
          ) : (
            dayMissions.map((m, index) => (
              <View key={m.id_mision || index} style={[styles.missionRow, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <View style={[styles.missionAccent, { backgroundColor: avatarColor }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.missionTitle, { color: theme.text, fontFamily: theme.fonts?.bold }]} numberOfLines={1}>{m.nombre}</Text>
                  <Text style={[styles.missionType, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>{m.tipo}</Text>
                </View>
                <Text style={[styles.missionXp, { color: avatarColor, fontFamily: theme.fonts?.display }]}>+{m.recompensa_exp || 0}</Text>
              </View>
            ))
          )}
        </ScrollView>
        <TouchableOpacity style={[styles.closeBtn, { backgroundColor: avatarColor }]} onPress={() => { setModalVisible(false); setSelectedDate(null); }}>
          <Text style={[styles.closeBtnText, { color: theme.textInverse, fontFamily: theme.fonts?.heading }]}>CERRAR</Text>
        </TouchableOpacity>
      </PersonaModal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50, paddingHorizontal: 16 },
  headerWrap: { marginBottom: 12, marginTop: 4 },

  hudRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  hudBar: { paddingVertical: 8, paddingHorizontal: 18, transform: [{ skewX: '-14deg' }], marginRight: 12 },
  hudDay: { fontSize: 18, letterSpacing: 1, transform: [{ skewX: '14deg' }] },
  hudMonth: { fontSize: 11, letterSpacing: 1, transform: [{ skewX: '14deg' }] },
  hudCircle: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },

  calendarWrapper: { flex: 1, justifyContent: 'center' },
  bgMonth: { position: 'absolute', right: 8, top: -28, fontSize: 120, lineHeight: 120, fontFamily: 'Anton_400Regular', opacity: 0.07, letterSpacing: -4 },

  missionRow: { flexDirection: 'row', alignItems: 'center', padding: 12, paddingLeft: 18, borderWidth: 1, borderRadius: 8, marginBottom: 10, overflow: 'hidden' },
  missionAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, transform: [{ skewX: '-12deg' }], marginLeft: -2 },
  missionTitle: { fontSize: 15 },
  missionType: { fontSize: 11, marginTop: 2, letterSpacing: 0.5 },
  missionXp: { fontSize: 22, marginLeft: 10 },

  closeBtn: { marginTop: 14, paddingVertical: 13, alignItems: 'center', alignSelf: 'center', paddingHorizontal: 40, transform: [{ skewX: '-12deg' }] },
  closeBtnText: { fontSize: 15, letterSpacing: 1, transform: [{ skewX: '12deg' }] },
});
