import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated, Easing, Switch, DevSettings } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../themes/useTheme';
import { db, initDatabase } from '../../database';
import { useAlert } from '../../context/AlertContext';
import { PersonaShard } from '../../components/UI/PersonaShard';
import { loadConfig, saveConfig, syncRoutineReminders, requestPermission, NotifConfig } from '../../services/notificationService';
import { exportBackup, importBackup } from '../../services/backupService';

export const SettingsScreen = () => {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const { showAlert } = useAlert();

  const intro = useRef(new Animated.Value(0)).current;

  // --- Recordatorios (notificaciones por bloques de rutina) ---
  const [notifCfg, setNotifCfg] = useState<NotifConfig | null>(null);
  const [pickerBlockId, setPickerBlockId] = useState<string | null>(null);

  useEffect(() => { loadConfig().then(setNotifCfg); }, []);

  const applyCfg = async (next: NotifConfig) => {
    setNotifCfg(next);
    await saveConfig(next);
    await syncRoutineReminders(next);
  };

  const toggleMaster = async () => {
    if (!notifCfg) return;
    if (!notifCfg.enabled) {
      const granted = await requestPermission();
      if (!granted) {
        showAlert('PERMISO NECESARIO', 'Activa las notificaciones de PersonaDays en los ajustes del sistema para recibir recordatorios.');
        return;
      }
      await applyCfg({ ...notifCfg, enabled: true });
    } else {
      await applyCfg({ ...notifCfg, enabled: false });
    }
  };

  const toggleBlock = async (id: string) => {
    if (!notifCfg) return;
    const blocks = notifCfg.blocks.map(b => (b.id === id ? { ...b, enabled: !b.enabled } : b));
    await applyCfg({ ...notifCfg, blocks });
  };

  const onPickTime = async (_event: any, date?: Date) => {
    const id = pickerBlockId;
    setPickerBlockId(null);
    if (!date || !id || !notifCfg) return;
    const blocks = notifCfg.blocks.map(b => (b.id === id ? { ...b, hour: date.getHours(), minute: date.getMinutes() } : b));
    await applyCfg({ ...notifCfg, blocks });
  };

  const fmtTime = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

  useEffect(() => {
    Animated.timing(intro, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [intro]);

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

  const handleDeleteDuplicateStats = () => {
    showAlert('Confirmar', '¿Eliminar stats duplicados? Esto mantendrá la instancia más antigua de cada stat y limpiará jugador_stat.', [
      { text: 'CANCELAR', style: 'cancel' },
      { text: 'ELIMINAR', style: 'destructive', onPress: async () => {
          try {
            await db.execAsync('BEGIN TRANSACTION;');
            // Eliminar stats duplicados (mantener la instancia más antigua)
            await db.runAsync(`DELETE FROM stats WHERE id_stat NOT IN (SELECT MIN(id_stat) FROM stats GROUP BY nombre);`);
            // Eliminar entradas en jugador_stat que referencien stats eliminados
            await db.runAsync(`DELETE FROM jugador_stat WHERE id_stat NOT IN (SELECT id_stat FROM stats);`);
            // Eliminar duplicados en jugador_stat dejando la entrada más antigua por jugador+stat
            await db.runAsync(`DELETE FROM jugador_stat WHERE id_jugador_stat NOT IN (SELECT MIN(id_jugador_stat) FROM jugador_stat GROUP BY id_jugador, id_stat);`);
            await db.execAsync('COMMIT;');
            showAlert('Hecho', 'Stats duplicados y entradas de jugador_stat limpiadas. Reinicia la app si es necesario.');
          } catch (err) {
            console.error('Error eliminando stats duplicados:', err);
            try { await db.execAsync('ROLLBACK;'); } catch(e){}
            showAlert('Error', 'No se pudo eliminar stats duplicados.');
          }
        } }
    ]);
  };

  const handleExportBackup = async () => {
    const res = await exportBackup();
    if (!res.ok && !res.canceled) showAlert('ERROR', res.reason || 'No se pudo exportar.');
  };

  const handleRestoreBackup = () => {
    showAlert('RESTAURAR RESPALDO', 'Esto REEMPLAZARÁ todos tus datos actuales con los del archivo que elijas. ¿Continuar?', [
      { text: 'CANCELAR', style: 'cancel' },
      { text: 'ELEGIR ARCHIVO', style: 'destructive', onPress: async () => {
        const res = await importBackup();
        if (res.ok === false && res.canceled) return;
        if (!res.ok) { showAlert('ERROR', res.reason || 'No se pudo restaurar.'); return; }
        showAlert('RESPALDO RESTAURADO', 'La app se recargará para aplicar los cambios. Si no se recarga sola, ciérrala y vuelve a abrirla.', [
          { text: 'RECARGAR', onPress: () => { try { DevSettings.reload(); } catch (e) { /* prod: el usuario reinicia */ } } },
        ]);
      } },
    ]);
  };

  // DEV: Reset Database (Danger Zone)
  const resetDatabase = () => {
    showAlert('CONFIRMAR RESET', '¿Estás seguro? Esto borrará TODO el progreso y datos de la app de forma permanente.', [
      { text: 'CANCELAR', style: 'cancel' },
      { text: 'SÍ, REINICIAR', style: 'destructive', onPress: async () => {
        try {
          await db.execAsync('BEGIN TRANSACTION;');
          const tables = [
            'jugadores','stats','jugador_stat','misiones','impacto_mision','arcos','logs',
            'finanzas','financial_categories','arcanos','custom_lists','list_items','jugador_arcanos_slots'
          ];
          for (const t of tables) {
            try { await db.runAsync(`DROP TABLE IF EXISTS ${t};`); } catch(e) { console.warn('No se pudo dropear', t, e); }
          }
          try { await db.runAsync("DELETE FROM sqlite_sequence;" ); } catch(e) { /* ignore */ }
          await db.execAsync('COMMIT;');

          // Recreate schema
          try {
            await initDatabase();
            showAlert('Éxito', 'Base de datos reiniciada. Por favor recarga la app si es necesario.');
          } catch (e) {
            console.error('Error recreando DB:', e);
            showAlert('Error', 'Ocurrió un error al recrear la base de datos. Revisa logs.');
          }
        } catch (err) {
          console.error('Error reseteando DB:', err);
          try { await db.execAsync('ROLLBACK;'); } catch(e){}
          showAlert('Error', 'No se pudo resetear la base de datos.');
        }
      } }
    ]);
  };

  const introStyle = {
    opacity: intro,
    transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.headerWrap}>
        <PersonaShard label="AJUSTES" height={50} fontSize={28} font={theme.fonts?.title} />
      </View>

      <Animated.View style={[{ flex: 1 }, introStyle]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* CUENTA */}
          <View style={styles.sectionTag}><PersonaShard label="CUENTA" height={24} fontSize={11} /></View>

          <OptionRow
            icon="person-circle"
            label="CONFIGURAR PERSONAJE"
            accent={theme.primary}
            skew={-11}
            chevron
            onPress={() => navigation.navigate('CharacterSelection', { isEditing: true })}
          />
          <OptionRow
            icon="create"
            label="EDITAR NOMBRE"
            accent={theme.secondary}
            skew={10}
            chevron
            onPress={() => navigation.navigate('Setup', { isEditing: true })}
          />

          {/* NOTIFICACIONES */}
          <View style={[styles.sectionTag, { marginTop: 26 }]}><PersonaShard label="NOTIFICACIONES" height={24} fontSize={11} color={theme.secondary} /></View>

          <View style={[styles.option, { borderColor: theme.border, backgroundColor: theme.surface, transform: [{ skewX: '-11deg' }] }]}>
            <View style={[styles.optionAccent, { backgroundColor: theme.secondary }]} />
            <View style={[styles.optionInner, { transform: [{ skewX: '11deg' }] }]}>
              <Ionicons name="notifications" size={24} color={theme.secondary} style={{ marginRight: 14 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionText, { color: theme.text, fontFamily: theme.fonts?.heading }]}>RECORDATORIOS</Text>
                <Text style={[styles.optionSub, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>AVISOS POR BLOQUE DE RUTINA</Text>
              </View>
              <Switch
                value={!!notifCfg?.enabled}
                onValueChange={toggleMaster}
                trackColor={{ true: theme.primary, false: theme.border }}
                thumbColor={theme.surface}
              />
            </View>
          </View>

          {notifCfg?.enabled && notifCfg.blocks.map((b) => (
            <View key={b.id} style={[styles.blockRow, { borderColor: theme.border, backgroundColor: theme.surface }]}>
              <View style={[styles.blockAccent, { backgroundColor: b.enabled ? theme.secondary : theme.border }]} />
              <Text style={[styles.blockLabel, { color: b.enabled ? theme.text : theme.textDim, fontFamily: theme.fonts?.heading }]} numberOfLines={1}>{b.label.toUpperCase()}</Text>
              <TouchableOpacity onPress={() => setPickerBlockId(b.id)} disabled={!b.enabled} style={[styles.timePill, { borderColor: b.enabled ? theme.primary : theme.border }]}>
                <Text style={[styles.timeText, { color: b.enabled ? theme.primary : theme.textDim, fontFamily: theme.fonts?.display }]}>{fmtTime(b.hour, b.minute)}</Text>
              </TouchableOpacity>
              <Switch
                value={b.enabled}
                onValueChange={() => toggleBlock(b.id)}
                trackColor={{ true: theme.secondary, false: theme.border }}
                thumbColor={theme.surface}
              />
            </View>
          ))}

          {pickerBlockId && notifCfg ? (() => {
            const b = notifCfg.blocks.find(x => x.id === pickerBlockId);
            const d = new Date();
            if (b) { d.setHours(b.hour); d.setMinutes(b.minute); d.setSeconds(0); }
            return <DateTimePicker value={d} mode="time" is24Hour display="default" onChange={onPickTime} />;
          })() : null}

          {/* RESPALDO */}
          <View style={[styles.sectionTag, { marginTop: 26 }]}><PersonaShard label="RESPALDO" height={24} fontSize={11} color={theme.primary} /></View>

          <OptionRow
            icon="cloud-upload"
            label="EXPORTAR RESPALDO"
            sublabel="GUARDA TODO TU PROGRESO EN UN ARCHIVO"
            accent={theme.primary}
            skew={-11}
            onPress={handleExportBackup}
          />
          <OptionRow
            icon="cloud-download"
            label="RESTAURAR RESPALDO"
            sublabel="REEMPLAZA TUS DATOS CON UN ARCHIVO"
            accent={theme.secondary}
            skew={10}
            onPress={handleRestoreBackup}
          />

          {/* MANTENIMIENTO */}
          <View style={[styles.sectionTag, { marginTop: 26 }]}><PersonaShard label="MANTENIMIENTO" variant="ghost" height={22} fontSize={10} /></View>

          <OptionRow
            icon="layers"
            label="ELIMINAR STATS DUPLICADOS"
            accent={theme.primary}
            skew={-13}
            onPress={handleDeleteDuplicateStats}
          />
          <OptionRow
            icon="trash"
            label="BORRAR TODOS LOS ARCOS"
            sublabel="DEBUG"
            accent={theme.error}
            skew={12}
            onPress={handleResetArcs}
          />

          {/* ZONA DE PELIGRO */}
          <View style={[styles.sectionTag, { marginTop: 26 }]}>
            <PersonaShard label="ZONA DE PELIGRO" height={24} fontSize={11} color={theme.error} />
          </View>

          <TouchableOpacity activeOpacity={0.85} onPress={resetDatabase} style={[styles.dangerCard, { borderColor: theme.error, backgroundColor: theme.error + '0E', transform: [{ skewX: '-10deg' }] }]}>
            <View style={[styles.dangerAccent, { backgroundColor: theme.error }]} />
            <View style={[styles.dangerInner, { transform: [{ skewX: '10deg' }] }]}>
              <Ionicons name="warning" size={26} color={theme.error} style={{ marginRight: 14 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.dangerTitle, { color: theme.error, fontFamily: theme.fonts?.heading }]}>RESET DATA</Text>
                <Text style={[styles.dangerSub, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>BORRA TODO EL PROGRESO. SOLO DEV.</Text>
              </View>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </View>
  );
};

// Fila de opcion inclinada con barra de acento (estilo P3R)
const OptionRow = ({ icon, label, sublabel, accent, skew, chevron, onPress }: {
  icon: any; label: string; sublabel?: string; accent: string; skew: number; chevron?: boolean; onPress: () => void;
}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[styles.option, { borderColor: theme.border, backgroundColor: theme.surface, transform: [{ skewX: `${skew}deg` }] }]}>
      <View style={[styles.optionAccent, { backgroundColor: accent }]} />
      <View style={[styles.optionInner, { transform: [{ skewX: `${-skew}deg` }] }]}>
        <Ionicons name={icon} size={24} color={accent} style={{ marginRight: 14 }} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.optionText, { color: theme.text, fontFamily: theme.fonts?.heading }]}>{label}</Text>
          {sublabel ? <Text style={[styles.optionSub, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>{sublabel}</Text> : null}
        </View>
        {chevron ? <Ionicons name="chevron-forward" size={22} color={theme.textDim} /> : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 50 },
  headerWrap: { marginBottom: 12, marginTop: 4 },

  sectionTag: { marginBottom: 12, marginTop: 4 },

  option: { borderWidth: 1.5, paddingVertical: 14, paddingHorizontal: 16, paddingLeft: 22, marginBottom: 12, overflow: 'hidden' },
  optionAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, transform: [{ skewX: '-14deg' }], marginLeft: -3 },
  optionInner: { flexDirection: 'row', alignItems: 'center' },
  optionText: { fontSize: 16, letterSpacing: 0.5 },
  optionSub: { fontSize: 10, letterSpacing: 1, marginTop: 1 },

  blockRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, paddingVertical: 11, paddingHorizontal: 14, paddingLeft: 18, marginBottom: 10, marginLeft: 14, overflow: 'hidden' },
  blockAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6 },
  blockLabel: { flex: 1, fontSize: 13, letterSpacing: 0.5 },
  timePill: { borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 5, marginRight: 12, transform: [{ skewX: '-10deg' }] },
  timeText: { fontSize: 17, letterSpacing: 1, transform: [{ skewX: '10deg' }] },

  dangerCard: { borderWidth: 2, paddingVertical: 16, paddingHorizontal: 16, paddingLeft: 22, marginBottom: 12, overflow: 'hidden' },
  dangerAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 10, transform: [{ skewX: '-14deg' }], marginLeft: -3 },
  dangerInner: { flexDirection: 'row', alignItems: 'center' },
  dangerTitle: { fontSize: 19, letterSpacing: 1 },
  dangerSub: { fontSize: 10, letterSpacing: 1, marginTop: 1 },
});
