import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Image, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { useGame } from '../../context/GameContext';
import { useFocusEntrance } from '../../hooks/useFocusEntrance';
import { db } from '../../database';
import { getCurrentStreak } from '../../services/playerService';
import { CHARACTERS } from '../../data/characters';
import { PersonaShard } from '../../components/UI/PersonaShard';
import { PersonaTile } from '../../components/UI/PersonaTile';
import { PersonaSlash } from '../../components/UI/PersonaSlash';
import { PersonaCount } from '../../components/UI/PersonaCount';
import { PressableScale } from '../../components/UI/PressableScale';

interface ProfileMeta {
  streak: number;
  prestigio: number;   // suma de cuenta_prestigio de todas las stats
  esfuerzo: number;    // suma de niveles de todas las stats (esfuerzo total)
  dias: number;        // dias jugando desde created_at
}

const fmt = (n: number) => Math.round(n).toLocaleString('es-MX');

export const ProfileScreen = () => {
  const navigation = useNavigation<any>();
  const { theme, player } = useGame();
  const { style: introStyle } = useFocusEntrance(18, 440);
  const [meta, setMeta] = useState<ProfileMeta>({ streak: 0, prestigio: 0, esfuerzo: 0, dias: 1 });

  const character = CHARACTERS.find(c => c.id === player?.character_theme) || CHARACTERS[0];

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const players: any[] = await db.getAllAsync('SELECT id_jugador, created_at FROM jugadores LIMIT 1');
          if (!players || players.length === 0) return;
          const p = players[0];
          const agg: any[] = await db.getAllAsync(
            'SELECT COALESCE(SUM(nivel_actual),0) as esfuerzo, COALESCE(SUM(cuenta_prestigio),0) as prestigio FROM jugador_stat WHERE id_jugador = ?',
            [p.id_jugador]
          );
          const streak = await getCurrentStreak(p.id_jugador);
          let dias = 1;
          if (p.created_at) {
            const ms = Date.now() - new Date(p.created_at).getTime();
            dias = Math.max(1, Math.floor(ms / 86400000) + 1);
          }
          if (active) {
            setMeta({
              streak,
              prestigio: agg?.[0]?.prestigio || 0,
              esfuerzo: agg?.[0]?.esfuerzo || 0,
              dias,
            });
          }
        } catch (e) {
          console.error('Error cargando perfil:', e);
        }
      })();
      return () => { active = false; };
    }, [])
  );

  const metaTiles: { label: string; value: number; icon: keyof typeof Ionicons.glyphMap; accent: string }[] = [
    { label: 'RACHA',     value: meta.streak,    icon: 'flame',   accent: theme.primary },
    { label: 'PRESTIGIO', value: meta.prestigio, icon: 'star',    accent: theme.secondary },
    { label: 'ESFUERZO',  value: meta.esfuerzo,  icon: 'barbell', accent: theme.secondary },
    { label: 'DIAS',      value: meta.dias,      icon: 'calendar', accent: theme.primary },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Engrane de ajustes (fuera del scroll, fijo) */}
      <PressableScale
        containerStyle={styles.gearPos}
        style={[styles.gear, { backgroundColor: theme.surface, borderColor: theme.primary }]}
        onPress={() => navigation.navigate('Settings')}
      >
        <Ionicons name="settings-sharp" size={20} color={theme.primary} />
      </PressableScale>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Animated.View style={introStyle}>
          <View style={styles.headerWrap}>
            <PersonaShard label="PERFIL" height={54} fontSize={30} font={theme.fonts?.title} />
          </View>

          {/* ===== HERO IDENTIDAD ===== */}
          <PersonaTile accent={theme.primary} skew={-4} float={8}>
            <View style={styles.heroRow}>
              <View style={[styles.avatarFrame, { borderColor: theme.primary, backgroundColor: theme.background, transform: [{ skewX: '-6deg' }] }]}>
                <Image source={character.image} style={[styles.avatarImg, { transform: [{ skewX: '6deg' }] }]} resizeMode="contain" />
              </View>
              <View style={styles.heroInfo}>
                <Text style={[styles.personaLabel, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>PERSONA</Text>
                <Text numberOfLines={1} style={[styles.personaName, { color: theme.text, fontFamily: theme.fonts?.heading }]}>
                  {character.name.toUpperCase()}
                </Text>
                <Text numberOfLines={2} style={[styles.quote, { color: theme.textDim, fontFamily: theme.fonts?.body }]}>
                  "{character.quote}"
                </Text>
              </View>
            </View>
          </PersonaTile>

          {/* ===== NOMBRE + NIVEL ===== */}
          <View style={styles.nameBlock}>
            <PersonaSlash color={theme.secondary} count={2} length={64} thickness={7} angle={-22} style={{ top: 8, left: -4 }} />
            <Text numberOfLines={1} style={[styles.playerName, { color: theme.text, fontFamily: theme.fonts?.title }]}>
              {(player?.nombre_jugador || 'VIAJERO').toUpperCase()}
            </Text>
            <View style={styles.levelRow}>
              <Text style={[styles.miniLabel, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>NIVEL</Text>
              <PersonaCount value={player?.nivel_jugador || 1} pad={2} fontSize={40} color={theme.primary} style={{ marginLeft: 10 }} />
            </View>
          </View>

          {/* ===== META TILES (2x2) ===== */}
          <View style={styles.tagWrap}><PersonaShard label="PROGRESO" /></View>
          <View style={styles.metaGrid}>
            {metaTiles.map((t, i) => (
              <PersonaTile
                key={t.label}
                accent={t.accent}
                skew={i % 2 === 0 ? -6 : -4}
                float={6}
                containerStyle={styles.metaTileWrap}
                style={styles.metaTile}
              >
                <View style={styles.metaInner}>
                  <Ionicons name={t.icon} size={20} color={t.accent} />
                  <Text style={[styles.metaValue, { color: theme.text, fontFamily: theme.fonts?.display }]}>{fmt(t.value)}</Text>
                  <Text style={[styles.metaLabel, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>{t.label}</Text>
                </View>
              </PersonaTile>
            ))}
          </View>

          {/* ===== ARCANOS ===== */}
          <View style={styles.tagWrap}><PersonaShard label="ARCANOS" /></View>
          <PressableScale
            style={[styles.actionBtn, { backgroundColor: theme.surface, borderColor: theme.primary }]}
            onPress={() => navigation.navigate('Arcana')}
          >
            <View style={styles.actionInner}>
              <Ionicons name="sparkles" size={22} color={theme.primary} />
              <Text style={[styles.actionText, { color: theme.text, fontFamily: theme.fonts?.heading }]}>MIS ARCANOS</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textDim} />
          </PressableScale>

          {/* ===== ACCIONES ===== */}
          <View style={styles.tagWrap}><PersonaShard label="AJUSTES" /></View>
          <PressableScale
            style={[styles.actionBtn, { backgroundColor: theme.surface, borderColor: theme.primary }]}
            onPress={() => navigation.navigate('CharacterSelection', { isEditing: true })}
          >
            <View style={styles.actionInner}>
              <Ionicons name="people-circle-outline" size={22} color={theme.primary} />
              <Text style={[styles.actionText, { color: theme.text, fontFamily: theme.fonts?.heading }]}>CAMBIAR PERSONA</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textDim} />
          </PressableScale>

          <PressableScale
            style={[styles.actionBtn, { backgroundColor: theme.surface, borderColor: theme.secondary, marginTop: 12 }]}
            onPress={() => navigation.navigate('Settings')}
          >
            <View style={styles.actionInner}>
              <Ionicons name="construct-outline" size={22} color={theme.secondary} />
              <Text style={[styles.actionText, { color: theme.text, fontFamily: theme.fonts?.heading }]}>CONFIGURACION</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textDim} />
          </PressableScale>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingTop: 50, paddingBottom: 170 },

  gearPos: { position: 'absolute', top: 52, right: 20, zIndex: 10 },
  gear: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },

  headerWrap: { marginBottom: 18, marginTop: 2 },

  // Hero
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  avatarFrame: { width: 88, height: 88, borderWidth: 2, borderRadius: 4, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImg: { width: 78, height: 78 },
  heroInfo: { flex: 1, marginLeft: 16 },
  personaLabel: { fontSize: 11, letterSpacing: 2 },
  personaName: { fontSize: 24, letterSpacing: 0.5, marginTop: 1 },
  quote: { fontSize: 13, fontStyle: 'italic', marginTop: 6 },

  // Nombre + nivel
  nameBlock: { marginTop: 24 },
  playerName: { fontSize: 38, letterSpacing: 0.5, transform: [{ skewX: '-6deg' }] },
  levelRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  miniLabel: { fontSize: 11, letterSpacing: 1.5 },

  tagWrap: { marginTop: 26, marginBottom: 14 },

  // Meta grid 2x2
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  metaTileWrap: { width: '47%', marginBottom: 16 },
  metaTile: { paddingVertical: 16 },
  metaInner: { alignItems: 'flex-start' },
  metaValue: { fontSize: 32, includeFontPadding: false, marginTop: 8 },
  metaLabel: { fontSize: 12, letterSpacing: 1.5, marginTop: 2 },

  // Acciones
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderRadius: 3, paddingVertical: 16, paddingHorizontal: 18,
    transform: [{ skewX: '-4deg' }],
  },
  actionInner: { flexDirection: 'row', alignItems: 'center', transform: [{ skewX: '4deg' }] },
  actionText: { fontSize: 16, letterSpacing: 1, marginLeft: 12 },
});
