import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../themes/useTheme';
import { useNavigation } from '@react-navigation/native';
import { useAlert } from '../../context/AlertContext';
import { PersonaShard } from '../../components/UI/PersonaShard';
import { PressableScale } from '../../components/UI/PressableScale';
import { useFocusEntrance } from '../../hooks/useFocusEntrance';
import { MenuGlyph } from '../../components/UI/MenuGlyphs';

export const PhoneMenuScreen = () => {
  const theme = useTheme();
  const navigation: any = useNavigation();
  const { showAlert } = useAlert();

  // Entrada animada en cada foco
  const { style: introStyle } = useFocusEntrance(18, 420);

  const tiles = [
    { key: 'calendar', label: 'CALENDARIO', glyph: 'calendario', action: () => navigation.navigate('Calendar') },
    { key: 'arcs', label: 'ARCOS', glyph: 'arcos', action: () => navigation.navigate('Arcs') },
    { key: 'shop', label: 'EMPORIO', glyph: 'emporio', action: () => navigation.navigate('ArcanaShop') },
    { key: 'lists', label: 'NOTAS', glyph: 'notas', action: () => navigation.navigate('ListsMenuScreen') },
    { key: 'gallery', label: 'GALERÍA', glyph: 'galeria', soon: true },
    { key: 'mail', label: 'CORREO', glyph: 'correo', soon: true },
    { key: 'settings', label: 'AJUSTES', glyph: 'ajustes', action: () => navigation.navigate('Settings') },
  ] as const;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.headerWrap}>
        <PersonaShard label="TELÉFONO" height={54} fontSize={30} font={theme.fonts?.title} />
      </View>

      <Animated.View style={[{ flex: 1 }, introStyle]}>
        <View style={styles.grid}>
          {tiles.map((t, i) => {
            const accent = i % 2 === 0 ? theme.primary : theme.secondary;
            const dimmed = !!(t as any).soon;
            const c = dimmed ? theme.textDim : accent;
            return (
              <PressableScale
                key={t.key}
                containerStyle={styles.tileWrap}
                scaleTo={0.95}
                style={[styles.tile, { backgroundColor: theme.surface, borderColor: c, opacity: dimmed ? 0.6 : 1 }]}
                onPress={dimmed ? () => showAlert('PRÓXIMAMENTE', `${t.label} llegará pronto.`) : (t as any).action}
              >
                <View style={[styles.tileAccent, { backgroundColor: c }]} />
                <MenuGlyph name={t.glyph} size={40} color={c} active={!dimmed} />
                <Text style={[styles.tileLabel, { color: theme.text, fontFamily: theme.fonts?.heading }]}>{t.label}</Text>
                {dimmed && (
                  <View style={[styles.soonTag, { backgroundColor: theme.textDim }]}>
                    <Text style={[styles.soonText, { color: theme.background, fontFamily: theme.fonts?.heading }]}>PRÓXIMAMENTE</Text>
                  </View>
                )}
              </PressableScale>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
};

export default PhoneMenuScreen;

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50, paddingHorizontal: 18 },
  headerWrap: { marginBottom: 18, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tileWrap: { width: '48%', marginBottom: 16 },
  tile: { aspectRatio: 1, borderWidth: 2, borderRadius: 8, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 10 },
  tileAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, transform: [{ skewX: '-12deg' }], marginLeft: -2 },
  tileLabel: { marginTop: 12, fontSize: 15, letterSpacing: 1.5 },
  soonTag: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingVertical: 3, alignItems: 'center', transform: [{ skewX: '-10deg' }], marginHorizontal: -4 },
  soonText: { fontSize: 9, letterSpacing: 1, transform: [{ skewX: '10deg' }] },
});
