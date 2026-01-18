import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar, Platform } from 'react-native';
import { useAlert } from '../../context/AlertContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../themes/useTheme';
import ManageArcModal from '../../components/Arcs/ManageArcModal';
import { db } from '../../database';
import { useGame } from '../../context/GameContext';
import { usePlayerStats } from '../../hooks/usePlayerStats';


type Props = NativeStackScreenProps<RootStackParamList, 'ArcDetail'>;

export const ArcDetailScreen = ({ route, navigation }: Props) => {
  const { arc } = route.params || { arc: null };
  const theme = useTheme();
  const [showModal, setShowModal] = useState(false);
  const { player, refreshUser } = useGame();
  const { refreshStats } = usePlayerStats();
  const { showAlert } = useAlert();

  if (!arc) return null;

  const now = new Date();
  const start = new Date(arc.fecha_inicio);
  const end = arc.fecha_fin ? new Date(arc.fecha_fin) : null;
  const state = (end && now > end) ? 'COMPLETADO' : (now >= start && (!end || now <= end) ? 'ACTIVO' : 'PENDIENTE');

  const onEdit = () => {
    setShowModal(true);
  };

  const handleFinishArc = async () => {
    if (!arc) return;

    // If parent, check active sub-arcs
    try {
      if (arc.id_arco_padre == null) {
        const res: any[] = await db.getAllAsync('SELECT count(*) as c FROM arcos WHERE id_arco_padre = ? AND estado = ?', [arc.id_arco, 'ACTIVO']);
        const count = (res && res.length > 0 && res[0].c) ? res[0].c : 0;
        if (count > 0) {
          showAlert('NO PUEDES FINALIZAR ESTE ARCO', 'Debes completar primero el sub-arco activo antes de cerrar el capítulo principal.');
          return;
        }
      }
    } catch (e: any) {
      console.error('Error comprobando sub-arcos activos:', e);
      showAlert('ERROR', 'No se pudo comprobar sub-arcos activos. ' + (e?.message || ''));
      return;
    }

    showAlert('FINALIZAR ARCO', '¿Estás seguro de que deseas cerrar este capítulo?', [
      { text: 'CANCELAR', style: 'cancel' },
      { text: 'FINALIZAR', onPress: async () => {
        try {
          await db.execAsync('BEGIN TRANSACTION;');
          await db.runAsync('UPDATE arcos SET estado = ?, fecha_fin = date("now") WHERE id_arco = ?', ['COMPLETADO', arc.id_arco]);
          await db.execAsync('COMMIT;');
          try { refreshStats && refreshStats(); } catch(e){}
          try { refreshUser && refreshUser(); } catch(e){}
          navigation.goBack();
        } catch (err: any) {
          console.error('Error finalizando arco:', err);
          try { await db.execAsync('ROLLBACK;'); } catch(e){}
          showAlert('ERROR', 'No se pudo finalizar el arco. ' + (err?.message || ''));
        }
      } }
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 30 : 60 }]}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: theme.text }]}>{arc.nombre}</Text>
          <Text style={[styles.badge, state === 'ACTIVO' ? { backgroundColor: theme.primary, color: theme.textInverse } : { backgroundColor: theme.surface+'66' }]}>{state}</Text>
        </View>

        {/* Contenido intencionalmente vacío para modo Zen. */}
        {/* TODO: Aquí irán notas, fotos y estadísticas avanzadas. */}
        <View style={{ height: 200 }} />

      </ScrollView>

      {state !== 'COMPLETADO' && (
        <View style={styles.footer}>
          <TouchableOpacity onPress={onEdit} style={[styles.editFooterBtn, { borderColor: theme.border, backgroundColor: theme.surface, flex: 1, marginRight: 8 }]}>
            <Text style={{ color: theme.text }}>EDITAR</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleFinishArc} style={[styles.finalizeFooterBtn, { backgroundColor: '#D9534F', flex: 2 }]}>
            <Text style={{ color: '#fff', fontWeight: '900' }}>FINALIZAR ARCO</Text>
          </TouchableOpacity>
        </View>
      )}

      <ManageArcModal visible={showModal} arc={arc} parentArc={null} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '900' },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, fontWeight: '700' },
  editBtn: { padding: 12, borderRadius: 8, borderWidth: 1 },
  finalizeBtn: { position: 'absolute', bottom: 24, left: 16, right: 16, padding: 16, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', left: 16, right: 16, bottom: 24, flexDirection: 'row', padding: 8 },
  editFooterBtn: { padding: 14, borderRadius: 8, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  finalizeFooterBtn: { padding: 14, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }
});
