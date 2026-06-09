import React, { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { createCustomStat } from '../../database/statsHelpers';
import { useTheme } from '../../themes/useTheme';
import { PersonaModal } from '../UI/PersonaModal';
import { PersonaShard } from '../UI/PersonaShard';
import { getContrastText } from '../../utils/colorUtils';
import { StatIcon } from './StatIcon';
import { resolveStatKey } from './stats';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}



// Hardcodeamos los IDs de las stats base (según tu seed data)
const MAIN_STATS = [
  { id: 1, nombre: 'Conocimiento' },
  { id: 2, nombre: 'Coraje' },
  { id: 3, nombre: 'Destreza' },
  { id: 4, nombre: 'Gentileza' },
  { id: 5, nombre: 'Carisma' },
];

export const CreateStatModalNew = ({ visible, onClose, onSuccess }: Props) => {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);
  const [maxLevel, setMaxLevel] = useState('50'); // Default razonable para un hobby
  const [loading, setLoading] = useState(false);
  const colors = useTheme();

  const handleSave = async () => {
    if (!nombre.trim()) return;
    if (!selectedParentId) {
      alert('Debes seleccionar a qué Stat Social pertenece este hábito.');
      return;
    }

    setLoading(true);
    const levelCap = parseInt(maxLevel) || 99;

    const success = await createCustomStat(nombre.trim(), descripcion.trim(), selectedParentId, levelCap);
    setLoading(false);

    if (success) {
      setNombre('');
      setDescripcion('');
      setSelectedParentId(null);
      setMaxLevel('50');
      onSuccess();
      onClose();
    } else {
      alert('Ocurrió un error creando el stat. Revisa logs.');
    }
  };

  return (
    <PersonaModal visible={visible} onClose={onClose} title="NUEVO HÁBITO">
            <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
              {/* NOMBRE protagonista (banner diagonal) */}
              <View style={styles.tagWrap}><PersonaShard label="NOMBRE DEL HÁBITO" height={24} fontSize={11} /></View>
              <View style={[styles.nameCard, { backgroundColor: colors.background, borderColor: colors.primary }]}>
                <View style={[styles.nameAccent, { backgroundColor: colors.primary }]} />
                <View style={[styles.nameStripe, { backgroundColor: colors.secondary }]} />
                <TextInput
                  style={[styles.nameInput, { color: colors.text }]}
                  placeholder="EJ: PIANO, LEER, GYM..."
                  placeholderTextColor={colors.textDim}
                  value={nombre}
                  onChangeText={setNombre}
                />
              </View>

              {/* STAT padre - chips en zigzag */}
              <View style={styles.tagWrap}><PersonaShard label="¿A QUÉ STAT PERTENECE?" height={24} fontSize={11} /></View>
              <View style={styles.parentSelector}>
                {MAIN_STATS.map((stat, i) => {
                  const active = selectedParentId === stat.id;
                  const sk = [-14, 11, -16, 10, -12][i % 5];
                  const st = [0, 14, 4, 12, 2][i % 5];
                  const cc = i % 2 === 0 ? colors.primary : colors.secondary;
                  return (
                    <TouchableOpacity
                      key={stat.id}
                      activeOpacity={0.85}
                      style={[styles.parentButton, { marginTop: st, borderColor: cc, backgroundColor: active ? cc : colors.surface, transform: [{ skewX: `${sk}deg` }] }]}
                      onPress={() => setSelectedParentId(stat.id)}
                    >
                      <View style={[styles.parentBtnInner, { transform: [{ skewX: `${-sk}deg` }] }]}>
                        {(() => { const k = resolveStatKey(stat.nombre); return k ? <StatIcon stat={k} size={16} skew={0} color={active ? getContrastText(cc) : cc} /> : null; })()}
                        <Text style={[styles.parentButtonText, { color: active ? getContrastText(cc) : colors.textDim, fontFamily: colors.fonts?.heading, marginLeft: 7 }]}>
                          {stat.nombre}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* META DE NIVEL - numero grande */}
              <View style={styles.tagWrap}><PersonaShard label="META DE NIVEL" height={24} fontSize={11} /></View>
              <View style={styles.metaRow}>
                <TextInput
                  style={[styles.metaInput, { color: colors.primary, borderBottomColor: colors.primary, fontFamily: colors.fonts?.display }]}
                  value={maxLevel}
                  onChangeText={setMaxLevel}
                  keyboardType="numeric"
                  maxLength={3}
                />
                <Text style={[styles.helperText, { color: colors.textDim, fontFamily: colors.fonts?.condensed }]}>
                  AL LLEGAR A {maxLevel}, HARÁS PRESTIGIO
                </Text>
              </View>

              <View style={styles.tagWrap}><PersonaShard label="DESCRIPCIÓN" variant="ghost" height={22} fontSize={10} /></View>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderBottomColor: colors.border, color: colors.text }]}
                placeholder="Detalles..."
                placeholderTextColor={colors.textDim}
                value={descripcion}
                onChangeText={setDescripcion}
                multiline
                numberOfLines={2}
              />

              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                  <Text style={[styles.cancelText, { color: colors.textDim }]}>CANCELAR</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveButton, { backgroundColor: colors.primary, opacity: loading ? 0.5 : 1 }]}
                  onPress={handleSave}
                  disabled={loading}
                >
                  <Text style={[styles.saveText, { color: colors.textInverse, fontFamily: colors.fonts?.heading }]}>
                    {loading ? '...' : 'CREAR'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
    </PersonaModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  keyboardView: { width: '100%' },
  modalContainer: {
    borderWidth: 2,
    padding: 20,
    borderRadius: 4,
  },
  headerDecoration: {
    position: 'absolute', top: -10, left: 20,
    width: 60, height: 20,
  },
  title: {
    fontSize: 22, fontWeight: '900',
    fontStyle: 'italic', marginBottom: 20,
  },
  label: {
    fontSize: 10, fontWeight: 'bold',
    marginBottom: 8, letterSpacing: 1, marginTop: 10,
  },
  input: {
    borderBottomWidth: 2,
    fontSize: 16, paddingVertical: 8, paddingHorizontal: 12,
    marginBottom: 10,
  },
  textArea: { height: 60, textAlignVertical: 'top' },
  tagWrap: { marginTop: 16, marginBottom: 10 },
  nameCard: { borderRadius: 4, borderWidth: 2, paddingVertical: 14, paddingHorizontal: 16, paddingLeft: 24, minHeight: 56, justifyContent: 'center', overflow: 'hidden' },
  nameAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 10, transform: [{ skewX: '-14deg' }], marginLeft: -3 },
  nameStripe: { position: 'absolute', left: -20, right: -20, bottom: 7, height: 4, transform: [{ skewX: '-20deg' }], opacity: 0.85 },
  nameInput: { fontSize: 20, fontWeight: 'bold', letterSpacing: 0.5 },
  parentSelector: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'flex-start',
  },
  parentButton: {
    borderWidth: 1.5,
    paddingVertical: 7, paddingHorizontal: 14,
  },
  parentButtonSelected: {},
  parentBtnInner: { flexDirection: 'row', alignItems: 'center' },
  parentButtonText: { fontSize: 12, fontWeight: 'bold' },
  parentButtonTextSelected: {},
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  metaInput: { fontSize: 40, fontWeight: '900', borderBottomWidth: 2, minWidth: 72, textAlign: 'center', padding: 0, includeFontPadding: false },
  helperText: { flex: 1, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' },
  buttonRow: {
    flexDirection: 'row', justifyContent: 'flex-end',
    marginTop: 25, gap: 15,
  },
  cancelButton: { paddingVertical: 12, paddingHorizontal: 20 },
  cancelText: { fontWeight: 'bold' },
  saveButton: { paddingVertical: 12, paddingHorizontal: 30, transform: [{ skewX: '-20deg' }] },
  saveText: { fontWeight: 'bold', transform: [{ skewX: '20deg' }] }
});
