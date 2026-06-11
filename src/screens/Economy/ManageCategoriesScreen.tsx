import React, { useCallback, useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, ScrollView, Animated, Easing } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../themes/useTheme';
import { db } from '../../database';
import { CategoryIcon, getCategory, CATEGORY_ORDER } from '../../components/category-icons';
import { useAlert } from '../../context/AlertContext';
import { getContrastText } from '../../utils/colorUtils';
import { PressableScale } from '../../components/UI/PressableScale';
import { PersonaShard } from '../../components/UI/PersonaShard';

// Tag de seccion inclinado (PersonaShard auto-varia entre tags consecutivos).
const SectionTag = ({ text }: { text: string }) => (
  <View style={styles.sectionTagWrap}><PersonaShard label={text} /></View>
);

// ---------- Fila disruptiva (barra de bala) para una categoria ----------
const CategoryRow = ({ item, index, onDelete }: { item: any; index: number; onDelete: (id: number) => void }) => {
  const theme = useTheme();
  const accent = item.color || (index % 2 === 0 ? theme.primary : theme.secondary);
  const isIncome = item.tipo === 'INGRESO';
  const tagColor = isIncome ? theme.success : theme.error;
  const sk = -8;
  const stagger = [0, 16, 8, 20, 12][index % 5];
  const rot = [-1.3, 1, -1, 1.3, -0.5][index % 5];

  // Entrada: fade + translateX -28 -> 0, escalonada por indice.
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 360, delay: index * 55, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);
  const entrance = {
    opacity: anim,
    transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [-28, 0] }) }],
  };

  return (
    <Animated.View style={[{ marginLeft: stagger, marginRight: 24 - stagger, marginBottom: 16 }, entrance]}>
      <View style={[styles.row, { backgroundColor: theme.surface, borderColor: accent, transform: [{ rotate: `${rot}deg` }, { skewX: `${sk}deg` }] }]}>
        <View style={[styles.rowAccent, { backgroundColor: accent }]} />
        <View style={[styles.rowInner, { transform: [{ skewX: `${-sk}deg` }] }]}>
          <View style={[styles.iconSwatch, { backgroundColor: accent }]}>
            <CategoryIcon category={getCategory(item.icono).key} size={24} skew={0} color={getContrastText(accent)} />
          </View>
          <Text numberOfLines={1} style={[styles.rowName, { color: theme.text, fontFamily: theme.fonts?.heading }]}>{item.nombre}</Text>
          <PressableScale onPress={() => onDelete(item.id_categoria)} style={styles.deleteBtn} scaleTo={0.85}>
            <MaterialCommunityIcons name="trash-can" size={20} color={theme.error} />
          </PressableScale>
        </View>
      </View>

      {/* Tag flotante: FUERA de la tarjeta (que tiene overflow:hidden) para que
          no se recorte su mitad superior. Tipo: GASTO=error / INGRESO=success. */}
      <View style={[styles.floatTag, { backgroundColor: tagColor }]}>
        <Text style={[styles.floatTagText, { color: getContrastText(tagColor), fontFamily: theme.fonts?.condensed }]}>{item.tipo}</Text>
      </View>
    </Animated.View>
  );
};

export const ManageCategoriesScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();

  const [categories, setCategories] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('cash');
  const [selectedColor, setSelectedColor] = useState('#FF5252');
  const [tipo, setTipo] = useState<'GASTO' | 'INGRESO'>('GASTO');

  const palette = ['#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800', '#FF5722', '#795548', '#9E9E9E', '#607D8B'];

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

  useFocusEffect(useCallback(() => { load(); }, []));

  const handleAdd = async () => {
    if (!name || name.trim().length === 0) { showAlert('ERROR', 'El nombre es requerido'); return; }
    if (!selectedIcon) { showAlert('ERROR', 'Selecciona un icono'); return; }
    if (!selectedColor) { showAlert('ERROR', 'Selecciona un color'); return; }
    try {
      await db.runAsync('INSERT INTO financial_categories (nombre, icono, color, tipo) VALUES (?, ?, ?, ?)', [name.trim(), selectedIcon, selectedColor, tipo]);
      setName(''); setSelectedIcon('cash'); setSelectedColor('#FF5252'); setTipo('GASTO');
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
      } },
    ]);
  };

  // ---------- Formulario de creacion (cabecera de la lista) ----------
  const FormHeader = (
    <View>
      <SectionTag text="NUEVA" />

      {/* Nombre: input con acento inclinado (estilo objetivo) */}
      <View style={[styles.inputWrap, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={[styles.inputAccent, { backgroundColor: theme.primary }]} />
        <TextInput
          placeholder="NOMBRE DE LA CATEGORÍA"
          placeholderTextColor={theme.textDim}
          value={name}
          onChangeText={setName}
          style={[styles.input, { color: theme.text, fontFamily: theme.fonts?.heading }]}
        />
      </View>

      {/* Tipo: GASTO (error) / INGRESO (success) como parallelogramos */}
      <View style={styles.typeRow}>
        {(['GASTO', 'INGRESO'] as const).map((t, idx) => {
          const active = tipo === t;
          const acc = t === 'GASTO' ? theme.error : theme.success;
          return (
            <TouchableOpacity
              key={t}
              activeOpacity={0.85}
              onPress={() => setTipo(t)}
              style={[styles.typeChip, { borderColor: acc, backgroundColor: active ? acc : theme.surface, marginLeft: idx === 0 ? 0 : 14 }]}
            >
              <View style={styles.typeInner}>
                <MaterialCommunityIcons name={t === 'GASTO' ? 'arrow-down-bold' : 'arrow-up-bold'} size={15} color={active ? getContrastText(acc) : acc} />
                <Text style={[styles.typeText, { color: active ? getContrastText(acc) : theme.textDim, fontFamily: theme.fonts?.heading }]}>{t}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Color: swatches paralelogramo en fila */}
      <SectionTag text="COLOR" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerRow}>
        {palette.map((c) => {
          const sel = selectedColor === c;
          return (
            <TouchableOpacity key={c} onPress={() => setSelectedColor(c)} activeOpacity={0.85}
              style={[styles.swatch, { backgroundColor: c, borderColor: sel ? theme.text : 'transparent', borderWidth: sel ? 3 : 0 }]}>
              {sel && <View style={styles.swatchCheck}><MaterialCommunityIcons name="check-bold" size={16} color={getContrastText(c)} /></View>}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Icono: chips en cascada (zigzag de skew + escalonado) */}
      <SectionTag text="ICONO" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.pickerRow, { alignItems: 'flex-start', paddingBottom: 18 }]}>
        {CATEGORY_ORDER.map((ic, i) => {
          const active = selectedIcon === ic;
          const acc = i % 2 === 0 ? theme.primary : theme.secondary;
          const sk = [-14, 12, -13, 15, -12][i % 5];
          const st = [0, 12, 4, 14, 6][i % 5];
          return (
            <TouchableOpacity key={ic} onPress={() => setSelectedIcon(ic)} activeOpacity={0.85}
              style={[styles.iconChip, { marginTop: st, borderColor: acc, backgroundColor: active ? acc : theme.surface, transform: [{ skewX: `${sk}deg` }] }]}>
              <View style={{ transform: [{ skewX: `${-sk}deg` }] }}>
                <CategoryIcon category={ic} size={24} skew={0} color={active ? getContrastText(acc) : theme.text} />
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Guardar: boton angular con sombra desplazada */}
      <View style={styles.saveWrap}>
        <View style={[styles.saveShadow, { backgroundColor: theme.secondary }]} />
        <PressableScale style={[styles.saveBtn, { backgroundColor: theme.primary }]} onPress={handleAdd}>
          <View style={styles.saveInner}>
            <MaterialCommunityIcons name="plus-thick" size={18} color={theme.textInverse} />
            <Text style={[styles.saveBtnText, { color: theme.textInverse, fontFamily: theme.fonts?.title }]}>GUARDAR CATEGORÍA</Text>
          </View>
        </PressableScale>
      </View>

      <SectionTag text="EXISTENTES" />
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top + 6 }]}>
      {/* Header */}
      <View style={styles.topHeader}>
        <PressableScale style={[styles.backBtn, { borderColor: theme.border, backgroundColor: theme.surface }]} onPress={() => navigation.goBack()} scaleTo={0.88}>
          <Ionicons name="chevron-back" size={22} color={theme.primary} />
        </PressableScale>
        <PersonaShard label="CATEGORÍAS" height={50} fontSize={28} font={theme.fonts?.title} />
      </View>

      <Animated.View style={{ flex: 1, opacity: intro, transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
        <FlatList
          data={categories}
          keyExtractor={(i) => String(i.id_categoria)}
          renderItem={({ item, index }) => <CategoryRow item={item} index={index} onDelete={handleDelete} />}
          ListHeaderComponent={FormHeader}
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="tag-off-outline" size={44} color={theme.textDim} />
              <Text style={{ color: theme.textDim, marginTop: 10, fontFamily: theme.fonts?.bold }}>Aún no hay categorías</Text>
            </View>
          }
        />
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  topHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingBottom: 12, gap: 14 },
  backBtn: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },

  sectionTagWrap: { marginTop: 22, marginBottom: 12 },

  // Input nombre
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 3, overflow: 'hidden' },
  inputAccent: { width: 7, alignSelf: 'stretch', transform: [{ skewX: '-12deg' }], marginLeft: -2 },
  input: { flex: 1, paddingVertical: 13, paddingHorizontal: 14, fontSize: 15, letterSpacing: 0.5 },

  // Tipo toggle
  typeRow: { flexDirection: 'row', marginTop: 16 },
  typeChip: { flex: 1, paddingVertical: 12, borderWidth: 1.5, borderRadius: 3, alignItems: 'center', transform: [{ skewX: '-11deg' }] },
  typeInner: { flexDirection: 'row', alignItems: 'center', transform: [{ skewX: '11deg' }] },
  typeText: { fontSize: 16, letterSpacing: 1.5, marginLeft: 6 },

  // Pickers
  pickerRow: { paddingHorizontal: 2, paddingVertical: 4 },
  swatch: { width: 40, height: 46, marginRight: 12, borderRadius: 2, justifyContent: 'center', alignItems: 'center', transform: [{ skewX: '-12deg' }] },
  swatchCheck: { transform: [{ skewX: '12deg' }] },
  iconChip: { width: 52, height: 52, marginRight: 12, borderWidth: 1.5, borderRadius: 2, justifyContent: 'center', alignItems: 'center' },

  // Guardar
  saveWrap: { marginTop: 22, alignSelf: 'center' },
  saveShadow: { position: 'absolute', left: 6, top: 6, right: -3, bottom: -4, transform: [{ skewX: '-11deg' }] },
  saveBtn: { paddingVertical: 15, paddingHorizontal: 34, transform: [{ skewX: '-11deg' }] },
  saveInner: { flexDirection: 'row', alignItems: 'center', transform: [{ skewX: '11deg' }] },
  saveBtnText: { fontSize: 18, letterSpacing: 1, marginLeft: 8 },

  // Fila disruptiva
  row: { borderWidth: 1.5, borderRadius: 3, paddingVertical: 14, paddingLeft: 18, paddingRight: 12, overflow: 'hidden' },
  rowAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 7 },
  rowInner: { flexDirection: 'row', alignItems: 'center' },
  iconSwatch: { width: 42, height: 42, borderRadius: 2, justifyContent: 'center', alignItems: 'center' },
  rowName: { flex: 1, fontSize: 21, letterSpacing: 0.5, marginLeft: 14, textTransform: 'uppercase' },
  deleteBtn: { padding: 8, marginLeft: 4 },

  floatTag: { position: 'absolute', top: -10, left: 16, paddingHorizontal: 10, paddingVertical: 3, transform: [{ skewX: '-12deg' }], zIndex: 5, elevation: 6 },
  floatTagText: { fontSize: 11, letterSpacing: 1.5, transform: [{ skewX: '12deg' }] },

  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
});

export default ManageCategoriesScreen;
