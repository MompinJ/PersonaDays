import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { createPlayer } from '../../services/playerService';
import { CharacterTheme } from '../../types';
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

  useEffect(() => {
    if (isEditing && player) {
      setNombre(player.nombre_jugador || '');
    }
  }, [isEditing, player]);

  const handleFirmarContrato = async () => {
    if (nombre.trim().length === 0) {
      showAlert("Error", "El contrato requiere un nombre.");
      return;
    }

    if (isEditing && player && player.id_jugador) {
      try {
        await db.runAsync('UPDATE jugadores SET nombre_jugador = ? WHERE id_jugador = ?', [nombre, player.id_jugador]);
        try { await refreshUser(); } catch(e){/* ignore */}
        navigation.goBack();
      } catch (e) {
        console.error('Error actualizando jugador:', e);
        showAlert("Error", "No se pudo guardar el contrato.");
      }
      return;
    }

    // Nuevo jugador (flujo existente)
    const exito = await createPlayer(nombre);

    if (exito) {
      // Navegar al selector de personaje inmediatamente
      navigation.navigate('CharacterSelection');
    } else {
      showAlert("Error", "No se pudo guardar el contrato.");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={[styles.card, { backgroundColor: colors.surface }]}> 
        <Text style={styles.title}>Contract</Text>
        <Text style={[styles.subtitle, { color: colors.textDim }] }>
          I chooseth this fate of mine own free will.
        </Text>

        <Text style={styles.label}>Escribe tu nombre:</Text>
        <TextInput
          style={styles.input}
          placeholder="Nombre del Protagonista"
          placeholderTextColor={colors.textDim}
          value={nombre}
          onChangeText={setNombre}
        />

        <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleFirmarContrato}>
          <Text style={[styles.buttonText, { color: colors.textInverse }]}>Firmar Contrato</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A1628',
        justifyContent: 'center',
        padding: 20
    },
    card: {
        backgroundColor: '#fff',
        padding: 30,
        borderRadius: 5,
        elevation: 5
    },
    title: {
        fontSize: 30,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
        fontFamily: 'serif'
    },
    subtitle: {
        fontSize: 14,
        fontStyle: 'italic',
        textAlign: 'center',
        marginBottom: 30,
        color: '#666'
    },
    label: {
        fontSize: 16,
        marginBottom: 8,
        fontWeight: 'bold'
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 12,
        borderRadius: 5,
        fontSize: 16,
        marginBottom: 20
    },
    button: {
        backgroundColor: '#0A1628',
        padding: 15,
        borderRadius: 5,
        alignItems: 'center'
    },
    buttonText: {
        color: '#00D4FF',
        fontWeight: 'bold',
        fontSize: 18,
        textTransform: 'uppercase'
    }
});
