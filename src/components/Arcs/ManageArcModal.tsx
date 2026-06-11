import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { useAlert } from '../../context/AlertContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../themes/useTheme';
import { db } from '../../database';
import { PersonaModal } from '../UI/PersonaModal';
import { getContrastText } from '../../utils/colorUtils';

const COLORS = ['#00D4FF', '#FF4D4F', '#28A745', '#FFC107', '#7B2CBF', '#FF7AC6', '#FF9800'];

const ManageArcModal = ({ visible, arc, onClose, onSaved }: { visible: boolean; arc: any | null; onClose: () => void; onSaved?: () => void }) => {
  const theme = useTheme();
  const { showAlert } = useAlert();
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [statRel, setStatRel] = useState<number | null>(null);
  const [statsOptions, setStatsOptions] = useState<Array<{ id_stat: number; nombre: string }>>([]);

  const [showPickerStart, setShowPickerStart] = useState(false);
  const [showPickerEnd, setShowPickerEnd] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());

  useEffect(() => {
    const loadStats = async () => {
      try {
        const rows: any[] = await db.getAllAsync('SELECT id_stat, nombre FROM stats ORDER BY id_stat');
        setStatsOptions(rows || []);
      } catch (e) {
        console.error('Error cargando stats para selector:', e);
      }
    };
    loadStats();
    if (arc) {
      setNombre(arc.nombre || '');
      setDescripcion(arc.descripcion || '');
      setFechaInicio(arc.fecha_inicio || '');
      setFechaFin(arc.fecha_fin || '');
      setColor(arc.color_hex || COLORS[0]);
      setStatRel(arc.id_stat_relacionado || null);
    } else {
      setNombre(''); setDescripcion(''); setFechaInicio(''); setFechaFin(''); setColor(theme.primary); setStatRel(null);
    }
  }, [arc, visible]);

  // Opciones de color: el color del personaje primero, luego la paleta fija
  const colorOptions = [theme.primary, ...COLORS.filter((c) => c.toLowerCase() !== theme.primary.toLowerCase())];

  const isCompleted = !!(arc && arc.estado === 'COMPLETADO');

  const save = async () => {
    if (isCompleted) return;
    if (!nombre || !fechaInicio) {
      showAlert('ATENCIÓN', 'Nombre y fecha de inicio son requeridos');
      return;
    }
    try {
      if (arc && arc.id_arco) {
        await db.runAsync('UPDATE arcos SET nombre = ?, descripcion = ?, fecha_inicio = ?, fecha_fin = ?, color_hex = ?, id_stat_relacionado = ? WHERE id_arco = ?', [nombre, descripcion, fechaInicio, fechaFin || null, color, statRel, arc.id_arco]);
      } else {
        await db.runAsync('INSERT INTO arcos (nombre, descripcion, fecha_inicio, fecha_fin, color_hex, id_stat_relacionado) VALUES (?, ?, ?, ?, ?, ?)', [nombre, descripcion, fechaInicio, fechaFin || null, color, statRel]);
      }
      if (onSaved) onSaved();
    } catch (e) {
      console.error('Error guardando arco:', e);
    }
  };

  return (
    <PersonaModal visible={visible} onClose={onClose} title={arc ? 'EDITAR ARCO' : 'NUEVO ARCO'}>
      <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
        <TextInput placeholder="TÍTULO DEL CAPÍTULO" placeholderTextColor={theme.textDim} value={nombre} onChangeText={setNombre} style={[styles.input, { color: theme.text, borderBottomColor: theme.primary }]} />
        <TextInput placeholder="Descripción" placeholderTextColor={theme.textDim} value={descripcion} onChangeText={setDescripcion} style={[styles.input, { color: theme.text, borderBottomColor: theme.border }]} />

        <View style={styles.dateRow}>
          <TouchableOpacity onPress={() => { if (!isCompleted) { setShowPickerStart(true); setTempDate(fechaInicio ? new Date(fechaInicio) : new Date()); } }} style={[styles.dateBtn, { borderColor: theme.primary }]}>
            <Ionicons name="calendar-outline" size={16} color={theme.primary} style={styles.unskew} />
            <Text style={[styles.dateText, { color: fechaInicio ? theme.text : theme.textDim }]}>{fechaInicio || 'INICIO'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { if (!isCompleted) { setShowPickerEnd(true); setTempDate(fechaFin ? new Date(fechaFin) : new Date()); } }} style={[styles.dateBtn, { borderColor: theme.border }]}>
            <Ionicons name="flag-outline" size={16} color={theme.textDim} style={styles.unskew} />
            <Text style={[styles.dateText, { color: fechaFin ? theme.text : theme.textDim }]}>{fechaFin || 'FIN'}</Text>
          </TouchableOpacity>
        </View>

        {showPickerStart && (
          <DateTimePicker value={tempDate} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(e, d) => { setShowPickerStart(false); if (d) setFechaInicio(d.toISOString().split('T')[0]); }} maximumDate={new Date(2100, 0, 1)} />
        )}
        {showPickerEnd && (
          <DateTimePicker value={tempDate} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(e, d) => { setShowPickerEnd(false); if (d) setFechaFin(d.toISOString().split('T')[0]); }} maximumDate={new Date(2100, 0, 1)} />
        )}

        <Text style={[styles.label, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>COLOR</Text>
        <View style={styles.colorRow}>
          {colorOptions.map((c) => (
            <TouchableOpacity key={c} onPress={() => setColor(c)} style={[styles.colorDot, { backgroundColor: c, borderColor: color === c ? theme.text : 'transparent' }]}>
              {color === c && <Ionicons name="checkmark" size={16} color={getContrastText(c)} />}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>STAT RELACIONADO (OPCIONAL)</Text>
        <View style={styles.statRow}>
          <StatChip label="NINGUNO" active={statRel === null} onPress={() => setStatRel(null)} skew={-12} />
          {statsOptions.map((s, i) => (
            <StatChip key={s.id_stat} label={s.nombre.toUpperCase()} active={statRel === s.id_stat} onPress={() => setStatRel(s.id_stat)} skew={[-14, 10, -11, 13, -16][i % 5]} />
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
          <Text style={{ color: theme.textDim, fontFamily: theme.fonts?.bold, letterSpacing: 1 }}>CANCELAR</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={isCompleted ? undefined : save} activeOpacity={0.9} style={[styles.skewBtn, { backgroundColor: isCompleted ? theme.inactive : theme.primary }]}>
          <Text style={[styles.skewBtnText, { color: isCompleted ? theme.textDim : theme.textInverse, fontFamily: theme.fonts?.heading }]}>{isCompleted ? 'NO EDITABLE' : 'GUARDAR'}</Text>
        </TouchableOpacity>
      </View>
    </PersonaModal>
  );
};

// Chip de stat inclinado (parallelogramo)
const StatChip = ({ label, active, onPress, skew }: { label: string; active: boolean; onPress: () => void; skew: number }) => {
  const theme = useTheme();
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[styles.statChip, { borderColor: theme.primary, backgroundColor: active ? theme.primary : theme.surface, transform: [{ skewX: `${skew}deg` }] }]}>
      <Text style={{ color: active ? theme.textInverse : theme.textDim, fontFamily: theme.fonts?.heading, fontSize: 12, transform: [{ skewX: `${-skew}deg` }] }}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  input: { borderBottomWidth: 2, paddingVertical: 9, marginTop: 10, fontSize: 16 },
  label: { fontSize: 11, marginTop: 18, marginBottom: 10, letterSpacing: 1, textTransform: 'uppercase' },

  dateRow: { flexDirection: 'row', gap: 12, marginTop: 14 },
  dateBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 14, borderWidth: 1.5, transform: [{ skewX: '-10deg' }] },
  dateText: { marginLeft: 8, fontSize: 13, letterSpacing: 0.5, transform: [{ skewX: '10deg' }] },
  unskew: { transform: [{ skewX: '10deg' }] },

  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorDot: { width: 36, height: 36, borderRadius: 18, borderWidth: 3, justifyContent: 'center', alignItems: 'center' },

  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statChip: { paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1.5 },

  footer: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 18 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 14, marginRight: 8 },
  skewBtn: { paddingVertical: 12, paddingHorizontal: 24, transform: [{ skewX: '-12deg' }] },
  skewBtnText: { fontSize: 15, letterSpacing: 1, textTransform: 'uppercase', transform: [{ skewX: '12deg' }] },
});

export default ManageArcModal;
