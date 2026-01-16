import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { createPlayer } from '../../services/playerService';
import { CharacterTheme } from '../../types';
import { useTheme } from '../../themes/useTheme';

interface Props {
  onFinishSetup?: () => void;
}

export const SetupScreen = ({ onFinishSetup }: Props) => {
  const [nombre, setNombre] = useState('');
  const navigation: any = require('@react-navigation/native').useNavigation();
  const colors = useTheme();

  const handleFirmarContrato = async () => {
    if (nombre.trim().length === 0) {
      Alert.alert("Error", "El contrato requiere un nombre.");
      return;
    }
      // TODO Sustituir por selector de temas
      const exito = await createPlayer(nombre);

    if (exito) {
      // Navegar al selector de personaje inmediatamente
      navigation.navigate('CharacterSelection');
    } else {
      Alert.alert("Error", "No se pudo guardar el contrato.");
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
