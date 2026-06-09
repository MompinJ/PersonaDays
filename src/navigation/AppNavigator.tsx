
// Se encarga de conectar las pantallas

//Herramientas de construccion
import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../themes/useTheme';
import { RevolverNav } from '../components/Navigation/RevolverNav';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

//Pantallas de la app
import { RootTabParamList, RootStackParamList } from './types';
import { HomeScreen } from '../screens/Home/HomeScreen';
import { StatsScreen } from '../screens/Stats/StatsScreen';
import { MissionsScreen } from '../screens/Missions/MissionsScreen';
import { CalendarScreen } from '../screens/Phone/Calendar/CalendarScreen';
import { EconomyScreen } from '../screens/Economy/EconomyScreen';
import { CreateMissionScreen } from '../screens/Missions/CreateMissionScreen';
import { ManageMissionsScreen } from '../screens/Missions/ManageMissionsScreen';
import { CompletedMissionsScreen } from '../screens/Missions/CompletedMissionsScreen';
import { ProfileScreen } from '../screens/Profile/ProfileScreen';
import { SettingsScreen } from '../screens/Profile/SettingsScreen';
import { CharacterSelectionScreen } from '../screens/CharacterSelectionScreen';
import { SetupScreen } from '../screens/Setup/SetupScreen';
import { ArcsScreen } from '../screens/Phone/Arcs/ArcsScreen';
import { ArcDetailScreen } from '../screens/Phone/Arcs/ArcDetailScreen';
import ManageCategoriesScreen from '../screens/Economy/ManageCategoriesScreen';
import PhoneMenuScreen from '../screens/Phone/Phone';
import ListsMenuScreen from '../screens/Phone/ListsMenuScreen';
import ListDetailScreen from '../screens/Phone/ListDetailScreen';

// Este objeto sabe que pantallas existen y  cuales estan activas en etse momento
// Ademas genera la barra visual por defecto
const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

// Etiquetas visibles de cada modulo en el cilindro
const TAB_LABELS: Record<string, string> = {
  Home: 'HOME',
  Phone: 'TELÉFONO',
  Stats: 'STATS',
  Missions: 'MISIONES',
  Economy: 'FINANZAS',
  Profile: 'PERFIL',
};

// Mapeo route name -> key de glifo (TabGlyphs)
const TAB_GLYPH: Record<string, string> = {
  Home: 'home',
  Phone: 'phone',
  Stats: 'stats',
  Missions: 'missions',
  Economy: 'economy',
  Profile: 'profile',
};

// Tab bar custom: el cilindro de revolver
const RevolverTabBar = ({ state, navigation }: BottomTabBarProps) => {
  const order = state.routes.map((r) => r.name);
  const labels: Record<string, string> = {};
  order.forEach((name) => { labels[TAB_GLYPH[name]] = TAB_LABELS[name] || name; });

  const handleChange = (i: number) => {
    const route = state.routes[i];
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!event.defaultPrevented) {
      navigation.navigate(route.name as never);
    }
  };

  // RevolverNav usa las keys de glifo como identificador de camara
  return (
    <RevolverNav
      order={order.map((n) => TAB_GLYPH[n])}
      labels={labels}
      activeIndex={state.index}
      onChange={handleChange}
    />
  );
};

const MainTabs = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <RevolverTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {/* Orden del cilindro: Home (default, centro) | Misiones (der) | ... | Stats (izq) */}
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Missions" component={MissionsScreen} />
      <Tab.Screen name="Economy" component={EconomyScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="Phone" component={PhoneMenuScreen} />
      <Tab.Screen name="Stats" component={StatsScreen} />
    </Tab.Navigator>
  );
};

// 4. El componente principal
export const AppNavigator = () => {
  const theme = useTheme();
  // Tema de navegacion con fondo del personaje: evita el flash blanco al hacer pop
  const navTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: theme.background,
      card: theme.surface,
      text: theme.text,
      primary: theme.primary,
      border: theme.border,
    },
  };
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.background },
          animation: 'fade',
          freezeOnBlur: false,
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="Calendar" component={CalendarScreen} />
        <Stack.Screen name="Arcs" component={ArcsScreen} />
        <Stack.Screen name="ListsMenuScreen" component={ListsMenuScreen} />
        <Stack.Screen name="ListDetailScreen" component={ListDetailScreen} />
        <Stack.Screen name="ArcDetail" component={ArcDetailScreen} />
        <Stack.Screen name="ManageMissions" component={ManageMissionsScreen} />
        <Stack.Screen name="CreateMission" component={CreateMissionScreen} />
        <Stack.Screen name="CompletedMissions" component={CompletedMissionsScreen} />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
        />
        <Stack.Screen
          name="ManageCategories"
          component={ManageCategoriesScreen}
        />
        <Stack.Screen
          name="CharacterSelection"
          component={CharacterSelectionScreen}
        />
        <Stack.Screen
          name="Setup"
          component={SetupScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};


