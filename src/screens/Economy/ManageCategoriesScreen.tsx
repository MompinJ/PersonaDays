import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../themes/useTheme';
import { db } from '../../database';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAlert } from '../../context/AlertContext';

export const ManageCategoriesScreen = () => {
  const theme = useTheme();
  const { showAlert } = useAlert();

  const [categories, setCategories] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('tag');
  const [selectedColor, setSelectedColor] = useState('#FF5252');
  const [tipo, setTipo] = useState<'GASTO' | 'INGRESO'>('GASTO');

  const palette = ['#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800', '#FF5722', '#795548', '#9E9E9E', '#607D8B'];

  const iconsList = ['food', 'bus', 'car', 'cart', 'shopping', 'gamepad-variant', 'movie', 'home', 'hospital-box', 'school', 'book-open-variant', 'gift', 'cash', 'credit-card', 'bank', 'tools', 'airplane', 'paw', 'tshirt-crew', 'glass-cocktail'];

  const load = async () => {
    try {
      const rows: any[] = await db.getAllAsync('SELECT * FROM financial_categories ORDER BY tipo, nombre ASC');
      setCategories(rows || []);
    } catch (e) {
      console.error('Error cargando categorías', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const handleAdd = async () => {
    if (!name || name.trim().length === 0) {
      showAlert('ERROR', 'El nombre es requerido');
      return;
    }
    if (!selectedIcon) {
      showAlert('ERROR', 'Selecciona un icono');
      return;
    }
    if (!selectedColor) {
      showAlert('ERROR', 'Selecciona un color');
      return;
    }

    try {
      await db.runAsync('INSERT INTO financial_categories (nombre, icono, color, tipo) VALUES (?, ?, ?, ?)', [name.trim(), selectedIcon, selectedColor, tipo]);
      setName(''); setSelectedIcon('tag'); setSelectedColor('#FF5252'); setTipo('GASTO');
      load();
      showAlert('Hecho', 'Categoría creada');
    } catch (e) {
      console.error('Error agregando categoría', e);
      showAlert('ERROR', 'No se pudo agregar la categoría');
    }
  };

  const handleDelete = (id: number) => {
    showAlert('Confirmar', '¿Eliminar esta categoría?', [
      { text: 'CANCELAR', style: 'cancel' },
      { text: 'ELIMINAR', style: 'destructive', onPress: async () => {
        try {
          await db.runAsync('DELETE FROM financial_categories WHERE id_categoria = ?', [id]);
          load();
          showAlert('Hecho', 'Categoría eliminada');
        } catch (e) {
          console.error('Error eliminando categoría', e);
          showAlert('ERROR', 'No se pudo eliminar la categoría');
        }
      } }
    ]);
  };

  const renderItem = ({ item }: any) => (
    <View style={[styles.row, { borderColor: theme.border }]}> 
      <View style={[styles.leftCircle, { backgroundColor: item.color || '#eee' }]}> 
        <MaterialCommunityIcons name={item.icono || 'tag'} size={20} color="#fff" />
      </View>

      <View style={styles.center}> 
        <Text style={[styles.name, { color: theme.text }]}>{item.nombre}</Text>
        <Text style={[styles.sub, { color: theme.textDim }]}>{item.tipo}</Text>
      </View>

      <TouchableOpacity onPress={() => handleDelete(item.id_categoria)} style={styles.deleteBtn}>
        <MaterialCommunityIcons name="trash-can" size={22} color={theme.error} />
      </TouchableOpacity>
    </View>
  );

  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top + 10 }]}> 
      <View style={styles.topHeader}>
        <Text style={[styles.title, { color: theme.text, fontFamily: theme.fonts?.title }]}>CATEGORÍAS</Text>
      </View>

      <View style={{ paddingHorizontal: 18 }}>
        <View style={styles.form}>
          <TextInput placeholder="Nombre de la categoría" placeholderTextColor={theme.textDim} value={name} onChangeText={setName} style={[styles.input, { color: theme.text, borderBottomColor: theme.border }]} />

          <View style={styles.typeRow}>
            <TouchableOpacity onPress={() => setTipo('GASTO')} style={[styles.tag, tipo === 'GASTO' ? { backgroundColor: theme.primary } : { borderColor: theme.primary }]}>
              <Text style={[styles.tagText, tipo === 'GASTO' ? { color: '#fff' } : { color: theme.primary }]}>GASTO</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setTipo('INGRESO')} style={[styles.tag, tipo === 'INGRESO' ? { backgroundColor: theme.primary } : { borderColor: theme.primary }, { marginLeft: 12 }]}>
              <Text style={[styles.tagText, tipo === 'INGRESO' ? { color: '#fff' } : { color: theme.primary }]}>INGRESO</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>Color</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12 }}>
            {palette.map((c) => (
              <TouchableOpacity key={c} onPress={() => setSelectedColor(c)} style={[styles.colorDotHorizontal, { backgroundColor: c }, selectedColor === c ? styles.colorSelected : null]}>
                {selectedColor === c && <MaterialCommunityIcons name="check" size={14} color="#fff" />}
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>Icono</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12 }}>
            {iconsList.map((ic) => (
              <TouchableOpacity key={ic} onPress={() => setSelectedIcon(ic)} style={[styles.iconChoiceHorizontal, selectedIcon === ic ? { borderColor: theme.primary, backgroundColor: theme.primary } : { borderColor: theme.border }]}>
                <MaterialCommunityIcons name={ic as any} size={20} color={selectedIcon === ic ? '#fff' : theme.text} />
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity onPress={handleAdd} style={[styles.saveBtn, { backgroundColor: theme.primary, marginTop: 10 }]}>
            <Text style={{ color: '#fff', fontWeight: '900' }}>Guardar Categoría</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ paddingHorizontal: 18, flex: 1 }}>
        <Text style={[styles.sectionHeader, { color: theme.text }]}>Categorías existentes</Text>
        <FlatList data={categories} keyExtractor={(i) => String(i.id_categoria)} renderItem={renderItem} contentContainerStyle={{ paddingBottom: 24 }} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  topHeader: { paddingHorizontal: 18, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  form: { padding: 12, borderRadius: 10, backgroundColor: 'transparent' },
  typeRow: { flexDirection: 'row', marginBottom: 12 },
  tag: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1 },
  tagText: { fontWeight: '900' },
  input: { paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 2, borderRadius: 4, marginBottom: 12 },
  sectionTitle: { fontWeight: '800', marginTop: 8, marginBottom: 8 },
  paletteRow: { flexDirection: 'row', flexWrap: 'wrap' },
  colorDot: { width: 36, height: 36, borderRadius: 18, margin: 6, justifyContent: 'center', alignItems: 'center' },
  colorSelected: { borderWidth: 3, borderColor: '#fff' },
  // horizontal variants
  colorDotHorizontal: { width: 40, height: 40, borderRadius: 20, marginHorizontal: 8, justifyContent: 'center', alignItems: 'center' },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  iconChoice: { width: 48, height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center', margin: 6, borderWidth: 1 },
  iconChoiceHorizontal: { width: 52, height: 52, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginHorizontal: 8, borderWidth: 1 },
  saveBtn: { padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  sectionHeader: { paddingHorizontal: 18, fontWeight: '900', marginTop: 6 },

  // Row styles
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1 },
  leftCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  center: { flex: 1, marginLeft: 12 },
  name: { fontWeight: '800', fontSize: 16 },
  sub: { fontSize: 12, marginTop: 2 },
  deleteBtn: { padding: 8 }
});

export default ManageCategoriesScreen;
