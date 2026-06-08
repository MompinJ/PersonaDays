import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../themes/useTheme';
import { db } from '../../database';
import { getPlayer } from '../../services/playerService';
import { useAlert } from '../../context/AlertContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getContrastText } from '../../utils/colorUtils';
import { PersonaModal } from '../UI/PersonaModal';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

const AddTransactionModal = ({ visible, onClose, onSaved }: Props) => {
  const colors = useTheme();
  const { showAlert } = useAlert();
  const [monto, setMonto] = useState('');
  const [tipo, setTipo] = useState<'INGRESO' | 'GASTO'>('GASTO');
  const [concepto, setConcepto] = useState('');
  const [categoria, setCategoria] = useState<number | null>(null);
  const [categories, setCategories] = useState<any[]>([]);

  const loadCategories = async () => {
    try {
      const rows: any[] = await db.getAllAsync('SELECT * FROM financial_categories WHERE tipo = ? ORDER BY nombre ASC', [tipo]);
      setCategories(rows || []);
      if ((!categoria || categoria === null) && rows && rows.length > 0) setCategoria(rows[0].id_categoria);
    } catch (e) {
      console.error('Error cargando categorías', e);
    }
  };

  useEffect(() => {
    if (visible) loadCategories();
  }, [visible, tipo]);

  const save = async () => {
    const valor = parseFloat(monto.replace(',', '.')) || 0;
    // Validaciones
    if (!valor || valor <= 0) {
      showAlert('ERROR', 'Ingresa un monto válido mayor a 0.');
      return;
    }
    if (!concepto || concepto.trim().length === 0) {
      showAlert('FALTA INFORMACIÓN', 'Debes escribir un concepto o descripción.');
      return;
    }
    if (!categoria) {
      showAlert('FALTA CATEGORÍA', 'Selecciona una categoría para clasificar el movimiento.');
      return;
    }

    try {
      const fecha = new Date().toISOString().replace('T', ' ').slice(0, 19);
      const selectedCat = categories.find((c) => c.id_categoria === categoria);
      const categoriaNombre = selectedCat ? selectedCat.nombre : null;
      await db.runAsync('INSERT INTO finanzas (tipo, monto, categoria, descripcion, fecha) VALUES (?, ?, ?, ?, ?)', [tipo, valor, categoriaNombre, concepto, fecha]);

      // Otorgar +2 XP al stat Conocimiento (buscando por nombre, no insertando stat nuevo)
      const player = await getPlayer();
      if (player && player.id_jugador) {
        try {
          const statRows: any[] = await db.getAllAsync('SELECT id_stat FROM stats WHERE nombre = ? LIMIT 1', ['Conocimiento']);
          if (statRows && statRows.length > 0) {
            const idStat = statRows[0].id_stat;
            const jsRows: any[] = await db.getAllAsync('SELECT id_jugador_stat FROM jugador_stat WHERE id_jugador = ? AND id_stat = ? LIMIT 1', [player.id_jugador, idStat]);
            if (jsRows && jsRows.length > 0) {
              await db.runAsync('UPDATE jugador_stat SET experiencia_actual = experiencia_actual + ? WHERE id_stat = ? AND id_jugador = ?', [2, idStat, player.id_jugador]);
            } else {
              // Crear vínculo jugador_stat si no existe (no crear stat por nombre)
              await db.runAsync('INSERT INTO jugador_stat (id_jugador, id_stat, nivel_actual, experiencia_actual, nivel_maximo) VALUES (?, ?, 1, ?, 99)', [player.id_jugador, idStat, 2]);
            }
          } else {
            console.warn('Stat "Conocimiento" no encontrada. No se otorgó XP.');
          }
        } catch (e) {
          console.error('Error otorgando XP:', e);
        }
      }

      // Mostrar alerta de éxito y cerrar modal solo cuando el usuario confirme
      showAlert('REGISTRO COMPLETADO', 'Transacción guardada. \n+2 XP Conocimiento 🧠', [
        { text: 'OK', onPress: () => {
            // limpiar y cerrar
            setMonto(''); setConcepto(''); setCategoria(null); setTipo('GASTO');
            onSaved && onSaved();
            onClose();
          } }
      ]);

    } catch (e) {
      console.error('Error guardando transacción', e);
      showAlert('ERROR', 'No se pudo guardar la transacción');
    }
  };

  return (
    <PersonaModal visible={visible} onClose={onClose} title="NUEVO MOVIMIENTO">
          <View style={styles.row}>
            <TouchableOpacity style={[styles.typeButton, tipo === 'INGRESO' ? { backgroundColor: '#2ecc71' } : { backgroundColor: colors.inactive }]} onPress={() => setTipo('INGRESO')}>
              <Text style={[styles.typeText, { color: tipo === 'INGRESO' ? '#fff' : colors.textDim }]}>INGRESO</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.typeButton, tipo === 'GASTO' ? { backgroundColor: '#e74c3c' } : { backgroundColor: colors.inactive }]} onPress={() => setTipo('GASTO')}>
              <Text style={[styles.typeText, { color: tipo === 'GASTO' ? '#fff' : colors.textDim }]}>GASTO</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            keyboardType="numeric"
            placeholder="¥ 0"
            placeholderTextColor={colors.textDim}
            style={[styles.montoInput, { color: colors.text, borderBottomColor: colors.primary, fontFamily: colors.fonts?.display }]}
            value={monto}
            onChangeText={setMonto}
          />

          <TextInput
            placeholder="Concepto (ej: Cine, Nómina)"
            placeholderTextColor={colors.textDim}
            style={[styles.input, { color: colors.text }]}
            value={concepto}
            onChangeText={setConcepto}
          />

          <View style={styles.catRow}>
            {categories && categories.length > 0 ? categories.map((c) => {
              const selected = categoria === c.id_categoria;
              const chipText = selected ? getContrastText(c.color) : colors.text;
              return (
              <TouchableOpacity key={c.id_categoria} onPress={() => setCategoria(c.id_categoria)} style={[styles.catBtn, selected ? { borderColor: colors.primary, backgroundColor: c.color } : { borderColor: colors.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons name={c.icono || 'tag'} size={18} color={chipText} />
                  <Text style={{ color: chipText, marginLeft: 8 }}>{c.nombre}</Text>
                </View>
              </TouchableOpacity>
              );
            }) : (
              <View style={{ padding: 8 }}>
                <Text style={{ color: colors.textDim }}>No hay categorías. Crea una en ajustes.</Text>
              </View>
            )}

          </View>

          <View style={styles.actions}>
            <TouchableOpacity onPress={onClose} style={[styles.actionBtn, { backgroundColor: colors.inactive }]}>
              <Text style={{ color: colors.text }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={save} style={[styles.actionBtn, { backgroundColor: colors.primary }]}>
              <Text style={{ color: colors.textInverse }}>Guardar</Text>
            </TouchableOpacity>
          </View>
    </PersonaModal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  container: { width: '92%', borderRadius: 12, padding: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  titleAccent: { width: 6, height: 22, marginRight: 10, transform: [{ skewX: '-20deg' }] },
  title: { fontSize: 22, fontWeight: '900', letterSpacing: 1.5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  typeButton: { flex: 1, marginHorizontal: 6, padding: 12, borderRadius: 8, alignItems: 'center' },
  typeText: { fontWeight: '700', color: '#fff' },
  montoInput: { fontSize: 28, fontWeight: '900', textAlign: 'center', padding: 8, marginBottom: 8, borderBottomWidth: 2 },
  input: { padding: 10, borderRadius: 8, marginBottom: 8 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 8 },
  catBtn: { padding: 8, borderRadius: 8, borderWidth: 1, margin: 4 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  actionBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, marginLeft: 8 }
});

export default AddTransactionModal;
