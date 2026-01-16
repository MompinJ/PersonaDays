import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useTheme } from '../../themes/useTheme';

interface Props {
  onPress: () => void;
  color: string;
}

export const AddStatButton = ({ onPress, color }: Props) => {
  const theme = useTheme();
  const textColor = color || theme.text;
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.wrapper}>
      <View style={[styles.container, { borderColor: color, backgroundColor: theme.surface }]}>
        <Text style={[styles.plus, { color: textColor }]}>+</Text>
        <Text style={[styles.text, { color: textColor }]}>NUEVO STAT</Text>
      </View>
    </TouchableOpacity>
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
  plus: {
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 10,
    lineHeight: 26,
  },
  text: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  }
});
