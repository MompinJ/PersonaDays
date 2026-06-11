import React, { useEffect, useState } from 'react';
import { LogBox } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// En Expo Go (SDK 53+) expo-notifications avisa que el PUSH remoto no esta
// disponible. Solo usamos notificaciones LOCALES (que si funcionan), asi que ese
// warning es ruido: lo silenciamos para no asustar. No afecta al build standalone.
LogBox.ignoreLogs([
  /Android Push notifications.*removed from Expo Go/,
  'expo-notifications',
]);

// Fonts
import { useFonts } from 'expo-font';
import { Anton_400Regular } from '@expo-google-fonts/anton';
import { Exo2_400Regular, Exo2_700Bold } from '@expo-google-fonts/exo-2';
import { BarlowCondensed_600SemiBold, BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed';
import { BigShouldersDisplay_700Bold, BigShouldersDisplay_800ExtraBold } from '@expo-google-fonts/big-shoulders-display';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';

// Navegador y Pantallas
import { AppNavigator } from './src/navigation/AppNavigator';
import { SetupScreen } from './src/screens/Setup/SetupScreen';
import { CharacterSelectionScreen } from './src/screens/CharacterSelectionScreen';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Servicios (Lógica)
import { initDatabase } from './src/database';
import { initNotifications, syncRoutineReminders } from './src/services/notificationService';

// Context
import { GameProvider, useGame } from './src/context/GameContext';
import { AlertProvider } from './src/context/AlertContext';
import { EventFlashProvider } from './src/context/EventFlashContext';
import { PALETTES } from './src/themes/palettes';
import { LoadingScreen } from './src/components/UI/LoadingScreen';

const DEFAULT_PALETTE = Object.values(PALETTES)[0] as any;

function RootNavigation() {
  const { player, isLoading } = useGame();
  const Stack = createNativeStackNavigator();

  if (isLoading) {
    return <LoadingScreen palette={DEFAULT_PALETTE} />;
  }

  if (!player) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: DEFAULT_PALETTE.background } }}>
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
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
    BigShouldersDisplay_700Bold,
    BigShouldersDisplay_800ExtraBold,
    BebasNeue_400Regular,
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
      // Recordatorios: setup del handler y reagendado desde la config guardada.
      // No pide permisos aqui (eso ocurre al activar en Ajustes). Si el master
      // esta off o no hay permiso, queda todo cancelado.
      try {
        await initNotifications();
        await syncRoutineReminders();
      } catch (e) {
        console.error('Error inicializando notificaciones:', e);
      }
    };
    setup();
  }, []);

  if (!fontsLoaded) return null;

  if (!isDbReady) {
    return <LoadingScreen palette={DEFAULT_PALETTE} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: DEFAULT_PALETTE.background }}>
      <StatusBar style="light" />
      <GameProvider>
        <AlertProvider>
          <EventFlashProvider>
            <RootNavigation />
          </EventFlashProvider>
        </AlertProvider>
      </GameProvider>
    </GestureHandlerRootView>
  );
}
