import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../themes/useTheme';

export const SettingsScreen = () => {
  const navigation = useNavigation<any>();
  const theme = useTheme();

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

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60 },
  header: { fontSize: 22, fontWeight: '900', marginBottom: 20, letterSpacing: 2 },
  option: { padding: 16, borderWidth: 1, borderRadius: 8, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  optionText: { fontSize: 16, fontWeight: '700' }
});
