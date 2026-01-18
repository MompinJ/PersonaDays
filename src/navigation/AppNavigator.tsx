
// Se encarga de conectar las pantallas

//Herramientas de construccion
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../themes/useTheme';

//Pantallas de la app
import { RootTabParamList, RootStackParamList } from './types';
import { HomeScreen } from '../screens/Home/HomeScreen';
import { StatsScreen } from '../screens/Stats/StatsScreen';
import { MissionsScreen } from '../screens/Missions/MissionsScreen';
import { CalendarScreen } from '../screens/Calendar/CalendarScreen';
import { EconomyScreen } from '../screens/Economy/EconomyScreen';
import { CreateMissionScreen } from '../screens/Missions/CreateMissionScreen';
import { ManageMissionsScreen } from '../screens/Missions/ManageMissionsScreen';
import { CompletedMissionsScreen } from '../screens/Missions/CompletedMissionsScreen';
import { ProfileScreen } from '../screens/Profile/ProfileScreen';
import { SettingsScreen } from '../screens/Profile/SettingsScreen';
import { CharacterSelectionScreen } from '../screens/CharacterSelectionScreen';
import { SetupScreen } from '../screens/Setup/SetupScreen';
import { ArcsScreen } from '../screens/Arcs/ArcsScreen';
import { ArcDetailScreen } from '../screens/Arcs/ArcDetailScreen';

// Este objeto sabe que pantallas existen y  cuales estan activas en etse momento
// Ademas genera la barra visual por defecto
const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const MainTabs = () => {
  const theme = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.primary,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textDim,
        tabBarShowLabel: true,
        tabBarIcon: ({ color, size }) => {
          const name = route.name;
          if (name === 'Home') return <Ionicons name="home" size={size} color={color} />;
          if (name === 'Arcs') return <MaterialCommunityIcons name="book-open-variant" size={size} color={color} />;
          if (name === 'Stats') return <Ionicons name="bar-chart" size={size} color={color} />;
          if (name === 'Missions') return <Ionicons name="list" size={size} color={color} />;
          if (name === 'Calendar') return <Ionicons name="calendar" size={size} color={color} />;
          if (name === 'Economy') return <Ionicons name="cash" size={size} color={color} />;
          if (name === 'Profile') return <Ionicons name="person-circle" size={size} color={color} />;
          return null;
        }
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Arcs" component={ArcsScreen} />
      <Tab.Screen name="Stats" component={StatsScreen} />
      <Tab.Screen name="Missions" component={MissionsScreen} />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="Economy" component={EconomyScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

// 4. El componente principal
export const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="ArcDetail" component={ArcDetailScreen} />
        <Stack.Screen
          name="ManageMissions"
          component={ManageMissionsScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="CreateMission"
          component={CreateMissionScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="CompletedMissions"
          component={CompletedMissionsScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
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


