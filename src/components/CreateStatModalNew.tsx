import React, { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { createCustomStat } from '../database/statsHelpers';
import { useTheme } from '../themes/useTheme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const THEME_COLOR = '#00D4FF';

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
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={[styles.modalContainer, { borderColor: colors.primary }]}>
            <View style={[styles.headerDecoration, { backgroundColor: colors.primary }]} />
            <Text style={styles.title}>NUEVO HÁBITO</Text>

            <ScrollView style={{ maxHeight: 500 }}>
              <Text style={[styles.label, { color: colors.primary }]}>NOMBRE DEL HÁBITO</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Tocar Piano, Leer, Gym..."
                placeholderTextColor="#666"
                value={nombre}
                onChangeText={setNombre}
              />

              <Text style={[styles.label, { color: colors.primary }]}>¿A QUÉ STAT PERTENECE?</Text>
              <View style={styles.parentSelector}>
                {MAIN_STATS.map((stat) => (
                  <TouchableOpacity
                    key={stat.id}
                    style={[
                      styles.parentButton,
                      selectedParentId === stat.id && { backgroundColor: colors.primary, borderColor: colors.primary }
                    ]}
                    onPress={() => setSelectedParentId(stat.id)}
                  >
                    <Text style={[
                      styles.parentButtonText,
                      selectedParentId === stat.id && styles.parentButtonTextSelected
                    ]}>
                      {stat.nombre}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: colors.primary }]}>META DE NIVEL (MAX)</Text>
              <View style={styles.rowInput}>
                <TextInput
                  style={[styles.input, { width: 80, textAlign: 'center' }]}
                  value={maxLevel}
                  onChangeText={setMaxLevel}
                  keyboardType="numeric"
                  maxLength={3}
                />
                <Text style={styles.helperText}>
                  (Al llegar a {maxLevel}, harás prestigio)
                </Text>
              </View>

              <Text style={[styles.label, { color: colors.primary }]}>DESCRIPCIÓN (Opcional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Detalles..."
                placeholderTextColor="#666"
                value={descripcion}
                onChangeText={setDescripcion}
                multiline
                numberOfLines={2}
              />

              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                  <Text style={styles.cancelText}>CANCELAR</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveButton, { backgroundColor: colors.primary, opacity: loading ? 0.5 : 1 }]}
                  onPress={handleSave}
                  disabled={loading}
                >
                  <Text style={[styles.saveText, { color: colors.background }]}>
                    {loading ? '...' : 'CREAR'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
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
    backgroundColor: '#0A1628',
    borderWidth: 2,
    borderColor: THEME_COLOR,
    padding: 20,
    borderRadius: 4,
  },
  headerDecoration: {
    position: 'absolute', top: -10, left: 20,
    width: 60, height: 20, backgroundColor: THEME_COLOR,
  },
  title: {
    color: '#FFF', fontSize: 22, fontWeight: '900',
    fontStyle: 'italic', marginBottom: 20,
  },
  label: {
    color: THEME_COLOR, fontSize: 10, fontWeight: 'bold',
    marginBottom: 8, letterSpacing: 1, marginTop: 10,
  },
  input: {
    backgroundColor: '#112', borderBottomWidth: 2,
    borderBottomColor: '#444', color: '#FFF',
    fontSize: 16, paddingVertical: 8, paddingHorizontal: 12,
    marginBottom: 10,
  },
  textArea: { height: 60, textAlignVertical: 'top' },
  parentSelector: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  parentButton: {
    borderWidth: 1, borderColor: '#444',
    paddingVertical: 6, paddingHorizontal: 12,
    borderRadius: 20,
  },
  parentButtonSelected: {
    backgroundColor: THEME_COLOR, borderColor: THEME_COLOR,
  },
  parentButtonText: { color: '#888', fontSize: 12, fontWeight: 'bold' },
  parentButtonTextSelected: { color: '#000' },
  rowInput: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  helperText: { color: '#666', fontSize: 12, fontStyle: 'italic' },
  buttonRow: {
    flexDirection: 'row', justifyContent: 'flex-end',
    marginTop: 25, gap: 15,
  },
  cancelButton: { paddingVertical: 12, paddingHorizontal: 20 },
  cancelText: { color: '#888', fontWeight: 'bold' },
  saveButton: {
    backgroundColor: THEME_COLOR, paddingVertical: 12,
    paddingHorizontal: 30, transform: [{ skewX: '-20deg' }]
  },
  saveText: {
    color: '#000', fontWeight: 'bold', transform: [{ skewX: '20deg' }]
  }
});
