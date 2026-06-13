import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, StatusBar, Platform, Linking, Image, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAlert } from '../../../context/AlertContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/types';
import { useTheme } from '../../../themes/useTheme';
import ManageArcModal from '../../../components/Arcs/ManageArcModal';
import ArcGallery from '../../../components/Arcs/ArcGallery';
import { useGame } from '../../../context/GameContext';
import { usePlayerStats } from '../../../hooks/usePlayerStats';
import { finalizeArcWithRewards, getArcState, getArcMissionSummary, ArcMissionSummary, arcElapsedDays } from '../../../services/arcService';
import { useEventFlash } from '../../../context/EventFlashContext';
import { db } from '../../../database';
import { PersonaShard } from '../../../components/UI/PersonaShard';
import { PersonaCount } from '../../../components/UI/PersonaCount';
import { getContrastText } from '../../../utils/colorUtils';

type Props = NativeStackScreenProps<RootStackParamList, 'ArcDetail'>;

export const ArcDetailScreen = ({ route, navigation }: Props) => {
  const initialArc = route.params?.arc || null;
  const theme = useTheme();
  // El arco vive en estado para poder recargarlo de la DB tras editar (el objeto
  // de params queda viejo: si no se recarga, los cambios no se ven hasta reabrir).
  const [arc, setArc] = useState<any>(initialArc);
  const [showModal, setShowModal] = useState(false);
  const { player, refreshUser } = useGame();
  const { refreshStats } = usePlayerStats();
  const { showAlert } = useAlert();
  const { flash } = useEventFlash();

  const [statName, setStatName] = useState<string | null>(null);
  const [missions, setMissions] = useState<ArcMissionSummary | null>(null);
  const [journal, setJournal] = useState(initialArc?.resumen_final || '');
  const [journalSaved, setJournalSaved] = useState(false);

  const reloadArc = async () => {
    if (!initialArc?.id_arco) return;
    try {
      const rows: any[] = await db.getAllAsync('SELECT * FROM arcos WHERE id_arco = ?', [initialArc.id_arco]);
      if (rows?.[0]) setArc(rows[0]);
    } catch (e) {
      console.error('Error recargando arco:', e);
    }
  };

  useEffect(() => {
    if (!arc) return;
    const load = async () => {
      try {
        if (arc.id_stat_relacionado) {
          const s: any[] = await db.getAllAsync('SELECT nombre FROM stats WHERE id_stat = ?', [arc.id_stat_relacionado]);
          setStatName(s?.[0]?.nombre || null);
        }
        setMissions(await getArcMissionSummary(arc.id_arco));
      } catch (e) {
        console.error('Error cargando detalle del arco:', e);
      }
    };
    load();
  }, [arc]);

  const saveJournal = async () => {
    if (!arc) return;
    try {
      await db.runAsync('UPDATE arcos SET resumen_final = ? WHERE id_arco = ?', [journal || null, arc.id_arco]);
      setJournalSaved(true);
      setTimeout(() => setJournalSaved(false), 1500);
    } catch (e) {
      console.error('Error guardando reflexiones:', e);
    }
  };

  const openAnthem = () => {
    if (arc?.anthem_url) Linking.openURL(arc.anthem_url).catch(() => {});
  };

  // Guarda las reflexiones explicitamente y vuelve atras (boton GUARDAR).
  const saveAndExit = async () => {
    await saveJournal();
    navigation.goBack();
  };

  const finishSwipeRef = useRef<any>(null);

  if (!arc) return null;

  const end = arc.fecha_fin ? new Date(arc.fecha_fin) : null;
  const state = getArcState(arc);
  const stateColor = state === 'ACTIVO' ? theme.primary : state === 'COMPLETADO' ? theme.success : theme.secondary;
  const stateLabel = state === 'ACTIVO' ? 'EN CURSO' : state === 'COMPLETADO' ? 'COMPLETADO' : 'ABANDONADO';
  const dias = arcElapsedDays(arc);

  const handleFinishArc = async () => {
    if (!arc) return;
    showAlert('FINALIZAR ARCO', '¿Estás seguro de que deseas cerrar este capítulo? Esta acción es irreversible.', [
      { text: 'CANCELAR', style: 'cancel', onPress: () => { try { finishSwipeRef.current?.close(); } catch (e) {} } },
      { text: 'SÍ, FINALIZAR', style: 'destructive', onPress: async () => {
        try {
          const { grantedXP } = await finalizeArcWithRewards(arc, player);
          try { refreshStats && refreshStats(); } catch (e) {}
          try { refreshUser && refreshUser(); } catch (e) {}
          // Vamos a la pantalla de resultados (reemplaza el detalle en el stack).
          navigation.replace('ArcResults', { arc });
          // Flash celebratorio (en vez de un alert): se muestra sobre la pantalla de resultados
          flash({ kind: 'complete', title: 'CAPÍTULO CERRADO', subtitle: arc?.nombre, xp: grantedXP > 0 ? grantedXP : undefined });
        } catch (err: any) {
          console.error('Error finalizando arco:', err);
          showAlert('ERROR', 'No se pudo finalizar el arco. ' + (err?.message || ''));
        }
      } },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 20 : 56 }]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={26} color={theme.primary} />
        </TouchableOpacity>
        <View style={[styles.badge, { backgroundColor: stateColor }]}>
          <Text style={[styles.badgeText, { color: getContrastText(stateColor), fontFamily: theme.fonts?.heading }]}>{stateLabel}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 210 }} showsVerticalScrollIndicator={false}>
        <PersonaShard label={arc.nombre} height={52} fontSize={28} font={theme.fonts?.title} color={stateColor} />

        {arc.frase_protagonica ? (
          <Text style={[styles.frase, { color: theme.text, fontFamily: theme.fonts?.body }]}>"{arc.frase_protagonica}"</Text>
        ) : null}

        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={16} color={theme.textDim} />
          <Text style={[styles.dateText, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>
            {arc.fecha_inicio}{end ? '  →  ' + arc.fecha_fin : '  →  EN CURSO'}
          </Text>
        </View>

        {arc.descripcion ? (
          <Text style={[styles.desc, { color: theme.text, fontFamily: theme.fonts?.body }]}>{arc.descripcion}</Text>
        ) : null}

        <View style={{ marginTop: 18 }}><PersonaShard label="TIEMPO" /></View>
        <View style={styles.progressBlock}>
          <PersonaCount value={dias} color={stateColor} fontSize={76} />
          <Text style={[styles.daysUnit, { color: stateColor, fontFamily: theme.fonts?.condensed }]}>{state === 'ACTIVO' ? 'DÍAS EN CURSO' : 'DÍAS'}</Text>
        </View>

        {statName ? (
          <>
            <View style={{ marginTop: 22 }}><PersonaShard label="ATRIBUTO QUE NUTRE" /></View>
            <View style={[styles.statTag, { borderColor: theme.primary }]}>
              <MaterialCommunityIcons name="star-four-points" size={16} color={theme.primary} style={styles.unskew} />
              <Text style={[styles.statText, { color: theme.text, fontFamily: theme.fonts?.heading }]}>{String(statName).toUpperCase()}</Text>
            </View>
          </>
        ) : null}

        {/* Anthem */}
        {arc.anthem_titulo ? (
          <>
            <View style={{ marginTop: 22 }}><PersonaShard label="ANTHEM" /></View>
            <TouchableOpacity activeOpacity={arc.anthem_url ? 0.7 : 1} onPress={openAnthem} style={[styles.anthemRow, { borderColor: stateColor }]}>
              {arc.anthem_cover_url ? (
                <Image source={{ uri: arc.anthem_cover_url }} style={[styles.anthemCover, styles.unskew8]} />
              ) : (
                <MaterialCommunityIcons name="music-note" size={20} color={stateColor} style={styles.unskew8} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.anthemTitle, { color: theme.text, fontFamily: theme.fonts?.heading }]} numberOfLines={1}>{arc.anthem_titulo}</Text>
                {arc.anthem_url ? <Text style={[styles.anthemLink, { color: stateColor, fontFamily: theme.fonts?.condensed }]} numberOfLines={1}>Abrir enlace</Text> : null}
              </View>
              {arc.anthem_url ? <Ionicons name="open-outline" size={18} color={stateColor} style={styles.unskew8} /> : null}
            </TouchableOpacity>
          </>
        ) : null}

        {/* Galeria (Memories) */}
        <View style={{ marginTop: 22 }}><PersonaShard label="MEMORIES" /></View>
        <ArcGallery idArco={arc.id_arco} accent={stateColor} editable={state !== 'COMPLETADO'} />

        {/* Misiones del arco */}
        {missions && missions.total > 0 ? (
          <>
            <View style={{ marginTop: 22 }}><PersonaShard label="MISIONES DEL ARCO" /></View>
            {missions.items.map((mi) => (
              <View key={mi.id_mision} style={styles.missionItem}>
                <MaterialCommunityIcons
                  name={mi.completada ? 'check-circle' : 'circle-outline'}
                  size={18}
                  color={mi.completada ? theme.success : theme.textDim}
                />
                <Text style={[styles.missionText, { color: mi.completada ? theme.text : theme.textDim, fontFamily: theme.fonts?.body }]} numberOfLines={1}>
                  {mi.nombre}
                </Text>
              </View>
            ))}
          </>
        ) : null}

        {/* Reflexiones (Journal) editable */}
        <View style={{ marginTop: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <PersonaShard label="REFLEXIONES" />
          {journalSaved ? <Text style={{ color: theme.success, fontFamily: theme.fonts?.condensed, fontSize: 12 }}>GUARDADO</Text> : null}
        </View>
        <TextInput
          value={journal}
          onChangeText={setJournal}
          onBlur={saveJournal}
          editable={state !== 'COMPLETADO'}
          multiline
          placeholder="¿Qué aprendiste en esta etapa? Escribe tus reflexiones..."
          placeholderTextColor={theme.textDim}
          style={[styles.journalInput, { color: theme.text, borderColor: theme.border, fontFamily: theme.fonts?.body }]}
        />
      </ScrollView>

      {state !== 'COMPLETADO' && (
        <View style={styles.footer}>
          {/* Finalizar SOLO por arrastre, para no confundirlo con guardar */}
          <Swipeable
            ref={finishSwipeRef}
            renderRightActions={(progress, dragX) => {
              const scale = dragX.interpolate({ inputRange: [-120, 0], outputRange: [1, 0.7], extrapolate: 'clamp' });
              return (
                <View style={styles.finishAction}>
                  <Animated.View style={{ flexDirection: 'row', alignItems: 'center', transform: [{ scale }] }}>
                    <MaterialCommunityIcons name="flag-checkered" size={22} color={theme.error} />
                    <Text style={[styles.finishActionText, { color: theme.error, fontFamily: theme.fonts?.bold }]}>FINALIZAR</Text>
                  </Animated.View>
                </View>
              );
            }}
            onSwipeableOpen={() => handleFinishArc()}
            containerStyle={{ marginBottom: 12 }}
          >
            <View style={[styles.slideBar, { borderColor: theme.error, backgroundColor: theme.background }]}>
              <Ionicons name="chevron-back" size={18} color={theme.error} />
              <Text style={[styles.slideBarText, { color: theme.error, fontFamily: theme.fonts?.heading }]}>DESLIZA PARA FINALIZAR EL ARCO</Text>
            </View>
          </Swipeable>

          <View style={styles.footerRow}>
            <TouchableOpacity onPress={() => setShowModal(true)} activeOpacity={0.85} style={[styles.skewBtn, { borderColor: theme.primary, borderWidth: 1.5 }]}>
              <Text style={[styles.skewBtnText, { color: theme.primary, fontFamily: theme.fonts?.heading }]}>EDITAR</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={saveAndExit} activeOpacity={0.9} style={[styles.skewBtn, styles.finalizeBtn, { backgroundColor: theme.primary }]}>
              <Text style={[styles.skewBtnText, { color: theme.textInverse, fontFamily: theme.fonts?.heading }]}>GUARDAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ManageArcModal visible={showModal} arc={arc} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); reloadArc(); }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
  backBtn: { padding: 4 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, transform: [{ skewX: '-12deg' }] },
  badgeText: { fontSize: 12, letterSpacing: 1, transform: [{ skewX: '12deg' }] },

  frase: { fontSize: 15, fontStyle: 'italic', lineHeight: 21, marginTop: 12 },
  dateRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  dateText: { marginLeft: 8, fontSize: 13, letterSpacing: 0.5 },
  desc: { fontSize: 14, lineHeight: 20, marginTop: 12 },

  progressBlock: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 4 },
  daysUnit: { fontSize: 16, letterSpacing: 1, marginLeft: 10, marginBottom: 14 },

  statTag: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1.5, transform: [{ skewX: '-12deg' }] },
  statText: { marginLeft: 8, fontSize: 14, letterSpacing: 0.5, transform: [{ skewX: '12deg' }] },
  unskew: { transform: [{ skewX: '12deg' }] },

  unskew8: { transform: [{ skewX: '8deg' }] },
  anthemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1.5, transform: [{ skewX: '-8deg' }] },
  anthemCover: { width: 44, height: 44, borderRadius: 4 },
  anthemTitle: { fontSize: 14, letterSpacing: 0.5, transform: [{ skewX: '8deg' }] },
  anthemLink: { fontSize: 11, marginTop: 2, letterSpacing: 0.5, transform: [{ skewX: '8deg' }] },

  missionItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  missionText: { flex: 1, fontSize: 14 },

  journalInput: { minHeight: 90, borderWidth: 1.5, borderRadius: 4, padding: 12, marginTop: 8, fontSize: 14, lineHeight: 20, textAlignVertical: 'top' },

  footer: { position: 'absolute', left: 18, right: 18, bottom: 26 },
  footerRow: { flexDirection: 'row', gap: 12 },
  skewBtn: { paddingVertical: 15, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center', transform: [{ skewX: '-12deg' }] },
  finalizeBtn: { flex: 1 },
  skewBtnText: { fontSize: 15, letterSpacing: 1, textTransform: 'uppercase', transform: [{ skewX: '12deg' }] },

  slideBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderWidth: 1.5, borderStyle: 'dashed' },
  slideBarText: { fontSize: 13, letterSpacing: 1 },
  finishAction: { width: 140, alignItems: 'center', justifyContent: 'center' },
  finishActionText: { fontSize: 14, letterSpacing: 1, marginLeft: 8 },
});
