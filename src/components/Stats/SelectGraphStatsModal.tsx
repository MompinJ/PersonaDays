import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PersonaModal } from '../UI/PersonaModal';
import { StatViewData } from '../../hooks/usePlayerStats';

interface Props {
  visible: boolean;
  allStats: StatViewData[];
  currentSelection: number[];
  onClose: () => void;
  onSave: (ids: number[]) => void;
}



import { useTheme } from '../../themes/useTheme';
import { useAlert } from '../../context/AlertContext';

export const SelectGraphStatsModal = ({ visible, allStats, currentSelection, onClose, onSave }: Props) => {
  const [selected, setSelected] = useState<number[]>([]);
  const colors = useTheme();
  const { showAlert } = useAlert();

  useEffect(() => {
    if (!visible) return;

    // 1. Sanitizar: Filtrar IDs que ya no existen en allStats
    const validSelection = currentSelection ? currentSelection.filter(id => allStats.some(s => s.id_stat === id)) : [];

    // 2. Aplicar lógica de selección
    if (validSelection.length >= 3) {
      setSelected(validSelection);
      return;
    } else {
      // Fallback: Si después de limpiar quedan menos de 3, selecciona los primeros disponibles
      const desired = Math.min(5, Math.max(3, allStats.length));
      const fallback = allStats.slice(0, desired).map(s => s.id_stat);
      setSelected(fallback);
    }
  }, [visible, allStats, currentSelection]);

  const toggleStat = (id: number) => {
    if (selected.includes(id)) {
      setSelected(selected.filter(s => s !== id));
    } else {
      // No imponemos un tope superior; permitir seleccionar tantos como el usuario desee.
      setSelected([...selected, id]);
    }
  };

  const handleSave = () => {
    if (selected.length < 3) {
      showAlert('Atención', 'El gráfico necesita al menos 3 atributos para visualizarse.');
      return;
    }
    onSave(selected);
    onClose();
  };

  return (
    <PersonaModal visible={visible} onClose={onClose} title="CONFIGURAR GRÁFICO">
          <Text style={[styles.subtitle, { color: colors.textDim }]}>Seleccionados: {selected.length} (Mínimo 3)</Text>
          
          <FlatList
            data={allStats}
            keyExtractor={item => item.id_stat.toString()}
            style={{ maxHeight: 400 }}
            renderItem={({ item }) => {
              const isSelected = selected.includes(item.id_stat);
              return (
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[styles.item, isSelected && { backgroundColor: colors.primary }, { borderBottomColor: colors.border }]}
                  onPress={() => toggleStat(item.id_stat)}
                >
                  <Text style={[styles.text, { fontFamily: colors.fonts?.bold }, isSelected ? { color: colors.textInverse } : { color: colors.text }]}>
                    {item.nombre_stat}
                  </Text>
                  {isSelected && <Ionicons name="checkmark-circle" size={18} color={colors.textInverse} />}
                </TouchableOpacity>
              );
            }}
          />

          <View style={styles.buttons}>
            <TouchableOpacity onPress={onClose} style={styles.btnCancel}><Text style={[styles.txtCancel, { color: colors.textDim, fontFamily: colors.fonts?.bold, letterSpacing: 1 }]}>CANCELAR</Text></TouchableOpacity>
            <TouchableOpacity onPress={handleSave} activeOpacity={0.9} style={[styles.btnSave, { backgroundColor: colors.primary }]}><Text style={[styles.txtSave, { color: colors.textInverse, fontFamily: colors.fonts?.heading, transform: [{ skewX: '12deg' }] }]}>APLICAR</Text></TouchableOpacity>
          </View>
    </PersonaModal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  container: { borderWidth: 2, borderRadius: 6, padding: 20, paddingTop: 24, overflow: 'hidden' },
  topAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 5 },
  title: { fontSize: 20, fontWeight: '900', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 1 },
  subtitle: { marginBottom: 15, fontSize: 12 },
  item: { padding: 12, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between' },
  itemSelected: {},
  text: {  },
  textSelected: {  },
  buttons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, gap: 10 },
  btnCancel: { padding: 10 },
  txtCancel: {  },
  btnSave: { paddingVertical: 12, paddingHorizontal: 24, transform: [{ skewX: '-12deg' }] },
  txtSave: { fontWeight: 'bold', letterSpacing: 1 }
});
