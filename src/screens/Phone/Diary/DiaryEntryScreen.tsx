import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, AppState } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../../themes/useTheme';
import { PhoneHeader } from '../../../components/Phone/PhoneHeader';
import { MarkdownEditor } from '../../../components/UI/MarkdownEditor';
import { useAlert } from '../../../context/AlertContext';
import {
  getEntrada, guardarEntrada, borrarEntrada, getContextoDia,
  parseClave, esHoy, fechaPagaXp, ANIMOS, ContextoDia, XP_POR_ENTRADA, STATS_DIARIO,
} from '../../../services/diaryService';

const MESES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
const DOW = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];

const colorAnimo = (a: number | null, theme: any): string => {
  switch (a) {
    case 1: return theme.error;
    case 2: return theme.secondary;
    case 3: return theme.textDim;
    case 4: return theme.primary;
    case 5: return theme.success;
    default: return theme.inactive;
  }
};

export const DiaryEntryScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { showAlert } = useAlert();
  const fecha: string = route.params?.fecha;

  const [contenido, setContenido] = useState('');
  const [animo, setAnimo] = useState<number | null>(null);
  const [editando, setEditando] = useState(false);
  const [contexto, setContexto] = useState<ContextoDia | null>(null);
  const [yaPago, setYaPago] = useState(false);
  const [cargada, setCargada] = useState(false);

  const sucio = useRef(false);
  const borrada = useRef(false);
  const snap = useRef({ contenido: '', animo: null as number | null });
  snap.current = { contenido, animo };

  useEffect(() => {
    const cargar = async () => {
      try {
        const [e, ctx] = await Promise.all([getEntrada(fecha), getContextoDia(fecha)]);
        setContenido(e?.contenido || '');
        setAnimo(e?.animo ?? null);
        setYaPago(e?.xp_otorgado === 1);
        setContexto(ctx);
        // Si el dia esta en blanco se abre escribiendo; si ya hay texto, leyendo.
        setEditando(!(e?.contenido || '').trim());
        setCargada(true);
      } catch (err) { console.error('Error cargando entrada', err); }
    };
    cargar();
  }, [fecha]);

  const guardar = useCallback(async () => {
    const s = snap.current;
    try {
      const res = await guardarEntrada(fecha, s.contenido, s.animo);
      sucio.current = false;
      if (res.xpGanada > 0) {
        setYaPago(true);
        const lista = res.stats.join(' y ');
        showAlert(
          res.subieron.length > 0 ? `¡${res.subieron.join(' y ')} SUBIÓ DE NIVEL!` : 'ENTRADA GUARDADA',
          `+${res.xpGanada} XP de ${lista}.`
        );
      }
    } catch (e) { console.error('Error guardando entrada', e); }
  }, [fecha, showAlert]);

  // La navegacion no espera promesas: frenamos la salida, guardamos y
  // reemitimos la accion, para que la lista no se recargue con datos viejos.
  useEffect(() => {
    const off = navigation.addListener('beforeRemove', (e: any) => {
      if (!sucio.current || borrada.current) return;
      e.preventDefault();
      guardar().finally(() => navigation.dispatch(e.data.action));
    });
    return off;
  }, [navigation, guardar]);

  // Guardar solo al salir de la pantalla no basta para un diario: una llamada
  // o un cambio de app se llevaria la entrada entera. Guardamos tambien al
  // pasar a segundo plano y cada pocos segundos mientras se escribe.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado !== 'active' && sucio.current && !borrada.current) guardar();
    });
    return () => sub.remove();
  }, [guardar]);

  useEffect(() => {
    if (!cargada) return;
    const t = setTimeout(() => {
      if (sucio.current && !borrada.current) guardar();
    }, 4000);
    return () => clearTimeout(t);
  }, [contenido, animo, cargada, guardar]);

  const cambiarTexto = (t: string) => { setContenido(t); sucio.current = true; };
  const cambiarAnimo = (v: number) => { setAnimo((p) => (p === v ? null : v)); sucio.current = true; };

  const borrar = () => {
    showAlert('ELIMINAR ENTRADA', '¿Borrar lo escrito este día? No se puede deshacer.', [
      { text: 'CANCELAR', style: 'cancel' },
      { text: 'ELIMINAR', style: 'destructive', onPress: async () => {
        try {
          await borrarEntrada(fecha);
          borrada.current = true;
          navigation.goBack();
        } catch (e) {
          console.error('Error eliminando entrada', e);
          showAlert('ERROR', 'No se pudo eliminar.');
        }
      } },
    ]);
  };

  if (!cargada) return <View style={[styles.container, { backgroundColor: theme.background }]} />;

  const d = parseClave(fecha);
  const titulo = esHoy(fecha) ? 'HOY' : `${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}`;
  const pagaXp = fechaPagaXp(fecha);

  // Contexto del dia: lo que la app ya sabe sin que escribas nada.
  const ContextoBloque = contexto && (contexto.misiones > 0 || contexto.gasto > 0 || contexto.arco) ? (
    <View style={[styles.ctx, { borderColor: theme.border }]}>
      {contexto.misiones > 0 && (
        <View style={styles.ctxRow}>
          <MaterialCommunityIcons name="sword-cross" size={14} color={theme.primary} />
          <Text style={[styles.ctxText, { color: theme.textDim }]}>
            {contexto.misiones} {contexto.misiones === 1 ? 'misión completada' : 'misiones completadas'}
            {contexto.xp > 0 ? ` · +${contexto.xp} XP` : ''}
          </Text>
        </View>
      )}
      {contexto.gasto > 0 && (
        <View style={styles.ctxRow}>
          <MaterialCommunityIcons name="wallet-outline" size={14} color={theme.error} />
          <Text style={[styles.ctxText, { color: theme.textDim }]}>
            Gastaste ¥{Math.round(contexto.gasto).toLocaleString('es-MX')}
          </Text>
        </View>
      )}
      {contexto.arco && (
        <View style={styles.ctxRow}>
          <View style={[styles.ctxDot, { backgroundColor: contexto.arco.color }]} />
          <Text style={[styles.ctxText, { color: theme.textDim }]} numberOfLines={1}>
            Arco: {contexto.arco.nombre}
          </Text>
        </View>
      )}
    </View>
  ) : null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <PhoneHeader
        title={titulo}
        showBackButton
        rightAction={
          <TouchableOpacity onPress={borrar} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialCommunityIcons name="trash-can-outline" size={23} color={theme.error} />
          </TouchableOpacity>
        }
      />

      {/* Fecha completa + animo: visibles siempre, tambien mientras escribes */}
      <View style={[styles.cabecera, { borderBottomColor: theme.border }]}>
        <Text style={[styles.fecha, { color: theme.text, fontFamily: theme.fonts?.heading }]}>
          {DOW[d.getDay()]} {d.getDate()} DE {MESES[d.getMonth()]} DE {d.getFullYear()}
        </Text>

        <View style={styles.animoRow}>
          {ANIMOS.map((a) => {
            const on = animo === a.valor;
            const c = colorAnimo(a.valor, theme);
            return (
              <TouchableOpacity
                key={a.valor}
                activeOpacity={0.8}
                onPress={() => cambiarAnimo(a.valor)}
                style={[styles.animoBtn, { borderColor: on ? c : theme.border, backgroundColor: on ? c + '22' : 'transparent' }]}
              >
                <MaterialCommunityIcons name={a.icono as any} size={22} color={on ? c : theme.textDim} />
              </TouchableOpacity>
            );
          })}
        </View>

        {!yaPago && pagaXp && (
          <Text style={[styles.xpNota, { color: theme.textDim }]}>
            Escribir este día suma +{XP_POR_ENTRADA} XP de {STATS_DIARIO.join(' y ')}.
          </Text>
        )}
        {!pagaXp && (
          <Text style={[styles.xpNota, { color: theme.textDim }]}>
            Día pasado: se guarda igual, pero ya no suma XP.
          </Text>
        )}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <MarkdownEditor
          value={contenido}
          onChange={cambiarTexto}
          onCommit={guardar}
          editing={editando}
          onEditingChange={setEditando}
          placeholder="¿Cómo estuvo el día?"
          emptyText="_Este día está en blanco. Toca el lápiz para escribirlo._"
          readHeader={ContextoBloque}
        />
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  cabecera: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14, borderBottomWidth: 1 },
  fecha: { fontSize: 15, letterSpacing: 0.8 },
  animoRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  animoBtn: { flex: 1, height: 42, borderWidth: 1.5, borderRadius: 3, justifyContent: 'center', alignItems: 'center' },
  xpNota: { fontSize: 11, marginTop: 10 },

  ctx: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 18, gap: 7 },
  ctxRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ctxDot: { width: 12, height: 12, borderRadius: 3, transform: [{ skewX: '-20deg' }] },
  ctxText: { flex: 1, fontSize: 12 },
});

export default DiaryEntryScreen;
