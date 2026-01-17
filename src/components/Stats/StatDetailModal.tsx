import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useTheme } from '../../themes/useTheme';
import { db } from '../../database';
import { StatViewData } from '../../hooks/usePlayerStats';
import { useGame } from '../../context/GameContext';

interface Props {
  visible: boolean;
  stat: StatViewData | null;
  onClose: () => void;
  onSaved?: () => void;
}

export const StatDetailModal = ({ visible, stat, onClose, onSaved }: Props) => {
  const colors = useTheme();
  const [descripcion, setDescripcion] = useState<string>('');
  const [nivelMeta, setNivelMeta] = useState<number>(1);
  const [children, setChildren] = useState<any[]>([]);

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


  const isBaseStat = !!stat && stat.id_stat >= 1 && stat.id_stat <= 5;

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
      Alert.alert('Error', 'No se pudo guardar el stat.');
    }
  };

  const { player } = useGame();

  const handleDelete = async () => {
    if (!stat) return;

    try {
      // 1) Comprobar si hay misiones que usen este stat
      const rowsCheck: any[] = await db.getAllAsync('SELECT COUNT(*) as c FROM impacto_mision WHERE id_stat = ?', [stat.id_stat]);
      const count = (rowsCheck && rowsCheck.length > 0) ? (rowsCheck[0].c || rowsCheck[0].count || 0) : 0;
      if (count > 0) {
        Alert.alert('No se puede eliminar', 'Hay misiones activas vinculadas a este atributo. Por favor, elimina o edita esas misiones antes de borrar el atributo.');
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
          Alert.alert('No se puede eliminar', 'Este atributo está vinculado a misiones activas. Por favor, elimina o edita esas misiones antes de borrar el atributo.');
        } else {
          Alert.alert('Error', msg);
        }
      }
    } catch (e: any) {
      const msg = (e && (e.message || e.toString())) || String(e);
      console.error('Error comprobando impacto_mision antes de eliminar stat:', e);
      Alert.alert('Error', msg);
    }
  };

  if (!stat) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.primary }] }>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <Text style={[styles.title, { color: colors.text }]}>{(stat.nombre_stat || 'SIN NOMBRE').toUpperCase()}</Text>

            <Text style={[styles.label, { color: colors.textDim }]}>Descripción</Text>
            {isBaseStat ? (
              <Text style={{ color: colors.textDim, marginBottom: 8 }}>{descripcion || 'Sin descripción disponible.'}</Text>
            ) : (
              <TextInput
                multiline
                value={descripcion}
                onChangeText={setDescripcion}
                placeholder="Descripción del stat"
                placeholderTextColor={colors.textDim}
                style={[styles.input, { color: colors.text, borderBottomColor: colors.border }]}
              />
            )}

            <Text style={[styles.label, { color: colors.textDim, marginTop: 12 }]}>Meta de Nivel (dificultad)</Text>
            {isBaseStat ? (
              <Text style={{ color: colors.textDim }}>{`Meta: ${nivelMeta} (Fijo)`}</Text>
            ) : (
              <TextInput
                keyboardType="number-pad"
                value={String(nivelMeta)}
                onChangeText={(t) => setNivelMeta(Math.max(1, parseInt(t || '1')))}
                style={[styles.input, { color: colors.text, borderBottomColor: colors.border }]}
              />
            )}

            {children && children.length > 0 && (
              <View style={{ marginTop: 14 }}>
                <Text style={[styles.label, { color: colors.textDim }]}>Hijos</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
                  {children.map(c => (
                    <View key={c.id_stat} style={[styles.chip, { borderColor: colors.primary, backgroundColor: 'transparent' }]}>
                      <Text style={{ color: colors.text }}>{c.nombre}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

          </ScrollView>

          <View style={styles.footer}>
            {isBaseStat ? (
              <TouchableOpacity onPress={onClose} style={[styles.btnSave, { backgroundColor: colors.primary, alignSelf: 'center' }]}>
                <Text style={{ color: colors.textInverse }}>CERRAR</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity onPress={onClose} style={styles.btnCancel}><Text style={{ color: colors.textDim }}>CERRAR</Text></TouchableOpacity>
                <View style={{ flexDirection: 'row' }}>
                  {stat.id_stat > 5 && (
                    <TouchableOpacity onPress={handleDelete} style={[styles.btnDelete, { borderColor: colors.error }]}>
                      <Text style={{ color: colors.error }}>ELIMINAR</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity onPress={handleSave} style={[styles.btnSave, { backgroundColor: colors.primary }]}>
                    <Text style={{ color: colors.textInverse }}>GUARDAR</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  card: { borderWidth: 3, borderRadius: 6, overflow: 'hidden' },
  title: { fontSize: 20, fontWeight: '900', marginBottom: 8 },
  label: { fontSize: 12, marginTop: 6 },
  input: { borderBottomWidth: 1, paddingVertical: 6 },
  chip: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginRight: 8, marginBottom: 8 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderTopWidth: 1 },
  btnCancel: { padding: 10 },
  btnSave: { padding: 10, borderRadius: 4, marginLeft: 10 },
  btnDelete: { padding: 10, borderRadius: 4, marginRight: 8, borderWidth: 1 }
});
