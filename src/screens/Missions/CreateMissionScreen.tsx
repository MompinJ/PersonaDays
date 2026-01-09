import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Switch, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { db } from '../../database';
import { MissionType } from '../../types';
import { useTheme } from '../../themes/useTheme';

export const CreateMissionScreen = () => {
  const navigation = useNavigation();
  const colors = useTheme();

  // Estados del formulario
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<MissionType>(MissionType.DIARIA);
  const [tieneExpiracion, setTieneExpiracion] = useState(false);
  // Por simplicidad MVP, expiración será "Mañana" si se activa. Luego pondremos un selector real.

  const guardarMision = async () => {
    if (!nombre.trim()) {
      Alert.alert("Error", "La misión necesita un nombre");
      return;
    }

    try {
      const fechaCreacion = new Date().toISOString();
      // Si activó expiración, ponemos fecha de mañana como placeholder
      const fechaExpiracion = tieneExpiracion
        ? new Date(Date.now() + 86400000).toISOString()
        : null;

      await db.runAsync(
        `INSERT INTO misiones (nombre, tipo, fecha_creacion, activa, completada, fecha_expiracion, recompensa_exp)
         VALUES (?, ?, ?, 1, 0, ?, 15)`, // 15xp default
        [nombre, tipo, fechaCreacion, fechaExpiracion]
      );

      // Regresar atrás (Cierra el modal)
      navigation.goBack();

    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo crear la misión");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.primary }]}>Nueva Misión</Text>

      <ScrollView>
        {/* Input Nombre */}
        <Text style={[styles.label, { color: colors.text }]}>Objetivo:</Text>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.surface, backgroundColor: colors.surface }]}
          placeholder="Ej: Estudiar React Native"
          placeholderTextColor={colors.textDim}
          value={nombre}
          onChangeText={setNombre}
        />

        {/* Selector de Tipo (Chips) */}
        <Text style={[styles.label, { color: colors.text }]}>Tipo de Encargo:</Text>
        <View style={styles.chipsContainer}>
          {Object.values(MissionType).map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                styles.chip,
                { borderColor: colors.primary },
                tipo === t && { backgroundColor: colors.primary }
              ]}
              onPress={() => setTipo(t)}
            >
              <Text style={{
                color: tipo === t ? colors.background : colors.text,
                fontWeight: 'bold'
              }}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Switch Expiración */}
        <View style={styles.switchContainer}>
          <Text style={[styles.label, { color: colors.text }]}>¿Tiene fecha límite?</Text>
          <Switch
            value={tieneExpiracion}
            onValueChange={setTieneExpiracion}
            trackColor={{ false: "#767577", true: colors.primary }}
            thumbColor={tieneExpiracion ? "#fff" : "#f4f3f4"}
          />
        </View>
        {tieneExpiracion && (
          <Text style={{ color: colors.textDim, marginBottom: 20 }}>
            ⚠️ Se marcará para vencer mañana (WIP)
          </Text>
        )}

      </ScrollView>

      {/* Botones de Acción */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btnCancel, { borderColor: colors.textDim }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: colors.textDim }}>CANCELAR</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btnSave, { backgroundColor: colors.primary }]}
          onPress={guardarMision}
        >
          <Text style={{ color: colors.background, fontWeight: 'bold' }}>ACEPTAR</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 16, marginBottom: 10, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 20 },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  chip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8 },
  switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  btnCancel: { flex: 1, padding: 15, borderRadius: 8, borderWidth: 1, marginRight: 10, alignItems: 'center' },
  btnSave: { flex: 1, padding: 15, borderRadius: 8, alignItems: 'center' },
});
