import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Calendar, DateData, LocaleConfig } from 'react-native-calendars';
import { useFocusEffect } from '@react-navigation/native';
import { format, parseISO, isSameDay, addDays } from 'date-fns';
import { db } from '../../database';
import { useTheme } from '../../themes/useTheme';
import { Mision } from '../../types';

// Configuración de idioma (sin cambios)
LocaleConfig.locales['es'] = {
  monthNames: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  monthNamesShort: ['Ene.', 'Feb.', 'Mar.', 'Abr.', 'May.', 'Jun.', 'Jul.', 'Ago.', 'Sep.', 'Oct.', 'Nov.', 'Dic.'],
  dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  dayNamesShort: ['Dom.', 'Lun.', 'Mar.', 'Mié.', 'Jue.', 'Vie.', 'Sáb.'],
  today: 'Hoy'
};
LocaleConfig.defaultLocale = 'es';

export const CalendarScreen = () => {
  const theme = useTheme();
  const [markedDates, setMarkedDates] = useState<any>({});
  const [activeArc, setActiveArc] = useState<any>(null);
  const [missions, setMissions] = useState<Mision[]>([]);

  // Estado para el Popup
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayMissions, setDayMissions] = useState<Mision[]>([]); // ESTADO QUE USAREMOS
  const [modalVisible, setModalVisible] = useState(false);

  const avatarColor = theme.primary;

  // Carga de datos
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
            if (arcRes) {
              generateArcMarkings(arcRes);
            } else {
              setMarkedDates({});
            }
          }
        } catch (e) { console.error("Error loading calendar data", e); }
      };
      fetchData();
      return () => { isActive = false; };
    }, [])
  );

  const generateArcMarkings = (arc: any) => {
    const start = parseISO(arc.fecha_inicio);
    const end = arc.fecha_fin ? parseISO(arc.fecha_fin) : new Date();
    const markings: any = {};
    let current = start;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const arcColor = arc.color_hex || theme.primary;

    while (current <= end || isSameDay(current, end)) {
      const dateStr = format(current, 'yyyy-MM-dd');
      let type: 'startingDay' | 'endingDay' | undefined = undefined;
      if (isSameDay(current, start)) type = 'startingDay';
      if (isSameDay(current, end)) type = 'endingDay';

      markings[dateStr] = {
        startingDay: type === 'startingDay',
        endingDay: type === 'endingDay',
        color: arcColor + '66',
        textColor: theme.textInverse,
      };

      if (dateStr === todayStr) {
        markings[dateStr] = {
          ...markings[dateStr],
          marked: true,
          dotColor: theme.textInverse,
          color: arcColor,
          textColor: theme.textInverse
        };
      }
      current = addDays(current, 1);
    }
    setMarkedDates(markings);
  };

  // --- LOGICA CORREGIDA DEL CLICK ---
  const handleDayPress = (day: DateData) => {
    const dateStr = day.dateString; // "YYYY-MM-DD"

    // 1. Crear fecha local segura para determinar el día de la semana
    const localDate = new Date(day.year, day.month - 1, day.day);
    const jsDayOfWeek = localDate.getDay(); // 0=Domingo, 1=Lunes, ...

    console.log(`--- SELECCIONADO: ${dateStr} (Dia JS: ${jsDayOfWeek}) ---`);

    const eventsForDay = missions.filter(m => {
      // CASO 1: Misiones Diarias
      if (m.tipo === 'DIARIA' || m.frecuencia_repeticion === 'EVERY_DAY') {
        return true;
      }

      // CASO 2: Días de repetición específicos (Ej: "1,3,5")
      if (m.dias_repeticion && String(m.dias_repeticion).trim().length > 0) {
        const daysArray = String(m.dias_repeticion)
          .split(',')
          .map(d => parseInt(d.trim(), 10))
          .filter(d => !isNaN(d));

        // Nota: si tu DB usa 7 para Domingo, conviértelo aquí
        return daysArray.includes(jsDayOfWeek);
      }

      // CASO 3: Fechas específicas (One-off / Eventos)
      if (m.fecha_expiracion) {
        const missionDatePart = String(m.fecha_expiracion).split('T')[0];
        return missionDatePart === dateStr;
      }

      return false;
    });

    console.log(`Misiones encontradas: ${eventsForDay.length}`);

    // Actualizamos estado
    setSelectedDate(dateStr);
    setDayMissions(eventsForDay);
    setModalVisible(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>

      <View style={styles.headerContainer}>
        <Text style={[styles.headerTitle, { color: theme.text, fontFamily: theme.fonts?.title }]}>CALENDAR</Text>
        {activeArc ? (
          <Text style={[styles.arcSubtitle, { color: avatarColor, fontFamily: theme.fonts?.bold }]}>{activeArc.nombre}</Text>
        ) : null}
        <View style={[styles.headerLine, { backgroundColor: avatarColor }]} />
      </View>

      <View style={styles.calendarWrapper}>
        <Calendar
          theme={{
            calendarBackground: 'transparent',
            textSectionTitleColor: theme.textDim,
            selectedDayBackgroundColor: avatarColor,
            selectedDayTextColor: theme.textInverse,
            todayTextColor: avatarColor,
            dayTextColor: theme.text,
            textDisabledColor: '#333',
            monthTextColor: theme.text,
            arrowColor: avatarColor,
            textDayFontFamily: theme.fonts?.body,
            textMonthFontFamily: theme.fonts?.title,
            textDayHeaderFontFamily: theme.fonts?.bold,
          }}
          markingType={'period'}
          markedDates={markedDates}
          onDayPress={handleDayPress}
          enableSwipeMonths={true}
        />
      </View>

      {/* MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalDismissArea} onPress={() => setModalVisible(false)} />

          <View style={[styles.modalContent, { backgroundColor: theme.surface, shadowColor: theme.primary, borderColor: theme.border }]}>
            <View style={[styles.modalDecorStrip, { backgroundColor: avatarColor }]} />

            <Text style={[styles.modalDate, { color: theme.text, fontFamily: theme.fonts?.title }]}>{selectedDate}</Text>
            <View style={{ height: 1, backgroundColor: theme.textDim, marginBottom: 10, marginHorizontal: 16, opacity: 0.3 }} />

            <ScrollView style={{ flex: 1, width: '100%' }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}>
              {dayMissions.length === 0 ? (
                <View style={{ padding: 20, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: theme.textDim, fontStyle: 'italic', textAlign: 'center' }}>No hay misiones activas para este día.</Text>
                </View>
              ) : (
                dayMissions.map((m, index) => (
                  <View key={m.id_mision || index} style={[styles.missionRow, { borderLeftColor: avatarColor }]}>
                    <Text style={[styles.missionTitle, { color: theme.text }]}>{m.nombre}</Text>
                    <View style={styles.missionTags}>
                      <Text style={[styles.tag, { color: theme.textDim, borderColor: theme.textDim }]}>{m.tipo}</Text>
                      <Text style={{ color: avatarColor, fontSize: 12, marginLeft: 8, fontWeight: 'bold' }}>+{m.recompensa_exp || 0} XP</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: avatarColor }]} onPress={() => { setModalVisible(false); setSelectedDate(null); }}>
              <Text style={{ color: theme.textInverse, fontWeight: 'bold' }}>CERRAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, paddingHorizontal: 16 },
  headerContainer: { marginBottom: 10 },
  headerTitle: { fontSize: 32, fontWeight: '900', letterSpacing: 2, fontStyle: 'italic' },
  headerLine: { height: 4, width: 100, transform: [{ skewX: '-20deg' }] },
  calendarWrapper: { flex: 1, justifyContent: 'center' },
  arcSubtitle: { fontSize: 14, marginTop: 6, marginBottom: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalDismissArea: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  modalContent: {
    width: '90%',
    height: '60%', // altura fija para que el ScrollView interno tenga referencia
    paddingVertical: 24,
    borderRadius: 8,
    borderWidth: 1,
    transform: [{ rotate: '-1deg' }],
    overflow: 'hidden'
  },
  modalDecorStrip: {
    position: 'absolute', top: 0, left: 20, width: 8, height: '100%', transform: [{ skewX: '-20deg' }], zIndex: -1
  },
  modalDate: { fontSize: 28, fontWeight: '900', marginBottom: 4, marginLeft: 40 },
  missionRow: {
    padding: 12, marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderLeftWidth: 4, marginLeft: 30, marginRight: 16, borderRadius: 4
  },
  missionTitle: { fontSize: 16, fontWeight: 'bold' },
  missionTags: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  tag: { fontSize: 10, borderWidth: 1, paddingHorizontal: 4, borderRadius: 4, textTransform: 'uppercase' },
  closeBtn: {
    marginTop: 10, padding: 14, alignItems: 'center', marginHorizontal: 30, borderRadius: 4, transform: [{ skewX: '-5deg' }]
  }
});
