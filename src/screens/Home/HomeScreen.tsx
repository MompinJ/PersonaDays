import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../themes/useTheme';

import { PlayerHeader } from '../../components/Home/PlayerHeader';

export const HomeScreen = () => {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
      <Text style={{ color: theme.text, fontFamily: theme.fonts?.title, textTransform: 'uppercase', fontSize: 18, letterSpacing: 1.5 }}>
        PANTALLA: HOME (Resumen del día)
      </Text>
    </View>
  );
};
