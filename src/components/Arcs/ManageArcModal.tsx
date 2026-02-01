import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { useAlert } from '../../context/AlertContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../themes/useTheme';
import { db } from '../../database';

const COLORS = ['#00D4FF', '#FF4D4F', '#28A745', '#FFC107', '#7B2CBF'];

const ManageArcModal = ({ visible, arc, onClose, onSaved }: { visible: boolean; arc: any | null; onClose: () => void; onSaved?: () => void }) => {
  const theme = useTheme();
  const { showAlert } = useAlert();
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [statRel, setStatRel] = useState<number | null>(null);
  const [statsOptions, setStatsOptions] = useState<Array<{id_stat:number; nombre:string}>>([]);
  const [isSubArc, setIsSubArc] = useState(false);

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
      setIsSubArc(!!arc.id_arco_padre);
    } else {
      setNombre(''); setDescripcion(''); setFechaInicio(''); setFechaFin(''); setColor(COLORS[0]); setStatRel(null); setIsSubArc(false);
    }

  }, [arc, visible]);

  const save = async () => {
    if (arc && arc.estado === 'COMPLETADO') {
      // Do not allow saving completed arcs
      return;
    }

    if (!nombre || !fechaInicio) {
      showAlert('ATENCIÓN', 'Nombre y fecha de inicio son requeridos');
      return;
    }

    try {
      if (arc && arc.id_arco) {
        const parentId = null;
        await db.runAsync('UPDATE arcos SET nombre = ?, descripcion = ?, fecha_inicio = ?, fecha_fin = ?, color_hex = ?, id_stat_relacionado = ?, id_arco_padre = ? WHERE id_arco = ?', [nombre, descripcion, fechaInicio, fechaFin || null, color, statRel, parentId, arc.id_arco]);
      } else {
        const parentId = null;
        await db.runAsync('INSERT INTO arcos (nombre, descripcion, fecha_inicio, fecha_fin, color_hex, id_stat_relacionado, id_arco_padre) VALUES (?, ?, ?, ?, ?, ?, ?)', [nombre, descripcion, fechaInicio, fechaFin || null, color, statRel, parentId]);
      }
      if (onSaved) onSaved();
    } catch (e) {
      console.error('Error guardando arco:', e);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.background, borderColor: theme.primary }]}> 
          <ScrollView>
            <Text style={[styles.title, { color: theme.primary }]}> {arc ? 'EDITAR ARCO' : 'NUEVO ARCO'}</Text>
            <TextInput placeholder="Título" placeholderTextColor={theme.textDim} value={nombre} onChangeText={setNombre} style={[styles.input, { color: theme.text, borderBottomColor: theme.border }]} />
            <TextInput placeholder="Descripción" placeholderTextColor={theme.textDim} value={descripcion} onChangeText={setDescripcion} style={[styles.input, { color: theme.text, borderBottomColor: theme.border }]} />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <TouchableOpacity onPress={() => { if (!arc || (arc && arc.estado !== 'COMPLETADO')) { setShowPickerStart(true); setTempDate(fechaInicio ? new Date(fechaInicio) : new Date()); } }} style={[styles.dateBtn, { borderColor: theme.border }]}> 
                <Text style={{ color: theme.text }}>{fechaInicio || 'Fecha inicio'}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { if (!arc || (arc && arc.estado !== 'COMPLETADO')) { setShowPickerEnd(true); setTempDate(fechaFin ? new Date(fechaFin) : new Date()); } }} style={[styles.dateBtn, { borderColor: theme.border }]}> 
                <Text style={{ color: theme.text }}>{fechaFin || 'Fecha fin'}</Text>
              </TouchableOpacity>
            </View>

            {showPickerStart && (
              <DateTimePicker value={tempDate} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(e,d)=>{ setShowPickerStart(false); if(d) setFechaInicio(d.toISOString().split('T')[0]); }} maximumDate={new Date(2100,0,1)} />
            )}
            {showPickerEnd && (
              <DateTimePicker value={tempDate} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(e,d)=>{ setShowPickerEnd(false); if(d) setFechaFin(d.toISOString().split('T')[0]); }} maximumDate={new Date(2100,0,1)} />
            )}

            <Text style={{ color: theme.text, marginTop: 8 }}>Color</Text>
            <View style={{ flexDirection: 'row', marginTop: 8 }}>
              {COLORS.map(c => (
                <TouchableOpacity key={c} onPress={() => setColor(c)} style={[styles.colorDot, { backgroundColor: c, borderColor: color === c ? theme.primary : 'transparent' }]} />
              ))}
            </View>

            <Text style={{ color: theme.text, marginTop: 12 }}>Stat Relacionado (opcional)</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              <TouchableOpacity onPress={() => setStatRel(null)} style={[styles.statBtn, { borderColor: statRel === null ? theme.primary : theme.border }]}> 
                <Text style={{ color: theme.text }}>Ninguno</Text>
              </TouchableOpacity>
              {statsOptions.map(s => (
                <TouchableOpacity key={s.id_stat} onPress={() => setStatRel(s.id_stat)} style={[styles.statBtn, { borderColor: statRel === s.id_stat ? theme.primary : theme.border }]}> 
                  <Text style={{ color: theme.text }}>{s.nombre}</Text>
                </TouchableOpacity>
              ))}
            </View>


            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20 }}>
              <TouchableOpacity onPress={onClose} style={{ padding: 10, marginRight: 10 }}><Text style={{ color: theme.textDim }}>CANCELAR</Text></TouchableOpacity>
              <TouchableOpacity onPress={ (arc && arc.estado === 'COMPLETADO') ? undefined : save } style={[styles.saveBtn, { backgroundColor: (arc && arc.estado === 'COMPLETADO') ? '#666' : theme.primary }]}><Text style={{ color: theme.textInverse }}>{ arc && arc.estado === 'COMPLETADO' ? 'NO EDITABLE' : 'GUARDAR' }</Text></TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  card: { padding: 16, borderWidth: 2, borderRadius: 8, maxHeight: '90%' },
  title: { fontSize: 16, fontWeight: '900', marginBottom: 8 },
  input: { borderBottomWidth: 1, paddingVertical: 8, marginTop: 8 },
  colorDot: { width: 36, height: 36, borderRadius: 18, marginRight: 8, borderWidth: 2 },
  statBtn: { padding: 8, borderWidth: 1, borderRadius: 6, marginRight: 8, marginBottom: 8 },
  saveBtn: { padding: 10, borderRadius: 6 },
  dateBtn: { padding: 10, borderWidth: 1, borderRadius: 6 }
});

export default ManageArcModal;
