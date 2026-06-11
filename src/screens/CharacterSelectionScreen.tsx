import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  StatusBar,
  Animated,
  Easing,
  Pressable,
  PanResponder,
} from 'react-native';
import Svg, { Polygon, Defs, LinearGradient, RadialGradient, Stop, Rect, Ellipse } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

import { CHARACTERS } from '../data/characters';
import { PALETTES } from '../themes/palettes';
import { db } from '../database';
import { CharacterTheme } from '../types';
import { useGame } from '../context/GameContext';
import { useTheme } from '../themes/useTheme';

const { width: SW, height: SH } = Dimensions.get('window');
const CARD_W = Math.min(SW - 30, 430);
const CARD_H = Math.min(SH * 0.6, 680);
const CUT = 26;                 // esquina cortada (TR y BL)
const F = CARD_W / 392;         // factor de escala respecto al prototipo (carta 392 ancho)
const SKEW = '-9deg';
const CSKEW = '9deg';           // contra-inclinacion para textos

const pad = (n: number) => (n < 10 ? '0' : '') + n;

// Columna de caracteres (RN no rota texto a vertical: apilamos los glifos).
const VerticalChars = ({ text, style }: { text: string; style: any }) => (
  <View>
    {text.split('').map((ch, i) => (
      <Text key={i} style={style}>{ch}</Text>
    ))}
  </View>
);

interface Props {
  navigation: any;
  route?: any;
}

export const CharacterSelectionScreen = ({ navigation, route }: Props) => {
  const isEditing = route?.params?.isEditing;
  const { refreshUser } = useGame();
  const appTheme = useTheme();

  const [index, setIndex] = useState(0);
  const busyRef = useRef(false);
  // El PanResponder se crea una sola vez y captura closures del primer render
  // (index=0). Para que el swipe navegue desde el personaje ACTUAL y no desde
  // Makoto, go/step leen el indice vivo via este ref estable.
  const indexRef = useRef(0);
  indexRef.current = index;

  const dragX = useRef(new Animated.Value(0)).current;
  const flashOp = useRef(new Animated.Value(0)).current;
  const bladeP = useRef(new Animated.Value(0)).current;
  const infoAnim = useRef(new Animated.Value(1)).current;
  const confirmScale = useRef(new Animated.Value(1)).current;

  const N = CHARACTERS.length;
  const ch = CHARACTERS[index];
  const t = PALETTES[ch.id as CharacterTheme];

  // ---------- transicion: corte seco + flash con cuchilla ----------
  const runFlash = () => {
    flashOp.setValue(0);
    bladeP.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(flashOp, { toValue: 1, duration: 48, useNativeDriver: true }),
        Animated.delay(130),
        Animated.timing(flashOp, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]),
      Animated.timing(bladeP, { toValue: 1, duration: 340, easing: Easing.bezier(0.7, 0, 0.3, 1), useNativeDriver: true }),
    ]).start();
  };

  const go = (n: number, _dir?: number) => {
    if (busyRef.current || n === indexRef.current) return;
    busyRef.current = true;
    runFlash();
    // intercambiar contenido en el pico del flash (corte oculto)
    setTimeout(() => {
      setIndex(n);
      infoAnim.setValue(0);
      Animated.timing(infoAnim, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }, 120);
    setTimeout(() => { busyRef.current = false; }, 360);
  };

  const step = (d: number) => go((indexRef.current + d + N) % N, d);

  // ---------- drag / swipe ----------
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 7 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_e, g) => { dragX.setValue(g.dx); },
      onPanResponderRelease: (_e, g) => {
        const dx = g.dx;
        Animated.spring(dragX, { toValue: 0, useNativeDriver: true, friction: 7, tension: 80 }).start();
        if (Math.abs(dx) > 58) step(dx < 0 ? 1 : -1);
      },
      onPanResponderTerminate: () => { Animated.spring(dragX, { toValue: 0, useNativeDriver: true }).start(); },
    })
  ).current;

  // ---------- confirmar ----------
  const handleSelect = async () => {
    try {
      const rows: any = await db.getAllAsync('SELECT id_jugador FROM jugadores LIMIT 1');
      const playerId = rows && rows.length > 0 ? rows[0].id_jugador : null;
      if (playerId) {
        await db.runAsync('UPDATE jugadores SET character_theme = ? WHERE id_jugador = ?', [ch.id, playerId]);
      } else {
        const fecha = new Date().toISOString();
        await db.runAsync(
          'INSERT INTO jugadores (nombre_jugador, nivel_jugador, vida, yenes, character_theme, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          ['Invitado', 1, 10, 5000, ch.id, fecha]
        );
      }
      await refreshUser();
      if (isEditing) navigation.goBack();
    } catch (error) {
      console.error('Error guardando personaje', error);
    }
  };

  // ---------- transforms ----------
  const cardTransform = {
    transform: [
      { translateX: Animated.multiply(dragX, 0.55) },
      { rotate: dragX.interpolate({ inputRange: [-260, 0, 260], outputRange: ['-1.4deg', '0deg', '1.4deg'], extrapolate: 'clamp' }) },
    ],
    opacity: dragX.interpolate({ inputRange: [-260, 0, 260], outputRange: [0.78, 1, 0.78], extrapolate: 'clamp' }),
  };
  const infoStyle = {
    opacity: infoAnim,
    transform: [{ translateY: infoAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
  };
  const bladeTransform = {
    transform: [
      { translateX: bladeP.interpolate({ inputRange: [0, 1], outputRange: [-CARD_W * 1.7, SW * 2.2] }) },
      { skewX: '-14deg' },
    ],
  };

  const nameSize = (ch.firstName.length >= 8 ? 56 : ch.firstName.length >= 7 ? 64 : 72) * F;

  return (
    <View style={[styles.container, { backgroundColor: t.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={t.background} />

      {/* ============ HEADER ============ */}
      <View style={styles.hdr}>
        <View>
          <View style={styles.eyebrowRow}>
            <View style={[styles.tick, { backgroundColor: t.primary }]} />
            <Text style={[styles.eyebrow, { color: t.primary, fontFamily: appTheme.fonts?.condensed }]}>SELECT · PROTAGONIST</Text>
          </View>
          <Text style={[styles.hdrTitle, { color: t.text, fontFamily: appTheme.fonts?.title }]}>CHOOSE YOUR</Text>
          <Text style={[styles.hdrTitle, { color: t.primary, fontFamily: appTheme.fonts?.title }]}>DESTINY</Text>
        </View>
        <View style={styles.hdrR}>
          <Text style={[styles.idxNow, { color: t.primary, fontFamily: appTheme.fonts?.display }]}>{pad(index + 1)}</Text>
          <Text style={[styles.idxTot, { color: t.textDim, fontFamily: appTheme.fonts?.display }]}>/ {pad(N)}</Text>
        </View>
      </View>

      {/* ============ CARD ============ */}
      <View style={styles.cardArea}>
        {/* flechas (fuera de la carta, siempre tappables) */}
        <Pressable style={[styles.nav, styles.navPrev]} onPress={() => step(-1)} hitSlop={10}>
          <View style={[styles.navGlyph, { backgroundColor: t.surface, borderColor: t.border }]}>
            <Ionicons name="chevron-back" size={20} color={t.primary} />
          </View>
        </Pressable>
        <Pressable style={[styles.nav, styles.navNext]} onPress={() => step(1)} hitSlop={10}>
          <View style={[styles.navGlyph, { backgroundColor: t.surface, borderColor: t.border }]}>
            <Ionicons name="chevron-forward" size={20} color={t.primary} />
          </View>
        </Pressable>

        <Animated.View style={[styles.cardWrap, cardTransform]} {...pan.panHandlers}>
          {/* glow exterior (elevation/shadow del color) */}
          <View style={[styles.cardGlow, { shadowColor: t.primary }]}>
            <View style={[styles.cardInner, { backgroundColor: t.background }]}>

              {/* 1. romaji gigante de fondo */}
              <Text
                numberOfLines={1}
                style={[styles.bgRomaji, { color: t.primary, fontFamily: appTheme.fonts?.title, fontSize: 184 * F }]}
              >
                {ch.firstName}
              </Text>

              {/* 2. katakana gigante de fondo (vertical, tenue) */}
              <View style={styles.bgKata}>
                <VerticalChars text={ch.kata} style={{ color: t.text, opacity: 0.08, fontSize: 96 * F, lineHeight: 92 * F }} />
              </View>

              {/* 3-4. ribbons diagonales */}
              <View style={[styles.ribbon, { backgroundColor: t.secondary }]} />
              <View style={[styles.ribbonThin, { backgroundColor: t.primary }]} />

              {/* 5. backdrop: spotlight + silueta */}
              <Svg width={CARD_W} height={CARD_H} style={StyleSheet.absoluteFill} pointerEvents="none">
                <Defs>
                  <RadialGradient id="spot" cx="50%" cy="86%" rx="55%" ry="40%">
                    <Stop offset="0%" stopColor={t.primary} stopOpacity={0.32} />
                    <Stop offset="72%" stopColor={t.primary} stopOpacity={0} />
                  </RadialGradient>
                  <LinearGradient id="sil" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor={t.primary} stopOpacity={0.34} />
                    <Stop offset="60%" stopColor={t.secondary} stopOpacity={0.2} />
                    <Stop offset="100%" stopColor={t.secondary} stopOpacity={0} />
                  </LinearGradient>
                </Defs>
                <Ellipse cx={CARD_W / 2} cy={CARD_H * 0.9} rx={CARD_W * 0.52} ry={CARD_H * 0.36} fill="url(#spot)" />
                <Polygon
                  fill="url(#sil)"
                  points={siluetaPoints(CARD_W, CARD_H)}
                />
              </Svg>

              {/* 6. retrato (arte real cuando exista; hoy placeholder transparente) */}
              <Image source={ch.image} style={styles.portrait} resizeMode="contain" />

              {/* 7. scrim inferior para que lea el texto */}
              <Svg width={CARD_W} height={CARD_H} style={StyleSheet.absoluteFill} pointerEvents="none">
                <Defs>
                  <LinearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor={t.background} stopOpacity={0} />
                    <Stop offset="55%" stopColor={t.background} stopOpacity={0.55} />
                    <Stop offset="82%" stopColor={t.background} stopOpacity={0.96} />
                    <Stop offset="100%" stopColor={t.background} stopOpacity={1} />
                  </LinearGradient>
                </Defs>
                <Rect x="0" y={CARD_H * 0.4} width={CARD_W} height={CARD_H * 0.6} fill="url(#scrim)" />
              </Svg>

              {/* 8. tira vertical de katakana en el borde derecho */}
              <View style={[styles.kataStrip, { borderRightColor: t.primary }]}>
                <VerticalChars text={ch.kata} style={{ color: t.text, opacity: 0.72, fontSize: 20 * F, letterSpacing: 2 }} />
              </View>

              {/* 9. numero indice gigante (contorno tenue) */}
              <Text style={[styles.cardNo, { color: t.primary, fontFamily: appTheme.fonts?.display, fontSize: 72 * F }]}>
                {pad(index + 1)}
              </Text>

              {/* 10. columna de info */}
              <Animated.View style={[styles.info, infoStyle]}>
                <Text style={[styles.arc, { color: t.primary, fontFamily: appTheme.fonts?.condensed }]}>{ch.arc}</Text>
                <View style={styles.nameRow}>
                  <View style={[styles.nameSlab, { backgroundColor: t.primary }]} />
                  <Text style={[styles.name, { color: t.text, fontFamily: appTheme.fonts?.title, fontSize: nameSize }]}>{ch.firstName}</Text>
                </View>
                <Text style={[styles.surname, { color: t.textDim, fontFamily: appTheme.fonts?.heading }]}>{ch.surname}</Text>
                <View style={styles.tagWrap}>
                  <View style={[styles.tagShard, { backgroundColor: t.primary, shadowColor: t.secondary }]}>
                    <Text style={[styles.tagText, { color: t.textInverse, fontFamily: appTheme.fonts?.heading }]}>{ch.tag}</Text>
                  </View>
                </View>
                <Text style={[styles.descriptor, { color: t.primary, fontFamily: appTheme.fonts?.condensed }]}>{ch.descriptor}</Text>
              </Animated.View>

              {/* 11. marco neon con esquinas cortadas (encima de todo) */}
              <Svg width={CARD_W} height={CARD_H} style={StyleSheet.absoluteFill} pointerEvents="none">
                {/* triangulos del color de fondo que "cortan" las esquinas TR y BL */}
                <Polygon points={`${CARD_W - CUT},0 ${CARD_W + 2},0 ${CARD_W + 2},${CUT + 2}`} fill={t.background} />
                <Polygon points={`0,${CARD_H - CUT} ${CUT},${CARD_H + 2} -2,${CARD_H + 2}`} fill={t.background} />
                {/* borde neon siguiendo la forma cortada */}
                <Polygon
                  points={cutFramePoints(CARD_W, CARD_H, CUT, 2)}
                  fill="none"
                  stroke={t.primary}
                  strokeWidth={3}
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
          </View>
        </Animated.View>
      </View>

      {/* ============ FOOTER ============ */}
      <View style={styles.footer}>
        <View style={styles.dots}>
          {CHARACTERS.map((c, n) => {
            const on = n === index;
            const dc = PALETTES[c.id as CharacterTheme].primary;
            return (
              <Pressable key={c.id} onPress={() => go(n)} hitSlop={6}>
                <View style={[styles.dot, { borderColor: on ? '#fff' : 'rgba(255,255,255,0.22)', backgroundColor: on ? dc : 'transparent' }]} />
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={handleSelect}
          onPressIn={() => Animated.spring(confirmScale, { toValue: 0.94, useNativeDriver: true }).start()}
          onPressOut={() => Animated.spring(confirmScale, { toValue: 1, friction: 4, useNativeDriver: true }).start()}
        >
          <Animated.View style={[styles.confirm, { transform: [{ scale: confirmScale }] }]}>
            <View style={[styles.confirmShadow, { backgroundColor: t.secondary }]} />
            <View style={[styles.confirmFill, { backgroundColor: t.primary, shadowColor: t.primary }]}>
              <View style={styles.confirmLbl}>
                <Ionicons name="checkmark-sharp" size={22} color={t.textInverse} />
                <Text style={[styles.confirmText, { color: t.textInverse, fontFamily: appTheme.fonts?.title }]}>I AM THOU</Text>
              </View>
            </View>
          </Animated.View>
        </Pressable>
      </View>

      {/* ============ FLASH a pantalla completa ============ */}
      <Animated.View pointerEvents="none" style={[styles.flash, { opacity: flashOp }]}>
        <View style={[styles.flashWash, { backgroundColor: t.primary, opacity: 0.12 }]} />
        <Animated.View style={[styles.blade, bladeTransform]}>
          <View style={[styles.bladeCore, { backgroundColor: t.primary }]} />
          <View style={styles.bladeHot} />
        </Animated.View>
      </Animated.View>
    </View>
  );
};

// Puntos del marco con esquinas cortadas (TR y BL), con inset s para que el
// stroke caiga dentro de la carta.
function cutFramePoints(w: number, h: number, cut: number, s: number): string {
  return [
    `${s},${s}`,
    `${w - cut},${s}`,
    `${w - s},${cut}`,
    `${w - s},${h - s}`,
    `${cut},${h - s}`,
    `${s},${h - cut}`,
  ].join(' ');
}

// Silueta estilizada (mismo perfil que el prototipo CSS clip-path), escalada.
function siluetaPoints(w: number, h: number): string {
  const sx = w * 0.5 - w * 0.34; // ancho ~ 0.68w centrado
  const sw = w * 0.68;
  const top = h * 0.2;
  const bh = h * 0.8;
  const P: [number, number][] = [
    [0.42, 0.08], [0.58, 0.08], [0.62, 0.14], [0.62, 0.22], [0.7, 0.26], [0.74, 0.34],
    [0.82, 0.5], [0.86, 0.74], [0.9, 1.0], [0.1, 1.0], [0.14, 0.74], [0.18, 0.5],
    [0.26, 0.34], [0.3, 0.26], [0.38, 0.22], [0.38, 0.14],
  ];
  return P.map(([px, py]) => `${(sx + px * sw).toFixed(1)},${(top + py * bh).toFixed(1)}`).join(' ');
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  hdr: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30, paddingHorizontal: 26, paddingTop: 46, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  tick: { width: 20, height: 3, marginRight: 8, transform: [{ skewX: SKEW }] },
  eyebrow: { fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', transform: [{ skewX: SKEW }] },
  hdrTitle: { fontSize: 30, lineHeight: 28, letterSpacing: 0.5, textTransform: 'uppercase', transform: [{ skewX: '-7deg' }] },
  hdrR: { alignItems: 'flex-end', transform: [{ skewX: '-7deg' }] },
  idxNow: { fontSize: 44, lineHeight: 40 },
  idxTot: { fontSize: 16, letterSpacing: 1 },

  // Card area
  cardArea: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 30 },
  nav: { position: 'absolute', top: '50%', marginTop: -44, zIndex: 35, width: 44, height: 88, justifyContent: 'center', alignItems: 'center' },
  navPrev: { left: 0 },
  navNext: { right: 0 },
  navGlyph: { width: 36, height: 76, borderWidth: 2, justifyContent: 'center', alignItems: 'center', borderRadius: 2 },

  cardWrap: { width: CARD_W, height: CARD_H },
  cardGlow: {
    width: CARD_W, height: CARD_H,
    elevation: 16, shadowOpacity: 0.55, shadowRadius: 22, shadowOffset: { width: 0, height: 12 },
  },
  cardInner: { width: CARD_W, height: CARD_H, borderRadius: 3, overflow: 'hidden' },

  // Layers
  bgRomaji: { position: 'absolute', left: -CARD_W * 0.12, top: CARD_H * 0.12, opacity: 0.13, letterSpacing: -2, transform: [{ skewX: SKEW }, { rotate: '-3deg' }] },
  bgKata: { position: 'absolute', right: CARD_W * 0.02, bottom: CARD_H * 0.12 },
  ribbon: { position: 'absolute', left: -CARD_W * 0.3, top: CARD_H * 0.34, width: CARD_W * 1.6, height: 150, opacity: 0.42, transform: [{ rotate: '-21deg' }] },
  ribbonThin: { position: 'absolute', left: -CARD_W * 0.2, top: CARD_H * 0.6, width: CARD_W * 1.4, height: 26, opacity: 0.4, transform: [{ rotate: '-21deg' }] },

  portrait: { position: 'absolute', left: 0, right: 0, bottom: 0, top: CARD_H * 0.08, width: CARD_W, height: CARD_H * 0.92 },

  kataStrip: { position: 'absolute', right: 12, top: 54, borderRightWidth: 2, paddingRight: 5 },

  cardNo: { position: 'absolute', left: 14, top: 10, opacity: 0.2, letterSpacing: -2 },

  // Info
  info: { position: 'absolute', left: 0, right: 0, bottom: 26, paddingHorizontal: 22 },
  arc: { fontSize: 14, letterSpacing: 4, textTransform: 'uppercase', transform: [{ skewX: SKEW }], marginBottom: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  nameSlab: { width: 8, height: 52, marginRight: 8, transform: [{ skewX: SKEW }] },
  name: { lineHeight: undefined, letterSpacing: 0.5, textTransform: 'uppercase', transform: [{ skewX: SKEW }], includeFontPadding: false },
  surname: { fontSize: 22, letterSpacing: 3, marginLeft: 16, marginTop: 2, transform: [{ skewX: SKEW }] },
  tagWrap: { flexDirection: 'row', marginTop: 12, marginLeft: 14 },
  tagShard: { paddingVertical: 7, paddingLeft: 14, paddingRight: 20, transform: [{ skewX: SKEW }], elevation: 6, shadowOpacity: 0.9, shadowRadius: 0, shadowOffset: { width: 4, height: 4 } },
  tagText: { fontSize: 22, letterSpacing: 1, transform: [{ skewX: CSKEW }] },
  descriptor: { fontSize: 14, letterSpacing: 2.5, textTransform: 'uppercase', transform: [{ skewX: SKEW }], marginTop: 12, marginLeft: 14 },

  // Footer
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 30, paddingHorizontal: 24, paddingBottom: 28, alignItems: 'center' },
  dots: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', maxWidth: 360, marginBottom: 16 },
  dot: { width: 16, height: 16, borderWidth: 2, marginHorizontal: 4, marginVertical: 4, transform: [{ skewX: '-10deg' }] },

  confirm: { width: 290, height: 58 },
  confirmShadow: { position: 'absolute', left: 6, top: 6, right: -2, bottom: -4, transform: [{ skewX: SKEW }] },
  confirmFill: { flex: 1, transform: [{ skewX: SKEW }], justifyContent: 'center', alignItems: 'center', elevation: 8, shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 0 } },
  confirmLbl: { flexDirection: 'row', alignItems: 'center', transform: [{ skewX: CSKEW }] },
  confirmText: { fontSize: 26, letterSpacing: 1, marginLeft: 10 },

  // Flash
  flash: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90, justifyContent: 'center' },
  flashWash: { ...StyleSheet.absoluteFillObject },
  blade: { position: 'absolute', top: -20, bottom: -20, width: SW * 0.62, left: 0, flexDirection: 'row' },
  bladeCore: { flex: 1, opacity: 0.5 },
  bladeHot: { position: 'absolute', left: '42%', top: 0, bottom: 0, width: '16%', backgroundColor: '#fff', opacity: 0.85 },
});
