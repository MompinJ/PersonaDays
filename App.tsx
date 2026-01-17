import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Fonts
import { useFonts } from 'expo-font';
import { Anton_400Regular } from '@expo-google-fonts/anton';
import { Exo2_400Regular, Exo2_700Bold } from '@expo-google-fonts/exo-2';

// Navegador y Pantallas
import { AppNavigator } from './src/navigation/AppNavigator';
import { SetupScreen } from './src/screens/Setup/SetupScreen';
import { CharacterSelectionScreen } from './src/screens/CharacterSelectionScreen';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Servicios (Lógica)
import { initDatabase } from './src/database';

// Context
import { GameProvider, useGame } from './src/context/GameContext';
import { PALETTES } from './src/themes/palettes';

const DEFAULT_PALETTE = Object.values(PALETTES)[0] as any;

function RootNavigation() {
  const { player, isLoading } = useGame();
  const Stack = createNativeStackNavigator();

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: DEFAULT_PALETTE.background }]}> 
        <ActivityIndicator size="large" color={DEFAULT_PALETTE.primary} />
        <Text style={[styles.loadingText, { color: DEFAULT_PALETTE.text }]}>Cargando usuario...</Text>
      </View>
    );
  }

  if (!player) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Setup" component={SetupScreen} />
          <Stack.Screen name="CharacterSelection" component={CharacterSelectionScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return <AppNavigator />;
}

export default function App() {
  const [isDbReady, setIsDbReady] = useState(false);

  const [fontsLoaded] = useFonts({
    Anton_400Regular,
    Exo2_400Regular,
    Exo2_700Bold,
  });

  useEffect(() => {
    const setup = async () => {
      try {
        await initDatabase();
        setIsDbReady(true);
      } catch (e) {
        console.error('Error inicializando DB:', e);
        setIsDbReady(true); // permitimos que la app intente seguir aunque falle
      }
    };
    setup();
  }, []);

  if (!fontsLoaded) return null;

  if (!isDbReady) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: DEFAULT_PALETTE.background }]}> 
        <ActivityIndicator size="large" color={DEFAULT_PALETTE.primary} />
        <Text style={[styles.loadingText, { color: DEFAULT_PALETTE.text }]}>Invocando a tu Persona...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <GameProvider>
        <RootNavigation />
      </GameProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0A1628',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold'
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  }
});
