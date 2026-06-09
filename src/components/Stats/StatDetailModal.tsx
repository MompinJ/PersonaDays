import React, { useEffect, useState, useRef } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Animated, Easing } from 'react-native';
import { useTheme } from '../../themes/useTheme';
import { db } from '../../database';
import { StatViewData } from '../../hooks/usePlayerStats';
import { useGame } from '../../context/GameContext';
import { useAlert } from '../../context/AlertContext';
import { StatIcon } from './StatIcon';
import { resolveStatKey } from './stats';
import { PersonaShard } from '../UI/PersonaShard';

interface Props {
  visible: boolean;
  stat: StatViewData | null;
  onClose: () => void;
  onSaved?: () => void;
}

export const StatDetailModal = ({ visible, stat, onClose, onSaved }: Props) => {
  const colors = useTheme();
  const { player } = useGame();
  const { showAlert } = useAlert();
  const [descripcion, setDescripcion] = useState<string>('');
  const [nivelMeta, setNivelMeta] = useState<number>(1);
  const [children, setChildren] = useState<any[]>([]);

  // Animacion de entrada/salida (pop)
  const [show, setShow] = useState(false);
  const [displayStat, setDisplayStat] = useState<StatViewData | null>(stat);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      if (stat) setDisplayStat(stat);
      setShow(true);
      anim.setValue(0);
      Animated.spring(anim, { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }).start();
    } else if (show) {
      Animated.timing(anim, { toValue: 0, duration: 150, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
        if (finished) setShow(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (!stat) return;

    const loadFull = async () => {
      try {
        // Obtener fila completa de stats para leer descripcion y dificultad real
        const rowsFull: any[] = await db.getAllAsync('SELECT * FROM stats WHERE id_stat = ?', [stat.id_stat]);
        const full = rowsFull && rowsFull.length > 0 ? rowsFull[0] : null;
        setDescripcion((full && full.descripcion) || '');
        // nivel_maximo proviene de jugador_stat (si existe para el jugador)
        let nivelMaxFromJS = 1;
        try {
          if (player && player.id_jugador) {
            const jsRows: any[] = await db.getAllAsync('SELECT nivel_maximo FROM jugador_stat WHERE id_stat = ? AND id_jugador = ?', [stat.id_stat, player.id_jugador]);
            if (jsRows && jsRows.length > 0) {
              nivelMaxFromJS = jsRows[0].nivel_maximo || 1;
            }
          }
        } catch (inner) {
          console.error('Error cargando jugador_stat para nivel_maximo:', inner);
        }
        setNivelMeta(Math.max(1, Math.round(nivelMaxFromJS)));

        // Si es stat padre (IDs 1..5) cargar hijos
        if (stat.id_stat >= 1 && stat.id_stat <= 5) {
          try {
            const rows: any[] = await db.getAllAsync('SELECT * FROM stats WHERE id_stat_padre = ?', [stat.id_stat]);
            setChildren(rows || []);
          } catch (e) {
            console.error('Error cargando hijos del stat:', e);
            setChildren([]);
          }
        } else {
          setChildren([]);
        }
      } catch (e) {
        console.error('Error cargando stat completo:', e);
      }
    };

    loadFull();
  }, [stat]);

  const ds = displayStat;
  const isBaseStat = !!ds && ds.id_stat >= 1 && ds.id_stat <= 5;

  const handleSave = async () => {
    if (!stat) return;
    if (isBaseStat) return; // protect bases
    try {
      // Usamos dificultad como campo editable para la "meta de nivel"
      await db.runAsync('UPDATE stats SET descripcion = ?, dificultad = ? WHERE id_stat = ?', [descripcion, nivelMeta, stat.id_stat]);
      if (onSaved) onSaved();
      onClose();
    } catch (e) {
      console.error('Error guardando stat:', e);
      showAlert('Error', 'No se pudo guardar el stat.');
    }
  };

  const handleDelete = async () => {
    if (!stat) return;

    try {
      // 1) Comprobar si hay misiones que usen este stat
      const rowsCheck: any[] = await db.getAllAsync('SELECT COUNT(*) as c FROM impacto_mision WHERE id_stat = ?', [stat.id_stat]);
      const count = (rowsCheck && rowsCheck.length > 0) ? (rowsCheck[0].c || rowsCheck[0].count || 0) : 0;
      if (count > 0) {
        showAlert('No se puede eliminar', 'Hay misiones activas vinculadas a este atributo. Por favor, elimina o edita esas misiones antes de borrar el atributo.');
        return;
      }

      // 2) No hay misiones: eliminar en transacción jugador_stat y stats
      try {
        await db.execAsync('BEGIN TRANSACTION;');
        await db.runAsync('DELETE FROM jugador_stat WHERE id_stat = ?', [stat.id_stat]);
        await db.runAsync('DELETE FROM stats WHERE id_stat = ?', [stat.id_stat]);
        await db.execAsync('COMMIT;');

        if (onSaved) onSaved();
        onClose();
      } catch (innerErr: any) {
        try { await db.execAsync('ROLLBACK;'); } catch(e) { /* ignore */ }
        const msg = (innerErr && (innerErr.message || innerErr.toString())) || String(innerErr);
        console.error('Error during deletion transaction:', innerErr);
        if (msg.toLowerCase().includes('foreign key') || msg.toLowerCase().includes('constraint')) {
          showAlert('No se puede eliminar', 'Este atributo está vinculado a misiones activas. Por favor, elimina o edita esas misiones antes de borrar el atributo.');
        } else {
          showAlert('Error', msg);
        }
      }
    } catch (e: any) {
      const msg = (e && (e.message || e.toString())) || String(e);
      console.error('Error comprobando impacto_mision antes de eliminar stat:', e);
      showAlert('Error', msg);
    }
  };

  return (
    <Modal visible={show} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: anim }]}>
        <Animated.View style={{ transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }}>
          <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.primary }]}>
            <View style={[styles.topAccent, { backgroundColor: colors.primary }]} />
            <ScrollView contentContainerStyle={{ padding: 18 }}>
              <View style={styles.titleRow}>
                {(() => { const k = resolveStatKey(ds?.nombre_stat); return k ? <StatIcon stat={k} size={34} color={colors.primary} /> : null; })()}
                <Text style={[styles.title, { color: colors.text, fontFamily: colors.fonts?.title, marginLeft: resolveStatKey(ds?.nombre_stat) ? 12 : 0 }]}>{(ds?.nombre_stat || 'SIN NOMBRE').toUpperCase()}</Text>
              </View>

              <View style={styles.tagWrap}><PersonaShard label="DESCRIPCIÓN" variant="ghost" height={22} fontSize={10} /></View>
              {isBaseStat ? (
                <Text style={[styles.descText, { color: colors.text, fontFamily: colors.fonts?.body }]}>{descripcion || 'Sin descripción disponible.'}</Text>
              ) : (
                <TextInput
                  multiline
                  value={descripcion}
                  onChangeText={setDescripcion}
                  placeholder="DESCRIPCIÓN DEL STAT"
                  placeholderTextColor={colors.textDim}
                  style={[styles.input, { color: colors.text, borderBottomColor: colors.primary, fontFamily: colors.fonts?.body }]}
                />
              )}

              <View style={[styles.tagWrap, { marginTop: 18 }]}><PersonaShard label="META DE NIVEL" height={24} fontSize={11} color={colors.secondary} /></View>
              {isBaseStat ? (
                <View style={styles.metaRow}>
                  <Text style={[styles.metaBig, { color: colors.primary, fontFamily: colors.fonts?.display }]}>{nivelMeta}</Text>
                  <Text style={[styles.metaHint, { color: colors.textDim, fontFamily: colors.fonts?.condensed }]}>NIVEL MÁXIMO FIJO</Text>
                </View>
              ) : (
                <View style={styles.metaRow}>
                  <TextInput
                    keyboardType="number-pad"
                    value={String(nivelMeta)}
                    onChangeText={(t) => setNivelMeta(Math.max(1, parseInt(t || '1')))}
                    style={[styles.metaInput, { color: colors.primary, borderBottomColor: colors.primary, fontFamily: colors.fonts?.display }]}
                  />
                  <Text style={[styles.metaHint, { color: colors.textDim, fontFamily: colors.fonts?.condensed }]}>AL LLEGAR, HARÁS PRESTIGIO</Text>
                </View>
              )}

              {children && children.length > 0 && (
                <View style={{ marginTop: 18 }}>
                  <View style={styles.tagWrap}><PersonaShard label="HÁBITOS HIJOS" variant="ghost" height={22} fontSize={10} color={colors.secondary} /></View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
                    {children.map((c, i) => {
                      const sk = [-12, 11, -13][i % 3];
                      return (
                        <View key={c.id_stat} style={[styles.chip, { borderColor: colors.secondary, transform: [{ skewX: `${sk}deg` }] }]}>
                          <Text style={[styles.chipText, { color: colors.secondary, fontFamily: colors.fonts?.heading, transform: [{ skewX: `${-sk}deg` }] }]}>{String(c.nombre).toUpperCase()}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

            </ScrollView>

            <View style={[styles.footer, { borderTopColor: colors.border }]}>
              {isBaseStat ? (
                <TouchableOpacity onPress={onClose} activeOpacity={0.9} style={[styles.skewBtn, { backgroundColor: colors.primary, alignSelf: 'center', paddingHorizontal: 40 }]}>
                  <Text style={[styles.skewBtnText, { color: colors.textInverse, fontFamily: colors.fonts?.heading }]}>CERRAR</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity onPress={onClose} style={styles.btnCancel}>
                    <Text style={{ color: colors.textDim, fontFamily: colors.fonts?.bold, letterSpacing: 1 }}>CERRAR</Text>
                  </TouchableOpacity>
                  <View style={{ flexDirection: 'row' }}>
                    {ds && ds.id_stat > 5 && (
                      <TouchableOpacity onPress={handleDelete} activeOpacity={0.85} style={[styles.skewBtn, { borderColor: colors.error, borderWidth: 1.5, marginRight: 8 }]}>
                        <Text style={[styles.skewBtnText, { color: colors.error, fontFamily: colors.fonts?.heading }]}>ELIMINAR</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={handleSave} activeOpacity={0.9} style={[styles.skewBtn, { backgroundColor: colors.primary }]}>
                      <Text style={[styles.skewBtnText, { color: colors.textInverse, fontFamily: colors.fonts?.heading }]}>GUARDAR</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  card: { borderWidth: 3, borderRadius: 6, overflow: 'hidden' },
  topAccent: { height: 5, width: '100%' },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 24, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, flexShrink: 1 },
  tagWrap: { marginTop: 14, marginBottom: 10 },
  descText: { fontSize: 15, lineHeight: 21, marginBottom: 2 },
  input: { borderBottomWidth: 2, paddingVertical: 7, fontSize: 15 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  metaBig: { fontSize: 46, lineHeight: 48, includeFontPadding: false },
  metaInput: { fontSize: 46, borderBottomWidth: 2, minWidth: 70, textAlign: 'center', padding: 0, includeFontPadding: false },
  metaHint: { flex: 1, fontSize: 11, letterSpacing: 1, marginLeft: 14, textTransform: 'uppercase' },
  chip: { borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 5, marginRight: 9, marginBottom: 9 },
  chipText: { fontSize: 12, letterSpacing: 0.5 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderTopWidth: 1 },
  btnCancel: { padding: 10 },
  skewBtn: { paddingVertical: 12, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', transform: [{ skewX: '-12deg' }] },
  skewBtnText: { letterSpacing: 1, textTransform: 'uppercase', transform: [{ skewX: '12deg' }] },
});
