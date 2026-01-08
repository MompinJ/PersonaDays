import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Jugador } from '../../types'

interface Props {
    jugador: Jugador;
}

export const PlayerHeader = ({ jugador }: Props) => {
    return (
        <View style={styles.container}>
            <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>
                    {jugador.nombre_jugador.charAt(0)}
                </Text>
            </View>
            <View style={styles.infoContainer}>
                <Text style={styles.avatarContainer}>{jugador.nombre_jugador}</Text>
                <Text style={styles.stats}>
                    Nivel {jugador.nivel_jugador} • ❤️ {jugador.vida} • ¥ {jugador.yenes}
                </Text>
            </View>
        </View>
    );
};


const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        padding: 20,
        backgroundColor: '#0A1628',
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: '#00d4ff'
    },
    avatarContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#00D4FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15
    },
    avatarText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ffffff'
    },
    infoContainer: {
        flex: 1
    },
    name: {
        color: '#ffffff',
        fontSize: 20,
        fontWeight: 'bold',
        fontStyle: 'italic'
    },
    stats: {
        color: '#aaaaaa',
        fontSize: 14,
        marginTop: 4
    }
})
