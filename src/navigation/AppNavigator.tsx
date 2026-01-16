
// Se encarga de conectar las pantallas

//Herramientas de construccion
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../themes/useTheme';

//Pantallas de la app
import { RootTabParamList, RootStackParamList } from './types';
import { HomeScreen } from '../screens/Home/HomeScreen';
import { StatsScreen } from '../screens/Stats/StatsScreen';
import { MissionsScreen } from '../screens/Missions/MissionsScreen';
import { CalendarScreen } from '../screens/Calendar/CalendarScreen';
import { EconomyScreen } from '../screens/Economy/EconomyScreen';
import { CreateMissionScreen } from '../screens/Missions/CreateMissionScreen';
import { ProfileScreen } from '../screens/Profile/ProfileScreen';

// Este objeto sabe que pantallas existen y  cuales estan activas en etse momento
// Ademas genera la barra visual por defecto
const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const MainTabs = () => {
  const theme = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.primary,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textDim,
        tabBarShowLabel: true,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
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
        <Stack.Screen
          name="CreateMission"
          component={CreateMissionScreen}
          options={{ presentation: 'modal' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};


