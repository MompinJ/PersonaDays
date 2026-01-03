import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Navegador
import { AppNavigator } from './src/navigation/AppNavigator';
// Inicializador de la base de datos
import { initDatabase } from './src/database';

export default function App() {
  // 1. Estado para controlar si estamos cargando
  const [isDbReady, setIsDbReady] = useState(false);

  // 2. useEffect: Se ejecuta una sola vez al iniciar la app
  useEffect(() => {
    const setup = async () => {
      try {
        console.log('🏁 Iniciando configuración...');
        await initDatabase();

        console.log('✅ Base de datos lista');
        setIsDbReady(true);
      } catch (e) {
        console.error('❌ Error al iniciar:', e);
      }
    };

    setup();
  }, []); // Los corchetes vacíos [] aseguran que solo pase una vez

  // 3. Si la base de datos no está lista, mostramos un Spinner
  if (!isDbReady) {
    return (
      <View style={styles.container}>
        {/* ActivityIndicator es el circulito de carga nativo */}
        <ActivityIndicator size="large" color="#00D4FF" />
        <Text style={{ marginTop: 10 }}>Invocando a tu Persona...</Text>
      </View>
    );
  }

  // 4. Si ya cargó, mostramos la App Principal
return (
    <>
      <StatusBar style="light" />
      <AppNavigator />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1628e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00D4FF', // Azul Persona 3
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  }
});
