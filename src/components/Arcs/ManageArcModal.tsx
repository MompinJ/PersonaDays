import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useAlert } from '../../context/AlertContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../themes/useTheme';
import { db } from '../../database';
import { PersonaModal } from '../UI/PersonaModal';
import { P3RDatePicker } from '../UI/P3RDatePicker';
import { getContrastText } from '../../utils/colorUtils';
import { buildStatsSnapshot } from '../../services/arcService';
import { fetchAnthemMeta, isSpotifyUrl } from '../../services/anthemService';

// fecha_inicio/fecha_fin se guardan como 'yyyy-mm-dd'. Convertir en LOCAL (no
// new Date(str) que parsea en UTC y desfasa el dia, ni toISOString que vuelve a UTC).
const parseLocalDate = (s: string): Date => {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
const toDateStr = (d: Date): string => {
  const pad = (n: number) => (n < 10 ? '0' + n : '' + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const COLORS = ['#00D4FF', '#FF4D4F', '#28A745', '#FFC107', '#7B2CBF', '#FF7AC6', '#FF9800'];

const ManageArcModal = ({ visible, arc, onClose, onSaved }: { visible: boolean; arc: any | null; onClose: () => void; onSaved?: () => void }) => {
  const theme = useTheme();
  const { showAlert } = useAlert();
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fraseProtagonica, setFraseProtagonica] = useState('');
  const [anthemTitulo, setAnthemTitulo] = useState('');
  const [anthemUrl, setAnthemUrl] = useState('');
  const [anthemCover, setAnthemCover] = useState<string | null>(null);
  const [fetchingCover, setFetchingCover] = useState(false);
  const [fechaInicio, setFechaInicio] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [statRel, setStatRel] = useState<number | null>(null);
  const [statsOptions, setStatsOptions] = useState<Array<{ id_stat: number; nombre: string }>>([]);

  const [showPickerStart, setShowPickerStart] = useState(false);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const rows: any[] = await db.getAllAsync('SELECT id_stat, nombre FROM stats ORDER BY id_stat');
        setStatsOptions(rows || []);
      } catch (e) {
        console.error('Error cargando stats para selector:', e);
      }
    };
    loadStats();
    if (arc) {
      setNombre(arc.nombre || '');
      setDescripcion(arc.descripcion || '');
      setFraseProtagonica(arc.frase_protagonica || '');
      setAnthemTitulo(arc.anthem_titulo || '');
      setAnthemUrl(arc.anthem_url || '');
      setAnthemCover(arc.anthem_cover_url || null);
      setFechaInicio(arc.fecha_inicio || '');
      setColor(arc.color_hex || COLORS[0]);
      setStatRel(arc.id_stat_relacionado || null);
    } else {
      setNombre(''); setDescripcion(''); setFraseProtagonica(''); setAnthemTitulo(''); setAnthemUrl('');
      setAnthemCover(null); setFechaInicio(''); setColor(theme.primary); setStatRel(null);
    }
  }, [arc, visible]);

  // Al terminar de escribir el link de Spotify, traemos caratula + titulo (oEmbed).
  const onAnthemUrlBlur = async () => {
    if (!isSpotifyUrl(anthemUrl)) { setAnthemCover(null); return; }
    setFetchingCover(true);
    try {
      const meta = await fetchAnthemMeta(anthemUrl);
      if (meta.coverUrl) setAnthemCover(meta.coverUrl);
      if (meta.title && !anthemTitulo.trim()) setAnthemTitulo(meta.title);
    } finally {
      setFetchingCover(false);
    }
  };

  // Opciones de color: el color del personaje primero, luego la paleta fija
  const colorOptions = [theme.primary, ...COLORS.filter((c) => c.toLowerCase() !== theme.primary.toLowerCase())];

  const isCompleted = !!(arc && arc.estado === 'COMPLETADO');
  // El atributo que nutre el arco es su identidad (decide a donde van el bonus de
  // cierre y, por defecto, el impacto de sus misiones). Se fija al crear y NO se
  // puede cambiar despues: cambiarlo a medio arco parte la atribucion (misiones
  // viejas alimentan el stat viejo, el cierre el nuevo).
  const statLocked = !!arc;

  // Resuelve caratula + titulo del anthem (Spotify oEmbed). Se llama tambien en
  // save() para cubrir el caso de pegar el link y guardar sin que el onBlur haya
  // terminado el fetch (race que dejaba la caratula en null).
  const resolveAnthem = async (): Promise<{ cover: string | null; titulo: string }> => {
    let cover = anthemCover;
    let titulo = anthemTitulo;
    if (isSpotifyUrl(anthemUrl) && (!cover || !titulo.trim())) {
      const meta = await fetchAnthemMeta(anthemUrl);
      if (meta.coverUrl && !cover) cover = meta.coverUrl;
      if (meta.title && !titulo.trim()) titulo = meta.title;
    }
    return { cover, titulo };
  };

  const save = async () => {
    if (isCompleted) return;
    if (!nombre || !fechaInicio) {
      showAlert('ATENCIÓN', 'Nombre y fecha de inicio son requeridos');
      return;
    }
    try {
      // Asegura caratula/titulo aunque el fetch del onBlur no haya terminado.
      const { cover, titulo } = await resolveAnthem();
      if (cover !== anthemCover) setAnthemCover(cover);
      if (titulo !== anthemTitulo) setAnthemTitulo(titulo);

      if (arc && arc.id_arco) {
        // El UPDATE NO toca fecha_fin, snapshot_inicio ni id_stat_relacionado:
        // la fecha de cierre se fija al finalizar, el snapshot se captura al crear
        // y el atributo del arco esta bloqueado tras la creacion.
        await db.runAsync(
          'UPDATE arcos SET nombre = ?, descripcion = ?, frase_protagonica = ?, anthem_titulo = ?, anthem_url = ?, anthem_cover_url = ?, fecha_inicio = ?, color_hex = ? WHERE id_arco = ?',
          [nombre, descripcion, fraseProtagonica || null, titulo || null, anthemUrl || null, cover || null, fechaInicio, color, arc.id_arco]
        );
      } else {
        // Arco nuevo: nace ACTIVO (DEFAULT), sin fecha_fin (NULL). Fotografiamos las
        // stats actuales en snapshot_inicio para el radar comparativo del cierre.
        const snapshotInicio = await buildStatsSnapshot();
        await db.runAsync(
          'INSERT INTO arcos (nombre, descripcion, frase_protagonica, anthem_titulo, anthem_url, anthem_cover_url, fecha_inicio, color_hex, id_stat_relacionado, snapshot_inicio) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [nombre, descripcion, fraseProtagonica || null, titulo || null, anthemUrl || null, cover || null, fechaInicio, color, statRel, snapshotInicio]
        );
      }
      if (onSaved) onSaved();
    } catch (e) {
      console.error('Error guardando arco:', e);
    }
  };

  return (
    <PersonaModal visible={visible} onClose={onClose} title={arc ? 'EDITAR ARCO' : 'NUEVO ARCO'}>
      <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
        <TextInput placeholder="TÍTULO DEL CAPÍTULO" placeholderTextColor={theme.textDim} value={nombre} onChangeText={setNombre} style={[styles.input, { color: theme.text, borderBottomColor: theme.primary }]} />
        <TextInput placeholder="Descripción" placeholderTextColor={theme.textDim} value={descripcion} onChangeText={setDescripcion} style={[styles.input, { color: theme.text, borderBottomColor: theme.border }]} />
        <TextInput placeholder="Frase que define este arco" placeholderTextColor={theme.textDim} value={fraseProtagonica} onChangeText={setFraseProtagonica} style={[styles.input, { color: theme.text, borderBottomColor: theme.border, fontStyle: 'italic' }]} />

        <Text style={[styles.label, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>ANTHEM (BANDA SONORA)</Text>
        <View style={styles.anthemEditRow}>
          <View style={[styles.coverPreview, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            {fetchingCover ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : anthemCover ? (
              <Image source={{ uri: anthemCover }} style={styles.coverImg} />
            ) : (
              <MaterialCommunityIcons name="music-note" size={22} color={theme.textDim} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <TextInput placeholder="Canción que marcó la etapa" placeholderTextColor={theme.textDim} value={anthemTitulo} onChangeText={setAnthemTitulo} style={[styles.input, { color: theme.text, borderBottomColor: theme.border, marginTop: 0 }]} />
            <TextInput placeholder="Link de Spotify (trae la carátula)" placeholderTextColor={theme.textDim} value={anthemUrl} onChangeText={setAnthemUrl} onBlur={onAnthemUrlBlur} autoCapitalize="none" keyboardType="url" style={[styles.input, { color: theme.text, borderBottomColor: theme.border }]} />
          </View>
        </View>

        <View style={styles.dateRow}>
          <TouchableOpacity onPress={() => { if (!isCompleted) setShowPickerStart(true); }} style={[styles.dateBtn, { flex: 1, borderColor: theme.primary }]}>
            <Ionicons name="calendar-outline" size={16} color={theme.primary} style={styles.unskew} />
            <Text style={[styles.dateText, { color: fechaInicio ? theme.text : theme.textDim }]}>{fechaInicio || 'INICIO'}</Text>
          </TouchableOpacity>
        </View>

        <P3RDatePicker
          visible={showPickerStart}
          value={fechaInicio ? parseLocalDate(fechaInicio) : new Date()}
          maxDate={new Date(2100, 0, 1)}
          onAccept={(d) => { if (d) setFechaInicio(toDateStr(d)); setShowPickerStart(false); }}
          onCancel={() => setShowPickerStart(false)}
        />

        <Text style={[styles.label, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>COLOR</Text>
        <View style={styles.colorRow}>
          {colorOptions.map((c) => (
            <TouchableOpacity key={c} onPress={() => setColor(c)} style={[styles.colorDot, { backgroundColor: c, borderColor: color === c ? theme.text : 'transparent' }]}>
              {color === c && <Ionicons name="checkmark" size={16} color={getContrastText(c)} />}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>
          {statLocked ? 'ATRIBUTO QUE NUTRE (FIJO)' : 'STAT RELACIONADO (OPCIONAL)'}
        </Text>
        {statLocked ? (
          <>
            <View style={styles.statRow}>
              <StatChip
                label={(statsOptions.find((s) => s.id_stat === statRel)?.nombre || 'NINGUNO').toUpperCase()}
                active
                onPress={() => {}}
                skew={-12}
                disabled
              />
            </View>
            <Text style={[styles.lockNote, { color: theme.textDim, fontFamily: theme.fonts?.body }]}>
              El atributo se decide al crear el arco y no se puede cambiar despues.
            </Text>
          </>
        ) : (
          <View style={styles.statRow}>
            <StatChip label="NINGUNO" active={statRel === null} onPress={() => setStatRel(null)} skew={-12} />
            {statsOptions.map((s, i) => (
              <StatChip key={s.id_stat} label={s.nombre.toUpperCase()} active={statRel === s.id_stat} onPress={() => setStatRel(s.id_stat)} skew={[-14, 10, -11, 13, -16][i % 5]} />
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
          <Text style={{ color: theme.textDim, fontFamily: theme.fonts?.bold, letterSpacing: 1 }}>CANCELAR</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={isCompleted ? undefined : save} activeOpacity={0.9} style={[styles.skewBtn, { backgroundColor: isCompleted ? theme.inactive : theme.primary }]}>
          <Text style={[styles.skewBtnText, { color: isCompleted ? theme.textDim : theme.textInverse, fontFamily: theme.fonts?.heading }]}>{isCompleted ? 'NO EDITABLE' : 'GUARDAR'}</Text>
        </TouchableOpacity>
      </View>
    </PersonaModal>
  );
};

// Chip de stat inclinado (parallelogramo)
const StatChip = ({ label, active, onPress, skew, disabled }: { label: string; active: boolean; onPress: () => void; skew: number; disabled?: boolean }) => {
  const theme = useTheme();
  return (
    <TouchableOpacity disabled={disabled} activeOpacity={disabled ? 1 : 0.85} onPress={onPress} style={[styles.statChip, { borderColor: theme.primary, backgroundColor: active ? theme.primary : theme.surface, transform: [{ skewX: `${skew}deg` }] }]}>
      <Text style={{ color: active ? theme.textInverse : theme.textDim, fontFamily: theme.fonts?.heading, fontSize: 12, transform: [{ skewX: `${-skew}deg` }] }}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  input: { borderBottomWidth: 2, paddingVertical: 9, marginTop: 10, fontSize: 16 },
  label: { fontSize: 11, marginTop: 18, marginBottom: 10, letterSpacing: 1, textTransform: 'uppercase' },

  anthemEditRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  coverPreview: { width: 60, height: 60, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  coverImg: { width: '100%', height: '100%' },

  dateRow: { flexDirection: 'row', gap: 12, marginTop: 14 },
  dateBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 14, borderWidth: 1.5, transform: [{ skewX: '-10deg' }] },
  dateText: { marginLeft: 8, fontSize: 13, letterSpacing: 0.5, transform: [{ skewX: '10deg' }] },
  unskew: { transform: [{ skewX: '10deg' }] },

  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorDot: { width: 36, height: 36, borderRadius: 18, borderWidth: 3, justifyContent: 'center', alignItems: 'center' },

  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statChip: { paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1.5 },
  lockNote: { fontSize: 12, marginTop: 8, fontStyle: 'italic' },

  footer: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 18 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 14, marginRight: 8 },
  skewBtn: { paddingVertical: 12, paddingHorizontal: 24, transform: [{ skewX: '-12deg' }] },
  skewBtnText: { fontSize: 15, letterSpacing: 1, textTransform: 'uppercase', transform: [{ skewX: '12deg' }] },
});

export default ManageArcModal;
