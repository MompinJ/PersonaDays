import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../themes/useTheme';
import { db, initDatabase } from '../../database';
import { useAlert } from '../../context/AlertContext';
import { PersonaShard } from '../../components/UI/PersonaShard';

export const SettingsScreen = () => {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const { showAlert } = useAlert();

  const intro = useRef(new Animated.Value(0)).current;

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

  dangerCard: { borderWidth: 2, paddingVertical: 16, paddingHorizontal: 16, paddingLeft: 22, marginBottom: 12, overflow: 'hidden' },
  dangerAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 10, transform: [{ skewX: '-14deg' }], marginLeft: -3 },
  dangerInner: { flexDirection: 'row', alignItems: 'center' },
  dangerTitle: { fontSize: 19, letterSpacing: 1 },
  dangerSub: { fontSize: 10, letterSpacing: 1, marginTop: 1 },
});
