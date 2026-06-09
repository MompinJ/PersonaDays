// StatChipCascade.tsx — chips seleccionables "en cascada" (regla de oro P3R).
//
// Cada chip rompe el patron del anterior: zigzag de skew + escalonado
// vertical + color alterno (primary / secondary). El contenido va
// contra-inclinado para quedar legible. El chip activo se rellena del
// color y el texto/icono usan getContrastText.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../themes/useTheme';
import { getContrastText } from '../../utils/colorUtils';
import { StatIcon } from './StatIcon';
import { STATS, STAT_ORDER, type StatKey } from './stats';

// Patron de variacion (la "cascada"). Se cicla con i % n.
const SKEWS = [-15, 12, -11, 15, -13]; // alterna DIRECCION de inclinacion
const STAGGER = [0, 22, 8, 18, 4];      // escalonado VERTICAL

export interface StatChipCascadeProps {
  selected?: StatKey | null;
  onSelect?: (key: StatKey) => void;
  /** Subconjunto / orden de stats a mostrar. Por defecto los 5. */
  stats?: StatKey[];
}

export function StatChipCascade({ selected, onSelect, stats = STAT_ORDER }: StatChipCascadeProps) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      {stats.map((key, i) => {
        const active = selected === key;
        const cc = i % 2 === 0 ? theme.primary : theme.secondary; // alterna COLOR
        const sk = SKEWS[i % SKEWS.length];
        const ink = getContrastText(cc);
        return (
          <TouchableOpacity
            key={key}
            activeOpacity={0.85}
            onPress={() => onSelect?.(key)}
            style={[
              styles.chip,
              {
                marginTop: STAGGER[i % STAGGER.length],
                borderColor: cc,
                backgroundColor: active ? cc : theme.surface,
                transform: [{ skewX: `${sk}deg` }],
              },
            ]}
          >
            {/* contra-skew: el contenido vuelve a 0 grados y queda legible */}
            <View style={[styles.inner, { transform: [{ skewX: `${-sk}deg` }] }]}>
              <StatIcon stat={key} size={20} skew={0} color={active ? ink : cc} />
              <Text
                style={[
                  styles.label,
                  { fontFamily: theme.fonts?.heading, color: active ? ink : theme.text },
                ]}
              >
                {STATS[key].es}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // alignItems flex-start para que el escalonado baje; paddingBottom cubre el escalon mas alto
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 12, paddingBottom: 24 },
  chip: { borderWidth: 1.5, borderRadius: 2, paddingVertical: 9, paddingHorizontal: 16 }, // radio afilado
  inner: { flexDirection: 'row', alignItems: 'center' },
  label: { fontSize: 18, letterSpacing: 1, marginLeft: 9, includeFontPadding: false },
});

export default StatChipCascade;
