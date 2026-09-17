import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Pressable,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../../themes/useTheme';
import { PhoneHeader } from '../../../components/Phone/PhoneHeader';
import { PersonaShard } from '../../../components/UI/PersonaShard';
import { PersonaField } from '../../../components/UI/PersonaPanel';
import { P3RDatePicker } from '../../../components/UI/P3RDatePicker';
import { useAlert } from '../../../context/AlertContext';
import { getContrastText } from '../../../utils/colorUtils';
import { RankPicker, colorRango } from '../../../components/Media/Rank';
import {
  getObra, getTemas, updateObra, deleteObra, setTemas, siguienteNumero,
  Obra, Tema, TipoObra, EstadoObra, Rango, ClaseTema, ESTADOS, CLASES,
  labelEstado, labelUnidad,
} from '../../../services/mediaService';

// Un tema en edicion: mismos campos que la fila, con el numero como texto
// mientras se escribe.
type TemaEdit = { clase: ClaseTema; numero: string; titulo: string; artista: string; rango: Rango | null };

const parseFecha = (s?: string | null): Date => {
  if (!s) return new Date();
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
const fechaStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fechaLegible = (s?: string | null) =>
  s ? parseFecha(s).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase() : 'SIN FECHA';

const Tag = ({ text, color }: { text: string; color?: string }) => (
  <View style={styles.tagWrap}><PersonaShard label={text} height={24} fontSize={11} color={color} /></View>
);

export const MediaDetailScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { showAlert } = useAlert();
  const obraId: number = route.params?.obraId;

  const [cargada, setCargada] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState<TipoObra>('ANIME');
  const [estado, setEstado] = useState<EstadoObra>('PENDIENTE');
  const [rango, setRango] = useState<Rango | null>(null);
  const [reflexion, setReflexion] = useState('');
  const [progreso, setProgreso] = useState('');
  const [total, setTotal] = useState('');
  const [favorito, setFavorito] = useState(false);
  const [etiquetas, setEtiquetas] = useState<string[]>([]);
  const [nuevaEtiqueta, setNuevaEtiqueta] = useState('');
  const [fechaInicio, setFechaInicio] = useState<string | null>(null);
  const [fechaFin, setFechaFin] = useState<string | null>(null);
  const [pickerInicio, setPickerInicio] = useState(false);
  const [pickerFin, setPickerFin] = useState(false);
  const [temas, setTemasState] = useState<TemaEdit[]>([]);

  // Guardado al salir: el estado vivo se lee por ref para que el listener
  // beforeRemove (registrado una vez) no guarde valores viejos.
  const sucio = useRef(false);
  const borrada = useRef(false);
  const snapshot = useRef<any>(null);

  useEffect(() => {
    const cargar = async () => {
      try {
        const o = await getObra(obraId);
        if (!o) { navigation.goBack(); return; }
        setTitulo(o.titulo);
        setTipo(o.tipo);
        setEstado(o.estado);
        setRango(o.rango);
        setReflexion(o.reflexion || '');
        setProgreso(o.progreso ? String(o.progreso) : '');
        setTotal(o.total ? String(o.total) : '');
        setFavorito(!!o.favorito);
        setEtiquetas((o.etiquetas || '').split(',').map((s) => s.trim()).filter(Boolean));
        setFechaInicio(o.fecha_inicio);
        setFechaFin(o.fecha_fin);
        const ts = await getTemas(obraId);
        setTemasState(ts.map((t) => ({
          clase: t.clase, numero: t.numero ? String(t.numero) : '',
          titulo: t.titulo || '', artista: t.artista || '', rango: t.rango,
        })));
        setCargada(true);
      } catch (e) { console.error('Error cargando obra', e); }
    };
    cargar();
  }, [obraId]);

  // Mantener el snapshot actualizado para el guardado de salida.
  snapshot.current = { titulo, tipo, estado, rango, reflexion, progreso, total, favorito, etiquetas, fechaInicio, fechaFin, temas };

  const marcar = () => { sucio.current = true; };

  const guardar = useCallback(async () => {
    const s = snapshot.current;
    if (!s || !s.titulo.trim()) return;
    try {
      await updateObra(obraId, {
        titulo: s.titulo,
        tipo: s.tipo,
        estado: s.estado,
        rango: s.rango,
        reflexion: s.reflexion.trim() || null,
        progreso: parseInt(s.progreso, 10) || 0,
        total: parseInt(s.total, 10) || null,
        favorito: s.favorito ? 1 : 0,
        etiquetas: s.etiquetas.length ? s.etiquetas.join(', ') : null,
        fecha_inicio: s.fechaInicio,
        fecha_fin: s.fechaFin,
      });
      await setTemas(obraId, s.temas.map((t: TemaEdit) => ({
        clase: t.clase,
        numero: parseInt(t.numero, 10) || null,
        titulo: t.titulo,
        artista: t.artista,
        rango: t.rango,
      })));
      sucio.current = false;
    } catch (e) { console.error('Error guardando obra', e); }
  }, [obraId]);

  // Navegar hacia atras dispara el guardado, pero la navegacion no espera a una
  // promesa: la lista se recargaba antes de que terminaran los INSERT y mostraba
  // datos viejos. Frenamos la salida, guardamos y reemitimos la accion (para
  // entonces `sucio` ya es false, asi que la segunda vuelta no reentra).
  useEffect(() => {
    const off = navigation.addListener('beforeRemove', (e: any) => {
      if (!sucio.current || borrada.current) return;
      e.preventDefault();
      guardar().finally(() => navigation.dispatch(e.data.action));
    });
    return off;
  }, [navigation, guardar]);

  const borrar = () => {
    showAlert('ELIMINAR', `¿Eliminar "${titulo}" y sus temas? No se puede deshacer.`, [
      { text: 'CANCELAR', style: 'cancel' },
      { text: 'ELIMINAR', style: 'destructive', onPress: async () => {
        try {
          await deleteObra(obraId);
          borrada.current = true;
          navigation.goBack();
        } catch (e) {
          console.error('Error eliminando obra', e);
          showAlert('ERROR', 'No se pudo eliminar.');
        }
      } },
    ]);
  };

  const addEtiqueta = () => {
    const t = nuevaEtiqueta.trim();
    if (!t || etiquetas.some((e) => e.toLowerCase() === t.toLowerCase())) { setNuevaEtiqueta(''); return; }
    setEtiquetas((p) => [...p, t]);
    setNuevaEtiqueta('');
    marcar();
  };

  const addTema = (clase: ClaseTema) => {
    setTemasState((p) => [...p, {
      clase,
      numero: String(siguienteNumero(p.map((x) => ({ clase: x.clase })), clase)),
      titulo: '', artista: '', rango: null,
    }]);
    marcar();
  };
  const setTema = (i: number, patch: Partial<TemaEdit>) => {
    setTemasState((p) => p.map((t, j) => (j === i ? { ...t, ...patch } : t)));
    marcar();
  };
  const delTema = (i: number) => { setTemasState((p) => p.filter((_, j) => j !== i)); marcar(); };

  if (!cargada) {
    return <View style={[styles.container, { backgroundColor: theme.background }]} />;
  }

  const unidad = labelUnidad(tipo);
  const esAnime = tipo === 'ANIME';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <PhoneHeader
        title={titulo || 'SIN TÍTULO'}
        showBackButton
        rightAction={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Pressable onPress={() => { setFavorito((f) => !f); marcar(); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialCommunityIcons
                name={favorito ? 'star' : 'star-outline'}
                size={23}
                color={favorito ? theme.secondary : theme.textDim}
              />
            </Pressable>
            <Pressable onPress={borrar} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialCommunityIcons name="trash-can-outline" size={23} color={theme.error} />
            </Pressable>
          </View>
        }
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* TÍTULO */}
          <PersonaField accent={rango ? colorRango(rango, theme) : theme.primary}>
            <TextInput
              value={titulo}
              onChangeText={(t) => { setTitulo(t); marcar(); }}
              placeholder="TÍTULO"
              placeholderTextColor={theme.textDim}
              style={[styles.tituloInput, { color: theme.text, fontFamily: theme.fonts?.heading }]}
            />
          </PersonaField>

          {/* TIPO */}
          <View style={styles.rowGap}>
            {(['ANIME', 'MANGA'] as const).map((t) => {
              const on = tipo === t;
              const acc = t === 'ANIME' ? theme.primary : theme.secondary;
              return (
                <TouchableOpacity
                  key={t}
                  activeOpacity={0.85}
                  onPress={() => { setTipo(t); marcar(); }}
                  style={[styles.segBtn, { borderColor: acc, backgroundColor: on ? acc : theme.surface }]}
                >
                  <Text style={[styles.segText, { color: on ? getContrastText(acc) : theme.textDim, fontFamily: theme.fonts?.heading }]}>{t}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* CALIFICACIÓN */}
          <Tag text="CALIFICACIÓN" color={rango ? colorRango(rango, theme) : undefined} />
          <RankPicker value={rango} onChange={(r) => { setRango(r); marcar(); }} />
          <Text style={[styles.hint, { color: theme.textDim }]}>Toca el rango activo para quitarlo.</Text>

          {/* ESTADO */}
          <Tag text="ESTADO" />
          <View style={styles.wrapRow}>
            {ESTADOS.map((e) => {
              const on = estado === e;
              return (
                <TouchableOpacity
                  key={e}
                  activeOpacity={0.85}
                  onPress={() => { setEstado(e); marcar(); }}
                  style={[styles.estadoChip, { borderColor: on ? theme.primary : theme.border, backgroundColor: on ? theme.primary : theme.surface }]}
                >
                  <Text style={[styles.estadoText, { color: on ? getContrastText(theme.primary) : theme.textDim, fontFamily: theme.fonts?.condensed }]}>
                    {labelEstado(e, tipo)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* PROGRESO */}
          <Tag text={unidad.toUpperCase()} />
          <View style={styles.progresoRow}>
            <View style={[styles.numBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <TextInput
                keyboardType="numeric"
                value={progreso}
                onChangeText={(t) => { setProgreso(t); marcar(); }}
                placeholder="0"
                placeholderTextColor={theme.textDim}
                style={[styles.numInput, { color: theme.text, fontFamily: theme.fonts?.display }]}
              />
            </View>
            <Text style={[styles.slash, { color: theme.textDim, fontFamily: theme.fonts?.display }]}>/</Text>
            <View style={[styles.numBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <TextInput
                keyboardType="numeric"
                value={total}
                onChangeText={(t) => { setTotal(t); marcar(); }}
                placeholder="?"
                placeholderTextColor={theme.textDim}
                style={[styles.numInput, { color: theme.text, fontFamily: theme.fonts?.display }]}
              />
            </View>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => { setProgreso(String((parseInt(progreso, 10) || 0) + 1)); marcar(); }}
              style={[styles.plusBtn, { borderColor: theme.primary }]}
            >
              <MaterialCommunityIcons name="plus" size={20} color={theme.primary} />
            </TouchableOpacity>
          </View>

          {/* FECHAS */}
          <Tag text="FECHAS" />
          <View style={styles.rowGap}>
            {[
              { label: 'EMPEZÓ', valor: fechaInicio, abrir: () => setPickerInicio(true), limpiar: () => { setFechaInicio(null); marcar(); } },
              { label: 'TERMINÓ', valor: fechaFin, abrir: () => setPickerFin(true), limpiar: () => { setFechaFin(null); marcar(); } },
            ].map((f) => (
              <TouchableOpacity
                key={f.label}
                activeOpacity={0.85}
                onPress={f.abrir}
                onLongPress={f.limpiar}
                style={[styles.fechaBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <Text style={[styles.fechaLabel, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>{f.label}</Text>
                <Text style={[styles.fechaValor, { color: f.valor ? theme.text : theme.textDim, fontFamily: theme.fonts?.bold }]}>
                  {fechaLegible(f.valor)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.hint, { color: theme.textDim }]}>Mantén pulsada una fecha para borrarla.</Text>

          {/* ETIQUETAS */}
          <Tag text="ETIQUETAS" />
          <View style={styles.wrapRow}>
            {etiquetas.map((t) => (
              <View key={t} style={[styles.etiqueta, { borderColor: theme.secondary, backgroundColor: theme.surface }]}>
                <Text style={[styles.etiquetaText, { color: theme.text }]}>{t}</Text>
                <Pressable onPress={() => { setEtiquetas((p) => p.filter((x) => x !== t)); marcar(); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialCommunityIcons name="close" size={13} color={theme.textDim} />
                </Pressable>
              </View>
            ))}
          </View>
          <View style={[styles.addTagRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <TextInput
              value={nuevaEtiqueta}
              onChangeText={setNuevaEtiqueta}
              onSubmitEditing={addEtiqueta}
              returnKeyType="done"
              placeholder="AÑADIR ETIQUETA (SHŌNEN, COMFORT...)"
              placeholderTextColor={theme.textDim}
              style={[styles.addTagInput, { color: theme.text, fontFamily: theme.fonts?.bold }]}
            />
            <Pressable onPress={addEtiqueta} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name="plus-circle" size={20} color={theme.secondary} />
            </Pressable>
          </View>

          {/* TEMAS: varios OP/ED/OST porque una obra de varias temporadas los acumula */}
          {esAnime && (
            <>
              <Tag text="OPENINGS, ENDINGS Y OST" color={theme.secondary} />
              {temas.length === 0 && (
                <Text style={[styles.hint, { color: theme.textDim, marginBottom: 10 }]}>
                  Añade cuantos quieras: una obra de varias temporadas tiene varios OP y ED.
                </Text>
              )}

              {temas.map((t, i) => {
                const acc = t.rango ? colorRango(t.rango, theme) : theme.border;
                return (
                  <View key={i} style={[styles.temaCard, { backgroundColor: theme.surface, borderColor: acc }]}>
                    <View style={styles.temaHead}>
                      <View style={styles.claseRow}>
                        {CLASES.map((c) => {
                          const on = t.clase === c;
                          return (
                            <TouchableOpacity
                              key={c}
                              activeOpacity={0.85}
                              onPress={() => setTema(i, { clase: c })}
                              style={[styles.claseChip, { borderColor: on ? theme.secondary : theme.border, backgroundColor: on ? theme.secondary : 'transparent' }]}
                            >
                              <Text style={[styles.claseText, { color: on ? getContrastText(theme.secondary) : theme.textDim, fontFamily: theme.fonts?.heading }]}>{c}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                      <TextInput
                        keyboardType="numeric"
                        value={t.numero}
                        onChangeText={(v) => setTema(i, { numero: v })}
                        placeholder="#"
                        placeholderTextColor={theme.textDim}
                        style={[styles.temaNum, { color: theme.text, borderColor: theme.border, fontFamily: theme.fonts?.display }]}
                      />
                      <Pressable onPress={() => delTema(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <MaterialCommunityIcons name="close" size={18} color={theme.error} />
                      </Pressable>
                    </View>

                    <TextInput
                      value={t.titulo}
                      onChangeText={(v) => setTema(i, { titulo: v })}
                      placeholder="NOMBRE DEL TEMA"
                      placeholderTextColor={theme.textDim}
                      style={[styles.temaInput, { color: theme.text, borderBottomColor: theme.border, fontFamily: theme.fonts?.bold }]}
                    />
                    <TextInput
                      value={t.artista}
                      onChangeText={(v) => setTema(i, { artista: v })}
                      placeholder="ARTISTA"
                      placeholderTextColor={theme.textDim}
                      style={[styles.temaInput, { color: theme.textDim, borderBottomColor: theme.border }]}
                    />
                    <View style={{ marginTop: 10 }}>
                      <RankPicker value={t.rango} onChange={(r) => setTema(i, { rango: r })} compact />
                    </View>
                  </View>
                );
              })}

              <View style={styles.addTemaRow}>
                {CLASES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    activeOpacity={0.85}
                    onPress={() => addTema(c)}
                    style={[styles.addTemaBtn, { borderColor: theme.secondary }]}
                  >
                    <MaterialCommunityIcons name="plus" size={14} color={theme.secondary} />
                    <Text style={[styles.addTemaText, { color: theme.secondary, fontFamily: theme.fonts?.heading }]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* REFLEXIÓN */}
          <Tag text="REFLEXIÓN" />
          <TextInput
            value={reflexion}
            onChangeText={(t) => { setReflexion(t); marcar(); }}
            placeholder="¿Qué te dejó? ¿Por qué le pusiste ese rango?"
            placeholderTextColor={theme.textDim}
            multiline
            textAlignVertical="top"
            style={[styles.reflexion, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border, fontFamily: theme.fonts?.body }]}
          />

          <Text style={[styles.autosave, { color: theme.textDim }]}>Los cambios se guardan al salir.</Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <P3RDatePicker
        visible={pickerInicio}
        value={parseFecha(fechaInicio)}
        maxDate={new Date(2100, 0, 1)}
        onAccept={(d) => { if (d) { setFechaInicio(fechaStr(d)); marcar(); } setPickerInicio(false); }}
        onCancel={() => setPickerInicio(false)}
      />
      <P3RDatePicker
        visible={pickerFin}
        value={parseFecha(fechaFin)}
        maxDate={new Date(2100, 0, 1)}
        onAccept={(d) => { if (d) { setFechaFin(fechaStr(d)); marcar(); } setPickerFin(false); }}
        onCancel={() => setPickerFin(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 18, paddingBottom: 90 },

  tituloInput: { paddingVertical: 13, paddingRight: 14, fontSize: 19, letterSpacing: 0.4 },

  rowGap: { flexDirection: 'row', gap: 12, marginTop: 14 },
  segBtn: { flex: 1, borderWidth: 1.5, borderRadius: 3, paddingVertical: 11, alignItems: 'center', transform: [{ skewX: '-11deg' }] },
  segText: { fontSize: 14, letterSpacing: 1.3, transform: [{ skewX: '11deg' }] },

  tagWrap: { marginTop: 26, marginBottom: 12 },
  hint: { fontSize: 11, marginTop: 8 },

  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  estadoChip: { borderWidth: 1.5, borderRadius: 2, paddingHorizontal: 11, paddingVertical: 7 },
  estadoText: { fontSize: 11, letterSpacing: 1.1 },

  progresoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  numBox: { flex: 1, borderWidth: 1.5, borderRadius: 3, paddingVertical: 8, paddingHorizontal: 14 },
  numInput: { fontSize: 24, padding: 0, includeFontPadding: false, textAlign: 'center' },
  slash: { fontSize: 22 },
  plusBtn: { width: 46, height: 46, borderWidth: 1.5, borderRadius: 3, justifyContent: 'center', alignItems: 'center' },

  fechaBtn: { flex: 1, borderWidth: 1.5, borderRadius: 3, paddingVertical: 10, paddingHorizontal: 12 },
  fechaLabel: { fontSize: 9, letterSpacing: 1.3 },
  fechaValor: { fontSize: 13, marginTop: 2 },

  etiqueta: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1.5, borderRadius: 2, paddingHorizontal: 10, paddingVertical: 6 },
  etiquetaText: { fontSize: 12 },
  addTagRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 3, paddingHorizontal: 12, paddingVertical: 9, marginTop: 10 },
  addTagInput: { flex: 1, fontSize: 12, letterSpacing: 0.4, padding: 0 },

  temaCard: { borderWidth: 1.5, borderRadius: 3, padding: 12, marginBottom: 12 },
  temaHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  claseRow: { flexDirection: 'row', gap: 6, flex: 1 },
  claseChip: { borderWidth: 1.5, borderRadius: 2, paddingHorizontal: 10, paddingVertical: 5 },
  claseText: { fontSize: 11, letterSpacing: 1 },
  temaNum: { width: 44, borderWidth: 1.5, borderRadius: 2, paddingVertical: 4, fontSize: 15, textAlign: 'center', padding: 0 },
  temaInput: { borderBottomWidth: 1, paddingVertical: 7, fontSize: 14 },

  addTemaRow: { flexDirection: 'row', gap: 10, marginTop: 2 },
  addTemaBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1.5, borderRadius: 3, paddingVertical: 9 },
  addTemaText: { fontSize: 12, letterSpacing: 1 },

  reflexion: { borderWidth: 1.5, borderRadius: 3, padding: 14, minHeight: 130, fontSize: 15, lineHeight: 22 },
  autosave: { fontSize: 11, textAlign: 'center', marginTop: 20 },
});

export default MediaDetailScreen;
