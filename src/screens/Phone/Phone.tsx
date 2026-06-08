import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../themes/useTheme';
import { useNavigation } from '@react-navigation/native';
import { useAlert } from '../../context/AlertContext';
import { PersonaShard } from '../../components/UI/PersonaShard';
import { PressableScale } from '../../components/UI/PressableScale';

export const PhoneMenuScreen = () => {
  const theme = useTheme();
  const navigation: any = useNavigation();
  const { showAlert } = useAlert();

  const intro = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(intro, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);

  const tiles = [
    { key: 'calendar', label: 'CALENDARIO', icon: 'calendar-month', action: () => navigation.navigate('Calendar') },
    { key: 'arcs', label: 'ARCOS', icon: 'book-open-variant', action: () => navigation.navigate('Arcs') },
    { key: 'lists', label: 'NOTAS', icon: 'playlist-edit', action: () => navigation.navigate('ListsMenuScreen') },
    { key: 'gallery', label: 'GALERÍA', icon: 'image-multiple', soon: true },
    { key: 'mail', label: 'CORREO', icon: 'email-outline', soon: true },
    { key: 'settings', label: 'AJUSTES', icon: 'cog-outline', action: () => navigation.navigate('Settings') },
  ] as const;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.headerWrap}>
        <PersonaShard label="TELÉFONO" height={54} fontSize={30} font={theme.fonts?.title} />
      </View>

      <Animated.View
        style={{
          flex: 1,
          opacity: intro,
          transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
        }}
      >
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
                <MaterialCommunityIcons name={t.icon as any} size={38} color={c} />
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
