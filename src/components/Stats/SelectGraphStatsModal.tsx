import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
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
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.background, borderColor: colors.primary }]}>
          <Text style={[styles.title, { color: colors.text }]}>CONFIGURAR GRÁFICO</Text>
          <Text style={[styles.subtitle, { color: colors.textDim }]}>Seleccionados: {selected.length} (Mínimo 3)</Text>
          
          <FlatList
            data={allStats}
            keyExtractor={item => item.id_stat.toString()}
            style={{ maxHeight: 400 }}
            renderItem={({ item }) => {
              const isSelected = selected.includes(item.id_stat);
              return (
                <TouchableOpacity 
                  style={[styles.item, isSelected && { backgroundColor: colors.primary }, { borderBottomColor: colors.border }]}
                  onPress={() => toggleStat(item.id_stat)}
                >
                  <Text style={[styles.text, isSelected ? { color: colors.background, fontWeight: 'bold' } : { color: colors.text }]}>
                    {item.nombre_stat}
                  </Text>
                  {isSelected && <Text style={{color: colors.background}}>✓</Text>}
                </TouchableOpacity>
              );
            }}
          />

          <View style={styles.buttons}>
            <TouchableOpacity onPress={onClose} style={styles.btnCancel}><Text style={[styles.txtCancel, { color: colors.textDim }]}>CANCELAR</Text></TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={[styles.btnSave, { backgroundColor: colors.primary }]}><Text style={[styles.txtSave, { color: colors.background }]}>APLICAR</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  container: { borderWidth: 1, padding: 20 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  subtitle: { marginBottom: 15, fontSize: 12 },
  item: { padding: 12, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between' },
  itemSelected: {},
  text: {  },
  textSelected: {  },
  buttons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, gap: 10 },
  btnCancel: { padding: 10 },
  txtCancel: {  },
  btnSave: { padding: 10, borderRadius: 2 },
  txtSave: { fontWeight: 'bold' }
});
