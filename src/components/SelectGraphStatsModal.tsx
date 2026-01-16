import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { StatViewData } from '../hooks/usePlayerStats';

interface Props {
  visible: boolean;
  allStats: StatViewData[];
  currentSelection: number[];
  onClose: () => void;
  onSave: (ids: number[]) => void;
}



import { useTheme } from '../themes/useTheme';

export const SelectGraphStatsModal = ({ visible, allStats, currentSelection, onClose, onSave }: Props) => {
  const [selected, setSelected] = useState<number[]>([]);
  const colors = useTheme();

  useEffect(() => {
    if (visible) setSelected(currentSelection && currentSelection.length === 5 ? currentSelection : [1,5,3,4,2]);
  }, [visible]);

  const toggleStat = (id: number) => {
    if (selected.includes(id)) {
      setSelected(selected.filter(s => s !== id));
    } else {
      if (selected.length >= 5) {
        alert('El gráfico pentagonal solo soporta 5 stats.');
        return;
      }
      setSelected([...selected, id]);
    }
  };

  const handleSave = () => {
    if (selected.length !== 5) {
      alert('Por favor selecciona exactamente 5 stats para formar el pentágono.');
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
          <Text style={[styles.subtitle, { color: colors.textDim }]}>Selecciona 5 stats para visualizar ({selected.length}/5)</Text>
          
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
