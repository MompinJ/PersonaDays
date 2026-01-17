import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Switch, Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker'; // <--- IMPORTANTE
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../database';
import { MissionType, MissionFrequency, Stat } from '../../types'; // Asegúrate de tener MissionFrequency en types
import { DaySelector } from '../../components/Missions/DaySelector';
import { useTheme } from '../../themes/useTheme';

export const CreateMissionScreen = ({ route, navigation }: any) => {
  const missionToEdit = route?.params?.missionToEdit || null;
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

  // Stats disponibles y selección
  const [availableStats, setAvailableStats] = useState<Stat[]>([]);
  const [selectedStatId, setSelectedStatId] = useState<number | null>(null);

  // 2. EFECTO: sugerir yenes al cambiar dificultad (pero es editable por el usuario)
  useEffect(() => {
    switch (dificultad) {
      case 'EASY': setYenes('500'); break;
      case 'MEDIUM': setYenes('1500'); break;
      case 'HARD': setYenes('5000'); break;
    }
  }, [dificultad]);

  // 3. Cargar stats disponibles
  useEffect(() => {
    let mounted = true;
    const loadStats = async () => {
      try {
        const rows: any = await db.getAllAsync('SELECT * FROM stats ORDER BY nombre ASC');
        if (mounted) setAvailableStats(rows || []);
      } catch (err) {
        console.error('Error cargando stats:', err);
      }
    };
    loadStats();
    return () => { mounted = false; };
  }, []);

  // Si llegamos en modo edición, rellenar estados con la misión
  useEffect(() => {
    if (!missionToEdit) return;
    try {
      setNombre(missionToEdit.nombre || '');
      setTipo(missionToEdit.tipo || MissionType.DIARIA);
      const xpVal = missionToEdit.recompensa_exp || 0;
      if (xpVal <= 10) setDificultad('EASY'); else if (xpVal <= 30) setDificultad('MEDIUM'); else setDificultad('HARD');
      setYenes((missionToEdit.recompensa_yenes || 0).toString());
      const dias = missionToEdit.dias_repeticion ? String(missionToEdit.dias_repeticion).split(',').filter(Boolean).map((d: string) => parseInt(d, 10)) : [];
      setDiasSeleccionados(dias);
      setTieneExpiracion(!!missionToEdit.fecha_expiracion);
      if (missionToEdit.fecha_expiracion) setFechaExpiracion(new Date(missionToEdit.fecha_expiracion));

      // Traer impacto_mision para conocer el id_stat
      (async () => {
        try {
          const im: any[] = await db.getAllAsync('SELECT * FROM impacto_mision WHERE id_mision = ?', [missionToEdit.id_mision]);
          if (im && im.length > 0) {
            setSelectedStatId(im[0].id_stat);
          }
        } catch (e) {
          console.error('Error cargando impacto_mision al editar:', e);
        }
      })();
    } catch (e) {
      console.error('Error prellenando misión:', e);
    }
  }, [missionToEdit]);

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
    const editing = !!missionToEdit;
    console.log(editing ? '--- INICIO EDICIÓN MISIÓN ---' : '--- INICIO CREACIÓN MISIÓN ---');
    console.log('Datos:', { nombre, tipo, recompensa: getRecompensas(), selectedStatId });
    if (!nombre.trim()) {
      Alert.alert("Atención", "Escribe el nombre del encargo.");
      return;
    }

    try {
      const { xp } = getRecompensas();
      const recompensaYenes = parseInt(yenes) || 0;
      const fechaCreacion = new Date().toISOString();
      const fechaFinal = tieneExpiracion ? fechaExpiracion.toISOString() : null;

      // Determinar frecuencia y días
      const frecuenciaVal = diasSeleccionados.length > 0 ? 'REPEATING' : 'ONE_OFF';
      const diasString = diasSeleccionados.join(',');

      try {
        await db.execAsync('BEGIN TRANSACTION;');

        if (editing) {
          // Actualizar misión existente
          try {
            const updateParams = [nombre, tipo, fechaFinal, xp, recompensaYenes, frecuenciaVal, diasString, missionToEdit.id_mision];
            console.log('SQL UPDATE misiones -> id:', missionToEdit.id_mision, 'params:', updateParams);
            const resUpdate: any = await db.runAsync(
              `UPDATE misiones SET nombre = ?, tipo = ?, fecha_expiracion = ?, recompensa_exp = ?, recompensa_yenes = ?, frecuencia_repeticion = ?, dias_repeticion = ? WHERE id_mision = ?`,
              updateParams
            );
            console.log('UPDATE result:', resUpdate);
          } catch (updErr) {
            console.error('Error ejecutando UPDATE misiones:', updErr);
            throw updErr;
          }

          // Reiniciar impacto y volver a insertar si corresponde
          try {
            console.log('Eliminando impacto_mision previo para id_mision:', missionToEdit.id_mision);
            await db.runAsync('DELETE FROM impacto_mision WHERE id_mision = ?', [missionToEdit.id_mision]);
            if (selectedStatId) {
              console.log('Insertando nuevo impacto_mision:', { id_mision: missionToEdit.id_mision, id_stat: selectedStatId, valor: xp });
              await db.runAsync(
                `INSERT INTO impacto_mision (id_mision, id_stat, valor_impacto) VALUES (?, ?, ?);`,
                [missionToEdit.id_mision, selectedStatId, xp]
              );
            }
          } catch (impErr) {
            console.error('Error actualizando impacto_mision:', impErr);
            throw impErr;
          }

        } else {
          // Crear nueva misión
          const res: any = await db.runAsync(
            `INSERT INTO misiones (
              nombre, tipo, fecha_creacion, activa, completada,
              fecha_expiracion, recompensa_exp, recompensa_yenes,
              frecuencia_repeticion, dias_repeticion
            ) VALUES (?, ?, ?, 1, 0, ?, ?, ?, ?, ?)`,
            [nombre, tipo, fechaCreacion, fechaFinal, xp, recompensaYenes, frecuenciaVal, diasString]
          );

          const insertId = res && (res.lastInsertRowId || res.insertId) ? (res.lastInsertRowId || res.insertId) : null;
          if (insertId && selectedStatId) {
            await db.runAsync(
              `INSERT INTO impacto_mision (id_mision, id_stat, valor_impacto) VALUES (?, ?, ?);`,
              [insertId, selectedStatId, xp]
            );
          }
        }

        await db.execAsync('COMMIT;');
        navigation.goBack();
      } catch (txErr) {
        console.error('ERROR SQL:', txErr);
        try { await db.execAsync('ROLLBACK;'); } catch(e){/* ignore*/}
        Alert.alert('Error', 'Falló al guardar la misión y su impacto.');
      }

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
              <Text style={{ color: dificultad === dif ? colors.primary : colors.textDim, fontFamily: colors.fonts?.bold }}>
                {dif}
              </Text>
              <Text style={{ fontSize: 10, color: colors.textDim, marginTop: 4, fontFamily: colors.fonts?.body }}>
                {dif === 'EASY' ? '+10 XP' : dif === 'MEDIUM' ? '+30 XP' : '+50 XP'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 3.5 IMPACTO EN ATRIBUTO */}
        <Text style={[styles.sectionLabel, { color: colors.textDim, fontFamily: colors.fonts?.bold }]}>IMPACTO EN ATRIBUTO</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
          {availableStats.map((s) => (
            <TouchableOpacity
              key={s.id_stat}
              style={[
                styles.chip,
                { borderColor: colors.text, backgroundColor: 'transparent' },
                selectedStatId === s.id_stat && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}
              onPress={() => setSelectedStatId(s.id_stat)}
            >
              <Text style={{ color: selectedStatId === s.id_stat ? colors.textInverse : colors.text, fontFamily: colors.fonts?.bold, textTransform: 'uppercase' }}>
                {s.nombre}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

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

        {/* Delete button in edit mode */}
        {missionToEdit && (
          <TouchableOpacity
            style={[styles.deleteBtn, { borderColor: colors.error }]}
            onPress={async () => {
              try {
                await db.execAsync('BEGIN TRANSACTION;');
                // Optionally delete impacto_mision first to avoid FK issues
                try {
                  await db.runAsync('DELETE FROM impacto_mision WHERE id_mision = ?', [missionToEdit.id_mision]);
                } catch (e) { /* ignore if not exists */ }
                await db.runAsync('DELETE FROM misiones WHERE id_mision = ?', [missionToEdit.id_mision]);
                await db.execAsync('COMMIT;');
                navigation.goBack();
              } catch (err) {
                console.error('Error borrando misión:', err);
                try { await db.execAsync('ROLLBACK;'); } catch(e){/* ignore */}
                Alert.alert('Error', 'No se pudo eliminar la misión.');
              }
            }}
          >
            <Text style={{ color: colors.error, fontWeight: 'bold' }}>ELIMINAR</Text>
          </TouchableOpacity>
        )}

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
  deleteBtn: { padding: 12, marginRight: 10, borderWidth: 1, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  saveBtn: { flex: 1, padding: 18, borderRadius: 50, alignItems: 'center', elevation: 5 }
});
