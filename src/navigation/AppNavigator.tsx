
// Se encarga de conectar las pantallas

//Herramientas de construccion
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

//Pantallas de la app
import { RootTabParamList } from './types';
import { HomeScreen } from '../screens/Home/HomeScreen';
import { StatsScreen } from '../screens/Stats/StatsScreen';
import { MissionsScreen } from '../screens/Missions/MissionsScreen';
import { CalendarScreen } from '../screens/Calendar/CalendarScreen';
import { ProfileScreen } from '../screens/Profile/ProfileScreen';

// Este objeto sabe que pantallas existen y  cuales estan activas en etse momento
// Ademas genera la barra visual por defecto
const Tab = createBottomTabNavigator<RootTabParamList>();


// 4. El componente principal
export const AppNavigator = () => {
  return (
    <NavigationContainer>
      {/* Todo lo que esté aquí dentro es navegable */}
      <Tab.Navigator>
        {/* Aquí definimos cada BOTÓN del menú inferior */}
        <Tab.Screen name="Home" component={HomeScreen} />
        {/* Crea una pestaña llamada "Home".
            Cuando la toquen, muestra el archivo HomeScreen.tsx */}
        <Tab.Screen name="Stats" component={StatsScreen} />
        <Tab.Screen name="Missions" component={MissionsScreen} />
        <Tab.Screen name="Calendar" component={CalendarScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>

    </NavigationContainer>
  );
};


