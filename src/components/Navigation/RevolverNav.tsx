// RevolverNav.tsx — navbar cilindro de revolver (6 camaras = 6 modulos).
// Se arrastra horizontalmente para girar (snap a 60 grados); la camara que
// queda arriba es el modulo activo. Tambien se puede tocar una camara lateral
// para girar hasta ella. Empujado hacia abajo: solo asoma el arco superior.
//
// Sin reanimated: PanResponder (built-in) + rotacion por requestAnimationFrame.
// Colores SIEMPRE del tema (cambian por personaje), nunca hardcodeados.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, PanResponder, useWindowDimensions } from 'react-native';
import { useTheme } from '../../themes/useTheme';
import { getContrastText } from '../../utils/colorUtils';
import { TabGlyph } from '../UI/TabGlyphs';

const STEP = 60;          // grados entre camaras
const K = 0.34;           // grados de giro por pixel arrastrado
const BAND = 142;         // alto de la banda visible (baja, menos invasiva)
const RYR = 84;           // radio VERTICAL del ovalo (aplana)
const RAISE = 20;         // cuanto se eleva la camara activa
const SIDELIFT = 6;       // leve elevacion de las camaras laterales (sin salirse del ovalo)
const CY = 156;           // centro Y del ovalo (debajo de la banda)
const BULLET = 60;        // tamano base de la camara

const norm = (a: number) => { a = ((a + 180) % 360 + 360) % 360 - 180; return a; };
const easeOutBack = (p: number) => { const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };

interface Props {
  order: string[];                 // route names en orden
  labels: Record<string, string>;  // route name -> etiqueta visible
  activeIndex: number;
  onChange: (i: number) => void;
}

export const RevolverNav = ({ order, labels, activeIndex, onChange }: Props) => {
  const theme = useTheme();
  const win = useWindowDimensions();
  const count = order.length;

  const [W, setW] = useState(win.width);
  const [, force] = useState(0);
  const render = () => force((n) => (n + 1) % 1000000);

  const s = useRef({
    rot: -activeIndex * STEP, active: activeIndex,
    raf: 0, from: 0, target: 0, t0: 0, dur: 0,
    startRot: 0,
  }).current;

  const cx = W / 2;
  // Anillo de camaras: mas estrecho que la cara, para que las laterales queden DENTRO de la pantalla
  const Rx = Math.min(Math.max(W * 0.40, 150), 240);
  // Cara del ovalo: ancha (cubre el ancho de la pantalla); vertical da cuerpo para contener las camaras
  const RFx = Math.min(Math.max(W * 0.60, 210), 340);
  const RFy = RYR + 40;

  const animateTo = (target: number, fireActive: boolean) => {
    const active = ((Math.round(-target / STEP) % count) + count) % count;
    if (fireActive && active !== s.active) { s.active = active; onChange(active); }
    else s.active = active;
    s.from = s.rot; s.target = target; s.t0 = Date.now();
    s.dur = 360 + Math.min(280, Math.abs(target - s.from) * 1.1);
    cancelAnimationFrame(s.raf);
    const loop = () => {
      const p = Math.min(1, (Date.now() - s.t0) / s.dur);
      s.rot = s.from + (s.target - s.from) * easeOutBack(p);
      render();
      if (p >= 1) { s.rot = s.target; render(); return; }
      s.raf = requestAnimationFrame(loop);
    };
    s.raf = requestAnimationFrame(loop);
  };

  // Sincronizar si el indice activo cambia desde fuera (ej. navegacion externa)
  useEffect(() => {
    if (activeIndex === s.active) return;
    const target = s.rot + norm(-activeIndex * STEP - s.rot);
    animateTo(target, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  useEffect(() => () => cancelAnimationFrame(s.raf), []);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
      onMoveShouldSetPanResponderCapture: (_e, g) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: () => { cancelAnimationFrame(s.raf); s.startRot = s.rot; },
      onPanResponderMove: (_e, g) => { s.rot = s.startRot + g.dx * K; render(); },
      onPanResponderRelease: (_e, g) => {
        const flick = Math.max(-2, Math.min(2, g.vx * 16)) * 6;
        const target = Math.round((s.rot + flick) / STEP) * STEP;
        animateTo(target, true);
      },
      onPanResponderTerminate: () => {
        const target = Math.round(s.rot / STEP) * STEP;
        animateTo(target, true);
      },
    })
  ).current;

  const tapChamber = (i: number) => {
    const target = s.rot + norm(-i * STEP - s.rot);
    animateTo(target, true);
  };

  // Construir camaras visibles
  const chambers: { i: number; x: number; y: number; t: number; z: number }[] = [];
  for (let i = 0; i < count; i++) {
    const rel = norm(i * STEP + s.rot);
    if (Math.abs(rel) > 98) continue;
    const a = (-90 + i * STEP + s.rot) * Math.PI / 180;
    const t = Math.max(0, 1 - Math.abs(rel) / STEP);
    const x = cx + Rx * Math.cos(a);
    // las laterales (t bajo) se elevan con SIDELIFT para asomar mas; la activa no
    const y = CY + RYR * Math.sin(a) - t * RAISE - (1 - t) * SIDELIFT;
    chambers.push({ i, x, y, t, z: Math.round(t * 100) });
  }
  chambers.sort((p, q) => p.z - q.z);

  const accent = theme.primary;
  const accentInk = getContrastText(accent);

  return (
    <View style={[styles.band, { height: BAND + 8, width: W }]} onLayout={(e) => setW(e.nativeEvent.layout.width)} {...pan.panHandlers}>
      {/* Cara del cilindro: circulo escalado a elipse ancha; solo asoma el arco superior */}
      <View
        pointerEvents="none"
        style={[styles.drum, {
          width: RFy * 2, height: RFy * 2, borderRadius: RFy,
          left: cx - RFy, top: CY - RFy,
          backgroundColor: theme.surface, borderColor: theme.border,
          transform: [{ scaleX: RFx / RFy }],
        }]}
      >
        <View style={[styles.drumTop, { borderColor: accent, borderTopLeftRadius: RFy, borderTopRightRadius: RFy }]} />
      </View>

      {/* Camaras (balas) */}
      {chambers.map(({ i, x, y, t, z }) => {
        const sc = 0.8 + t * 0.3;
        const key = order[i];
        const hot = t > 0.55;
        const size = BULLET;
        return (
          <Pressable
            key={i}
            onPress={() => tapChamber(i)}
            style={{
              position: 'absolute',
              left: x - size / 2, top: y - size / 2,
              width: size, height: size, zIndex: z,
              opacity: 0.62 + t * 0.38,
              transform: [{ scale: sc }],
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            {hot && (
              <Text
                numberOfLines={1}
                style={[styles.label, { color: accent, fontFamily: theme.fonts?.title, opacity: (t - 0.55) / 0.45 }]}
              >
                {labels[key] || key}
              </Text>
            )}
            <View
              style={[
                styles.bullet,
                {
                  width: size, height: size, borderRadius: size / 2,
                  backgroundColor: hot ? accent : theme.surface,
                  borderColor: hot ? accent : theme.textDim,
                  shadowColor: accent,
                  shadowOpacity: hot ? 0.7 : 0,
                  shadowRadius: hot ? 14 : 0,
                  elevation: hot ? 10 : 0,
                },
              ]}
            >
              <TabGlyph tab={key} size={28} color={hot ? accentInk : theme.textDim} active={hot} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  band: { position: 'absolute', left: 0, bottom: 0, overflow: 'hidden' },
  drum: { position: 'absolute', borderWidth: 2 },
  drumTop: {
    position: 'absolute', left: 0, right: 0, top: 0, height: '50%',
    borderTopWidth: 3, borderColor: 'transparent', opacity: 0.5,
  },
  bullet: {
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
  },
  label: {
    position: 'absolute', top: BULLET + 5, left: (BULLET - 140) / 2,
    fontSize: 15, letterSpacing: 1, textAlign: 'center', width: 140,
  },
});

export default RevolverNav;
