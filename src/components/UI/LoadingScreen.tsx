import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle, Line, Polygon, Path } from 'react-native-svg';

// Pantalla de carga estilo Persona 3 Reload (port del prototipo
// "Recursos raw/pantalla de carga idea/carga-app.jsx", emblema "Rueda Ritual").
// Se muestra mientras la app arranca (fonts + DB) y mientras carga el jugador.
// Recibe una paleta (colores del tema); por defecto, el del primer personaje.

interface Palette {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  textDim: string;
  textInverse?: string;
}

const FONTS = {
  anton: 'Anton_400Regular',
  big: 'BigShouldersDisplay_800ExtraBold',
  bigBold: 'BigShouldersDisplay_700Bold',
  cond: 'BarlowCondensed_700Bold',
  bebas: 'BebasNeue_400Regular',
};

const PHASES: [number, string][] = [
  [0, 'ESTABLECIENDO VÍNCULO'],
  [22, 'SINCRONIZANDO ARCANOS'],
  [48, 'INVOCANDO PERSONA'],
  [72, 'ENTRANDO A LA HORA OSCURA'],
  [94, 'BIENVENIDO, PROTAGONISTA'],
];
const phaseFor = (v: number) => {
  let t = PHASES[0][1];
  for (const [p, l] of PHASES) if (v >= p) t = l;
  return t;
};

// ---- geometria del emblema (viewBox 150x150) ----
const C = 75;
const pentaPts = (r: number, rot = -Math.PI / 2) =>
  [0, 1, 2, 3, 4].map((i) => [C + r * Math.cos(rot + (i * 2 * Math.PI) / 5), C + r * Math.sin(rot + (i * 2 * Math.PI) / 5)] as [number, number]);
const pentagramD = (r: number) => {
  const p = pentaPts(r);
  const o = [0, 2, 4, 1, 3];
  return 'M' + o.map((i) => `${p[i][0].toFixed(1)},${p[i][1].toFixed(1)}`).join(' L') + ' Z';
};

const AnimatedView = Animated.View;

// Emblema memoizado: no depende del % de carga, asi no re-renderiza cada frame.
const Emblem = React.memo(({ acc, accHi, ink2, spin }: { acc: string; accHi: string; ink2: string; spin: Animated.AnimatedInterpolation<string> }) => {
  const ticks = useMemo(() => {
    const out: { x1: number; y1: number; x2: number; y2: number; big: boolean }[] = [];
    for (let i = 0; i < 30; i++) {
      const a = (i * Math.PI) / 15;
      const big = i % 6 === 0;
      const r1 = big ? 56 : 60;
      const r2 = 65;
      out.push({ x1: C + r1 * Math.cos(a), y1: C + r1 * Math.sin(a), x2: C + r2 * Math.cos(a), y2: C + r2 * Math.sin(a), big });
    }
    return out;
  }, []);
  const pentagon = useMemo(() => pentaPts(46, Math.PI / 2).map((p) => p.join(',')).join(' '), []);
  const dots = useMemo(() => pentaPts(46), []);
  const star = useMemo(() => pentagramD(46), []);

  return (
    <View style={styles.emblemBox}>
      {/* anillo de ticks (gira) */}
      <AnimatedView style={[StyleSheet.absoluteFill, { transform: [{ rotate: spin }] }]}>
        <Svg width={150} height={150} viewBox="0 0 150 150">
          {ticks.map((t, i) => (
            <Line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={acc} strokeWidth={t.big ? 2.2 : 1} opacity={t.big ? 0.95 : 0.5} />
          ))}
        </Svg>
      </AnimatedView>
      {/* partes estaticas */}
      <Svg width={150} height={150} viewBox="0 0 150 150" style={StyleSheet.absoluteFill}>
        <Circle cx={75} cy={75} r={66} fill="none" stroke={acc} strokeWidth={2} />
        <Circle cx={75} cy={75} r={50} fill={ink2} stroke={acc} strokeOpacity={0.45} strokeWidth={1.4} />
        <Polygon points={pentagon} fill="none" stroke={acc} strokeOpacity={0.3} strokeWidth={1.2} />
        <Path d={star} fill={acc} fillOpacity={0.12} stroke={acc} strokeWidth={2.6} strokeLinejoin="round" />
        <Path d={star} fill="none" stroke={accHi} strokeWidth={0.7} strokeLinejoin="round" strokeOpacity={0.6} />
        {dots.map((p, i) => (
          <Circle key={i} cx={p[0]} cy={p[1]} r={2.6} fill={accHi} />
        ))}
        <Circle cx={75} cy={75} r={3.4} fill={acc} />
      </Svg>
    </View>
  );
});

// Porcentaje con ceros a la izquierda tenues (estilo prototipo)
const Pct = ({ v, text, faint, acc }: { v: number; text: string; faint: string; acc: string }) => {
  const s = String(v).padStart(3, '0');
  const firstReal = s.search(/[1-9]/);
  return (
    <View style={styles.pctRow}>
      {s.split('').map((c, i) => {
        const isZero = firstReal === -1 ? i < 2 : i < firstReal;
        return (
          <Text key={i} style={[styles.pct, { color: isZero ? faint : text, fontFamily: FONTS.big }]}>{c}</Text>
        );
      })}
      <Text style={[styles.pctSign, { color: acc, fontFamily: FONTS.big }]}>%</Text>
    </View>
  );
};

export const LoadingScreen = ({ palette, character = 'MAKOTO' }: { palette: Palette; character?: string }) => {
  const acc = palette.primary;
  const acc2 = palette.secondary;
  const ink = palette.background;
  const text = palette.text;
  const dim = palette.textDim;
  const accHi = acc2 || acc;
  const ink2 = '#04070D';
  const faint = dim + '66';

  const [pct, setPct] = useState(0);
  const spin = useRef(new Animated.Value(0)).current;
  const halo = useRef(new Animated.Value(0)).current;
  const enter = useRef(new Animated.Value(0)).current;
  const blink = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // giro del anillo (lento, continuo)
    Animated.loop(Animated.timing(spin, { toValue: 1, duration: 42000, easing: Easing.linear, useNativeDriver: true })).start();
    // pulso del halo
    Animated.loop(
      Animated.sequence([
        Animated.timing(halo, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(halo, { toValue: 0, duration: 1700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();
    // parpadeo del rombo NOW LOADING
    Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 0.25, duration: 500, easing: Easing.step0, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 500, easing: Easing.step0, useNativeDriver: true }),
      ])
    ).start();
    // entrada escalonada
    Animated.timing(enter, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();

    // barra de progreso: avanza a 100 en ~2.2s y se mantiene (loop sutil)
    let raf: any;
    let startTs: number | null = null;
    const dur = 2200;
    const tick = (ts: number) => {
      if (startTs == null) startTs = ts;
      const e = ts - startTs;
      if (e <= dur) setPct(Math.min(100, Math.round((e / dur) * 100)));
      else { setPct(100); if (e > dur + 900) startTs = ts; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => raf && cancelAnimationFrame(raf);
  }, []);

  const spinDeg = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const haloScale = halo.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.06] });
  const haloOpacity = halo.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
  const riseStyle = (i: number) => ({
    opacity: enter,
    transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [16 + i * 4, 0] }) }],
  });

  return (
    <View style={[styles.root, { backgroundColor: ink }]}>
      {/* glow superior tenue */}
      <View style={[styles.topGlow, { backgroundColor: acc, shadowColor: acc }]} />

      {/* SEES tab + version */}
      <View style={styles.sees}>
        <View style={[styles.seesBar, { backgroundColor: acc, shadowColor: acc }]} />
        <Text style={[styles.seesTxt, { color: dim, fontFamily: FONTS.cond }]}>SEES · NIGHT OPS</Text>
      </View>
      <Text style={[styles.ver, { color: faint, fontFamily: FONTS.bigBold }]}>VER 3.0</Text>

      {/* centro */}
      <View style={styles.center}>
        <Animated.View style={[styles.eyebrow, riseStyle(0)]}>
          <View style={[styles.eyeTick, { backgroundColor: acc, shadowColor: acc }]} />
          <Text style={[styles.eyebrowTxt, { color: acc, fontFamily: FONTS.cond }]}>THE REAL LIFE RPG</Text>
          <View style={[styles.eyeTick, { backgroundColor: acc, shadowColor: acc }]} />
        </Animated.View>

        <Animated.View style={[styles.emblemWrap, riseStyle(1)]}>
          <Animated.View style={[styles.halo, { backgroundColor: acc, shadowColor: acc, opacity: haloOpacity, transform: [{ scale: haloScale }] }]} />
          <Emblem acc={acc} accHi={accHi} ink2={ink2} spin={spinDeg} />
        </Animated.View>

        <Animated.View style={riseStyle(2)}>
          <Text style={styles.wordmark}>
            <Text style={{ color: text, fontFamily: FONTS.anton }}>PERSONA</Text>
            <Text style={{ color: acc, fontFamily: FONTS.anton }}>DAYS</Text>
          </Text>
        </Animated.View>

        <Animated.View style={[styles.tagline, riseStyle(3)]}>
          <View style={[styles.tagLn, { backgroundColor: acc + '99' }]} />
          <Text style={[styles.tagTxt, { color: dim, fontFamily: FONTS.bebas }]}>MEMENTO MORI</Text>
          <View style={[styles.tagLn, { backgroundColor: acc + '99' }]} />
        </Animated.View>
      </View>

      {/* loader inferior */}
      <View style={styles.loader}>
        <View style={styles.ldTop}>
          <View style={styles.ldNow}>
            <Animated.View style={[styles.ldDot, { backgroundColor: acc, shadowColor: acc, opacity: blink }]} />
            <Text style={[styles.ldNowTxt, { color: text, fontFamily: FONTS.cond }]}>NOW LOADING</Text>
          </View>
          <Pct v={pct} text={text} faint={faint} acc={acc} />
        </View>

        <View style={[styles.track, { borderColor: acc + '55' }]}>
          <View style={[styles.fill, { width: `${pct}%`, backgroundColor: acc, shadowColor: acc }]} />
        </View>

        <View style={styles.ldSub}>
          <Text style={[styles.ldHint, { color: dim, fontFamily: FONTS.cond }]}>{phaseFor(pct)}</Text>
          <Text style={[styles.ldChar, { color: faint, fontFamily: FONTS.cond }]}>{character} · SEES</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  topGlow: {
    position: 'absolute', top: -180, alignSelf: 'center', width: 340, height: 340, borderRadius: 170,
    opacity: 0.16, elevation: 0, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 120,
  },

  sees: { position: 'absolute', top: 44, left: 28, flexDirection: 'row', alignItems: 'center', gap: 8, transform: [{ skewX: '-8deg' }] },
  seesBar: { width: 5, height: 16, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 6, elevation: 4 },
  seesTxt: { fontSize: 11, letterSpacing: 2.6 },
  ver: { position: 'absolute', top: 44, right: 28, fontSize: 13, letterSpacing: 1, transform: [{ skewX: '-8deg' }] },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 30, paddingHorizontal: 40 },

  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 10, transform: [{ skewX: '-8deg' }] },
  eyeTick: { width: 22, height: 3, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 6, elevation: 4 },
  eyebrowTxt: { fontSize: 12, letterSpacing: 4 },

  emblemWrap: { width: 150, height: 150, alignItems: 'center', justifyContent: 'center' },
  emblemBox: { width: 150, height: 150 },
  halo: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100, opacity: 0.6,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 60, elevation: 0,
  },

  wordmark: { fontSize: 46, letterSpacing: 0.5, textAlign: 'center', transform: [{ skewX: '-8deg' }], textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 0 },

  tagline: { flexDirection: 'row', alignItems: 'center', gap: 12, transform: [{ skewX: '-7deg' }] },
  tagLn: { width: 30, height: 2 },
  tagTxt: { fontSize: 22, letterSpacing: 7 },

  loader: { position: 'absolute', left: 0, right: 0, bottom: 74, paddingHorizontal: 40, gap: 14 },
  ldTop: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  ldNow: { flexDirection: 'row', alignItems: 'center', gap: 9, transform: [{ skewX: '-8deg' }] },
  ldDot: { width: 8, height: 8, transform: [{ rotate: '45deg' }], shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 6, elevation: 4 },
  ldNowTxt: { fontSize: 13, letterSpacing: 3 },

  pctRow: { flexDirection: 'row', alignItems: 'flex-end', transform: [{ skewX: '-8deg' }] },
  pct: { fontSize: 54, lineHeight: 54, letterSpacing: 0.5 },
  pctSign: { fontSize: 26, lineHeight: 30, marginLeft: 2 },

  track: { height: 16, transform: [{ skewX: '-12deg' }], backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1.5, overflow: 'hidden' },
  fill: { position: 'absolute', top: 0, bottom: 0, left: 0, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 10, elevation: 4 },

  ldSub: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ldHint: { fontSize: 11, letterSpacing: 2 },
  ldChar: { fontSize: 11, letterSpacing: 2 },
});

export default LoadingScreen;
