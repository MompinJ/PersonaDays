import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, Animated, Easing, Pressable } from 'react-native';
import { createPlayer } from '../../services/playerService';
import { useTheme } from '../../themes/useTheme';
import { useAlert } from '../../context/AlertContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useGame } from '../../context/GameContext';
import { db } from '../../database';

interface Props {
  onFinishSetup?: () => void;
}

export const SetupScreen = ({ onFinishSetup }: Props) => {
  const [nombre, setNombre] = useState('');
  const navigation: any = useNavigation();
  const route: any = useRoute();
  const colors = useTheme();
  const { showAlert } = useAlert();
  const { player, refreshUser } = useGame();
  const isEditing = route?.params?.isEditing;

  // Animacion de entrada (el contrato aparece) + press del boton
  const intro = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(intro, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (isEditing && player) {
      setNombre(player.nombre_jugador || '');
    }
  }, [isEditing, player]);

  const handleFirmarContrato = async () => {
    if (nombre.trim().length === 0) {
      showAlert('Error', 'El contrato requiere un nombre.');
      return;
    }

    if (isEditing && player && player.id_jugador) {
      try {
        await db.runAsync('UPDATE jugadores SET nombre_jugador = ? WHERE id_jugador = ?', [nombre, player.id_jugador]);
        try { await refreshUser(); } catch (e) {/* ignore */}
        navigation.goBack();
      } catch (e) {
        console.error('Error actualizando jugador:', e);
        showAlert('Error', 'No se pudo guardar el contrato.');
      }
      return;
    }

    // Nuevo jugador (flujo existente)
    const exito = await createPlayer(nombre);

    if (exito) {
      navigation.navigate('CharacterSelection');
    } else {
      showAlert('Error', 'No se pudo guardar el contrato.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View
        style={{
          opacity: intro,
          transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
        }}
      >
        {/* Encabezado */}
        <View style={styles.headerRow}>
          <View style={[styles.titleAccent, { backgroundColor: colors.primary }]} />
          <Text style={[styles.title, { color: colors.text, fontFamily: colors.fonts?.title }]}>
            {isEditing ? 'TU NOMBRE' : 'CONTRACT'}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
          <View style={[styles.topAccent, { backgroundColor: colors.primary }]} />

          <Text style={[styles.subtitle, { color: colors.textDim, fontFamily: colors.fonts?.body }]}>
            "I chooseth this fate of mine own free will."
          </Text>

          <Text style={[styles.label, { color: colors.primary, fontFamily: colors.fonts?.condensed }]}>NOMBRE DEL PROTAGONISTA</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderBottomColor: colors.primary, backgroundColor: colors.background }]}
            placeholder="Escribe tu nombre..."
            placeholderTextColor={colors.textDim}
            value={nombre}
            onChangeText={setNombre}
            autoFocus={!isEditing}
          />

          <Pressable
            onPress={handleFirmarContrato}
            onPressIn={() => Animated.spring(btnScale, { toValue: 0.94, useNativeDriver: true }).start()}
            onPressOut={() => Animated.spring(btnScale, { toValue: 1, friction: 4, useNativeDriver: true }).start()}
          >
            <Animated.View style={[styles.button, { backgroundColor: colors.primary, transform: [{ skewX: '-12deg' }, { scale: btnScale }] }]}>
              <Text style={[styles.buttonText, { color: colors.textInverse, fontFamily: colors.fonts?.heading }]}>
                {isEditing ? 'GUARDAR' : 'FIRMAR CONTRATO'}
              </Text>
            </Animated.View>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingLeft: 4 },
  titleAccent: { width: 8, height: 34, marginRight: 12, transform: [{ skewX: '-20deg' }] },
  title: { fontSize: 38, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2 },
  card: {
    padding: 28,
    paddingTop: 32,
    borderRadius: 8,
    borderWidth: 2,
    overflow: 'hidden',
    elevation: 8,
  },
  topAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 6 },
  subtitle: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 28,
  },
  label: {
    fontSize: 11,
    marginBottom: 8,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  input: {
    borderBottomWidth: 2,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 4,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 28,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 6,
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 40,
  },
  buttonText: {
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 1,
    textTransform: 'uppercase',
    transform: [{ skewX: '12deg' }],
  },
});
