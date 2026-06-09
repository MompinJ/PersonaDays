// TabBar.tsx — barra de navegación P3R (ejemplo listo para usar).
// Inactivo = sólido tenue (textDim) · activo = corte Shard + primary +
// subrayado inclinado. Esquinas afiladas, borde superior primary.
//
// Úsalo como barra propia o pásalo a React Navigation:
//   <Tab.Navigator tabBar={(props) => <TabBar
//      active={props.state.routeNames[props.state.index] as TabKey}
//      onChange={(k) => props.navigation.navigate(k)} />}>
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../themes/useTheme';
import { TabIcon } from './TabIcon';
import { TABS, TAB_ORDER, type TabKey } from './tabs';

export interface TabBarProps {
  active: TabKey;
  onChange?: (key: TabKey) => void;
}

export function TabBar({ active, onChange }: TabBarProps) {
  const theme = useTheme();
  return (
    <View style={[styles.bar, { backgroundColor: theme.surface, borderTopColor: theme.primary }]}>
      {TAB_ORDER.map((k) => {
        const on = active === k;
        const tint = on ? theme.primary : theme.textDim;
        return (
          <Pressable key={k} style={styles.tab} onPress={() => onChange?.(k)} hitSlop={6}>
            <TabIcon tab={k} active={on} size={26} color={tint} />
            <Text style={[styles.label, { fontFamily: theme.fonts?.condensed, color: tint }]}>
              {TABS[k].label}
            </Text>
            {on && <View style={[styles.underline, { backgroundColor: theme.primary }]} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'stretch', height: 64, borderTopWidth: 2, paddingBottom: 6 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5, paddingTop: 8 },
  label: { fontSize: 11, letterSpacing: 1, includeFontPadding: false },
  underline: { position: 'absolute', bottom: 4, width: 22, height: 3, transform: [{ skewX: '-20deg' }] },
});

export default TabBar;
