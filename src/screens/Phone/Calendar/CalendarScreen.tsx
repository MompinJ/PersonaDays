import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
import { getFechasConEntrada } from '../../../services/diaryService';
import { useNavigation } from '@react-navigation/native';

export const CalendarScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  // Dias con entrada de diario: se pintan sobre el tinte del arco.
  const [diasEscritos, setDiasEscritos] = useState<Set<string>>(new Set());
  const [markedDates, setMarkedDates] = useState<Record<string, string>>({});
  const [activeArc, setActiveArc] = useState<any>(null);
  const [missions, setMissions] = useState<Mision[]>([]);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayMissions, setDayMissions] = useState<Mision[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  // 'done'    = dia pasado -> lo que realmente se completo (registro historico)
  // 'planned' = hoy o futuro -> proyeccion de lo programado (planificacion)
  const [dayMode, setDayMode] = useState<'done' | 'planned'>('planned');

  const avatarColor = theme.primary;

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const fetchData = async () => {
        try {
          const arcRes: any = await db.getFirstAsync("SELECT * FROM arcos WHERE estado = 'ACTIVO' ORDER BY id_arco DESC LIMIT 1");
          // Para la proyeccion de hoy/futuro tomamos TODAS las activas (la complecion
          // es transitoria y se reinicia), asi el pronostico refleja el horario real.
          const missionsRes = await db.getAllAsync<Mision>("SELECT * FROM misiones WHERE activa = 1");
          // Ventana amplia (un año a cada lado): el panel deja navegar meses y
          // las marcas deben seguir ahi al moverse.
          const hoy = new Date();
          const escritas = await getFechasConEntrada(
            format(addDays(hoy, -400), 'yyyy-MM-dd'),
            format(addDays(hoy, 400), 'yyyy-MM-dd')
          );
          if (isActive) {
            setActiveArc(arcRes);
            setMissions(missionsRes as Mision[]);
            setDiasEscritos(new Set(escritas));
            if (arcRes) generateArcMarkings(arcRes, escritas);
            else setMarkedDates(Object.fromEntries(escritas.map((f) => [f, theme.secondary])));
          }
        } catch (e) { console.error('Error loading calendar data', e); }
      };
      fetchData();
      return () => { isActive = false; };
    }, [])
  );

  // El panel admite un color por dia. El arco tiñe su rango completo y encima
  // se marcan los dias escritos, que asi resaltan dentro del arco.
  const generateArcMarkings = (arc: any, escritas: string[] = []) => {
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
    escritas.forEach((f) => { markings[f] = theme.secondary; });
    setMarkedDates(markings);
  };

  const handleDayPress = async (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    if (dateStr < todayStr) {
      // PASADO: solo lo que realmente se completo ese dia (registro historico).
      // No proyectamos recurrencias hacia atras (la app pudo no existir aun, o la
      // mision se creo despues). logs.fecha_completada se guarda en hora local.
      try {
        const rows = await db.getAllAsync<any>(
          `SELECT m.id_mision, m.nombre, m.tipo, l.exp_ganada as recompensa_exp, l.fecha_completada
             FROM logs l
             JOIN misiones m ON m.id_mision = l.id_mision
            WHERE date(l.fecha_completada) = ?
            ORDER BY l.fecha_completada ASC`,
          [dateStr]
        );
        setDayMode('done');
        setDayMissions((rows || []) as Mision[]);
      } catch (e) {
        console.error('Error cargando historico del dia:', e);
        setDayMode('done');
        setDayMissions([]);
      }
    } else {
      // HOY o FUTURO: proyeccion de lo programado. Nunca antes de su fecha_creacion.
      const jsDayOfWeek = date.getDay();
      const isToday = dateStr === todayStr;

      // Para HOY marcamos las que ya completaste (cruce con logs de hoy, hora local)
      // para que no salgan como "pendientes" si ya las hiciste.
      let doneSet = new Set<number>();
      if (isToday) {
        try {
          const doneRows = await db.getAllAsync<any>(
            "SELECT DISTINCT id_mision FROM logs WHERE date(fecha_completada) = ?",
            [dateStr]
          );
          doneSet = new Set((doneRows || []).map((r) => r.id_mision));
        } catch (e) { console.error('Error cargando completadas de hoy:', e); }
      }

      const eventsForDay = missions.filter(m => {
        const creada = m.fecha_creacion ? String(m.fecha_creacion).split('T')[0] : null;
        if (creada && creada > dateStr) return false;
        // Respetar los dias asignados primero (diaria/semanal/arco con dias marcados):
        // una mision solo cae en los dias de la semana que tiene seleccionados.
        if (m.dias_repeticion && String(m.dias_repeticion).trim().length > 0) {
          const daysArray = String(m.dias_repeticion).split(',').map(d => parseInt(d.trim(), 10)).filter(d => !isNaN(d));
          return daysArray.includes(jsDayOfWeek);
        }
        // Diaria sin dias explicitos o marcada EVERY_DAY -> cada dia.
        if (m.tipo === 'DIARIA' || m.frecuencia_repeticion === 'EVERY_DAY') return true;
        // Una-vez con fecha limite -> solo ese dia.
        if (m.fecha_expiracion) {
          const missionDatePart = String(m.fecha_expiracion).split('T')[0];
          return missionDatePart === dateStr;
        }
        return false;
      }).map(m => ({ ...m, _done: doneSet.has(m.id_mision) }));
      setDayMode('planned');
      setDayMissions(eventsForDay as Mision[]);
    }

    setSelectedDate(dateStr);
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
        <View style={styles.modeRow}>
          <View style={[styles.modeDot, { backgroundColor: dayMode === 'done' ? theme.success : avatarColor }]} />
          <Text style={[styles.modeLabel, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>
            {dayMode === 'done' ? 'COMPLETADAS ESTE DÍA' : 'PROGRAMADAS'}
          </Text>
        </View>
        {!!selectedDate && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              const f = selectedDate;
              setModalVisible(false);
              setSelectedDate(null);
              navigation.navigate('DiaryEntry', { fecha: f });
            }}
            style={[styles.diaryRow, { borderColor: theme.secondary, backgroundColor: theme.background }]}
          >
            <Ionicons name="book-outline" size={16} color={theme.secondary} />
            <Text style={[styles.diaryText, { color: theme.text, fontFamily: theme.fonts?.bold }]}>
              {diasEscritos.has(selectedDate) ? 'VER LA ENTRADA DEL DIARIO' : 'ESCRIBIR ESTE DÍA'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={theme.textDim} />
          </TouchableOpacity>
        )}

        <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
          {dayMissions.length === 0 ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ color: theme.textDim, fontStyle: 'italic', textAlign: 'center', fontFamily: theme.fonts?.body }}>
                {dayMode === 'done' ? 'No se completó ninguna misión este día.' : 'No hay misiones programadas para este día.'}
              </Text>
            </View>
          ) : (
            dayMissions.map((m, index) => {
              // En dias pasados todo lo listado es real (completado). En HOY,
              // marcamos las que ya hiciste con _done.
              const hecha = dayMode === 'done' || (m as any)._done;
              const accent = hecha ? theme.success : avatarColor;
              return (
                <View key={m.id_mision || index} style={[styles.missionRow, { backgroundColor: theme.background, borderColor: theme.border, opacity: hecha && dayMode !== 'done' ? 0.7 : 1 }]}>
                  <View style={[styles.missionAccent, { backgroundColor: accent }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.missionTitle, { color: theme.text, fontFamily: theme.fonts?.bold }]} numberOfLines={1}>{m.nombre}</Text>
                    <View style={styles.missionMetaRow}>
                      <Text style={[styles.missionType, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>{m.tipo}</Text>
                      {hecha && (
                        <View style={styles.doneTag}>
                          <Ionicons name="checkmark-circle" size={13} color={theme.success} />
                          <Text style={[styles.doneTagText, { color: theme.success, fontFamily: theme.fonts?.condensed }]}>HECHA</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Text style={[styles.missionXp, { color: accent, fontFamily: theme.fonts?.display }]}>+{m.recompensa_exp || 0}</Text>
                </View>
              );
            })
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

  diaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderLeftWidth: 6, paddingVertical: 11, paddingHorizontal: 12, marginBottom: 14 },
  diaryText: { flex: 1, fontSize: 13, letterSpacing: 0.5 },
  modeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginTop: 2 },
  modeDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8, transform: [{ skewX: '-12deg' }] },
  modeLabel: { fontSize: 12, letterSpacing: 1.5 },

  missionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingLeft: 18, paddingRight: 12, borderLeftWidth: 6, marginBottom: 10, overflow: 'hidden' },
  missionAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, transform: [{ skewX: '-12deg' }], marginLeft: -2 },
  missionTitle: { fontSize: 15 },
  missionMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 8 },
  missionType: { fontSize: 11, letterSpacing: 0.5 },
  doneTag: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  doneTagText: { fontSize: 10, letterSpacing: 1 },
  missionXp: { fontSize: 22, marginLeft: 10 },

  closeBtn: { marginTop: 14, paddingVertical: 13, alignItems: 'center', alignSelf: 'center', paddingHorizontal: 40, transform: [{ skewX: '-12deg' }] },
  closeBtnText: { fontSize: 15, letterSpacing: 1, transform: [{ skewX: '12deg' }] },
});
