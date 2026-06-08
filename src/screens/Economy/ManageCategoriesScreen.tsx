import React, { useCallback, useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, ScrollView, Animated, Easing } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../themes/useTheme';
import { db } from '../../database';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAlert } from '../../context/AlertContext';
import { getContrastText } from '../../utils/colorUtils';
import { PressableScale } from '../../components/UI/PressableScale';
import { PersonaShard } from '../../components/UI/PersonaShard';

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

  // Animacion de entrada
  const intro = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(intro, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);

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

  // Etiqueta de seccion inclinada (estilo Persona)
  const SectionTag = ({ text }: { text: string }) => (
    <View style={styles.sectionTagWrap}>
      <PersonaShard label={text} />
    </View>
  );

  const renderItem = ({ item }: any) => (
    <View style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.rowAccent, { backgroundColor: item.color || theme.inactive }]} />
      <View style={[styles.leftCircle, { backgroundColor: item.color || theme.inactive }]}>
        <MaterialCommunityIcons name={item.icono || 'tag'} size={20} color={getContrastText(item.color)} />
      </View>

      <View style={styles.center}>
        <Text style={[styles.name, { color: theme.text }]}>{item.nombre}</Text>
        <Text style={[styles.sub, { color: theme.textDim }]}>{item.tipo}</Text>
      </View>

      <PressableScale onPress={() => handleDelete(item.id_categoria)} style={styles.deleteBtn} scaleTo={0.85}>
        <MaterialCommunityIcons name="trash-can" size={22} color={theme.error} />
      </PressableScale>
    </View>
  );

  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top + 10 }]}>
      <View style={styles.topHeader}>
        <View style={[styles.titleAccent, { backgroundColor: theme.primary }]} />
        <Text style={[styles.title, { color: theme.text, fontFamily: theme.fonts?.title }]}>CATEGORÍAS</Text>
      </View>

      <Animated.View
        style={{
          flex: 1,
          opacity: intro,
          transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
        }}
      >
        <View style={{ paddingHorizontal: 18 }}>
          <View style={styles.form}>
            <TextInput placeholder="Nombre de la categoría" placeholderTextColor={theme.textDim} value={name} onChangeText={setName} style={[styles.input, { color: theme.text, borderBottomColor: theme.primary }]} />

            <View style={styles.typeRow}>
              {(['GASTO', 'INGRESO'] as const).map((t, idx) => {
                const active = tipo === t;
                return (
                  <TouchableOpacity
                    key={t}
                    activeOpacity={0.85}
                    onPress={() => setTipo(t)}
                    style={[styles.tag, { borderColor: theme.primary, backgroundColor: active ? theme.primary : theme.surface, marginLeft: idx === 0 ? 0 : 12 }]}
                  >
                    <Text style={[styles.tagText, { color: active ? theme.textInverse : theme.textDim, fontFamily: theme.fonts?.heading }]}>{t}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <SectionTag text="COLOR" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4, paddingVertical: 2 }}>
              {palette.map((c) => (
                <TouchableOpacity key={c} onPress={() => setSelectedColor(c)} style={[styles.colorDotHorizontal, { backgroundColor: c }, selectedColor === c ? { borderWidth: 3, borderColor: theme.text } : null]}>
                  {selectedColor === c && <MaterialCommunityIcons name="check" size={14} color={getContrastText(c)} />}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <SectionTag text="ICONO" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4, paddingVertical: 2 }}>
              {iconsList.map((ic) => {
                const active = selectedIcon === ic;
                return (
                  <TouchableOpacity key={ic} onPress={() => setSelectedIcon(ic)} style={[styles.iconChoiceHorizontal, active ? { borderColor: theme.primary, backgroundColor: theme.primary } : { borderColor: theme.border, backgroundColor: theme.surface }]}>
                    <MaterialCommunityIcons name={ic as any} size={20} color={active ? theme.textInverse : theme.text} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <PressableScale containerStyle={{ marginTop: 16, alignItems: 'center' }} style={[styles.saveBtn, { backgroundColor: theme.primary }]} onPress={handleAdd}>
              <Text style={[styles.saveBtnText, { color: theme.textInverse, fontFamily: theme.fonts?.heading }]}>GUARDAR CATEGORÍA</Text>
            </PressableScale>
          </View>
        </View>

        <View style={{ paddingHorizontal: 18, flex: 1 }}>
          <SectionTag text="EXISTENTES" />
          <FlatList
            data={categories}
            keyExtractor={(i) => String(i.id_categoria)}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.empty}>
                <MaterialCommunityIcons name="tag-off-outline" size={44} color={theme.textDim} />
                <Text style={{ color: theme.textDim, marginTop: 10, fontFamily: theme.fonts?.bold }}>Aún no hay categorías</Text>
              </View>
            }
          />
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  topHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingBottom: 10 },
  titleAccent: { width: 7, height: 26, marginRight: 12, transform: [{ skewX: '-20deg' }] },
  title: { fontSize: 26, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },

  form: { paddingVertical: 4 },
  typeRow: { flexDirection: 'row', marginBottom: 4 },
  tag: { paddingVertical: 8, paddingHorizontal: 18, borderWidth: 1.5, transform: [{ skewX: '-12deg' }] },
  tagText: { fontWeight: '900', transform: [{ skewX: '12deg' }] },
  input: { paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 2, marginBottom: 14, fontSize: 16 },

  sectionTagWrap: { marginTop: 12, marginBottom: 10 },
  sectionTag: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, transform: [{ skewX: '-20deg' }] },
  sectionTagText: { fontSize: 11, fontWeight: '900', letterSpacing: 1.2, transform: [{ skewX: '20deg' }] },

  colorDotHorizontal: { width: 40, height: 40, borderRadius: 20, marginHorizontal: 6, justifyContent: 'center', alignItems: 'center' },
  iconChoiceHorizontal: { width: 52, height: 52, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginHorizontal: 6, borderWidth: 1.5 },

  saveBtn: { paddingVertical: 14, paddingHorizontal: 30, alignItems: 'center', transform: [{ skewX: '-12deg' }] },
  saveBtnText: { fontWeight: '900', letterSpacing: 1, transform: [{ skewX: '12deg' }] },

  // Row styles (tarjeta con acento)
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, paddingLeft: 18, borderRadius: 10, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  rowAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, transform: [{ skewX: '-12deg' }], marginLeft: -2 },
  leftCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  center: { flex: 1, marginLeft: 12 },
  name: { fontWeight: '800', fontSize: 16 },
  sub: { fontSize: 12, marginTop: 2 },
  deleteBtn: { padding: 8 },

  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
});

export default ManageCategoriesScreen;
