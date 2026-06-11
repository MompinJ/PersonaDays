import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../themes/useTheme';
import { db } from '../../database';
import { getPlayer } from '../../services/playerService';
import { useAlert } from '../../context/AlertContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CategoryIcon, getCategory } from '../category-icons';
import { getContrastText } from '../../utils/colorUtils';
import { PersonaModal } from '../UI/PersonaModal';
import { PersonaShard } from '../UI/PersonaShard';

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
      showAlert('REGISTRO COMPLETADO', 'Transacción guardada. \n+2 XP Conocimiento', [
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

  const ingresoColor = colors.success;
  const gastoColor = colors.error;
  const tipoColor = tipo === 'INGRESO' ? ingresoColor : gastoColor;

  return (
    <PersonaModal visible={visible} onClose={onClose} title="NUEVO MOVIMIENTO">
          {/* TIPO - botones parallelogramo */}
          <View style={styles.tagWrap}><PersonaShard label="TIPO" height={22} fontSize={10} /></View>
          <View style={styles.typeRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.typeButton, { borderColor: ingresoColor, backgroundColor: tipo === 'INGRESO' ? ingresoColor : colors.surface, transform: [{ skewX: '-12deg' }] }]}
              onPress={() => setTipo('INGRESO')}
            >
              <Text style={[styles.typeText, { color: tipo === 'INGRESO' ? getContrastText(ingresoColor) : colors.textDim, fontFamily: colors.fonts?.heading, transform: [{ skewX: '12deg' }] }]}>INGRESO</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.typeButton, { borderColor: gastoColor, backgroundColor: tipo === 'GASTO' ? gastoColor : colors.surface, transform: [{ skewX: '-12deg' }] }]}
              onPress={() => setTipo('GASTO')}
            >
              <Text style={[styles.typeText, { color: tipo === 'GASTO' ? getContrastText(gastoColor) : colors.textDim, fontFamily: colors.fonts?.heading, transform: [{ skewX: '12deg' }] }]}>GASTO</Text>
            </TouchableOpacity>
          </View>

          {/* MONTO - protagonista, gigante */}
          <View style={styles.tagWrap}><PersonaShard label="MONTO" height={24} fontSize={11} color={tipoColor} /></View>
          <View style={[styles.montoCard, { backgroundColor: colors.background, borderColor: tipoColor }]}>
            <View style={[styles.montoAccent, { backgroundColor: tipoColor }]} />
            <View style={[styles.montoStripe, { backgroundColor: colors.secondary }]} />
            <Text style={[styles.yenSign, { color: tipoColor, fontFamily: colors.fonts?.display }]}>¥</Text>
            <TextInput
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.textDim}
              style={[styles.montoInput, { color: colors.text, fontFamily: colors.fonts?.display }]}
              value={monto}
              onChangeText={setMonto}
            />
          </View>

          {/* CONCEPTO */}
          <View style={styles.tagWrap}><PersonaShard label="CONCEPTO" variant="ghost" height={22} fontSize={10} /></View>
          <TextInput
            placeholder="EJ: CINE, NÓMINA..."
            placeholderTextColor={colors.textDim}
            style={[styles.input, { color: colors.text, borderBottomColor: colors.primary, fontFamily: colors.fonts?.bold }]}
            value={concepto}
            onChangeText={setConcepto}
          />

          {/* CATEGORÍA - chips caoticos (rotados + esquinados + escalonados) */}
          <View style={styles.tagWrap}><PersonaShard label="CATEGORÍA" height={22} fontSize={10} color={colors.secondary} /></View>
          <View style={styles.catRow}>
            {categories && categories.length > 0 ? categories.map((c, i) => {
              const selected = categoria === c.id_categoria;
              const chipText = selected ? getContrastText(c.color) : colors.text;
              const sk = [-14, 12, -16, 10, -13][i % 5];
              const rot = [-3, 2, -2, 3, -1][i % 5];
              const st = [0, 12, 4, 10, 2][i % 5];
              return (
              <TouchableOpacity
                key={c.id_categoria}
                activeOpacity={0.85}
                onPress={() => setCategoria(c.id_categoria)}
                style={[styles.catBtn, { marginTop: st, borderColor: selected ? c.color : colors.border, backgroundColor: selected ? c.color : colors.surface, transform: [{ rotate: `${rot}deg` }, { skewX: `${sk}deg` }] }]}
              >
                <View style={[styles.catInner, { transform: [{ skewX: `${-sk}deg` }] }]}>
                  <CategoryIcon category={getCategory(c.icono).key} size={18} skew={0} color={chipText} />
                  <Text style={{ color: chipText, marginLeft: 8, fontFamily: colors.fonts?.heading, fontSize: 14, letterSpacing: 0.5 }}>{c.nombre}</Text>
                </View>
              </TouchableOpacity>
              );
            }) : (
              <View style={{ padding: 8 }}>
                <Text style={{ color: colors.textDim, fontFamily: colors.fonts?.body }}>No hay categorías. Crea una en ajustes.</Text>
              </View>
            )}

          </View>

          {/* ACCIONES */}
          <View style={styles.actions}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={{ color: colors.textDim, fontFamily: colors.fonts?.bold, letterSpacing: 1 }}>CANCELAR</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={save} activeOpacity={0.9} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
              <Text style={[styles.saveBtnText, { color: colors.textInverse, fontFamily: colors.fonts?.heading }]}>GUARDAR</Text>
            </TouchableOpacity>
          </View>
    </PersonaModal>
  );
};

const styles = StyleSheet.create({
  tagWrap: { marginTop: 14, marginBottom: 10 },

  typeRow: { flexDirection: 'row', gap: 14 },
  typeButton: { flex: 1, paddingVertical: 13, borderWidth: 2, alignItems: 'center' },
  typeText: { fontSize: 16, letterSpacing: 1.5 },

  montoCard: { borderRadius: 4, borderWidth: 2, paddingVertical: 10, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  montoAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 10, transform: [{ skewX: '-14deg' }], marginLeft: -3 },
  montoStripe: { position: 'absolute', left: -20, right: -20, bottom: 9, height: 4, transform: [{ skewX: '-20deg' }], opacity: 0.85 },
  yenSign: { fontSize: 36, marginRight: 8 },
  montoInput: { flex: 1, fontSize: 44, padding: 0, includeFontPadding: false },

  input: { borderBottomWidth: 2, paddingVertical: 9, fontSize: 16, letterSpacing: 0.5 },

  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'flex-start', paddingTop: 4 },
  catBtn: { paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1.5 },
  catInner: { flexDirection: 'row', alignItems: 'center' },

  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 22 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 16, marginRight: 8 },
  saveBtn: { paddingVertical: 12, paddingHorizontal: 28, transform: [{ skewX: '-12deg' }] },
  saveBtnText: { fontSize: 16, letterSpacing: 1.5, transform: [{ skewX: '12deg' }] },
});

export default AddTransactionModal;
