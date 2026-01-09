import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Mision } from '../../types';
import { useTheme } from '../../themes/useTheme';

interface Props {
    mision: Mision;
    onToogle: (id: number) => void;
}

export const MissionItem = ({ mision, onToogle }: Props) => {
    const colors = useTheme();
    return (
    <View style={[styles.card, {
        backgroundColor: colors.surface, // Usamos variables
        borderLeftColor: colors.primary
    }]}>

      <TouchableOpacity
        style={styles.checkbox}
        onPress={() => onToogle(mision.id_mision)}
      >
        <Ionicons
          name={mision.completada ? "checkbox" : "square-outline"}
          size={24}
          // Color dinámico según estado
          color={mision.completada ? colors.primary : colors.textDim}
        />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={[
          styles.title,
          { color: colors.text }, // Color de texto dinámico
          mision.completada && { color: colors.textDim, textDecorationLine: 'line-through' }
        ]}>
          {mision.nombre}
        </Text>

        {mision.recompensa_exp > 0 && (
          <Text style={[styles.reward, { color: colors.primary }]}>
            Exp: +{mision.recompensa_exp}
          </Text>
        )}
      </View>
    </View>
  );
};



const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
    borderLeftWidth: 4,
    elevation: 2,
  },
    checkbox: {
        marginRight: 15
    },
    content: {
        flex: 1
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold'
    },
    reward: {
        fontSize: 12,
        marginTop: 4,
        fontWeight: '600'
    }
});
