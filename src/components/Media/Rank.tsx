import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../../themes/useTheme';
import { getContrastText } from '../../utils/colorUtils';
import { RANGOS, Rango } from '../../services/mediaService';

// El rango es la unidad de valoracion de toda la biblioteca (la obra y cada
// tema). S destaca sobre el resto y de ahi hacia abajo el color se apaga, para
// que un vistazo a la lista baste para saber que vale la pena.
export const colorRango = (r: Rango | null | undefined, theme: any): string => {
  switch (r) {
    case 'S': return theme.secondary;
    case 'A': return theme.primary;
    case 'B': return theme.success;
    case 'C': return theme.text;
    case 'D': return theme.textDim;
    case 'E': return theme.error;
    default: return theme.inactive;
  }
};

/** Sello inclinado con el rango. Para las tarjetas de la lista. */
export const RankSeal = ({ rango, size = 34, style }: { rango: Rango | null; size?: number; style?: StyleProp<ViewStyle> }) => {
  const theme = useTheme();
  if (!rango) return null;
  const c = colorRango(rango, theme);
  return (
    <View style={[styles.seal, { backgroundColor: c, width: size, height: size }, style]}>
      <Text
        style={[styles.sealText, {
          color: getContrastText(c),
          fontSize: size * 0.58,
          fontFamily: theme.fonts?.display,
        }]}
      >
        {rango}
      </Text>
    </View>
  );
};

/**
 * Selector de rango S..E. Tocar el rango ya activo lo limpia, que es la unica
 * forma de dejar algo sin calificar despues de haberlo calificado.
 */
export const RankPicker = ({ value, onChange, compact }: {
  value: Rango | null;
  onChange: (r: Rango | null) => void;
  compact?: boolean;
}) => {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      {RANGOS.map((r) => {
        const on = value === r;
        const c = colorRango(r, theme);
        return (
          <TouchableOpacity
            key={r}
            activeOpacity={0.85}
            onPress={() => onChange(on ? null : r)}
            style={[
              compact ? styles.chipCompact : styles.chip,
              { borderColor: on ? c : theme.border, backgroundColor: on ? c : theme.surface },
            ]}
          >
            <Text
              style={[
                compact ? styles.chipTextCompact : styles.chipText,
                { color: on ? getContrastText(c) : theme.textDim, fontFamily: theme.fonts?.display },
              ]}
            >
              {r}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  chip: { flex: 1, height: 44, borderWidth: 1.5, borderRadius: 3, justifyContent: 'center', alignItems: 'center', transform: [{ skewX: '-11deg' }] },
  chipText: { fontSize: 20, transform: [{ skewX: '11deg' }] },
  chipCompact: { width: 30, height: 30, borderWidth: 1.5, borderRadius: 2, justifyContent: 'center', alignItems: 'center', transform: [{ skewX: '-11deg' }] },
  chipTextCompact: { fontSize: 14, transform: [{ skewX: '11deg' }] },

  seal: { justifyContent: 'center', alignItems: 'center', transform: [{ skewX: '-12deg' }], borderRadius: 2 },
  sealText: { transform: [{ skewX: '12deg' }], includeFontPadding: false },
});
