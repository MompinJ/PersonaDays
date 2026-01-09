import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useIsFocused } from '@react-navigation/native'; // Hook para saber cuando entras a la pantalla
import { db } from '../../database'; // Tu conexión DB
import { Mision, MissionType } from '../../types'; // Tus tipos
import { MissionItem } from '../../components/Missions/MissionItem';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';

export const MissionsScreen = () => {
  // 1. Estado para guardar la lista de misiones que vienen de la BD
  const [misiones, setMisiones] = useState<Mision[]>([]);
  const [filtroActual, setFiltroActual] = useState<MissionType>(MissionType.DIARIA);
  const isFocused = useIsFocused();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

 // Mostrar misiones
  const cargarMisiones = async () => {
    try {
      const query = 'SELECT * FROM misiones WHERE tipo = ? ORDER BY completada ASC, id_mision DESC';
      const resultados = await db.getAllAsync<Mision>(query, [filtroActual]);
      setMisiones(resultados);
    } catch (error) {
      console.error('Error al cargar misiones:', error);
    }
  };

  // Marcar como completada una mision
  const toogleMission = async (id: number) => {
    try {
      const mision = misiones.find(m => m.id_mision === id);
      if (!mision) return;

      const nuevoEstado = mision.completada ? 0 : 1;
      await db.runAsync(
        'UPDATE misiones SET completada = ? WHERE id_mision = ?',
        [nuevoEstado, id]
      );
      cargarMisiones();

      // TODO: Aquí en el futuro llamaremos a "Sumar Experiencia"
    } catch (error) {
      console.error('Error actualizando misión:', error);
    }
  };



  // todo temporal
const irACrearMision = () => {
    navigation.navigate('CreateMission');
  };

  // 4. Cada vez que entres a esta pestaña, recarga los datos
  useEffect(() => {
    if (isFocused) {
      cargarMisiones();
    }
  }, [isFocused, filtroActual]);


  const renderFiltro = (tipo: MissionType) => (
    <TouchableOpacity
      style={[styles.filterChip, filtroActual === tipo && styles.filterChipActive]}
      onPress={() => setFiltroActual(tipo)}
    >
      <Text style={[styles.filterText, filtroActual === tipo && styles.filterTextActive]}>
        {tipo}
      </Text>
    </TouchableOpacity>
  );
  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>REQUESTS</Text>

      {/* Zona de Filtros (Scroll Horizontal) */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {renderFiltro(MissionType.DIARIA)}
          {renderFiltro(MissionType.SEMANAL)}
          {renderFiltro(MissionType.ARCO)}
          {renderFiltro(MissionType.EXTRA)}
          {renderFiltro(MissionType.BOSS)}
        </ScrollView>
      </View>

      {/* Lista de Misiones */}
      <FlatList
        data={misiones}
        keyExtractor={(item) => item.id_mision.toString()}
        renderItem={({ item }) => (
          <MissionItem
            mision={item}
            onToogle={toogleMission}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No hay misiones de tipo {filtroActual}.</Text>
        }
        contentContainerStyle={{ paddingBottom: 80 }} // Espacio para que no se corte abajo
      />

      {/* Botón Flotante para añadir (Temporal) */}
      <TouchableOpacity style={styles.fab} onPress={irACrearMision}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A1628', padding: 20, paddingTop: 50 },
  headerTitle: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 15, fontFamily: 'serif' },

  // Estilos de los Filtros
  filterContainer: { marginBottom: 20, height: 40 },
  filterChip: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1A2639',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#2D3B55',
  },
  filterChipActive: {
    backgroundColor: '#00D4FF', // Cyan activo
    borderColor: '#00D4FF',
  },
  filterText: { color: '#8892B0', fontWeight: 'bold', fontSize: 12 },
  filterTextActive: { color: '#0A1628' }, // Texto oscuro sobre fondo cyan

  emptyText: { color: '#8892B0', textAlign: 'center', marginTop: 50, fontStyle: 'italic' },

  // Botón Flotante (FAB)
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#00D4FF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#00D4FF',
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  fabText: { fontSize: 30, color: '#fff', marginTop: -4 }
});
