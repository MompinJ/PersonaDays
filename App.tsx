import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { db } from './src/database';
// Navegador y Pantallas
import { AppNavigator } from './src/navigation/AppNavigator';
import { SetupScreen } from './src/screens/Setup/SetupScreen';

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
        await db.execAsync('DELETE FROM jugadores'); // TODO Quitar esto
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
  return (
    <>
      <StatusBar style="light" />

      {hasPlayer ? (
        // CAMINO A: Si ya tiene jugador, entra al juego normal
        <AppNavigator />
      ) : (
        // CAMINO B: Si es nuevo, muestra el Contrato (SetupScreen)
        <SetupScreen onFinishSetup={() => setHasPlayer(true)} />
      )}
    </>
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
