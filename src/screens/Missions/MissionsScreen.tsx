import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useIsFocused } from '@react-navigation/native'; // Hook para saber cuando entras a la pantalla
import { db } from '../../database'; // Tu conexión DB
import { Mision } from '../../types'; // Tus tipos

export const MissionsScreen = () => {
  // 1. Estado para guardar la lista de misiones que vienen de la BD
  const [misiones, setMisiones] = useState<Mision[]>([]);
  const isFocused = useIsFocused();

  // 2. Función para LEER (SELECT) las misiones
  const cargarMisiones = async () => {
    try {
      const resultados = await db.getAllAsync<Mision>('SELECT * FROM misiones ORDER BY id_mision DESC');
      setMisiones(resultados);
    } catch (error) {
      console.error('Error al cargar misiones:', error);
    }
  };

  // 3. Función para ESCRIBIR (INSERT) una misión de prueba
  const crearMisionPrueba = async () => {
    try {
      const randomId = Math.floor(Math.random() * 1000);
      const nombre = `Misión de Prueba #${randomId}`;

      // Insertamos en la tabla 'misiones'
      await db.runAsync(
        'INSERT INTO misiones (nombre, tipo, fecha_creacion, activa) VALUES (?, ?, ?, ?)',
        [nombre, 'DIARIA', new Date().toISOString(), 1]
      );

      // Recargamos la lista para ver el cambio al instante
      cargarMisiones();
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar en la BD');
      console.error(error);
    }
  };

  // 4. Cada vez que entres a esta pestaña, recarga los datos
  useEffect(() => {
    if (isFocused) {
      cargarMisiones();
    }
  }, [isFocused]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Lista de Misiones</Text>
        <TouchableOpacity style={styles.button} onPress={crearMisionPrueba}>
          <Text style={styles.buttonText}>+ Agregar Test</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={misiones}
        keyExtractor={(item) => item.id_mision.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.nombre}</Text>
            <Text style={styles.cardSubtitle}>Tipo: {item.tipo}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No hay misiones activas.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60, backgroundColor: '#f2f2f2' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold' },
  button: { backgroundColor: '#00D4FF', padding: 10, borderRadius: 8 },
  buttonText: { color: 'white', fontWeight: 'bold' },
  card: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 10, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: 'bold' },
  cardSubtitle: { color: '#666', marginTop: 5 },
  empty: { textAlign: 'center', marginTop: 50, color: '#999' }
});
