import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { db } from './src/database';
// Navegador y Pantallas
import { AppNavigator } from './src/navigation/AppNavigator';
import { SetupScreen } from './src/screens/Setup/SetupScreen';
import { CharacterSelectionScreen } from './src/screens/CharacterSelectionScreen';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Servicios (Lógica)
import { initDatabase } from './src/database';
import { checkPlayerExists } from './src/services/playerService';


export default function App() {
  // 1. Estados
  // isDbReady: Controla si ya terminamos de cargar todo lo inicial (BD + Chequeos)
  const [isDbReady, setIsDbReady] = useState(false);
  // hasPlayer: Controla si el usuario ya firmó el contrato antes
  const [hasPlayer, setHasPlayer] = useState(false);

  // 2. useEffect: Se ejecuta una sola vez al iniciar
  useEffect(() => {
    const setup = async () => {
      try {
        console.log('🏁 Iniciando configuración...');

        // Paso A: Iniciar la base de datos física
        await initDatabase();
        console.log('✅ Base de datos lista');

        // Paso B: Preguntar si ya existe un jugador registrado
        const existeJugador = await checkPlayerExists();
        setHasPlayer(existeJugador);
        console.log('👤 ¿Existe jugador?:', existeJugador);

        // Paso C: Todo listo, quitamos el spinner de carga
        setIsDbReady(true);

      } catch (e) {
        console.error('❌ Error al iniciar:', e);
      }
    };

    setup();
  }, []);

  if (!isDbReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00D4FF" />
        <Text style={styles.loadingText}>Invocando a tu Persona...</Text>
      </View>
    );
  }

  // 4. Lógica Principal (El Semáforo)
  // Si ya hay jugador, mostramos el stack principal; si no, mostramos una navegación pequeña
  const Stack = createNativeStackNavigator();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />

      {hasPlayer ? (
        <AppNavigator />
      ) : (
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Setup" component={SetupScreen} />
            <Stack.Screen name="CharacterSelection">
              {(props) => (
                <CharacterSelectionScreen {...props} onAuthentication={() => setHasPlayer(true)} />
              )}
            </Stack.Screen>
          </Stack.Navigator>
        </NavigationContainer>
      )}
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
