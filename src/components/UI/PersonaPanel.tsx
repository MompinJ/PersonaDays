import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../themes/useTheme';

// Vocabulario de contenedores estilo Persona 3 Reload.
//
// El problema que resuelve: la app tenia 42 paneles con esquina redondeada y
// borde de 1px -el gesto de Material Design- mientras sus piezas pequeñas
// (chips, shards, slashes) ya eran angulares. P3R CORTA en vez de redondear y
// usa PESO en vez de contorno, asi que estos componentes sustituyen a la
// "tarjeta" generica y viven en un solo sitio para no volver a divergir.

// ---------------------------------------------------------------- PANEL

interface PanelProps {
  children: React.ReactNode;
  /** Color de la barra de anclaje (default theme.primary). */
  accent?: string;
  /** Fondo del panel (default theme.surface). */
  background?: string;
  /**
   * Color que "muerde" la esquina. Debe ser el del fondo REAL sobre el que se
   * apoya el panel; por eso es un prop y no se asume theme.background.
   */
  cutColor?: string;
  /** Tamaño del corte diagonal en px. 0 lo desactiva. */
  cut?: number;
  /** Grosor de la barra de anclaje. 0 la quita. */
  bar?: number;
  /** Esquina recortada. */
  corner?: 'bottomRight' | 'topRight' | 'bottomLeft';
  style?: StyleProp<ViewStyle>;
}

/**
 * Panel angular: fondo plano, barra de acento a la izquierda y una esquina
 * mordida en diagonal. Sin borde perimetral: si el panel ya tiene fondo
 * propio, el contorno solo añade ruido.
 *
 * El corte se hace con un cuadrado rotado 45 grados del color del fondo, ya
 * que React Native no tiene clip-path.
 */
export const PersonaPanel = ({
  children, accent, background, cutColor, cut = 18, bar = 7,
  corner = 'bottomRight', style,
}: PanelProps) => {
  const theme = useTheme();
  const acc = accent || theme.primary;
  const bg = background || theme.surface;
  const cutBg = cutColor || theme.background;

  // El cuadrado se rota 45 grados, asi que su diagonal (cut) exige un lado de
  // cut/√2; se sobredimensiona un poco para que no asome el fondo del panel.
  const size = cut * 1.45;
  const off = -size / 2;
  const cornerPos: ViewStyle =
    corner === 'topRight' ? { top: off, right: off }
    : corner === 'bottomLeft' ? { bottom: off, left: off }
    : { bottom: off, right: off };

  return (
    <View style={[styles.panel, { backgroundColor: bg }, style]}>
      {bar > 0 && <View style={[styles.bar, { backgroundColor: acc, width: bar }]} />}
      {cut > 0 && (
        <View
          pointerEvents="none"
          style={[
            styles.cut,
            cornerPos,
            { width: size, height: size, backgroundColor: cutBg },
          ]}
        />
      )}
      {children}
    </View>
  );
};

// --------------------------------------------------------------- CIFRA

interface FigureProps {
  value: string;
  label: string;
  /** Color de la cifra y de la barra (default theme.text / theme.primary). */
  color?: string;
  accent?: string;
  sub?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Cifra sin caja. Meter cada numero en su recuadro aplana la jerarquia: si
 * todo va en una caja, ninguna caja significa nada. Aqui manda el peso
 * tipografico y basta una barra inclinada para agrupar cifra y etiqueta.
 */
export const PersonaFigure = ({ value, label, color, accent, sub, size = 34, style }: FigureProps) => {
  const theme = useTheme();
  const acc = accent || color || theme.primary;
  return (
    <View style={[styles.figure, style]}>
      <View style={[styles.figureBar, { backgroundColor: acc }]} />
      <Text
        style={[styles.figureValue, { color: color || theme.text, fontSize: size, fontFamily: theme.fonts?.display }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text style={[styles.figureLabel, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]} numberOfLines={1}>
        {label}
      </Text>
      {!!sub && <Text style={[styles.figureSub, { color: theme.textDim }]} numberOfLines={1}>{sub}</Text>}
    </View>
  );
};

// ------------------------------------------------------------ SEPARADOR

/**
 * Separador de franjas diagonales. El hairline de 1px es el tic de Material;
 * P3R corta. Se dibuja con barras inclinadas repetidas (RN no tiene
 * repeating-linear-gradient).
 */
export const PersonaDivider = ({ color, height = 5, gap = 15, style }: {
  color?: string; height?: number; gap?: number; style?: StyleProp<ViewStyle>;
}) => {
  const theme = useTheme();
  const c = color || theme.border;
  // 24 barras cubren de sobra cualquier ancho de telefono; el overflow las recorta.
  return (
    <View style={[styles.divider, { height }, style]}>
      {Array.from({ length: 24 }, (_, i) => (
        <View key={i} style={[styles.dividerBar, { backgroundColor: c, width: height, marginRight: gap - height, height: height * 3 }]} />
      ))}
    </View>
  );
};

// --------------------------------------------------------------- CAMPO

/**
 * Envoltorio de campo de texto: acento inclinado y subrayado grueso, en vez de
 * la caja con borde y radio.
 */
export const PersonaField = ({ children, accent, style }: {
  children: React.ReactNode; accent?: string; style?: StyleProp<ViewStyle>;
}) => {
  const theme = useTheme();
  const acc = accent || theme.primary;
  return (
    <View style={[styles.field, { borderBottomColor: acc }, style]}>
      <View style={[styles.fieldAccent, { backgroundColor: acc }]} />
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  panel: { position: 'relative', overflow: 'hidden', paddingVertical: 16, paddingRight: 18, paddingLeft: 22 },
  bar: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  cut: { position: 'absolute', transform: [{ rotate: '45deg' }] },

  figure: { position: 'relative', paddingLeft: 14, minWidth: 0 },
  figureBar: { position: 'absolute', left: 0, top: 2, bottom: 6, width: 5, transform: [{ skewX: '-12deg' }] },
  figureValue: { includeFontPadding: false, letterSpacing: 0.5 },
  figureLabel: { fontSize: 10, letterSpacing: 1.8, textTransform: 'uppercase', marginTop: 2 },
  figureSub: { fontSize: 10, marginTop: 1 },

  divider: { flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  dividerBar: { transform: [{ skewX: '-25deg' }] },

  field: { flexDirection: 'row', alignItems: 'stretch', borderBottomWidth: 3 },
  fieldAccent: { width: 7, transform: [{ skewX: '-12deg' }], marginRight: 12 },
});

export default PersonaPanel;
