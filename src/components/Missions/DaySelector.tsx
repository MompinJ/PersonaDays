import React, { useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../themes/useTheme';

interface Props {
  selectedDays: number[]; // Array de números (0=Dom, 1=Lun...)
  onChange: (days: number[]) => void;
}

const DAYS = [
  { label: 'D', val: 0 },
  { label: 'L', val: 1 },
  { label: 'M', val: 2 },
  { label: 'M', val: 3 },
  { label: 'J', val: 4 },
  { label: 'V', val: 5 },
  { label: 'S', val: 6 },
];

// Cada dia tiene un angulo distinto -> look disruptivo P3R
const SKEWS = [-14, -8, -16, -10, -13, -7, -15];

// Dia angulado (parallelogramo) con pulso al pulsar
const DayChip = ({ label, isSelected, onToggle, skew }: { label: string; isSelected: boolean; onToggle: () => void; skew: number }) => {
  const colors = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.22, duration: 110, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
    onToggle();
  };

  return (
    <Pressable onPress={handlePress} hitSlop={4}>
      <Animated.View
        style={[
          styles.chip,
          {
            borderColor: isSelected ? colors.primary : colors.textDim,
            backgroundColor: isSelected ? colors.primary : 'transparent',
            transform: [{ skewX: `${skew}deg` }, { scale }],
          },
        ]}
      >
        <Text
          style={{
            color: isSelected ? colors.textInverse : colors.textDim,
            fontFamily: colors.fonts?.heading,
            fontSize: 17,
            transform: [{ skewX: `${-skew}deg` }],
          }}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
};

export const DaySelector = ({ selectedDays, onChange }: Props) => {
  const toggleDay = (dayVal: number) => {
    if (selectedDays.includes(dayVal)) {
      onChange(selectedDays.filter((d) => d !== dayVal));
    } else {
      onChange([...selectedDays, dayVal].sort());
    }
  };

  return (
    <View style={styles.container}>
      {DAYS.map((day, i) => (
        <DayChip
          key={`${day.val}-${i}`}
          label={day.label}
          skew={SKEWS[i % SKEWS.length]}
          isSelected={selectedDays.includes(day.val)}
          onToggle={() => toggleDay(day.val)}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  chip: {
    width: 38,
    height: 40,
    borderWidth: 2,
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
