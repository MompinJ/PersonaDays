import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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

export const DaySelector = ({ selectedDays, onChange }: Props) => {
  const colors = useTheme();

  const toggleDay = (dayVal: number) => {
    if (selectedDays.includes(dayVal)) {
      // Si ya está, lo quitamos
      onChange(selectedDays.filter(d => d !== dayVal));
    } else {
      // Si no está, lo agregamos y ordenamos
      onChange([...selectedDays, dayVal].sort());
    }
  };

  return (
    <View style={styles.container}>
      {DAYS.map((day) => {
        const isSelected = selectedDays.includes(day.val);
        return (
          <TouchableOpacity
            key={day.val}
            onPress={() => toggleDay(day.val)}
            style={[
              styles.circle,
              {
                borderColor: isSelected ? colors.primary : colors.textDim,
                backgroundColor: isSelected ? colors.primary : 'transparent'
              }
            ]}
          >
            <Text style={{
              color: isSelected ? colors.background : colors.textDim,
              fontWeight: 'bold'
            }}>
              {day.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  circle: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
