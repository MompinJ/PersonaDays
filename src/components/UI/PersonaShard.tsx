import React, { useMemo } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../../themes/useTheme';
import { getContrastText } from '../../utils/colorUtils';

type Direction = 'right' | 'left';
type Variant = 'solid' | 'ghost';

interface Props {
  label: string;
  color?: string;        // fill del banner (default: auto primary/secondary)
  textColor?: string;    // texto (default: contraste automatico sobre el fill)
  accentColor?: string;  // sombra detras (default: el color complementario)
  font?: string;         // familia (default: auto entre heading/title/display)
  rotate?: number;       // inclinacion (grados). Omitir = auto.
  direction?: Direction; // lado de la punta. Omitir = auto.
  variant?: Variant;     // 'solid' | 'ghost' (contorno)
  shadow?: boolean;      // capa de sombra (default true en solid)
  seed?: string;         // semilla de variacion (default = label)
  height?: number;       // omitir = auto
  fontSize?: number;     // omitir = auto
  indent?: number;       // sangria horizontal. Omitir = auto.
  style?: StyleProp<ViewStyle>;
}

// Etiqueta estilo Persona 3 Reload: banner inclinado con punta triangular,
// sombra desplazada y texto rotado. Auto-varia orientacion, inclinacion,
// tamaño, color, tipografia y sangria segun el texto (sin repetir).
export const PersonaShard = ({
  label,
  color,
  textColor,
  accentColor,
  font,
  rotate,
  direction,
  variant = 'solid',
  shadow,
  seed,
  height,
  fontSize,
  indent,
  style,
}: Props) => {
  const theme = useTheme();
  const isGhost = variant === 'ghost';

  // Hash deterministico del texto -> varias "corrientes" decorrelacionadas
  const hash = useMemo(() => {
    const s = seed ?? label ?? '';
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  }, [seed, label]);
  const h1 = hash;
  const h2 = (hash >>> 3) >>> 0;
  const h3 = (hash >>> 7) >>> 0;
  const h4 = (hash >>> 11) >>> 0;
  const h5 = (hash >>> 15) >>> 0;

  // Color: ~1/3 usan secondary como fill; el acento es el complementario
  const useSecondary = h4 % 3 === 0;
  const fill = color || (useSecondary ? theme.secondary : theme.primary);
  const accent = accentColor || (useSecondary ? theme.primary : theme.secondary);
  const tColor = textColor || (isGhost ? fill : getContrastText(fill));

  // Tipografia: alterna entre heading (Bebas), title (Anton), display (Big Shoulders)
  const fontPool = [theme.fonts?.heading, theme.fonts?.title, theme.fonts?.display];
  const fam = font || fontPool[h3 % fontPool.length];

  // Geometria
  const dir: Direction = direction ?? (h1 % 2 === 0 ? 'right' : 'left');
  const rot = rotate ?? [-4, -3, -2, 2, 3, 4][h1 % 6];
  const H = height ?? [26, 30, 34, 40][h2 % 4];
  const FS = fontSize ?? Math.max(11, Math.round(H * 0.46));
  const pad = Math.round(H * 0.5);
  const point = Math.round(H * 0.5);
  const ind = indent ?? [0, 0, 14, 26][h5 % 4];
  const showShadow = (shadow ?? true) && !isGhost;

  const SKEW = '-16deg';

  const Triangle = ({ tfill }: { tfill: string }) => (
    <View
      style={{
        width: 0,
        height: 0,
        borderTopWidth: H / 2,
        borderBottomWidth: H / 2,
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
        ...(dir === 'left'
          ? { borderRightWidth: point, borderRightColor: tfill, marginRight: -0.5 }
          : { borderLeftWidth: point, borderLeftColor: tfill, marginLeft: -0.5 }),
        transform: [{ skewX: SKEW }],
      }}
    />
  );

  const Banner = ({ bfill, outline, children }: { bfill: string; outline?: boolean; children?: React.ReactNode }) => (
    <View style={styles.bannerRow}>
      {dir === 'left' && <Triangle tfill={bfill} />}
      <View
        style={[
          styles.bannerBody,
          {
            height: H,
            paddingHorizontal: pad,
            backgroundColor: outline ? 'transparent' : bfill,
            borderWidth: outline ? 2 : 0,
            borderColor: bfill,
          },
          { transform: [{ skewX: SKEW }] },
        ]}
      >
        {children}
      </View>
      {dir === 'right' && <Triangle tfill={bfill} />}
    </View>
  );

  const TextNode = ({ col }: { col: string }) => (
    <Text style={[styles.text, { color: col, fontFamily: fam, fontSize: FS }]} numberOfLines={1}>
      {label}
    </Text>
  );

  return (
    <View style={[styles.wrap, { marginLeft: ind, transform: [{ rotate: `${rot}deg` }] }, style]}>
      {showShadow && (
        <View style={styles.accentLayer} pointerEvents="none">
          <Banner bfill={accent}>
            <TextNode col="transparent" />
          </Banner>
        </View>
      )}

      <Banner bfill={fill} outline={isGhost}>
        <TextNode col={tColor} />
      </Banner>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignSelf: 'flex-start' },
  accentLayer: { position: 'absolute', left: 5, top: 4 },
  bannerRow: { flexDirection: 'row', alignItems: 'center' },
  bannerBody: { justifyContent: 'center' },
  text: {
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    includeFontPadding: false,
    transform: [{ skewX: '16deg' }],
  },
});

export default PersonaShard;
