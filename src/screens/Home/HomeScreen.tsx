import React, {useEffect, useState} from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

import { PlayerHeader } from '../../components/Home/PlayerHeader';
import { Jugador } from '../../types';

export const HomeScreen = () => {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Pantalla: HOME (Resumen del día)</Text>
    </View>
  );
};
