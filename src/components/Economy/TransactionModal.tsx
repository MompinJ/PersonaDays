import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { useTheme } from '../../themes/useTheme';
import { db } from '../../database';
import { getPlayer } from '../../services/playerService';
import { useAlert } from '../../context/AlertContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CategoryIcon, getCategory } from '../category-icons';
import { getContrastText } from '../../utils/colorUtils';
import { PersonaModal } from '../UI/PersonaModal';
import { PersonaShard } from '../UI/PersonaShard';
import { P3RDatePicker } from '../UI/P3RDatePicker';
import {
  getCategories, getLiquidaciones, setLiquidaciones, createTransaction, updateTransaction,
  deleteTransaction, toDbDate, Transaction, TipoMovimiento, FinancialCategory,
} from '../../services/economyService';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
  transaction?: Transaction | null;   // si viene, el modal edita en vez de crear
};

// Una parte del movimiento que va a volver. 'contraparte' es solo un concepto
// para que tu sepas de que es (puede quedar vacio). El monto vive como texto
// mientras se escribe; monto_pagado se toca desde el modal de recuperacion.
type Parte = { id_liquidacion?: number; contraparte: string; monto: string; monto_pagado: number };

const num = (s: string) => parseFloat((s || '').replace(',', '.')) || 0;
const fmt = (n: number) => Math.round(n || 0).toLocaleString('es-MX');

// 'YYYY-MM-DD HH:MM:SS' -> Date local (new Date(str) lo interpretaria como UTC
// en algunos motores y correría el movimiento un dia).
const parseDbDate = (s?: string | null): Date => {
  if (!s) return new Date();
  const [f, h] = s.split(' ');
  const [y, m, d] = f.split('-').map(Number);
  const [hh, mm, ss] = (h || '00:00:00').split(':').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, ss || 0);
};

export const TransactionModal = ({ visible, onClose, onSaved, transaction }: Props) => {
  const colors = useTheme();
  const { showAlert } = useAlert();
  const { height: altoPantalla } = useWindowDimensions();
  const editing = !!transaction;

  const [monto, setMonto] = useState('');
  const [tipo, setTipo] = useState<TipoMovimiento>('GASTO');
  const [concepto, setConcepto] = useState('');
  const [categoria, setCategoria] = useState<number | null>(null);
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [fecha, setFecha] = useState<Date>(new Date());
  const [showDate, setShowDate] = useState(false);
  const [partes, setPartes] = useState<Parte[]>([]);
  const [saving, setSaving] = useState(false);

  // Carga inicial: en edicion volcamos el movimiento y sus partes; en alta
  // dejamos todo limpio con la fecha de hoy.
  useEffect(() => {
    if (!visible) return;
    if (transaction) {
      setMonto(String(Math.round(transaction.monto)));
      setTipo(transaction.tipo);
      setConcepto(transaction.descripcion || '');
      setCategoria(transaction.id_categoria);
      setFecha(parseDbDate(transaction.fecha));
      getLiquidaciones(transaction.id_finanza)
        .then((ls) => setPartes(ls.map((l) => ({
          id_liquidacion: l.id_liquidacion,
          contraparte: l.contraparte || '',
          monto: String(Math.round(l.monto)),
          monto_pagado: l.monto_pagado || 0,
        }))))
        .catch((e) => console.error('Error cargando liquidaciones', e));
    } else {
      setMonto(''); setTipo('GASTO'); setConcepto(''); setCategoria(null);
      setFecha(new Date()); setPartes([]);
    }
  }, [visible, transaction?.id_finanza]);

  // Las categorias se filtran por tipo; al cambiar de tipo la seleccion previa
  // deja de ser valida.
  useEffect(() => {
    if (!visible) return;
    getCategories(tipo)
      .then((rows) => {
        setCategories(rows);
        setCategoria((prev) => (prev && rows.some((r) => r.id_categoria === prev) ? prev : rows[0]?.id_categoria ?? null));
      })
      .catch((e) => console.error('Error cargando categorías', e));
  }, [visible, tipo]);

  const total = num(monto);
  const esperado = useMemo(() => partes.reduce((s, p) => s + num(p.monto), 0), [partes]);
  const cobrado = useMemo(() => partes.reduce((s, p) => s + (p.monto_pagado || 0), 0), [partes]);
  const netoFinal = total - esperado;
  const netoHoy = total - cobrado;

  const addParte = () => setPartes((p) => [...p, { contraparte: '', monto: '', monto_pagado: 0 }]);
  const setParte = (i: number, patch: Partial<Parte>) =>
    setPartes((p) => p.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const delParte = (i: number) => setPartes((p) => p.filter((_, j) => j !== i));

  // Cuenta compartida: reparte el total entre n y deja tu parte fuera, o sea
  // crea n-1 partes por total/n cada una.
  const dividirEntre = (n: number) => {
    if (total <= 0) { showAlert('FALTA EL MONTO', 'Escribe primero cuánto pagaste.'); return; }
    const parte = Math.round(total / n);
    setPartes(Array.from({ length: n - 1 }, (_, i) => ({
      contraparte: partes[i]?.contraparte || '',
      monto: String(parte),
      monto_pagado: partes[i]?.monto_pagado || 0,
    })));
  };

  const otorgarXp = async () => {
    const player = await getPlayer();
    if (!player?.id_jugador) return;
    const statRows: any[] = await db.getAllAsync('SELECT id_stat FROM stats WHERE nombre = ? LIMIT 1', ['Conocimiento']);
    if (!statRows?.length) { console.warn('Stat "Conocimiento" no encontrada. No se otorgó XP.'); return; }
    const idStat = statRows[0].id_stat;
    const jsRows: any[] = await db.getAllAsync('SELECT id_jugador_stat FROM jugador_stat WHERE id_jugador = ? AND id_stat = ? LIMIT 1', [player.id_jugador, idStat]);
    if (jsRows?.length) {
      await db.runAsync('UPDATE jugador_stat SET experiencia_actual = experiencia_actual + ? WHERE id_stat = ? AND id_jugador = ?', [2, idStat, player.id_jugador]);
    } else {
      await db.runAsync('INSERT INTO jugador_stat (id_jugador, id_stat, nivel_actual, experiencia_actual, nivel_maximo) VALUES (?, ?, 1, ?, 99)', [player.id_jugador, idStat, 2]);
    }
  };

  const save = async () => {
    if (saving) return;
    if (!total || total <= 0) { showAlert('ERROR', 'Ingresa un monto válido mayor a 0.'); return; }
    if (!concepto.trim()) { showAlert('FALTA INFORMACIÓN', 'Debes escribir un concepto o descripción.'); return; }
    if (!categoria) { showAlert('FALTA CATEGORÍA', 'Selecciona una categoría para clasificar el movimiento.'); return; }
    if (esperado > total + 0.005) {
      showAlert('REVISA LAS PARTES', `Lo que va a volver (¥${fmt(esperado)}) supera el monto del movimiento (¥${fmt(total)}).`);
      return;
    }

    setSaving(true);
    try {
      const datos = {
        tipo,
        monto: total,
        id_categoria: categoria,
        descripcion: concepto.trim(),
        // `fecha` ya conserva la hora (la original al editar, la de ahora al crear).
        fecha: toDbDate(fecha),
      };

      const id = editing
        ? (await updateTransaction(transaction!.id_finanza, datos), transaction!.id_finanza)
        : await createTransaction(datos);

      await setLiquidaciones(id, partes
        .filter((p) => num(p.monto) > 0)
        .map((p) => ({
          id_liquidacion: p.id_liquidacion,
          contraparte: p.contraparte.trim() || null,
          monto: num(p.monto),
          monto_pagado: Math.min(p.monto_pagado || 0, num(p.monto)),
          fecha_pago: (p.monto_pagado || 0) >= num(p.monto) - 0.005 ? toDbDate() : null,
        })));

      if (!editing) {
        try { await otorgarXp(); } catch (e) { console.error('Error otorgando XP:', e); }
      }

      const msg = editing
        ? 'Movimiento actualizado.'
        : `Transacción guardada. \n+2 XP Conocimiento${esperado > 0 ? `\nPor recuperar ¥${fmt(esperado)}` : ''}`;
      showAlert(editing ? 'CAMBIOS GUARDADOS' : 'REGISTRO COMPLETADO', msg, [
        { text: 'OK', onPress: () => { onSaved && onSaved(); onClose(); } },
      ]);
    } catch (e) {
      console.error('Error guardando transacción', e);
      showAlert('ERROR', 'No se pudo guardar la transacción');
    } finally {
      setSaving(false);
    }
  };

  const borrar = () => {
    if (!transaction) return;
    showAlert('ELIMINAR MOVIMIENTO', `Se borrará "${transaction.descripcion || 'este movimiento'}"${transaction.partes > 0 ? ' y sus partes por recuperar' : ''}. No se puede deshacer.`, [
      { text: 'CANCELAR', style: 'cancel' },
      { text: 'ELIMINAR', style: 'destructive', onPress: async () => {
        try {
          await deleteTransaction(transaction.id_finanza);
          onSaved && onSaved();
          onClose();
        } catch (e) {
          console.error('Error eliminando transacción', e);
          showAlert('ERROR', 'No se pudo eliminar el movimiento');
        }
      } },
    ]);
  };

  const ingresoColor = colors.success;
  const gastoColor = colors.error;
  const tipoColor = tipo === 'INGRESO' ? ingresoColor : gastoColor;
  const fechaLabel = fecha.toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();

  return (
    <PersonaModal visible={visible} onClose={onClose} title={editing ? 'EDITAR MOVIMIENTO' : 'NUEVO MOVIMIENTO'}>
      {/* El formulario crecio (fecha + partes + resumen) y PersonaModal no
          desplaza su contenido, asi que el cuerpo scrollea y las acciones se
          quedan siempre visibles al pie. */}
      <ScrollView
        style={{ maxHeight: altoPantalla * 0.62 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
      {/* TIPO - botones parallelogramo */}
      <View style={styles.tagWrap}><PersonaShard label="TIPO" height={22} fontSize={10} /></View>
      <View style={styles.typeRow}>
        {(['INGRESO', 'GASTO'] as const).map((t) => {
          const acc = t === 'INGRESO' ? ingresoColor : gastoColor;
          const on = tipo === t;
          return (
            <TouchableOpacity
              key={t}
              activeOpacity={0.85}
              style={[styles.typeButton, { borderColor: acc, backgroundColor: on ? acc : colors.surface, transform: [{ skewX: '-12deg' }] }]}
              onPress={() => setTipo(t)}
            >
              <Text style={[styles.typeText, { color: on ? getContrastText(acc) : colors.textDim, fontFamily: colors.fonts?.heading, transform: [{ skewX: '12deg' }] }]}>{t}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* MONTO - protagonista, gigante */}
      <View style={styles.tagWrap}><PersonaShard label="MONTO" height={24} fontSize={11} color={tipoColor} /></View>
      <View style={[styles.montoCard, { backgroundColor: colors.background, borderColor: tipoColor }]}>
        <View style={[styles.montoAccent, { backgroundColor: tipoColor }]} />
        <View style={[styles.montoStripe, { backgroundColor: colors.secondary }]} />
        <Text style={[styles.yenSign, { color: tipoColor, fontFamily: colors.fonts?.display }]}>¥</Text>
        <TextInput
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={colors.textDim}
          style={[styles.montoInput, { color: colors.text, fontFamily: colors.fonts?.display }]}
          value={monto}
          onChangeText={setMonto}
        />
      </View>

      {/* CONCEPTO */}
      <View style={styles.tagWrap}><PersonaShard label="CONCEPTO" variant="ghost" height={22} fontSize={10} /></View>
      <TextInput
        placeholder="EJ: CINE, NÓMINA..."
        placeholderTextColor={colors.textDim}
        style={[styles.input, { color: colors.text, borderBottomColor: colors.primary, fontFamily: colors.fonts?.bold }]}
        value={concepto}
        onChangeText={setConcepto}
      />

      {/* FECHA - antes siempre era "ahora", asi que no se podia capturar algo de ayer */}
      <View style={styles.tagWrap}><PersonaShard label="FECHA" variant="ghost" height={22} fontSize={10} /></View>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setShowDate(true)}
        style={[styles.fechaBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
      >
        <MaterialCommunityIcons name="calendar-blank" size={18} color={colors.primary} />
        <Text style={[styles.fechaText, { color: colors.text, fontFamily: colors.fonts?.bold }]}>{fechaLabel}</Text>
        <MaterialCommunityIcons name="chevron-down" size={18} color={colors.textDim} />
      </TouchableOpacity>

      {/* CATEGORÍA - chips caoticos (rotados + esquinados + escalonados) */}
      <View style={styles.tagWrap}><PersonaShard label="CATEGORÍA" height={22} fontSize={10} color={colors.secondary} /></View>
      <View style={styles.catRow}>
        {categories.length > 0 ? categories.map((c, i) => {
          const selected = categoria === c.id_categoria;
          const chipText = selected ? getContrastText(c.color) : colors.text;
          const sk = [-14, 12, -16, 10, -13][i % 5];
          const rot = [-3, 2, -2, 3, -1][i % 5];
          const st = [0, 12, 4, 10, 2][i % 5];
          return (
            <TouchableOpacity
              key={c.id_categoria}
              activeOpacity={0.85}
              onPress={() => setCategoria(c.id_categoria)}
              style={[styles.catBtn, { marginTop: st, borderColor: selected ? c.color : colors.border, backgroundColor: selected ? c.color : colors.surface, transform: [{ rotate: `${rot}deg` }, { skewX: `${sk}deg` }] }]}
            >
              <View style={[styles.catInner, { transform: [{ skewX: `${-sk}deg` }] }]}>
                <CategoryIcon category={getCategory(c.icono).key} size={18} skew={0} color={chipText} />
                <Text style={{ color: chipText, marginLeft: 8, fontFamily: colors.fonts?.heading, fontSize: 14, letterSpacing: 0.5 }}>{c.nombre}</Text>
              </View>
            </TouchableOpacity>
          );
        }) : (
          <View style={{ padding: 8 }}>
            <Text style={{ color: colors.textDim, fontFamily: colors.fonts?.body }}>No hay categorías. Crea una en ajustes.</Text>
          </View>
        )}
      </View>

      {/* POR RECUPERAR - partes de este movimiento que sabes que van a volver.
          No es una deuda ni requiere una persona: el concepto es solo para que
          tu sepas de que es. */}
      <View style={styles.tagWrap}>
        <PersonaShard label={tipo === 'GASTO' ? 'POR RECUPERAR' : 'POR DEVOLVER'} height={22} fontSize={10} color={colors.secondary} />
      </View>

      {partes.length === 0 && (
        <Text style={[styles.hint, { color: colors.textDim }]}>
          {tipo === 'GASTO'
            ? 'Si parte de este dinero va a volver (te lo reembolsan, alguien te pasa su parte, lo pusiste por adelantado), apúntalo aquí. El movimiento sigue valiendo el total, pero tu costo real baja conforme regrese.'
            : 'Si este dinero no es realmente tuyo y va a salir otra vez, apunta aquí cuánto.'}
        </Text>
      )}

      {partes.map((p, i) => {
        const pm = num(p.monto);
        const pagado = (p.monto_pagado || 0) >= pm - 0.005 && pm > 0;
        return (
          <View key={i} style={[styles.parteRow, { borderColor: pagado ? colors.success : colors.border, backgroundColor: colors.surface }]}>
            <MaterialCommunityIcons
              name={pagado ? 'check-circle' : 'label-outline'}
              size={18}
              color={pagado ? colors.success : colors.textDim}
            />
            <TextInput
              placeholder="DE QUÉ ES (OPCIONAL)"
              placeholderTextColor={colors.textDim}
              value={p.contraparte}
              onChangeText={(t) => setParte(i, { contraparte: t })}
              style={[styles.parteName, { color: colors.text, fontFamily: colors.fonts?.bold }]}
            />
            <Text style={{ color: colors.textDim, fontFamily: colors.fonts?.display }}>¥</Text>
            <TextInput
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.textDim}
              value={p.monto}
              onChangeText={(t) => setParte(i, { monto: t })}
              style={[styles.parteMonto, { color: colors.text, fontFamily: colors.fonts?.display }]}
            />
            <TouchableOpacity onPress={() => delParte(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name="close" size={18} color={colors.error} />
            </TouchableOpacity>
          </View>
        );
      })}

      <View style={styles.parteActions}>
        <TouchableOpacity onPress={addParte} activeOpacity={0.85} style={[styles.addParteBtn, { borderColor: colors.secondary }]}>
          <MaterialCommunityIcons name="plus-circle-outline" size={16} color={colors.secondary} />
          <Text style={[styles.addParteText, { color: colors.secondary, fontFamily: colors.fonts?.heading }]}>AGREGAR</Text>
        </TouchableOpacity>
        {[2, 3, 4].map((n) => (
          <TouchableOpacity key={n} onPress={() => dividirEntre(n)} activeOpacity={0.85} style={[styles.divBtn, { borderColor: colors.border }]}>
            <Text style={[styles.divText, { color: colors.textDim, fontFamily: colors.fonts?.heading }]}>÷{n}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {esperado > 0 && (
        <View style={[styles.netoCard, { borderColor: tipoColor, backgroundColor: colors.background }]}>
          <View style={styles.netoLine}>
            <Text style={[styles.netoLabel, { color: colors.textDim, fontFamily: colors.fonts?.condensed }]}>
              {tipo === 'GASTO' ? 'PAGASTE' : 'RECIBISTE'}
            </Text>
            <Text style={[styles.netoVal, { color: colors.text, fontFamily: colors.fonts?.display }]}>¥{fmt(total)}</Text>
          </View>
          <View style={styles.netoLine}>
            <Text style={[styles.netoLabel, { color: colors.textDim, fontFamily: colors.fonts?.condensed }]}>
              {cobrado > 0 ? `YA VOLVIÓ (¥${fmt(esperado - cobrado)} PENDIENTE)` : 'VA A VOLVER'}
            </Text>
            <Text style={[styles.netoVal, { color: colors.secondary, fontFamily: colors.fonts?.display }]}>
              -¥{fmt(cobrado > 0 ? cobrado : esperado)}
            </Text>
          </View>
          <View style={[styles.netoSep, { backgroundColor: colors.border }]} />
          <View style={styles.netoLine}>
            <Text style={[styles.netoLabel, { color: colors.text, fontFamily: colors.fonts?.condensed }]}>
              {cobrado > 0 && cobrado < esperado ? 'TE CUESTA HOY' : 'TE CUESTA'}
            </Text>
            <Text style={[styles.netoTotal, { color: tipoColor, fontFamily: colors.fonts?.display }]}>
              ¥{fmt(cobrado > 0 ? netoHoy : netoFinal)}
            </Text>
          </View>
          {cobrado > 0 && cobrado < esperado && (
            <Text style={[styles.netoFoot, { color: colors.textDim }]}>Cuando vuelva todo quedará en ¥{fmt(netoFinal)}.</Text>
          )}
        </View>
      )}

      </ScrollView>

      {/* ACCIONES */}
      <View style={styles.actions}>
        {editing && (
          <TouchableOpacity onPress={borrar} style={styles.deleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="trash-can-outline" size={22} color={colors.error} />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
          <Text style={{ color: colors.textDim, fontFamily: colors.fonts?.bold, letterSpacing: 1 }}>CANCELAR</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={save} activeOpacity={0.9} disabled={saving} style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}>
          <Text style={[styles.saveBtnText, { color: colors.textInverse, fontFamily: colors.fonts?.heading }]}>GUARDAR</Text>
        </TouchableOpacity>
      </View>

      <P3RDatePicker
        visible={showDate}
        value={fecha}
        maxDate={new Date(2100, 0, 1)}
        onAccept={(d) => {
          // El calendario devuelve el dia a medianoche; conservamos la hora que
          // ya tenia el movimiento para no alterar su orden en la lista.
          if (d) setFecha(new Date(d.getFullYear(), d.getMonth(), d.getDate(), fecha.getHours(), fecha.getMinutes(), fecha.getSeconds()));
          setShowDate(false);
        }}
        onCancel={() => setShowDate(false)}
      />
    </PersonaModal>
  );
};

const styles = StyleSheet.create({
  tagWrap: { marginTop: 14, marginBottom: 10 },
  hint: { fontSize: 12, lineHeight: 17, marginBottom: 4 },

  typeRow: { flexDirection: 'row', gap: 14 },
  typeButton: { flex: 1, paddingVertical: 13, borderWidth: 2, alignItems: 'center' },
  typeText: { fontSize: 16, letterSpacing: 1.5 },

  montoCard: { borderRadius: 4, borderWidth: 2, paddingVertical: 10, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  montoAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 10, transform: [{ skewX: '-14deg' }], marginLeft: -3 },
  montoStripe: { position: 'absolute', left: -20, right: -20, bottom: 9, height: 4, transform: [{ skewX: '-20deg' }], opacity: 0.85 },
  yenSign: { fontSize: 36, marginRight: 8 },
  montoInput: { flex: 1, fontSize: 44, padding: 0, includeFontPadding: false },

  input: { borderBottomWidth: 2, paddingVertical: 9, fontSize: 16, letterSpacing: 0.5 },

  fechaBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 3, paddingVertical: 11, paddingHorizontal: 13 },
  fechaText: { flex: 1, fontSize: 14, letterSpacing: 0.5 },

  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'flex-start', paddingTop: 4 },
  catBtn: { paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1.5 },
  catInner: { flexDirection: 'row', alignItems: 'center' },

  // Partes / deudores
  parteRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 3, paddingVertical: 7, paddingHorizontal: 11, marginBottom: 8 },
  parteName: { flex: 1, fontSize: 14, padding: 0 },
  parteMonto: { width: 72, fontSize: 19, padding: 0, textAlign: 'right' },
  parteActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  addParteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderRadius: 3, paddingVertical: 8, paddingHorizontal: 12 },
  addParteText: { fontSize: 12, letterSpacing: 1 },
  divBtn: { borderWidth: 1.5, borderRadius: 3, paddingVertical: 8, paddingHorizontal: 11 },
  divText: { fontSize: 13, letterSpacing: 0.5 },

  // Resumen neto
  netoCard: { borderWidth: 1.5, borderRadius: 4, padding: 13, marginTop: 14 },
  netoLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 },
  netoLabel: { fontSize: 10, letterSpacing: 1.4, flex: 1, marginRight: 8 },
  netoVal: { fontSize: 16 },
  netoTotal: { fontSize: 24 },
  netoSep: { height: 1, marginVertical: 6 },
  netoFoot: { fontSize: 11, marginTop: 4 },

  actions: { flexDirection: 'row', alignItems: 'center', marginTop: 22 },
  deleteBtn: { padding: 8 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 16, marginRight: 8 },
  saveBtn: { paddingVertical: 12, paddingHorizontal: 28, transform: [{ skewX: '-12deg' }] },
  saveBtnText: { fontSize: 16, letterSpacing: 1.5, transform: [{ skewX: '12deg' }] },
});

export default TransactionModal;
