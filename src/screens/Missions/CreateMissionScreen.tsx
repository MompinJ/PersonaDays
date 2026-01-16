import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Switch, Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker'; // <--- IMPORTANTE
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../database';
import { MissionType, MissionFrequency } from '../../types'; // Asegúrate de tener MissionFrequency en types
import { DaySelector } from '../../components/Missions/DaySelector';
import { useTheme } from '../../themes/useTheme';

export const CreateMissionScreen = () => {
  const navigation = useNavigation();
  const colors = useTheme();

  // Estados del formulario
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<MissionType>(MissionType.DIARIA);
  const [dificultad, setDificultad] = useState<'EASY' | 'MEDIUM' | 'HARD'>('EASY');

  // 1. NUEVO ESTADO PARA YENES (editable)
  const [yenes, setYenes] = useState('500');

  // NUEVO: Días seleccionados para repetición
  const [diasSeleccionados, setDiasSeleccionados] = useState<number[]>([]);

  // Nuevo: Fecha
  const [tieneExpiracion, setTieneExpiracion] = useState(false);

  // 2. EFECTO: sugerir yenes al cambiar dificultad (pero es editable por el usuario)
  useEffect(() => {
    switch (dificultad) {
      case 'EASY': setYenes('500'); break;
      case 'MEDIUM': setYenes('1500'); break;
      case 'HARD': setYenes('5000'); break;
    }
  }, [dificultad]);
  const [fechaExpiracion, setFechaExpiracion] = useState(new Date());
  const [mostrarPicker, setMostrarPicker] = useState(false);

  // Calcular recompensas según dificultad
  const getRecompensas = () => {
    switch (dificultad) {
      case 'EASY': return { xp: 10, yenes: 500 };
      case 'MEDIUM': return { xp: 30, yenes: 1000 };
      case 'HARD': return { xp: 50, yenes: 1500 };
    }
  };

  const guardarMision = async () => {
    if (!nombre.trim()) {
      Alert.alert("Atención", "Escribe el nombre del encargo.");
      return;
    }

    try {
      const { xp } = getRecompensas();
      const recompensaYenes = parseInt(yenes) || 0;
      const fechaCreacion = new Date().toISOString();
      // Si tiene fecha límite, usamos la seleccionada, si no, null
      const fechaFinal = tieneExpiracion ? fechaExpiracion.toISOString() : null;

      // Determinar frecuencia y días
      const frecuenciaVal = diasSeleccionados.length > 0 ? 'REPEATING' : 'ONE_OFF';
      const diasString = diasSeleccionados.join(',');

      await db.runAsync(
        `INSERT INTO misiones (
          nombre, tipo, fecha_creacion, activa, completada,
          fecha_expiracion, recompensa_exp, recompensa_yenes,
          frecuencia_repeticion, dias_repeticion
        ) VALUES (?, ?, ?, 1, 0, ?, ?, ?, ?, ?)`,
        [nombre, tipo, fechaCreacion, fechaFinal, xp, recompensaYenes, frecuenciaVal, diasString]
      );

      navigation.goBack();

    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Falló al guardar la misión");
    }
  };

  // Manejador del calendario
  const onChangeDate = (event: any, selectedDate?: Date) => {
    setMostrarPicker(false); // Cerrar picker en Android
    if (selectedDate) {
      setFechaExpiracion(selectedDate);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.headerTitle, { color: colors.primary }]}>NUEVO ENCARGO</Text>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

        {/* 1. OBJETIVO */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
          <Text style={[styles.label, { color: colors.textDim }]}>OBJETIVO</Text>
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="¿Qué debes hacer?"
            placeholderTextColor={colors.textDim}
            value={nombre}
            onChangeText={setNombre}
            autoFocus
          />
        </View>

        {/* 2. CATEGORÍA */}
        <Text style={[styles.sectionLabel, { color: colors.textDim }]}>CATEGORÍA</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
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
                fontWeight: 'bold', fontSize: 12
              }}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 3. DIFICULTAD (Recompensas) */}
        <Text style={[styles.sectionLabel, { color: colors.textDim }]}>DIFICULTAD & RECOMPENSA</Text>
        <View style={styles.row}>
          {['EASY', 'MEDIUM', 'HARD'].map((dif) => (
            <TouchableOpacity
              key={dif}
              onPress={() => setDificultad(dif as any)}
              style={[
                styles.difficultyBtn,
                { borderColor: dificultad === dif ? colors.primary : colors.textDim },
                dificultad === dif && { backgroundColor: `${colors.primary}20` }
              ]}
            >
              <Text style={{ color: dificultad === dif ? colors.primary : colors.textDim, fontWeight: 'bold' }}>
                {dif}
              </Text>
              <Text style={{ fontSize: 10, color: colors.textDim, marginTop: 4 }}>
                {dif === 'EASY' ? '+10 XP' : dif === 'MEDIUM' ? '+30 XP' : '+60 XP'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 4. REPETICIÓN (Selector de Días) */}
        <Text style={[styles.sectionLabel, { color: colors.textDim }]}>REPETICIÓN {diasSeleccionados.length === 0 && "(Una sola vez)"}{diasSeleccionados.length === 7 && "(Todos los días)"}</Text>

        {/* 3b. YENES (Editable) */}
        <Text style={[styles.sectionLabel, { color: colors.textDim }]}>RECOMPENSA</Text>
        <View style={[styles.section, { backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }]}>
            <Ionicons name="cash-outline" size={24} color={colors.secondary} style={{ marginRight: 10 }} />
            <Text style={{ color: colors.text, fontWeight: 'bold', marginRight: 10 }}>Valor de la mision: ¥</Text>
            <TextInput
                style={{ color: colors.secondary, fontSize: 18, fontWeight: 'bold', flex: 1 }}
                value={yenes}
                onChangeText={setYenes}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.textDim}
            />
        </View>

        <DaySelector
            selectedDays={diasSeleccionados}
            onChange={setDiasSeleccionados}
        />

        <Text style={{ fontSize: 10, color: colors.textDim, marginBottom: 20, textAlign: 'center' }}>
          {diasSeleccionados.length > 0
            ? "Se reiniciará automáticamente los días marcados."
            : "Esta misión no se repite, desaparecerá al completarse."}
        </Text>

        {/* 5. FECHA LÍMITE (Calendario) */}
        <View style={[styles.dateSection, { borderColor: colors.textDim }]}>
          <View style={styles.dateHeader}>
            <Text style={[styles.label, { color: colors.text, marginBottom: 0 }]}>Fecha Límite</Text>
            <Switch
              value={tieneExpiracion}
              onValueChange={setTieneExpiracion}
              trackColor={{ false: colors.inactive, true: colors.primary }}
              thumbColor={colors.textInverse}
            />
          </View>

          {tieneExpiracion && (
            <TouchableOpacity
              onPress={() => setMostrarPicker(true)}
              style={[styles.dateDisplay, { backgroundColor: colors.surface }]}
            >
              <Ionicons name="calendar" size={20} color={colors.primary} />
              <Text style={[styles.dateText, { color: colors.text }]}>
                {fechaExpiracion.toLocaleDateString()}
              </Text>
              <Text style={{ color: colors.textDim, fontSize: 12 }}>
                (Toca para cambiar)
              </Text>
            </TouchableOpacity>
          )}

          {tieneExpiracion && mostrarPicker && (
            <DateTimePicker
              value={fechaExpiracion}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onChangeDate}
              minimumDate={new Date()} // No permitir fechas pasadas
              textColor={colors.text} // Solo funciona en iOS a veces
            />
          )}
        </View>

      </ScrollView>

      {/* FOOTER */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.textDim }}>CANCELAR</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          onPress={guardarMision}
        >
          <Text style={{ color: colors.background, fontWeight: 'bold', fontSize: 16 }}>
            CONFIRMAR
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 50 },
  headerTitle: { fontSize: 22, fontWeight: '900', marginBottom: 25, textAlign: 'center', letterSpacing: 2, fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif' },

  section: { padding: 15, borderRadius: 10, borderWidth: 1, marginBottom: 20 },
  sectionLabel: { fontSize: 12, fontWeight: 'bold', marginBottom: 10, letterSpacing: 1, marginTop: 10 },
  label: { fontSize: 14, fontWeight: 'bold', marginBottom: 5 },
  input: { fontSize: 18, fontWeight: 'bold' },

  horizontalScroll: { flexDirection: 'row', marginBottom: 20, maxHeight: 50 },
  chip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginRight: 10, justifyContent: 'center' },

  row: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  difficultyBtn: { flex: 1, padding: 15, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  freqBtn: { flex: 1, paddingVertical: 12, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },

  dateSection: { marginTop: 10, marginBottom: 30, borderTopWidth: 1, paddingTop: 20, borderStyle: 'dashed' },
  dateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  dateDisplay: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 8, gap: 10 },
  dateText: { fontSize: 18, fontWeight: 'bold' },

  footer: { flexDirection: 'row', alignItems: 'center', marginTop: 'auto' },
  cancelBtn: { padding: 15, marginRight: 20 },
  saveBtn: { flex: 1, padding: 18, borderRadius: 50, alignItems: 'center', elevation: 5 }
});
