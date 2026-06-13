import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../themes/useTheme';
import { useAlert } from '../../context/AlertContext';
import { getArcPhotos, addArcPhoto, deleteArcPhoto, ArcPhotoView } from '../../services/arcPhotoService';

// Galeria de fotos de un arco. Si editable, permite añadir (picker) y borrar
// (boton X en cada foto). En modo solo-lectura (arco completado) solo muestra las fotos.
const ArcGallery = ({ idArco, accent, editable = true }: { idArco: number; accent: string; editable?: boolean }) => {
  const theme = useTheme();
  const { showAlert } = useAlert();
  const [photos, setPhotos] = useState<ArcPhotoView[]>([]);

  const load = useCallback(async () => {
    try {
      setPhotos(await getArcPhotos(idArco));
    } catch (e) {
      console.error('Error cargando fotos del arco:', e);
    }
  }, [idArco]);

  useEffect(() => { load(); }, [load]);

  const onAdd = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showAlert('PERMISO REQUERIDO', 'Necesito acceso a tus fotos para añadirlas al arco.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      await addArcPhoto(idArco, result.assets[0].uri);
      load();
    } catch (e) {
      console.error('Error añadiendo foto:', e);
      showAlert('ERROR', 'No se pudo añadir la foto.');
    }
  };

  const onDelete = (foto: ArcPhotoView) => {
    showAlert('BORRAR FOTO', '¿Eliminar esta foto del arco?', [
      { text: 'CANCELAR', style: 'cancel' },
      { text: 'BORRAR', style: 'destructive', onPress: async () => {
        try { await deleteArcPhoto(foto); load(); } catch (e) { console.error('Error borrando foto:', e); }
      } },
    ]);
  };

  if (!editable && photos.length === 0) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {editable ? (
        <TouchableOpacity onPress={onAdd} activeOpacity={0.85} style={[styles.addTile, { borderColor: accent }]}>
          <Ionicons name="add" size={28} color={accent} />
          <Text style={[styles.addText, { color: accent, fontFamily: theme.fonts?.condensed }]}>FOTO</Text>
        </TouchableOpacity>
      ) : null}

      {photos.map((p) => (
        <View key={p.id_foto} style={styles.thumbWrap}>
          {p.exists ? (
            <Image source={{ uri: p.uri }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, styles.missing, { borderColor: theme.border }]}>
              <MaterialCommunityIcons name="image-off-outline" size={24} color={theme.textDim} />
            </View>
          )}
          {editable ? (
            <TouchableOpacity
              onPress={() => onDelete(p)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[styles.delBtn, { backgroundColor: theme.error }]}
            >
              <Ionicons name="close" size={16} color={theme.textInverse} />
            </TouchableOpacity>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  row: { gap: 10, paddingVertical: 4, paddingRight: 8 },
  addTile: { width: 96, height: 96, borderWidth: 1.5, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  addText: { fontSize: 11, letterSpacing: 1, marginTop: 4 },
  thumbWrap: { width: 96, height: 96 },
  thumb: { width: 96, height: 96, borderRadius: 4 },
  missing: { borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  delBtn: { position: 'absolute', top: 3, right: 3, width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },
});

export default ArcGallery;
