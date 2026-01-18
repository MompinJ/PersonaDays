import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../themes/useTheme';

export const ProfileScreen = () => {
  const navigation = useNavigation<any>();
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>PERFIL</Text>
      <TouchableOpacity style={[styles.settingsBtn, { borderColor: theme.primary }]} onPress={() => navigation.navigate('Settings')}>
        <Ionicons name="settings-sharp" size={20} color={theme.primary} />
      </TouchableOpacity>

      <View style={styles.centerContent}>
        <Text style={{ color: theme.textDim }}>Aquí puedes ver y ajustar tu perfil.</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50, padding: 20 },
  title: { fontSize: 20, fontWeight: '900' },
  settingsBtn: { position: 'absolute', top: 50, right: 20, padding: 10, borderRadius: 8, borderWidth: 1 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
