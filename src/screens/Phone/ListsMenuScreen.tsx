import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, TextInput, Animated, Easing } from 'react-native';
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

// Tarjeta de nota estilo P3R (inclinada, escalonada, titulo grande, fecha grande)
const NoteCard = ({ item, index, formatDate, getPreview, onPress }: any) => {
  const theme = useTheme();
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 340, delay: Math.min(index, 8) * 60, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);

  const accent = index % 2 === 0 ? theme.primary : theme.secondary;
  const sk = -8;
  const stagger = [0, 16, 8, 20, 12][index % 5];
  const rot = [-1.3, 1, -1, 1.3, -0.5][index % 5];
  const animStyle = {
    opacity: anim,
    transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [-26, 0] }) }],
  };

  return (
    <Animated.View style={[animStyle, { marginLeft: stagger, marginRight: 22 - stagger, marginBottom: 16 }]}>
      <TouchableOpacity
        activeOpacity={0.9}
        style={[styles.card, { backgroundColor: theme.surface, borderColor: accent, transform: [{ rotate: `${rot}deg` }, { skewX: `${sk}deg` }] }]}
        onPress={onPress}
      >
        <View style={[styles.cardAccent, { backgroundColor: accent }]} />
        <View style={[styles.cardInner, { transform: [{ skewX: `${-sk}deg` }] }]}>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: theme.text, fontFamily: theme.fonts?.heading }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.cardPreview, { color: theme.textDim, fontFamily: theme.fonts?.body }]} numberOfLines={1}>
              {getPreview(item.content)}
            </Text>
          </View>
          <View style={styles.cardRight}>
            <Text style={[styles.cardDate, { color: accent, fontFamily: theme.fonts?.heading }]}>
              {formatDate(item.updated_at)}
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color={accent} />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
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
      <PhoneHeader title="Notas" showBackButton={true} shard />

      <FlatList
        data={notes}
        keyExtractor={(i) => String(i.id_list)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => (
          <NoteCard
            item={item}
            index={index}
            formatDate={formatDate}
            getPreview={getPreview}
            onPress={() => navigation.navigate('ListDetailScreen', { listId: item.id_list, title: item.title })}
          />
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
    paddingVertical: 16,
    paddingHorizontal: 16,
    paddingLeft: 24,
    borderWidth: 1.5,
  },
  cardAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 9, transform: [{ skewX: '-14deg' }], marginLeft: -3 },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 22,
    letterSpacing: 0.5,
  },
  cardPreview: {
    fontSize: 13,
    marginTop: 3,
  },
  cardRight: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  cardDate: {
    fontSize: 15,
    letterSpacing: 0.5,
    marginBottom: 2,
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
