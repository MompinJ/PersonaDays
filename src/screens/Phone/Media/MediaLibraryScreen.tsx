import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Animated, Easing, Pressable } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../../themes/useTheme';
import { PhoneHeader } from '../../../components/Phone/PhoneHeader';
import { PersonaModal } from '../../../components/UI/PersonaModal';
import { PersonaShard } from '../../../components/UI/PersonaShard';
import { getContrastText } from '../../../utils/colorUtils';
import { RankSeal, colorRango } from '../../../components/Media/Rank';
import {
  getObras, getResumen, createObra, toggleFavorito,
  Obra, TipoObra, EstadoObra, ESTADOS, labelEstado, labelUnidad, BibliotecaResumen,
} from '../../../services/mediaService';

type Filtro = 'TODO' | TipoObra;

// Modal de alta: solo titulo y tipo. Todo lo demas (rango, reflexion, temas) se
// llena en el detalle, para que registrar algo recien visto sea de dos toques.
const NuevaObraModal = ({ visible, onClose, onCreada }: {
  visible: boolean; onClose: () => void; onCreada: (id: number, tipo: TipoObra) => void;
}) => {
  const theme = useTheme();
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState<TipoObra>('ANIME');

  useEffect(() => { if (visible) { setTitulo(''); setTipo('ANIME'); } }, [visible]);

  const crear = async () => {
    if (!titulo.trim()) return;
    try {
      const id = await createObra(titulo, tipo);
      onCreada(id, tipo);
      onClose();
    } catch (e) { console.error('Error creando obra', e); }
  };

  return (
    <PersonaModal visible={visible} onClose={onClose} title="NUEVA OBRA">
      <View style={{ marginBottom: 12 }}><PersonaShard label="TIPO" height={22} fontSize={10} /></View>
      <View style={styles.tipoRow}>
        {(['ANIME', 'MANGA'] as const).map((t) => {
          const on = tipo === t;
          const acc = t === 'ANIME' ? theme.primary : theme.secondary;
          return (
            <TouchableOpacity
              key={t}
              activeOpacity={0.85}
              onPress={() => setTipo(t)}
              style={[styles.tipoBtn, { borderColor: acc, backgroundColor: on ? acc : theme.surface }]}
            >
              <MaterialCommunityIcons
                name={t === 'ANIME' ? 'television-classic' : 'book-open-page-variant'}
                size={16}
                color={on ? getContrastText(acc) : acc}
              />
              <Text style={[styles.tipoText, { color: on ? getContrastText(acc) : theme.textDim, fontFamily: theme.fonts?.heading }]}>{t}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{ marginTop: 18, marginBottom: 10 }}><PersonaShard label="TÍTULO" variant="ghost" height={22} fontSize={10} /></View>
      <TextInput
        placeholder="EJ: FRIEREN"
        placeholderTextColor={theme.textDim}
        value={titulo}
        onChangeText={setTitulo}
        autoFocus
        onSubmitEditing={crear}
        returnKeyType="done"
        style={[styles.input, { color: theme.text, borderBottomColor: theme.primary, fontFamily: theme.fonts?.bold }]}
      />

      <View style={styles.modalBtns}>
        <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
          <Text style={{ color: theme.textDim, fontFamily: theme.fonts?.bold, letterSpacing: 1 }}>CANCELAR</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={crear}
          activeOpacity={0.9}
          disabled={!titulo.trim()}
          style={[styles.createBtn, { backgroundColor: titulo.trim() ? theme.primary : theme.inactive }]}
        >
          <Text style={[styles.createBtnText, { color: titulo.trim() ? theme.textInverse : theme.textDim, fontFamily: theme.fonts?.heading }]}>CREAR</Text>
        </TouchableOpacity>
      </View>
    </PersonaModal>
  );
};

// Tarjeta inclinada y escalonada, en la linea de las notas y las categorias.
const ObraCard = ({ item, index, onPress, onFav }: {
  item: Obra; index: number; onPress: () => void; onFav: () => void;
}) => {
  const theme = useTheme();
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 340, delay: Math.min(index, 8) * 55, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);

  const accent = item.rango ? colorRango(item.rango, theme) : (index % 2 === 0 ? theme.primary : theme.secondary);
  const sk = -8;
  const stagger = [0, 16, 8, 20, 12][index % 5];
  const rot = [-1.3, 1, -1, 1.3, -0.5][index % 5];
  const etiquetas = (item.etiquetas || '').split(',').map((s) => s.trim()).filter(Boolean);
  const progreso = item.total && item.total > 0 ? `${item.progreso}/${item.total}` : (item.progreso > 0 ? String(item.progreso) : null);

  return (
    <Animated.View style={[
      { opacity: anim, transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [-26, 0] }) }] },
      { marginLeft: stagger, marginRight: 22 - stagger, marginBottom: 16 },
    ]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        style={[styles.card, { backgroundColor: theme.surface, borderColor: accent, transform: [{ rotate: `${rot}deg` }, { skewX: `${sk}deg` }] }]}
      >
        <View style={[styles.cardAccent, { backgroundColor: accent }]} />
        <View style={[styles.cardInner, { transform: [{ skewX: `${-sk}deg` }] }]}>
          <View style={{ flex: 1 }}>
            <View style={styles.cardTitleRow}>
              <MaterialCommunityIcons
                name={item.tipo === 'ANIME' ? 'television-classic' : 'book-open-page-variant'}
                size={14}
                color={theme.textDim}
              />
              <Text style={[styles.cardTitle, { color: theme.text, fontFamily: theme.fonts?.heading }]} numberOfLines={1}>
                {item.titulo}
              </Text>
            </View>
            <Text style={[styles.cardMeta, { color: theme.textDim }]} numberOfLines={1}>
              {labelEstado(item.estado, item.tipo)}
              {progreso ? ` · ${progreso}` : ''}
              {item.temas > 0 ? ` · ${item.temas} ${item.temas === 1 ? 'tema' : 'temas'}` : ''}
            </Text>
            {etiquetas.length > 0 && (
              <View style={styles.tagRow}>
                {etiquetas.slice(0, 3).map((t) => (
                  <View key={t} style={[styles.tag, { borderColor: theme.border }]}>
                    <Text style={[styles.tagText, { color: theme.textDim }]} numberOfLines={1}>{t}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <Pressable onPress={onFav} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ padding: 4 }}>
            <MaterialCommunityIcons
              name={item.favorito ? 'star' : 'star-outline'}
              size={20}
              color={item.favorito ? theme.secondary : theme.textDim}
            />
          </Pressable>
          <RankSeal rango={item.rango} style={{ marginLeft: 8 }} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const MediaLibraryScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();

  const [obras, setObras] = useState<Obra[]>([]);
  const [resumen, setResumen] = useState<BibliotecaResumen | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('TODO');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoObra | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [nueva, setNueva] = useState(false);

  const load = async () => {
    try {
      const tipo = filtro === 'TODO' ? undefined : filtro;
      const [lista, res] = await Promise.all([getObras(tipo), getResumen(tipo)]);
      setObras(lista);
      setResumen(res);
    } catch (e) { console.error('Error cargando biblioteca', e); }
  };

  useFocusEffect(useCallback(() => { load(); }, [filtro]));

  const visibles = obras.filter((o) => {
    if (estadoFiltro && o.estado !== estadoFiltro) return false;
    const q = busqueda.trim().toLowerCase();
    if (!q) return true;
    return o.titulo.toLowerCase().includes(q) || (o.etiquetas || '').toLowerCase().includes(q);
  });

  const abrir = (id: number) => navigation.navigate('MediaDetail', { obraId: id });

  const Header = (
    <View>
      {/* Resumen */}
      {resumen && resumen.total > 0 && (
        <View style={[styles.resumen, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {[
            { label: 'EN TOTAL', valor: String(resumen.total), color: theme.text },
            { label: 'COMPLETADOS', valor: String(resumen.completados), color: theme.success },
            { label: 'EN CURSO', valor: String(resumen.viendo), color: theme.primary },
            { label: 'FAVORITOS', valor: String(resumen.favoritos), color: theme.secondary },
          ].map((t, i) => (
            <View key={t.label} style={[styles.resumenItem, i > 0 && { borderLeftWidth: 1, borderLeftColor: theme.border }]}>
              <Text style={[styles.resumenValor, { color: t.color, fontFamily: theme.fonts?.display }]}>{t.valor}</Text>
              <Text style={[styles.resumenLabel, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>{t.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Buscador */}
      <View style={[styles.search, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <MaterialCommunityIcons name="magnify" size={18} color={theme.textDim} />
        <TextInput
          placeholder="BUSCAR POR TÍTULO O ETIQUETA"
          placeholderTextColor={theme.textDim}
          value={busqueda}
          onChangeText={setBusqueda}
          style={[styles.searchInput, { color: theme.text, fontFamily: theme.fonts?.bold }]}
        />
        {busqueda.length > 0 && (
          <Pressable onPress={() => setBusqueda('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="close" size={16} color={theme.textDim} />
          </Pressable>
        )}
      </View>

      {/* Tipo */}
      <View style={styles.filtroRow}>
        {(['TODO', 'ANIME', 'MANGA'] as const).map((f, i) => {
          const on = filtro === f;
          const acc = i === 1 ? theme.primary : i === 2 ? theme.secondary : theme.primary;
          return (
            <TouchableOpacity
              key={f}
              activeOpacity={0.85}
              onPress={() => { setFiltro(f); setEstadoFiltro(null); }}
              style={[styles.filtroChip, { borderColor: acc, backgroundColor: on ? acc : theme.surface }]}
            >
              <Text style={[styles.filtroText, { color: on ? getContrastText(acc) : theme.textDim, fontFamily: theme.fonts?.heading }]}>{f}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Estado */}
      <View style={styles.estadoRow}>
        {ESTADOS.map((e) => {
          const on = estadoFiltro === e;
          const n = resumen?.porEstado[e] || 0;
          if (n === 0 && !on) return null;
          return (
            <TouchableOpacity
              key={e}
              activeOpacity={0.85}
              onPress={() => setEstadoFiltro(on ? null : e)}
              style={[styles.estadoChip, { borderColor: on ? theme.primary : theme.border, backgroundColor: on ? theme.primary : 'transparent' }]}
            >
              <Text style={[styles.estadoText, { color: on ? getContrastText(theme.primary) : theme.textDim, fontFamily: theme.fonts?.condensed }]}>
                {labelEstado(e, filtro === 'MANGA' ? 'MANGA' : 'ANIME')} {n}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <PhoneHeader title="BIBLIOTECA" showBackButton shard />

      <FlatList
        data={visibles}
        keyExtractor={(i) => String(i.id_obra)}
        renderItem={({ item, index }) => (
          <ObraCard
            item={item}
            index={index}
            onPress={() => abrir(item.id_obra)}
            onFav={async () => { await toggleFavorito(item.id_obra); load(); }}
          />
        )}
        ListHeaderComponent={Header}
        contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="television-classic-off" size={48} color={theme.textDim} />
            <Text style={[styles.emptyText, { color: theme.textDim, fontFamily: theme.fonts?.bold }]}>
              {obras.length === 0 ? 'Tu biblioteca está vacía' : 'Nada con ese filtro'}
            </Text>
            <Text style={[styles.emptySub, { color: theme.textDim }]}>
              {obras.length === 0 ? 'Pulsa + para registrar lo primero que viste' : 'Prueba quitando el filtro o la búsqueda'}
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setNueva(true)}
        style={[styles.fab, { backgroundColor: theme.primary, shadowColor: theme.primary }]}
      >
        <MaterialCommunityIcons name="plus" size={28} color={theme.textInverse} />
      </TouchableOpacity>

      <NuevaObraModal
        visible={nueva}
        onClose={() => setNueva(false)}
        onCreada={(id) => { load(); abrir(id); }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  resumen: { flexDirection: 'row', borderWidth: 1, borderRadius: 12, paddingVertical: 12, marginBottom: 14 },
  resumenItem: { flex: 1, alignItems: 'center' },
  resumenValor: { fontSize: 22 },
  resumenLabel: { fontSize: 9, letterSpacing: 1.1, marginTop: 1 },

  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 3, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 13, letterSpacing: 0.5, padding: 0 },

  filtroRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  filtroChip: { flex: 1, borderWidth: 1.5, borderRadius: 3, paddingVertical: 9, alignItems: 'center', transform: [{ skewX: '-11deg' }] },
  filtroText: { fontSize: 13, letterSpacing: 1.2, transform: [{ skewX: '11deg' }] },

  estadoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 18 },
  estadoChip: { borderWidth: 1, borderRadius: 2, paddingHorizontal: 9, paddingVertical: 5 },
  estadoText: { fontSize: 10, letterSpacing: 1 },

  // Tarjeta
  card: { borderWidth: 1.5, borderRadius: 3, paddingVertical: 13, paddingLeft: 18, paddingRight: 12, overflow: 'hidden' },
  cardAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 7 },
  cardInner: { flexDirection: 'row', alignItems: 'center' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  cardTitle: { flex: 1, fontSize: 19, letterSpacing: 0.4 },
  cardMeta: { fontSize: 11, marginTop: 3 },
  tagRow: { flexDirection: 'row', gap: 6, marginTop: 7 },
  tag: { borderWidth: 1, borderRadius: 2, paddingHorizontal: 7, paddingVertical: 2 },
  tagText: { fontSize: 9, letterSpacing: 0.6, textTransform: 'uppercase' },

  // Modal de alta
  tipoRow: { flexDirection: 'row', gap: 12 },
  tipoBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1.5, borderRadius: 3, paddingVertical: 12, transform: [{ skewX: '-11deg' }] },
  tipoText: { fontSize: 14, letterSpacing: 1.2 },
  input: { borderBottomWidth: 2, paddingVertical: 9, fontSize: 17, letterSpacing: 0.5 },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 22 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 16, marginRight: 8 },
  createBtn: { paddingVertical: 12, paddingHorizontal: 28, transform: [{ skewX: '-12deg' }] },
  createBtnText: { fontSize: 16, letterSpacing: 1.5, transform: [{ skewX: '12deg' }] },

  empty: { alignItems: 'center', paddingVertical: 50 },
  emptyText: { fontSize: 15, marginTop: 12 },
  emptySub: { fontSize: 13, marginTop: 4, textAlign: 'center', paddingHorizontal: 30 },

  fab: { position: 'absolute', right: 20, bottom: 36, width: 58, height: 58, borderRadius: 29, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 6 },
});

export default MediaLibraryScreen;
