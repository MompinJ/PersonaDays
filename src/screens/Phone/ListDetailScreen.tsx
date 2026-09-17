import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { useTheme } from '../../themes/useTheme';
import { db } from '../../database';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { PhoneHeader } from '../../components/Phone/PhoneHeader';
import { MarkdownEditor } from '../../components/UI/MarkdownEditor';
import { useAlert } from '../../context/AlertContext';

type Props = NativeStackScreenProps<RootStackParamList, 'ListDetailScreen'>;

export const ListDetailScreen = ({ route, navigation }: Props) => {
  const { listId, title: paramTitle } = route.params || { listId: null, title: '' };
  const theme = useTheme();
  const { showAlert } = useAlert();

  const [headerTitle, setHeaderTitle] = useState(paramTitle || 'Cargando...');
  const [content, setContent] = useState('');
  const [isEditing, setIsEditing] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  // Ref (no estado): el listener beforeRemove debe verlo en el mismo tick del
  // goBack tras borrar, para no re-guardar una nota que ya no existe.
  const deletedRef = useRef(false);

  useEffect(() => {
    const loadData = async () => {
      if (!listId) return;
      try {
        const rows: any[] = await db.getAllAsync('SELECT title, content FROM custom_lists WHERE id_list = ?', [listId]);
        if (rows && rows[0]) {
          const loadedContent = rows[0].content || '';
          setContent(loadedContent);
          setHeaderTitle(rows[0].title || 'Sin Título');
          setIsEditing(!loadedContent.trim());
        }
      } catch (e) { console.error(e); }
    };
    loadData();
  }, [listId]);

  const saveToDB = async (text: string) => {
    if (!listId) return;
    try {
      await db.runAsync(
        'UPDATE custom_lists SET content = ?, updated_at = ? WHERE id_list = ?',
        [text, new Date().toISOString(), listId]
      );
      setHasChanges(false);
    } catch (e) { console.error(e); }
  };

  // El guardado es async pero la navegacion no espera promesas: la lista de
  // notas podia recargarse antes del UPDATE y enseñar el preview viejo.
  // Frenamos la salida, guardamos y reemitimos la accion.
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (!hasChanges || deletedRef.current) return;
      e.preventDefault();
      saveToDB(content).finally(() => navigation.dispatch(e.data.action));
    });
    return unsubscribe;
  }, [navigation, hasChanges, content]);

  const handleTextChange = (text: string) => {
    setContent(text);
    setHasChanges(true);
  };

  const handleDelete = () => {
    showAlert('ELIMINAR NOTA', `¿Eliminar "${headerTitle}"? Esta acción no se puede deshacer.`, [
      { text: 'CANCELAR', style: 'cancel' },
      { text: 'ELIMINAR', style: 'destructive', onPress: async () => {
        if (!listId) return;
        try {
          await db.runAsync('DELETE FROM custom_lists WHERE id_list = ?', [listId]);
          deletedRef.current = true;
          navigation.goBack();
        } catch (e) {
          console.error('Error eliminando nota', e);
          showAlert('ERROR', 'No se pudo eliminar la nota.');
        }
      } },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <PhoneHeader
        title={headerTitle}
        showBackButton={true}
        rightAction={
          <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialCommunityIcons name="trash-can-outline" size={24} color={theme.error} />
          </TouchableOpacity>
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <MarkdownEditor
          value={content}
          onChange={handleTextChange}
          onCommit={saveToDB}
          editing={isEditing}
          onEditingChange={setIsEditing}
          emptyText="_Lista vacía..._"
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
});

export default ListDetailScreen;
