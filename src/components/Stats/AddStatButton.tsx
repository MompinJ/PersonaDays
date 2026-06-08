import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../themes/useTheme';
import { PressableScale } from '../UI/PressableScale';

interface Props {
  onPress: () => void;
  color: string;
}

export const AddStatButton = ({ onPress, color }: Props) => {
  const theme = useTheme();
  const accent = color || theme.primary;
  return (
    <PressableScale containerStyle={styles.wrapper} style={[styles.container, { borderColor: accent, backgroundColor: theme.surface }]} onPress={onPress}>
      <Ionicons name="add" size={20} color={accent} style={{ marginRight: 8 }} />
      <Text style={[styles.text, { color: accent, fontFamily: theme.fonts?.heading }]}>NUEVO STAT</Text>
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 20,
    alignItems: 'center',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderWidth: 2,
    borderStyle: 'dashed', // Estilo técnico/blueprint
    borderRadius: 4,
  },
  text: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
