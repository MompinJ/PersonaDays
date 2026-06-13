import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Linking } from 'react-native';
import { useTheme } from '../../themes/useTheme';
import { getContrastText } from '../../utils/colorUtils';
import { PersonaCount } from '../UI/PersonaCount';
import { getArcState, arcElapsedDays } from '../../services/arcService';
import ArcPhotoCollage from './ArcPhotoCollage';

const ArcCard = ({ arc, onPress, containerStyle, style, mode }: { arc: any; onPress?: () => void; containerStyle?: any; style?: any; mode?: 'HERO' | 'DEFAULT' }) => {
  const theme = useTheme();
  const isHero = mode === 'HERO';

  const state = getArcState(arc);
  const stateColor = state === 'ACTIVO' ? theme.primary : state === 'COMPLETADO' ? theme.success : theme.secondary;
  const stateLabel = state === 'ACTIVO' ? 'EN CURSO' : state === 'COMPLETADO' ? 'COMPLETADO' : 'ABANDONADO';
  const dias = arcElapsedDays(arc);
  const diasLabel = state === 'ACTIVO' ? 'DÍAS EN CURSO' : 'DÍAS';

  const openAnthem = () => { if (arc.anthem_url) Linking.openURL(arc.anthem_url).catch(() => {}); };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[styles.card, isHero && styles.heroCard, { backgroundColor: theme.surface, borderColor: stateColor }, containerStyle, style]}
    >
      {/* Acento inclinado segun estado */}
      <View style={[styles.accent, { backgroundColor: stateColor }]} />

      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.text, fontFamily: theme.fonts?.title, fontSize: isHero ? 30 : 22 }]} numberOfLines={2}>
          {arc.nombre}
        </Text>
        <View style={[styles.badge, { backgroundColor: stateColor }]}>
          <Text style={[styles.badgeText, { color: getContrastText(stateColor), fontFamily: theme.fonts?.heading }]}>{stateLabel}</Text>
        </View>
      </View>

      {arc.frase_protagonica ? (
        <Text style={[styles.frase, { color: theme.textDim, fontFamily: theme.fonts?.body }]} numberOfLines={isHero ? 3 : 1}>
          "{arc.frase_protagonica}"
        </Text>
      ) : null}

      <Text style={[styles.dates, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>
        {arc.fecha_inicio}{arc.fecha_fin ? '  →  ' + arc.fecha_fin : '  →  HOY'}
      </Text>

      {/* Anthem: caratula + titulo, clickeable */}
      {(arc.anthem_cover_url || arc.anthem_titulo) ? (
        <TouchableOpacity activeOpacity={arc.anthem_url ? 0.7 : 1} onPress={openAnthem} style={styles.anthemRow}>
          {arc.anthem_cover_url ? (
            <Image source={{ uri: arc.anthem_cover_url }} style={styles.anthemCover} />
          ) : (
            <View style={[styles.anthemCover, styles.anthemCoverEmpty, { borderColor: stateColor }]} />
          )}
          <Text style={[styles.anthemTitle, { color: theme.text, fontFamily: theme.fonts?.heading }]} numberOfLines={1}>
            {arc.anthem_titulo || 'Anthem'}
          </Text>
        </TouchableOpacity>
      ) : null}

      {/* Collage de fotos al azar (solo HERO): hasta 5, regadas con angulos variados.
          Ocupa el espacio flexible entre el anthem y los dias. */}
      {isHero
        ? <ArcPhotoCollage idArco={arc.id_arco} style={styles.collageFill} />
        : <View style={styles.heroSpace} />}

      {/* Dias en el arco (medida de TIEMPO, ya no % de misiones) */}
      <View style={styles.daysRow}>
        <PersonaCount value={dias} color={stateColor} fontSize={isHero ? 60 : 42} />
        <Text style={[styles.daysLabel, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>{diasLabel}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: { minHeight: 190, padding: 20, paddingLeft: 26, borderWidth: 2, borderRadius: 10, marginBottom: 18, justifyContent: 'flex-start', overflow: 'hidden' },
  heroCard: { flex: 1, width: '100%' },
  accent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 9, transform: [{ skewX: '-12deg' }], marginLeft: -3 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5, flex: 1, marginRight: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, transform: [{ skewX: '-12deg' }] },
  badgeText: { fontSize: 11, letterSpacing: 1, transform: [{ skewX: '12deg' }] },
  frase: { fontSize: 13, fontStyle: 'italic', lineHeight: 19, marginTop: 8 },
  dates: { fontSize: 12, marginTop: 8, letterSpacing: 0.5 },

  anthemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  anthemCover: { width: 40, height: 40, borderRadius: 4 },
  anthemCoverEmpty: { borderWidth: 1.5 },
  anthemTitle: { flex: 1, fontSize: 13, letterSpacing: 0.3 },

  heroSpace: { flex: 1, minHeight: 12 },
  collageFill: { flex: 1, minHeight: 200, marginTop: 14 },
  daysRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 8 },
  daysLabel: { fontSize: 11, letterSpacing: 1, marginLeft: 12, marginBottom: 10 },
});

export default ArcCard;
