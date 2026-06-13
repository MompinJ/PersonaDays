import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar, Platform, Linking, InteractionManager, Image } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import ArcGallery from '../../../components/Arcs/ArcGallery';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/types';
import { useTheme } from '../../../themes/useTheme';
import { db } from '../../../database';
import { PersonaShard } from '../../../components/UI/PersonaShard';
import { PersonaCount } from '../../../components/UI/PersonaCount';
import { StatRadarChart } from '../../../components/Stats/StatRadarChart';
import { getArcGrind, getArcMissionSummary, getArcFinance, arcDisplayColor, ArcGrind, ArcMissionSummary, ArcFinance } from '../../../services/arcService';
import { getArcPhotos } from '../../../services/arcPhotoService';
import { ArcoStatSnapshot } from '../../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'ArcResults'>;

const formatYen = (n: number) => Math.round(n || 0).toLocaleString('es-MX');

const daysBetween = (a: string, b: string): number => {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(1, Math.floor(ms / 86400000));
};

export const ArcResultsScreen = ({ route, navigation }: Props) => {
  const theme = useTheme();
  const idArco = route.params?.arc?.id_arco;

  const [arc, setArc] = useState<any | null>(null);
  const [grind, setGrind] = useState<ArcGrind>({ diarias: 0, semanales: 0 });
  const [missions, setMissions] = useState<ArcMissionSummary>({ total: 0, completadas: 0, falladas: 0, items: [] });
  const [finance, setFinance] = useState<ArcFinance>({ ingresos: 0, gastos: 0, categoriaDominante: null, montoDominante: 0 });
  const [hasPhotos, setHasPhotos] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!idArco) { setLoading(false); return; }
    try {
      // Re-leemos el arco fresco de la DB: el objeto de params no trae snapshot_fin/xp
      // tras finalizar. El resto de lecturas van en paralelo.
      const rows: any[] = await db.getAllAsync('SELECT * FROM arcos WHERE id_arco = ?', [idArco]);
      const fresh = rows?.[0] || null;
      const [g, m, f, ph] = await Promise.all([
        getArcGrind(idArco),
        getArcMissionSummary(idArco),
        fresh ? getArcFinance(fresh) : Promise.resolve({ ingresos: 0, gastos: 0, categoriaDominante: null, montoDominante: 0 }),
        getArcPhotos(idArco),
      ]);
      setArc(fresh);
      setGrind(g);
      setMissions(m);
      setFinance(f);
      setHasPhotos((ph || []).some((p) => p.exists));
    } catch (e) {
      console.error('Error cargando resultados del arco:', e);
    } finally {
      setLoading(false);
    }
  }, [idArco]);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(load);
    return () => task.cancel();
  }, [load]);

  if (!arc) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        {!loading && <Text style={{ color: theme.textDim, fontFamily: theme.fonts?.body }}>Arco no encontrado.</Text>}
      </View>
    );
  }

  const accent = arcDisplayColor(arc, theme.primary);
  const fin = arc.fecha_fin || new Date().toISOString().slice(0, 10);
  const dias = daysBetween(arc.fecha_inicio, fin);
  const xp = arc.xp_otorgado || 0;

  // Parseo de snapshots para el radar comparativo.
  let radarStats: any[] = [];
  let baselineValues: Record<number, number> | undefined;
  try {
    const finSnap: ArcoStatSnapshot[] = arc.snapshot_fin ? JSON.parse(arc.snapshot_fin) : [];
    const iniSnap: ArcoStatSnapshot[] = arc.snapshot_inicio ? JSON.parse(arc.snapshot_inicio) : [];
    radarStats = finSnap.map((s) => ({ id_stat: s.id_stat, nombre_stat: s.nombre, nivel_actual: s.nivel_actual, nivel_maximo: s.nivel_maximo }));
    if (iniSnap.length) {
      baselineValues = {};
      iniSnap.forEach((s) => { baselineValues![s.id_stat] = s.nivel_actual; });
    }
  } catch (e) {
    radarStats = [];
  }

  const openAnthem = () => {
    if (arc.anthem_url) Linking.openURL(arc.anthem_url).catch(() => {});
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 18 : 54 }]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={26} color={accent} />
        </TouchableOpacity>
        <View style={[styles.badge, { backgroundColor: theme.success }]}>
          <Text style={[styles.badgeText, { color: theme.textInverse, fontFamily: theme.fonts?.heading }]}>CAPÍTULO CERRADO</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <PersonaShard label={arc.nombre} height={52} fontSize={28} font={theme.fonts?.title} color={accent} />
        {arc.frase_protagonica ? (
          <Text style={[styles.frase, { color: theme.text, fontFamily: theme.fonts?.body }]}>"{arc.frase_protagonica}"</Text>
        ) : null}
        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={15} color={theme.textDim} />
          <Text style={[styles.dateText, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>
            {arc.fecha_inicio}  →  {fin}   ·   {dias} {dias === 1 ? 'DÍA' : 'DÍAS'}
          </Text>
        </View>

        {/* XP otorgado */}
        <View style={{ marginTop: 22 }}><PersonaShard label="RECOMPENSA" /></View>
        <View style={styles.xpBlock}>
          <Text style={[styles.xpPlus, { color: accent, fontFamily: theme.fonts?.display }]}>+</Text>
          <PersonaCount value={xp} color={accent} fontSize={72} />
          <Text style={[styles.xpLabel, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>XP</Text>
        </View>

        {/* Radar comparativo */}
        {radarStats.length >= 3 ? (
          <>
            <View style={{ marginTop: 18 }}><PersonaShard label="CRECIMIENTO" /></View>
            <View style={{ alignItems: 'center' }}>
              <StatRadarChart stats={radarStats} baselineValues={baselineValues} size={280} color={accent} />
            </View>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDash, { borderColor: accent }]} />
                <Text style={[styles.legendText, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>INICIO</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendSolid, { backgroundColor: accent }]} />
                <Text style={[styles.legendText, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>FIN</Text>
              </View>
            </View>
          </>
        ) : null}

        {/* Grind */}
        <View style={{ marginTop: 18 }}><PersonaShard label="GRIND DEL PERIODO" /></View>
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { borderColor: theme.border }]}>
            <PersonaCount value={grind.diarias} color={theme.text} fontSize={34} />
            <Text style={[styles.statBoxLabel, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>DIARIAS</Text>
          </View>
          <View style={[styles.statBox, { borderColor: theme.border }]}>
            <PersonaCount value={grind.semanales} color={theme.text} fontSize={34} />
            <Text style={[styles.statBoxLabel, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>SEMANALES</Text>
          </View>
        </View>

        {/* Misiones ARCO */}
        {missions.total > 0 ? (
          <>
            <View style={{ marginTop: 18 }}><PersonaShard label="MISIONES DEL ARCO" /></View>
            <View style={styles.missionsHeader}>
              <Text style={[styles.missionsCount, { color: theme.success, fontFamily: theme.fonts?.bold }]}>{missions.completadas} logradas</Text>
              <Text style={[styles.missionsCount, { color: theme.error, fontFamily: theme.fonts?.bold }]}>{missions.falladas} falladas</Text>
            </View>
            {missions.items.map((mi) => (
              <View key={mi.id_mision} style={styles.missionItem}>
                <MaterialCommunityIcons
                  name={mi.completada ? 'check-circle' : 'close-circle-outline'}
                  size={18}
                  color={mi.completada ? theme.success : theme.error}
                />
                <Text style={[styles.missionText, { color: mi.completada ? theme.text : theme.textDim, fontFamily: theme.fonts?.body, textDecorationLine: mi.completada ? 'none' : 'line-through' }]} numberOfLines={1}>
                  {mi.nombre}
                </Text>
              </View>
            ))}
          </>
        ) : null}

        {/* Memories (galeria read-only) */}
        {hasPhotos ? (
          <>
            <View style={{ marginTop: 18 }}><PersonaShard label="MEMORIES" /></View>
            <ArcGallery idArco={arc.id_arco} accent={accent} editable={false} />
          </>
        ) : null}

        {/* Anthem */}
        {arc.anthem_titulo ? (
          <>
            <View style={{ marginTop: 18 }}><PersonaShard label="ANTHEM" /></View>
            <TouchableOpacity activeOpacity={arc.anthem_url ? 0.7 : 1} onPress={openAnthem} style={[styles.anthemRow, { borderColor: accent }]}>
              {arc.anthem_cover_url ? (
                <Image source={{ uri: arc.anthem_cover_url }} style={[styles.anthemCover, styles.unskew]} />
              ) : (
                <MaterialCommunityIcons name="music-note" size={20} color={accent} style={styles.unskew} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.anthemTitle, { color: theme.text, fontFamily: theme.fonts?.heading }]} numberOfLines={1}>{arc.anthem_titulo}</Text>
                {arc.anthem_url ? <Text style={[styles.anthemLink, { color: accent, fontFamily: theme.fonts?.condensed }]} numberOfLines={1}>Abrir enlace</Text> : null}
              </View>
              {arc.anthem_url ? <Ionicons name="open-outline" size={18} color={accent} style={styles.unskew} /> : null}
            </TouchableOpacity>
          </>
        ) : null}

        {/* Journal / reflexiones */}
        {arc.resumen_final ? (
          <>
            <View style={{ marginTop: 18 }}><PersonaShard label="REFLEXIONES" /></View>
            <Text style={[styles.journal, { color: theme.text, fontFamily: theme.fonts?.body }]}>{arc.resumen_final}</Text>
          </>
        ) : null}

        {/* Balance financiero (menor protagonismo) */}
        {(finance.ingresos > 0 || finance.gastos > 0) ? (
          <>
            <View style={{ marginTop: 18 }}><PersonaShard label="BALANCE" /></View>
            <View style={styles.financeRow}>
              <Text style={[styles.financeItem, { color: theme.success, fontFamily: theme.fonts?.condensed }]}>+¥{formatYen(finance.ingresos)}</Text>
              <Text style={[styles.financeItem, { color: theme.error, fontFamily: theme.fonts?.condensed }]}>-¥{formatYen(finance.gastos)}</Text>
            </View>
            {finance.categoriaDominante ? (
              <Text style={[styles.financeDom, { color: theme.textDim, fontFamily: theme.fonts?.body }]}>
                Más gastado en {finance.categoriaDominante} (¥{formatYen(finance.montoDominante)})
              </Text>
            ) : null}
          </>
        ) : null}
      </ScrollView>
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
  dateText: { marginLeft: 8, fontSize: 12, letterSpacing: 0.5 },

  xpBlock: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 4 },
  xpPlus: { fontSize: 40, marginBottom: 10, marginRight: 2 },
  xpLabel: { fontSize: 16, marginLeft: 8, marginBottom: 14, letterSpacing: 1 },

  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 26, marginTop: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  legendDash: { width: 18, height: 0, borderTopWidth: 2, borderStyle: 'dashed', opacity: 0.7 },
  legendSolid: { width: 18, height: 3 },
  legendText: { fontSize: 11, letterSpacing: 1 },

  statsRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 14, borderWidth: 1.5, transform: [{ skewX: '-8deg' }] },
  statBoxLabel: { fontSize: 11, letterSpacing: 1, marginTop: 4 },

  missionsHeader: { flexDirection: 'row', gap: 18, marginBottom: 8 },
  missionsCount: { fontSize: 13, letterSpacing: 0.5, textTransform: 'uppercase' },
  missionItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  missionText: { flex: 1, fontSize: 14 },

  anthemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1.5, transform: [{ skewX: '-8deg' }] },
  anthemCover: { width: 44, height: 44, borderRadius: 4 },
  anthemTitle: { fontSize: 14, letterSpacing: 0.5, transform: [{ skewX: '8deg' }] },
  anthemLink: { fontSize: 11, marginTop: 2, letterSpacing: 0.5, transform: [{ skewX: '8deg' }] },
  unskew: { transform: [{ skewX: '8deg' }] },

  journal: { fontSize: 14, lineHeight: 21, marginTop: 4 },

  financeRow: { flexDirection: 'row', gap: 22, marginTop: 4 },
  financeItem: { fontSize: 18, letterSpacing: 0.5 },
  financeDom: { fontSize: 13, marginTop: 6 },
});
