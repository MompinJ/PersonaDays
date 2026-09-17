import React, { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, ScrollView, Animated, Easing } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../themes/useTheme';
import { CategoryIcon, getCategory, CATEGORY_ORDER } from '../../components/category-icons';
import { useAlert } from '../../context/AlertContext';
import { getContrastText, colorsAreClose } from '../../utils/colorUtils';
import { PressableScale } from '../../components/UI/PressableScale';
import { PersonaShard } from '../../components/UI/PersonaShard';
import { PersonaModal } from '../../components/UI/PersonaModal';
import {
  getCategories, getCategoryUsage, createCategory, updateCategory, deleteCategory,
  FinancialCategory, TipoMovimiento,
} from '../../services/economyService';

const PALETTE = ['#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800', '#FF5722', '#795548', '#9E9E9E', '#607D8B'];

// Tag de seccion inclinado (PersonaShard auto-varia entre tags consecutivos).
const SectionTag = ({ text }: { text: string }) => (
  <View style={styles.sectionTagWrap}><PersonaShard label={text} /></View>
);

// ---------- Fila disruptiva (barra de bala) para una categoria ----------
const CategoryRow = ({ item, index, usos, editing, onEdit, onDelete }: {
  item: FinancialCategory; index: number; usos: number; editing: boolean;
  onEdit: (c: FinancialCategory) => void; onDelete: (c: FinancialCategory) => void;
}) => {
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
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onEdit(item)}
        style={[
          styles.row,
          { backgroundColor: theme.surface, borderColor: accent, transform: [{ rotate: `${rot}deg` }, { skewX: `${sk}deg` }] },
          editing && { borderWidth: 3 },
        ]}
      >
        <View style={[styles.rowAccent, { backgroundColor: accent }]} />
        <View style={[styles.rowInner, { transform: [{ skewX: `${-sk}deg` }] }]}>
          <View style={[styles.iconSwatch, { backgroundColor: accent }]}>
            <CategoryIcon category={getCategory(item.icono).key} size={24} skew={0} color={getContrastText(accent)} />
          </View>
          <View style={styles.rowTexts}>
            <Text numberOfLines={1} style={[styles.rowName, { color: theme.text, fontFamily: theme.fonts?.heading }]}>{item.nombre}</Text>
            <Text style={[styles.rowUses, { color: theme.textDim }]}>
              {usos === 0 ? 'sin movimientos' : `${usos} ${usos === 1 ? 'movimiento' : 'movimientos'}`}
            </Text>
          </View>
          <MaterialCommunityIcons name="pencil" size={17} color={theme.textDim} style={{ marginRight: 2 }} />
          <PressableScale onPress={() => onDelete(item)} style={styles.deleteBtn} scaleTo={0.85}>
            <MaterialCommunityIcons name="trash-can" size={20} color={theme.error} />
          </PressableScale>
        </View>
      </TouchableOpacity>

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
  const listRef = useRef<FlatList<FinancialCategory>>(null);

  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [usage, setUsage] = useState<Record<number, number>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('cash');
  const [selectedColor, setSelectedColor] = useState('#FF5252');
  const [tipo, setTipo] = useState<TipoMovimiento>('GASTO');
  const [porBorrar, setPorBorrar] = useState<FinancialCategory | null>(null);

  const intro = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(intro, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);

  const load = async () => {
    try {
      setCategories(await getCategories());
      setUsage(await getCategoryUsage());
    } catch (e) {
      console.error('Error cargando categorías', e);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  // Quien ocupa cada color de la paleta (excluyendo la categoria en edicion).
  // Alimenta el aviso de color repetido y la eleccion de un color libre.
  const duenoDeColor = useMemo(() => {
    const map: Record<string, string[]> = {};
    categories
      .filter((c) => c.id_categoria !== editingId)
      .forEach((c) => {
        const hit = PALETTE.find((p) => colorsAreClose(p, c.color, 24));
        const key = hit || (c.color || '').toUpperCase();
        if (!key) return;
        (map[key] = map[key] || []).push(c.nombre);
      });
    return map;
  }, [categories, editingId]);

  const primerColorLibre = useCallback((mapa: Record<string, string[]>) =>
    PALETTE.find((p) => !mapa[p]) || PALETTE[0], []);

  // Al abrir la pantalla (y tras cada guardado) proponemos un color que nadie
  // use todavia, para no seguir apilando categorias del mismo tono.
  const resetForm = useCallback(() => {
    setEditingId(null);
    setName('');
    setSelectedIcon('cash');
    setTipo('GASTO');
    setSelectedColor(primerColorLibre(duenoDeColor));
  }, [duenoDeColor, primerColorLibre]);

  useEffect(() => {
    if (editingId === null && name === '') setSelectedColor(primerColorLibre(duenoDeColor));
  }, [categories]);

  const colisionActual = duenoDeColor[PALETTE.find((p) => colorsAreClose(p, selectedColor, 24)) || selectedColor.toUpperCase()];

  const startEdit = (c: FinancialCategory) => {
    setEditingId(c.id_categoria);
    setName(c.nombre);
    setSelectedIcon(c.icono || 'cash');
    setSelectedColor(c.color || PALETTE[0]);
    setTipo((c.tipo as TipoMovimiento) || 'GASTO');
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const handleSave = async () => {
    if (!name || name.trim().length === 0) { showAlert('ERROR', 'El nombre es requerido'); return; }
    if (!selectedIcon) { showAlert('ERROR', 'Selecciona un icono'); return; }
    if (!selectedColor) { showAlert('ERROR', 'Selecciona un color'); return; }
    const datos = { nombre: name.trim(), icono: selectedIcon, color: selectedColor, tipo };
    try {
      if (editingId !== null) {
        await updateCategory(editingId, datos);
        // El historico apunta por id, asi que hereda el cambio sin tocar nada mas.
        const n = usage[editingId] || 0;
        showAlert('Hecho', n > 0
          ? `Categoría actualizada. Sus ${n} ${n === 1 ? 'movimiento' : 'movimientos'} ya usan los datos nuevos.`
          : 'Categoría actualizada');
      } else {
        await createCategory(datos);
        showAlert('Hecho', 'Categoría creada');
      }
      resetForm();
      load();
    } catch (e) {
      console.error('Error guardando categoría', e);
      showAlert('ERROR', 'No se pudo guardar la categoría');
    }
  };

  // Borrar sin movimientos es directo; con movimientos hay que decidir a donde
  // van, asi que abrimos el selector de reasignacion.
  const handleDelete = (c: FinancialCategory) => {
    const n = usage[c.id_categoria] || 0;
    if (n === 0) {
      showAlert('Confirmar', `¿Eliminar "${c.nombre}"?`, [
        { text: 'CANCELAR', style: 'cancel' },
        { text: 'ELIMINAR', style: 'destructive', onPress: () => confirmarBorrado(c, null) },
      ]);
      return;
    }
    setPorBorrar(c);
  };

  const confirmarBorrado = async (c: FinancialCategory, destino: number | null) => {
    try {
      await deleteCategory(c.id_categoria, destino);
      if (editingId === c.id_categoria) resetForm();
      setPorBorrar(null);
      load();
      showAlert('Hecho', 'Categoría eliminada');
    } catch (e) {
      console.error('Error eliminando categoría', e);
      showAlert('ERROR', 'No se pudo eliminar la categoría');
    }
  };

  // ---------- Formulario (cabecera de la lista); crea o edita ----------
  const FormHeader = (
    <View>
      <SectionTag text={editingId !== null ? 'EDITANDO' : 'NUEVA'} />

      {editingId !== null && (
        <View style={[styles.editBanner, { borderColor: theme.primary, backgroundColor: theme.surface }]}>
          <MaterialCommunityIcons name="pencil" size={16} color={theme.primary} />
          <Text style={[styles.editBannerText, { color: theme.text, fontFamily: theme.fonts?.bold }]} numberOfLines={1}>
            Editando una categoría existente
          </Text>
          <PressableScale onPress={resetForm} style={{ padding: 4 }} scaleTo={0.85}>
            <MaterialCommunityIcons name="close" size={18} color={theme.textDim} />
          </PressableScale>
        </View>
      )}

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

      {/* Color: swatches paralelogramo. Los ya ocupados llevan un punto para
          no repetir tonos sin darse cuenta (es lo que vuelve ilegible el donut). */}
      <SectionTag text="COLOR" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerRow}>
        {PALETTE.map((c) => {
          const sel = selectedColor === c;
          const ocupado = duenoDeColor[c];
          return (
            <TouchableOpacity key={c} onPress={() => setSelectedColor(c)} activeOpacity={0.85}
              style={[styles.swatch, { backgroundColor: c, borderColor: sel ? theme.text : 'transparent', borderWidth: sel ? 3 : 0 }]}>
              {sel && <View style={styles.swatchCheck}><MaterialCommunityIcons name="check-bold" size={16} color={getContrastText(c)} /></View>}
              {!sel && ocupado && (
                <View style={[styles.swatchUsed, { backgroundColor: getContrastText(c) }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {colisionActual && (
        <View style={styles.warnRow}>
          <MaterialCommunityIcons name="alert-circle-outline" size={15} color={theme.secondary} />
          <Text style={[styles.warnText, { color: theme.textDim }]}>
            Ese color ya lo usa {colisionActual.join(', ')}. El gráfico les dará tonos distintos,
            pero se leen mejor con colores separados.
          </Text>
        </View>
      )}

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
        <PressableScale style={[styles.saveBtn, { backgroundColor: theme.primary }]} onPress={handleSave}>
          <View style={styles.saveInner}>
            <MaterialCommunityIcons name={editingId !== null ? 'content-save' : 'plus-thick'} size={18} color={theme.textInverse} />
            <Text style={[styles.saveBtnText, { color: theme.textInverse, fontFamily: theme.fonts?.title }]}>
              {editingId !== null ? 'GUARDAR CAMBIOS' : 'GUARDAR CATEGORÍA'}
            </Text>
          </View>
        </PressableScale>
      </View>

      <SectionTag text="EXISTENTES" />
      <Text style={[styles.hint, { color: theme.textDim }]}>Toca una categoría para editarla.</Text>
    </View>
  );

  // Destinos validos al borrar una categoria con movimientos.
  const destinos = porBorrar ? categories.filter((c) => c.id_categoria !== porBorrar.id_categoria && c.tipo === porBorrar.tipo) : [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.topHeader}>
        <PressableScale style={[styles.backBtn, { borderColor: theme.border, backgroundColor: theme.surface }]} onPress={() => navigation.goBack()} scaleTo={0.88}>
          <Ionicons name="chevron-back" size={22} color={theme.primary} />
        </PressableScale>
        <PersonaShard label="CATEGORÍAS" height={50} fontSize={28} font={theme.fonts?.title} />
      </View>

      <Animated.View style={{ flex: 1, opacity: intro, transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
        <FlatList
          ref={listRef}
          data={categories}
          keyExtractor={(i) => String(i.id_categoria)}
          renderItem={({ item, index }) => (
            <CategoryRow
              item={item}
              index={index}
              usos={usage[item.id_categoria] || 0}
              editing={editingId === item.id_categoria}
              onEdit={startEdit}
              onDelete={handleDelete}
            />
          )}
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

      {/* Reasignacion al borrar: los movimientos no pueden quedar apuntando al
          vacio sin que el usuario lo decida. */}
      <PersonaModal visible={!!porBorrar} onClose={() => setPorBorrar(null)} title="¿Y SUS MOVIMIENTOS?">
        <Text style={[styles.modalText, { color: theme.text, fontFamily: theme.fonts?.body }]}>
          "{porBorrar?.nombre}" tiene {usage[porBorrar?.id_categoria as number] || 0} movimientos.
          Elige a qué categoría pasan antes de eliminarla.
        </Text>
        <ScrollView style={{ maxHeight: 260 }} keyboardShouldPersistTaps="handled">
          {destinos.map((d) => (
            <TouchableOpacity
              key={d.id_categoria}
              activeOpacity={0.85}
              onPress={() => porBorrar && confirmarBorrado(porBorrar, d.id_categoria)}
              style={[styles.destRow, { borderColor: theme.border, backgroundColor: theme.surface }]}
            >
              <View style={[styles.destSwatch, { backgroundColor: d.color || theme.primary }]}>
                <CategoryIcon category={getCategory(d.icono).key} size={16} skew={0} color={getContrastText(d.color)} />
              </View>
              <Text style={[styles.destName, { color: theme.text, fontFamily: theme.fonts?.bold }]} numberOfLines={1}>{d.nombre}</Text>
              <Ionicons name="chevron-forward" size={17} color={theme.textDim} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => porBorrar && confirmarBorrado(porBorrar, null)}
            style={[styles.destRow, { borderColor: theme.error, backgroundColor: theme.surface }]}
          >
            <View style={[styles.destSwatch, { backgroundColor: theme.inactive }]}>
              <MaterialCommunityIcons name="tag-off" size={16} color={theme.textDim} />
            </View>
            <Text style={[styles.destName, { color: theme.textDim, fontFamily: theme.fonts?.bold }]}>Dejarlos sin categoría</Text>
            <Ionicons name="chevron-forward" size={17} color={theme.textDim} />
          </TouchableOpacity>
        </ScrollView>
        <TouchableOpacity onPress={() => setPorBorrar(null)} style={styles.modalCancel}>
          <Text style={{ color: theme.textDim, fontFamily: theme.fonts?.bold, letterSpacing: 1 }}>CANCELAR</Text>
        </TouchableOpacity>
      </PersonaModal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  topHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 8, paddingBottom: 12, gap: 14 },
  backBtn: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },

  sectionTagWrap: { marginTop: 22, marginBottom: 12 },
  hint: { fontSize: 12, marginTop: -4, marginBottom: 14 },

  // Banner de edicion
  editBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 3, paddingVertical: 9, paddingHorizontal: 12, marginBottom: 14 },
  editBannerText: { flex: 1, fontSize: 13 },

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
  swatchUsed: { position: 'absolute', bottom: 5, width: 7, height: 7, borderRadius: 4, opacity: 0.85 },
  iconChip: { width: 52, height: 52, marginRight: 12, borderWidth: 1.5, borderRadius: 2, justifyContent: 'center', alignItems: 'center' },

  warnRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 8, paddingRight: 8 },
  warnText: { flex: 1, fontSize: 12, lineHeight: 16 },

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
  rowTexts: { flex: 1, marginLeft: 14 },
  rowName: { fontSize: 21, letterSpacing: 0.5, textTransform: 'uppercase' },
  rowUses: { fontSize: 11, marginTop: 1 },
  deleteBtn: { padding: 8, marginLeft: 4 },

  floatTag: { position: 'absolute', top: -10, left: 16, paddingHorizontal: 10, paddingVertical: 3, transform: [{ skewX: '-12deg' }], zIndex: 5, elevation: 6 },
  floatTagText: { fontSize: 11, letterSpacing: 1.5, transform: [{ skewX: '12deg' }] },

  // Modal de reasignacion
  modalText: { fontSize: 14, lineHeight: 20, marginBottom: 14 },
  destRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderRadius: 3, paddingVertical: 11, paddingHorizontal: 12, marginBottom: 9 },
  destSwatch: { width: 30, height: 30, borderRadius: 2, justifyContent: 'center', alignItems: 'center' },
  destName: { flex: 1, fontSize: 15 },
  modalCancel: { alignSelf: 'flex-end', paddingVertical: 12, paddingHorizontal: 8, marginTop: 6 },

  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
});

export default ManageCategoriesScreen;
