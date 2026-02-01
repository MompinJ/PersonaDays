import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../themes/useTheme';
import { db } from '../../database';
import { useAlert } from '../../context/AlertContext';

export const SettingsScreen = () => {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const { showAlert } = useAlert();

  useEffect(() => {
    const inspectArcos = async () => {
      try {
        const schema: any[] = await db.getAllAsync("PRAGMA table_info(arcos);");
        console.log('SCHEMA ARCOS:', schema);
      } catch (e) {
        console.log('Error fetching schema arcos:', e);
      }

      try {
        const rows: any[] = await db.getAllAsync('SELECT * FROM arcos;');
        console.log('DATA ARCOS:', rows);
      } catch (e) {
        console.log('Error fetching data arcos:', e);
      }
    };
    inspectArcos();
  }, []);

  const handleResetArcs = () => {
    showAlert('Confirmar', '¿Estás seguro? Esto eliminará todos los arcos y desvinculará las misiones asociadas.', [
      { text: 'CANCELAR', style: 'cancel' },
      { text: 'SÍ, BORRAR', style: 'destructive', onPress: async () => {
        try {
          await db.execAsync('BEGIN TRANSACTION;');
          await db.runAsync('UPDATE misiones SET id_arco = NULL;');
          await db.runAsync('DELETE FROM arcos;');
          try {
            await db.runAsync("DELETE FROM sqlite_sequence WHERE name='arcos';");
          } catch(e) { /* ignore if sqlite_sequence not present */ }
          await db.execAsync('COMMIT;');
          showAlert('Hecho', 'Arcos eliminados. Base de datos limpia.');
        } catch (err) {
          console.error('Error reseteando arcos:', err);
          try { await db.execAsync('ROLLBACK;'); } catch(e){}
          showAlert('Error', 'No se pudo resetear arcos.');
        }
      } }
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}> 
      <Text style={[styles.header, { color: theme.text, fontFamily: theme.fonts?.title }]}>AJUSTES</Text>

      <TouchableOpacity style={[styles.option, { borderColor: theme.primary }]} onPress={() => navigation.navigate('CharacterSelection', { isEditing: true })}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="person-circle" size={28} color={theme.primary} style={{ marginRight: 12 }} />
          <Text style={[styles.optionText, { color: theme.text }]}>Configurar Personaje</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={theme.textDim} />
      </TouchableOpacity>

      <TouchableOpacity style={[styles.option, { borderColor: theme.primary, marginTop: 10 }]} onPress={() => navigation.navigate('Setup', { isEditing: true })}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="create" size={24} color={theme.primary} style={{ marginRight: 12 }} />
          <Text style={[styles.optionText, { color: theme.text }]}>Editar Nombre</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={theme.textDim} />
      </TouchableOpacity>

      <TouchableOpacity style={[styles.option, { borderColor: theme.error, marginTop: 10 }]} onPress={handleResetArcs}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="trash" size={22} color={theme.error} style={{ marginRight: 12 }} />
          <Text style={[styles.optionText, { color: theme.error }]}>Borrar Todos los Arcos (Debug)</Text>
        </View>
      </TouchableOpacity>

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60 },
  header: { fontSize: 22, fontWeight: '900', marginBottom: 20, letterSpacing: 2 },
  option: { padding: 16, borderWidth: 1, borderRadius: 8, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  optionText: { fontSize: 16, fontWeight: '700' }
});
