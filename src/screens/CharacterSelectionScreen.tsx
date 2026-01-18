import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  Animated
} from 'react-native';
import { CHARACTERS } from '../data/characters';
import { PALETTES } from '../themes/palettes';
import { db } from '../database';
import { CharacterTheme } from '../types';
import { useGame } from '../context/GameContext';
import { useTheme } from '../themes/useTheme';

const { width, height } = Dimensions.get('window');
const ITEM_WIDTH = width * 0.8;

interface Props {
  navigation: any;
  route?: any;
}

export const CharacterSelectionScreen = ({ navigation, route }: Props) => {
  const isEditing = route?.params?.isEditing;  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  const currentCharacter = CHARACTERS[currentIndex];
  const currentTheme = PALETTES[currentCharacter.id as CharacterTheme];
  const { refreshUser } = useGame();
  const appTheme = useTheme();

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / width);
    if (index !== currentIndex && index >= 0 && index < CHARACTERS.length) {
      setCurrentIndex(index);
    }
  };

  const handleSelect = async () => {
    try {
      // Determinar el jugador actual (si existe)
      const rows: any = await db.getAllAsync('SELECT id_jugador FROM jugadores LIMIT 1');
      const playerId = rows && rows.length > 0 ? rows[0].id_jugador : null;

      if (playerId) {
        await db.runAsync(`UPDATE jugadores SET character_theme = ? WHERE id_jugador = ?`, [currentCharacter.id, playerId]);
      } else {
        // Si no existe jugador, creamos uno rápido (modo dev)
        const fecha = new Date().toISOString();
        await db.runAsync(`INSERT INTO jugadores (nombre_jugador, nivel_jugador, vida, yenes, character_theme, created_at) VALUES (?, ?, ?, ?, ?, ?)`, ['Invitado', 1, 10, 5000, currentCharacter.id, fecha]);
      }

      await refreshUser();
      if (isEditing) {
        // Volver a Settings si venimos en modo edición
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error guardando personaje', error);
    }
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.8, 1, 0.8],
      extrapolate: 'clamp'
    });

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.5, 1, 0.5],
      extrapolate: 'clamp'
    });

    const theme = PALETTES[item.id as CharacterTheme];

    return (
      <View style={{ width, justifyContent: 'center', alignItems: 'center' }}>
        <Animated.View
          style={[
            styles.cardContainer,
            {
              transform: [{ scale }],
              opacity,
              borderColor: theme.primary,
              shadowColor: theme.shadow
            }
          ]}
        >
          <Image source={item.image} style={styles.characterImage} resizeMode="contain" />

          <View style={[styles.infoContainer, { backgroundColor: theme.surface }]}>
            <Text style={[styles.characterName, { color: theme.primary, fontFamily: appTheme.fonts?.title, textTransform: 'uppercase' }]}>{item.name.toUpperCase()}</Text>
            <View style={[styles.separator, { backgroundColor: theme.border }]} />
            <Text style={[styles.quote, { color: theme.text, fontFamily: appTheme.fonts?.body, fontStyle: 'italic' }]}>{`"${item.quote}"`}</Text>
            <Text style={[styles.description, { color: theme.textDim, fontFamily: appTheme.fonts?.body }]}>{item.description}</Text>
          </View>
        </Animated.View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={currentTheme.background} />

      <View style={styles.header}>
        <Text style={[styles.headerText, { color: currentTheme.textDim, fontFamily: appTheme.fonts?.title, textTransform: 'uppercase', letterSpacing: 1 }]}>CHOOSE YOUR</Text>
        <Text style={[styles.headerTitle, { color: currentTheme.text, transform: [{ skewX: '-15deg' }], fontFamily: appTheme.fonts?.title, textTransform: 'uppercase', fontStyle: 'italic', letterSpacing: 1.5 }]}>DESTINY</Text>
      </View>

      <Animated.FlatList
        data={CHARACTERS}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true, listener: handleScroll })}
        scrollEventThrottle={16}
        contentContainerStyle={{ alignItems: 'center' }}
      />

      <TouchableOpacity activeOpacity={0.8} onPress={handleSelect} style={[styles.button, { backgroundColor: currentTheme.primary }]}>
        <Text style={[styles.buttonText, { color: currentTheme.textInverse, fontFamily: appTheme.fonts?.bold, textTransform: 'uppercase' }]}>I AM THOU</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { position: 'absolute', top: 60, alignItems: 'center', zIndex: 10 },
  headerText: { fontSize: 16, letterSpacing: 4 },
  headerTitle: { fontSize: 42, fontWeight: '900', fontStyle: 'italic', letterSpacing: 2 },
  cardContainer: {
    width: ITEM_WIDTH,
    height: height * 0.6,
    borderRadius: 20,
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.3)',
    elevation: 10,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 10
  },
  characterImage: { width: '100%', height: '75%' },
  infoContainer: { height: '25%', padding: 15, justifyContent: 'center', alignItems: 'center' },
  characterName: { fontSize: 22, letterSpacing: 1 },
  separator: { width: 40, height: 2, marginVertical: 8 },
  quote: { fontSize: 16, fontStyle: 'italic', textAlign: 'center', marginBottom: 5, fontWeight: '600' },
  description: { fontSize: 12, textAlign: 'center' },
  button: { position: 'absolute', bottom: 50, paddingVertical: 15, paddingHorizontal: 60, borderRadius: 30, elevation: 5, transform: [{ skewX: '-10deg' }] },
  buttonText: { fontSize: 18, letterSpacing: 2 }
});
