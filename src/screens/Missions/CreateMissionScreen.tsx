import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Switch, Platform, Animated, Easing } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker'; // <--- IMPORTANTE
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../database';
import { MissionType, MissionFrequency, Stat } from '../../types'; // Asegúrate de tener MissionFrequency en types
import { DaySelector } from '../../components/Missions/DaySelector';
import { PersonaShard } from '../../components/UI/PersonaShard';
import { getContrastText } from '../../utils/colorUtils';
import { useTheme } from '../../themes/useTheme';
import { useAlert } from '../../context/AlertContext';

export const CreateMissionScreen = ({ route, navigation }: any) => {
  const missionToEdit = route?.params?.missionToEdit || null;
  const colors = useTheme();
  const { showAlert } = useAlert();
  const [activeArc, setActiveArc] = useState<any | null>(null);
  const [missionArcId, setMissionArcId] = useState<number | null>(null);

  // Estados del formulario
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<MissionType>(MissionType.DIARIA);
  const [dificultad, setDificultad] = useState<'EASY' | 'MEDIUM' | 'HARD'>('EASY');

  // 1. NUEVO ESTADO PARA YENES (editable)
  const [yenes, setYenes] = useState('500');
  // Estado para detectar si el usuario editó manualmente el valor de Yenes
  const [precioManual, setPrecioManual] = useState(false);

  // NUEVO: Días seleccionados para repetición
  const [diasSeleccionados, setDiasSeleccionados] = useState<number[]>([]);

  // Nuevo: Fecha
  const [tieneExpiracion, setTieneExpiracion] = useState(false);

  // Stats disponibles y selección
  const [availableStats, setAvailableStats] = useState<Stat[]>([]);
  const [selectedStatId, setSelectedStatId] = useState<number | null>(null);

  // 2. EFECTO: sugerir yenes al cambiar dificultad (pero es editable por el usuario)
  useEffect(() => {
    if (precioManual) return;
    switch (dificultad) {
      case 'EASY': setYenes('500'); break;
      case 'MEDIUM': setYenes('1500'); break;
      case 'HARD': setYenes('5000'); break;
    }
  }, [dificultad, precioManual]);

  // 1. EFECTO: cargar arco activo (si existe) — usar useFocusEffect para reactividad
  useFocusEffect(useCallback(() => {
    let mounted = true;
    const loadActiveArc = async () => {
      try {
        // SQL a prueba de balas: obtener solo el arco estrictamente ACTIVO más reciente
        const result: any = await db.getFirstAsync(
          `SELECT * FROM arcos WHERE estado = 'ACTIVO' ORDER BY id_arco DESC LIMIT 1;`
        );

        if (!mounted) return;

        // Doble verificación defensiva
        if (result && result.estado === 'ACTIVO') {
          console.log('✅ Arco Activo encontrado:', result.nombre);
          setActiveArc(result);
        } else {
          console.log('🚫 Sin Arco Activo (Limpiando estado)');
          setActiveArc(null);
          setMissionArcId(null);
        }
      } catch (e) {
        console.error('Error cargando arco activo:', e);
        setActiveArc(null);
        setMissionArcId(null);
      }
    };
    loadActiveArc();
    return () => { mounted = false; };
  }, []));

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

      // Mantener id_arco del edit si existe
      setMissionArcId(missionToEdit.id_arco || null);

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

  // Animacion de entrada (una sola vez al montar)
  const intro = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(intro, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);

  // Calcular recompensas según dificultad
  const getRecompensas = () => {
    switch (dificultad) {
      case 'EASY': return { xp: 10, yenes: 500 };
      case 'MEDIUM': return { xp: 30, yenes: 1000 };
      case 'HARD': return { xp: 50, yenes: 1500 };
    }
  };

  const handleSelectTipo = (t: MissionType) => {
    if (t === MissionType.ARCO) {
      if (!activeArc) {
        showAlert('SIN ARCO ACTIVO', 'Debes iniciar un Arco en la pestaña correspondiente para crear misiones de trama.');
        return;
      }
      setTipo(t);
      setMissionArcId(activeArc.id_arco || null);
      if (activeArc.id_stat_relacionado) setSelectedStatId(activeArc.id_stat_relacionado);
      return;
    }
    // switching away from ARCO clears linkage
    setTipo(t);
    setMissionArcId(null);
  };

  const guardarMision = async () => {
    const editing = !!missionToEdit;
    console.log(editing ? '--- INICIO EDICIÓN MISIÓN ---' : '--- INICIO CREACIÓN MISIÓN ---');
    console.log('Datos:', { nombre, tipo, recompensa: getRecompensas(), selectedStatId });
    if (!nombre.trim()) {
      showAlert("Atención", "Escribe el nombre del encargo.");
      return;
    }

    // Validación UX: Misiones DIARIAS requieren al menos un día seleccionado
    if (tipo === 'DIARIA' && (!diasSeleccionados || diasSeleccionados.length === 0)) {
      showAlert(
        'Faltan días asignados',
        'Las misiones DIARIAS requieren al menos un día de la semana. Si es una tarea eventual sin día fijo, por favor cámbiala a categoría EXTRA.'
      );
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
            const idArcVal = (tipo === MissionType.ARCO) ? missionArcId : null;
            const updateParams = [nombre, tipo, fechaFinal, xp, recompensaYenes, frecuenciaVal, diasString, idArcVal, missionToEdit.id_mision];
            console.log('SQL UPDATE misiones -> id:', missionToEdit.id_mision, 'params:', updateParams);
            const resUpdate: any = await db.runAsync(
              `UPDATE misiones SET nombre = ?, tipo = ?, fecha_expiracion = ?, recompensa_exp = ?, recompensa_yenes = ?, frecuencia_repeticion = ?, dias_repeticion = ?, id_arco = ? WHERE id_mision = ?`,
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
          const idArcVal = (tipo === MissionType.ARCO) ? missionArcId : null;
          const res: any = await db.runAsync(
            `INSERT INTO misiones (
              nombre, tipo, fecha_creacion, activa, completada,
              fecha_expiracion, recompensa_exp, recompensa_yenes,
              frecuencia_repeticion, dias_repeticion, id_arco
            ) VALUES (?, ?, ?, 1, 0, ?, ?, ?, ?, ?, ?)`,
            [nombre, tipo, fechaCreacion, fechaFinal, xp, recompensaYenes, frecuenciaVal, diasString, idArcVal]
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
        showAlert('Error', 'Falló al guardar la misión y su impacto.');
      }

    } catch (error) {
      console.error(error);
      showAlert("Error", "Falló al guardar la misión");
    }
  };

  // Manejador del calendario
  const onChangeDate = (event: any, selectedDate?: Date) => {
    setMostrarPicker(false); // Cerrar picker en Android
    if (selectedDate) {
      setFechaExpiracion(selectedDate);
    }
  };

  const handleDelete = async () => {
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
      showAlert('Error', 'No se pudo eliminar la misión.');
    }
  };

  // Etiqueta de seccion inclinada (estilo Persona)
  const SectionTag = ({ text }: { text: string }) => (
    <View style={styles.sectionTagWrap}>
      <PersonaShard label={text} />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.headerWrap}>
        <PersonaShard
          label={missionToEdit ? 'EDITAR ENCARGO' : 'NUEVO ENCARGO'}
          height={56}
          fontSize={30}
          font={colors.fonts?.title}
        />
      </View>

      <Animated.View
        style={{
          flex: 1,
          opacity: intro,
          transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
        }}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>

          {/* 1. OBJETIVO (protagonista) */}
          <SectionTag text="OBJETIVO" />
          <View style={[styles.objetivoCard, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
            <View style={[styles.objetivoAccent, { backgroundColor: colors.primary }]} />
            <View style={[styles.objetivoStripe, { backgroundColor: colors.secondary }]} />
            <TextInput
              style={[styles.objetivoInput, { color: colors.text }]}
              placeholder="¿QUÉ DEBES HACER?"
              placeholderTextColor={colors.textDim}
              value={nombre}
              onChangeText={setNombre}
            />
          </View>

          {/* 2. CATEGORÍA */}
          <SectionTag text="CATEGORÍA" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll} contentContainerStyle={styles.chipRow}>
            {Object.values(MissionType).map((t, i) => {
              const active = tipo === t;
              const sk = [-16, 13, -11, 16, -13][i % 5];     // alterna direccion (zigzag)
              const st = [0, 20, 6, 16, 2][i % 5];           // escalonado vertical (cascada)
              const cc = i % 2 === 0 ? colors.primary : colors.secondary; // alterna color
              return (
                <TouchableOpacity
                  key={t}
                  activeOpacity={0.85}
                  style={[styles.chip, { marginTop: st, borderColor: cc, backgroundColor: active ? cc : colors.surface, transform: [{ skewX: `${sk}deg` }] }]}
                  onPress={() => handleSelectTipo(t as MissionType)}
                >
                  <Text style={[styles.chipText, { color: active ? getContrastText(cc) : colors.textDim, fontFamily: colors.fonts?.heading, transform: [{ skewX: `${-sk}deg` }] }]}>{t}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {tipo === MissionType.ARCO && activeArc ? (
            <View style={[styles.arcLink, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
              <Ionicons name="link" size={15} color={colors.primary} />
              <Text style={{ color: colors.text, fontSize: 12, marginLeft: 6, fontFamily: colors.fonts?.bold }}>Vinculado a: {activeArc.nombre}</Text>
            </View>
          ) : null}

          {/* 3. DIFICULTAD */}
          <SectionTag text="DIFICULTAD" />
          <View style={styles.row}>
            {['EASY', 'MEDIUM', 'HARD'].map((dif) => {
              const active = dificultad === dif;
              return (
                <TouchableOpacity
                  key={dif}
                  activeOpacity={0.85}
                  onPress={() => setDificultad(dif as any)}
                  style={[styles.difficultyBtn, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary + '22' : colors.surface }]}
                >
                  <Text style={{ color: active ? colors.primary : colors.textDim, fontFamily: colors.fonts?.heading, fontSize: 15, letterSpacing: 0.5, transform: [{ skewX: '10deg' }] }}>{dif}</Text>
                  <Text style={{ fontSize: 10, color: colors.textDim, marginTop: 4, fontFamily: colors.fonts?.condensed, transform: [{ skewX: '10deg' }] }}>
                    {dif === 'EASY' ? '+10 XP' : dif === 'MEDIUM' ? '+30 XP' : '+50 XP'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 4. IMPACTO EN ATRIBUTO */}
          <SectionTag text="IMPACTO EN ATRIBUTO" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll} contentContainerStyle={styles.chipRow}>
            {availableStats.map((s, i) => {
              const active = selectedStatId === s.id_stat;
              const sk = [13, -15, 10, -16, 14][i % 5];      // alterna direccion (zigzag)
              const st = [16, 2, 18, 6, 12][i % 5];          // escalonado vertical (cascada)
              const cc = i % 2 === 0 ? colors.primary : colors.secondary; // alterna color
              return (
                <TouchableOpacity
                  key={s.id_stat}
                  activeOpacity={0.85}
                  style={[styles.chip, { marginTop: st, borderColor: cc, backgroundColor: active ? cc : colors.surface, transform: [{ skewX: `${sk}deg` }] }]}
                  onPress={() => setSelectedStatId(s.id_stat)}
                >
                  <Text style={[styles.chipText, { color: active ? getContrastText(cc) : colors.text, fontFamily: colors.fonts?.heading, transform: [{ skewX: `${-sk}deg` }] }]}>{s.nombre.toUpperCase()}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* 5. RECOMPENSA (Yenes editable) */}
          <SectionTag text="RECOMPENSA" />
          <View style={[styles.rewardCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.cardAccent, { backgroundColor: colors.primary }]} />
            <Text style={[styles.yenSign, { color: colors.primary, fontFamily: colors.fonts?.display }]}>¥</Text>
            <TextInput
              style={[styles.yenInput, { color: colors.text, fontFamily: colors.fonts?.display }]}
              value={yenes}
              onChangeText={(t) => { setYenes(t); setPrecioManual(true); }}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.textDim}
            />
          </View>

          {/* 6. REPETICIÓN (Selector de Días) - fuera de cualquier caja */}
          <SectionTag text={`REPETICIÓN${diasSeleccionados.length === 0 ? '  ·  UNA VEZ' : diasSeleccionados.length === 7 ? '  ·  CADA DÍA' : ''}`} />
          <View style={{ paddingVertical: 6 }}>
            <DaySelector selectedDays={diasSeleccionados} onChange={setDiasSeleccionados} />
            <View style={styles.repeatHintRow}>
              <View style={[styles.repeatHintAccent, { backgroundColor: colors.secondary }]} />
              <Text style={[styles.repeatHint, { color: colors.textDim, fontFamily: colors.fonts?.condensed }]}>
                {diasSeleccionados.length > 0
                  ? 'SE REINICIARÁ LOS DÍAS MARCADOS'
                  : 'NO SE REPITE · DESAPARECE AL COMPLETARSE'}
              </Text>
            </View>
          </View>

          {/* 7. FECHA LÍMITE - toggle de estado disruptivo */}
          <SectionTag text="FECHA LÍMITE" />
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setTieneExpiracion(!tieneExpiracion)}
            style={[styles.fechaToggle, { backgroundColor: tieneExpiracion ? colors.primary : colors.surface, borderColor: colors.primary }]}
          >
            <Ionicons name={tieneExpiracion ? 'flag' : 'flag-outline'} size={22} color={tieneExpiracion ? colors.textInverse : colors.textDim} style={styles.unskew} />
            <Text style={[styles.fechaToggleText, { color: tieneExpiracion ? colors.textInverse : colors.textDim, fontFamily: colors.fonts?.heading }]}>
              {tieneExpiracion ? 'CON LÍMITE' : 'SIN LÍMITE'}
            </Text>
            <View style={[styles.fechaDot, styles.unskew, { backgroundColor: tieneExpiracion ? colors.textInverse : 'transparent', borderColor: tieneExpiracion ? colors.textInverse : colors.textDim }]} />
          </TouchableOpacity>

          {tieneExpiracion && (
            <TouchableOpacity
              onPress={() => setMostrarPicker(true)}
              style={[styles.dateDisplay, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 10 }]}
            >
              <Ionicons name="calendar" size={20} color={colors.primary} />
              <Text style={[styles.dateText, { color: colors.text, fontFamily: colors.fonts?.display, fontSize: 18 }]}>{fechaExpiracion.toLocaleDateString()}</Text>
              <Text style={{ color: colors.textDim, fontSize: 12 }}>(cambiar)</Text>
            </TouchableOpacity>
          )}

          {tieneExpiracion && mostrarPicker && (
            <DateTimePicker
              value={fechaExpiracion}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onChangeDate}
              minimumDate={new Date()}
              textColor={colors.text}
            />
          )}

        </ScrollView>

        {/* FOOTER */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
            <Text style={{ color: colors.textDim, fontFamily: colors.fonts?.bold, letterSpacing: 1 }}>CANCELAR</Text>
          </TouchableOpacity>

          {/* Delete button in edit mode */}
          {missionToEdit && (
            <TouchableOpacity style={[styles.skewBtn, { borderColor: colors.error, borderWidth: 1.5 }]} activeOpacity={0.85} onPress={handleDelete}>
              <Text style={[styles.skewBtnText, { color: colors.error, fontFamily: colors.fonts?.heading }]}>ELIMINAR</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[styles.skewBtn, styles.saveBtn, { backgroundColor: colors.primary }]} activeOpacity={0.9} onPress={guardarMision}>
            <Text style={[styles.skewBtnText, { color: colors.textInverse, fontFamily: colors.fonts?.title, fontSize: 16 }]}>
              {missionToEdit ? 'GUARDAR' : 'CONFIRMAR'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 50 },

  headerWrap: { marginBottom: 18, marginTop: 4 },

  // Etiqueta de seccion inclinada
  sectionTagWrap: { marginTop: 26, marginBottom: 14 },
  sectionTag: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, transform: [{ skewX: '-20deg' }] },
  sectionTagText: { fontSize: 12, fontWeight: '900', letterSpacing: 1.2, transform: [{ skewX: '20deg' }] },

  section: { padding: 14, borderRadius: 10, borderWidth: 1 },
  accentCard: { borderRadius: 10, borderWidth: 1, padding: 14, paddingLeft: 22, overflow: 'hidden' },
  cardAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 7, transform: [{ skewX: '-12deg' }], marginLeft: -2 },
  rewardCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 16, paddingLeft: 22, overflow: 'hidden' },
  yenSign: { fontSize: 40, marginRight: 8, includeFontPadding: false },
  yenInput: { flex: 1, fontSize: 40, padding: 0, includeFontPadding: false },

  // OBJETIVO protagonista (banner diagonal)
  objetivoCard: { borderRadius: 4, borderWidth: 2, paddingVertical: 18, paddingHorizontal: 20, paddingLeft: 28, minHeight: 72, justifyContent: 'center', overflow: 'hidden' },
  objetivoAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 12, transform: [{ skewX: '-14deg' }], marginLeft: -3 },
  objetivoStripe: { position: 'absolute', left: -20, right: -20, bottom: 9, height: 5, transform: [{ skewX: '-20deg' }], opacity: 0.85 },
  objetivoInput: { fontSize: 22, fontWeight: 'bold', letterSpacing: 0.5 },

  // REPETICION hint (fuera de caja)
  repeatHintRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, alignSelf: 'center' },
  repeatHintAccent: { width: 5, height: 16, marginRight: 8, transform: [{ skewX: '-18deg' }] },
  repeatHint: { fontSize: 12, letterSpacing: 1 },

  // FECHA LIMITE toggle disruptivo
  fechaToggle: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, paddingVertical: 14, paddingHorizontal: 22, transform: [{ skewX: '-12deg' }], alignSelf: 'flex-start' },
  fechaToggleText: { fontSize: 18, letterSpacing: 1, marginHorizontal: 12, transform: [{ skewX: '12deg' }] },
  fechaDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  unskew: { transform: [{ skewX: '12deg' }] },
  label: { fontSize: 14, fontWeight: 'bold', marginBottom: 5 },
  input: { fontSize: 18, fontWeight: 'bold' },

  horizontalScroll: { flexDirection: 'row' },
  chipRow: { alignItems: 'flex-start', paddingRight: 14, paddingTop: 4, paddingBottom: 20 },
  chip: { borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 9, marginRight: 14, justifyContent: 'center', transform: [{ skewX: '-12deg' }] },
  chipText: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, transform: [{ skewX: '12deg' }] },

  arcLink: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, borderWidth: 1, marginTop: 10 },

  row: { flexDirection: 'row', gap: 14 },
  difficultyBtn: { flex: 1, padding: 14, borderRadius: 3, borderWidth: 1.5, alignItems: 'center', transform: [{ skewX: '-10deg' }] },

  dateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateDisplay: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 8, gap: 10, marginTop: 12, borderWidth: 1 },
  dateText: { fontSize: 16, fontWeight: 'bold', flex: 1 },

  footer: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 8 },
  cancelBtn: { paddingVertical: 14, paddingHorizontal: 10, marginRight: 8 },
  skewBtn: { paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', transform: [{ skewX: '-12deg' }] },
  skewBtnText: { letterSpacing: 1, textTransform: 'uppercase', transform: [{ skewX: '12deg' }] },
  saveBtn: { flex: 1, marginLeft: 8, elevation: 5 },
});
