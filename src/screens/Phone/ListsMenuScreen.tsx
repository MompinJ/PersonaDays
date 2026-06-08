import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, TextInput } from 'react-native';
import { useTheme } from '../../themes/useTheme';
import { db } from '../../database';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { CustomList } from '../../types';
import { PhoneHeader } from '../../components/Phone/PhoneHeader';
import { PersonaModal } from '../../components/UI/PersonaModal';
import { PressableScale } from '../../components/UI/PressableScale';

const CreateNoteModal = ({ visible, onClose, onCreate }: any) => {
  const theme = useTheme();
  const [title, setTitle] = useState('');

  const create = async () => {
    if (!title.trim()) return;
    const now = new Date().toISOString();
    try {
      const result = await db.runAsync(
        `INSERT INTO custom_lists (title, content, updated_at) VALUES (?, ?, ?);`, 
        [title.trim(), '', now]
      );
      onCreate && onCreate(result.lastInsertRowId);
      setTitle('');
      onClose();
    } catch (e) { 
      console.error('Error creating note', e); 
    }
  };

  return (
    <PersonaModal visible={visible} onClose={onClose} title="Nueva Nota">
      <TextInput
        placeholder="TÍTULO DE LA NOTA"
        placeholderTextColor={theme.textDim}
        value={title}
        onChangeText={setTitle}
        style={[styles.input, { color: theme.text, borderBottomColor: theme.primary }]}
        autoFocus
        onSubmitEditing={create}
        returnKeyType="done"
      />
      <View style={styles.modalButtons}>
        <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
          <Text style={{ color: theme.textDim, fontFamily: theme.fonts?.bold, letterSpacing: 1 }}>CANCELAR</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={create} activeOpacity={0.9} style={[styles.createButton, { backgroundColor: title.trim() ? theme.primary : theme.inactive }]} disabled={!title.trim()}>
          <Text style={[styles.createBtnText, { color: title.trim() ? theme.textInverse : theme.textDim, fontFamily: theme.fonts?.heading }]}>CREAR</Text>
        </TouchableOpacity>
      </View>
    </PersonaModal>
  );
};

export const ListsMenuScreen = () => {
  const theme = useTheme();
  const [notes, setNotes] = useState<CustomList[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const navigation: any = useNavigation();

  const load = async () => {
    try {
      const rows: any[] = await db.getAllAsync('SELECT * FROM custom_lists ORDER BY updated_at DESC');
      setNotes(rows || []);
    } catch (e) { 
      console.error('Error loading notes', e); 
    }
  };

  useEffect(() => { 
    load(); 
    
    // Recargar cuando volvemos a la pantalla
    const unsubscribe = navigation.addListener('focus', () => {
      load();
    });
    
    return unsubscribe;
  }, [navigation]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora mismo';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  };

  const getPreview = (content: string) => {
    if (!content || content.trim() === '') return 'Nota vacía';
    // Limpiar markdown básico y tomar primeras líneas
    const cleaned = content
      .replace(/^#+\s/gm, '') // Headers
      .replace(/\*\*/g, '') // Bold
      .replace(/\*/g, '') // Italic
      .trim();
    const firstLine = cleaned.split('\n')[0];
    return firstLine.length > 60 ? firstLine.substring(0, 60) + '...' : firstLine;
  };

  const handleCreate = (noteId: number) => {
    setShowCreate(false);
    // Navegar inmediatamente a la nueva nota
    navigation.navigate('ListDetailScreen', { 
      listId: noteId, 
      title: notes.find(n => n.id_list === noteId)?.title || 'Nota' 
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}> 
      <PhoneHeader title="Notas" showBackButton={true} />
      
      <FlatList 
        data={notes} 
        keyExtractor={(i) => String(i.id_list)} 
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => navigation.navigate('ListDetailScreen', { listId: item.id_list, title: item.title })}
          >
            <View style={[styles.cardAccent, { backgroundColor: theme.primary }]} />
            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: theme.text, fontFamily: theme.fonts?.bold }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={[styles.cardDate, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>
                  {formatDate(item.updated_at)}
                </Text>
              </View>
              <Text style={[styles.cardPreview, { color: theme.textDim }]} numberOfLines={2}>
                {getPreview(item.content)}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={theme.primary} />
          </TouchableOpacity>
        )} 
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons 
              name="note-text-outline" 
              size={64} 
              color={theme.textDim} 
            />
            <Text style={[styles.emptyText, { color: theme.textDim }]}>
              No hay notas aún
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.textDim }]}>
              Presiona + para escribir tu primera nota
            </Text>
          </View>
        } 
      />

      <PressableScale containerStyle={styles.fabPos} style={[styles.fab, { backgroundColor: theme.primary, shadowColor: theme.primary }]} onPress={() => setShowCreate(true)}>
        <MaterialCommunityIcons name="plus" size={28} color={theme.textInverse} />
      </PressableScale>

      <CreateNoteModal 
        visible={showCreate} 
        onClose={() => setShowCreate(false)} 
        onCreate={handleCreate} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  listContent: { 
    padding: 16,
    paddingBottom: 100 
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingLeft: 22,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 7, transform: [{ skewX: '-12deg' }], marginLeft: -2 },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  cardDate: {
    fontSize: 11,
    marginLeft: 8,
  },
  cardPreview: {
    fontSize: 13,
    lineHeight: 18,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
  },
  fabPos: { position: 'absolute', right: 20, bottom: 30 },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  input: {
    borderBottomWidth: 2,
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 22,
    fontSize: 16,
    letterSpacing: 0.5,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  createButton: {
    paddingVertical: 12,
    paddingHorizontal: 26,
    transform: [{ skewX: '-12deg' }],
  },
  createBtnText: { fontSize: 15, letterSpacing: 1, textTransform: 'uppercase', transform: [{ skewX: '12deg' }] },
});

export default ListsMenuScreen;
