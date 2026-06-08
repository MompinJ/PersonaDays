import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  SafeAreaView,
  Keyboard
} from 'react-native';
import Markdown, { ASTNode } from 'react-native-markdown-display';
import { useTheme } from '../../themes/useTheme';
import { db } from '../../database';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { PhoneHeader } from '../../components/Phone/PhoneHeader';

type Props = NativeStackScreenProps<RootStackParamList, 'ListDetailScreen'>;

interface Selection {
  start: number;
  end: number;
}

// Helper recursivo para extraer texto limpio
const getTextFromNode = (node: ASTNode): string => {
  if (node.type === 'text') return node.content || '';
  if (node.children) {
    return node.children.map(child => getTextFromNode(child)).join('');
  }
  return '';
};

export const ListDetailScreen = ({ route, navigation }: Props) => {
  const { listId, title: paramTitle } = route.params || { listId: null, title: '' };
  const theme = useTheme();

  const [headerTitle, setHeaderTitle] = useState(paramTitle || 'Cargando...');
  const [content, setContent] = useState('');
  const [isEditing, setIsEditing] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [selection, setSelection] = useState<Selection>({ start: 0, end: 0 });
  const inputRef = useRef<TextInput>(null);

  // 1. Carga de Datos
  useEffect(() => {
    const loadData = async () => {
      if (!listId) return;
      try {
        const rows: any[] = await db.getAllAsync('SELECT title, content FROM custom_lists WHERE id_list = ?', [listId]);
        if (rows && rows[0]) {
          const loadedContent = rows[0].content || '';
          const loadedTitle = rows[0].title || 'Sin Título';

          setContent(loadedContent);
          setHeaderTitle(loadedTitle);

          if (!loadedContent.trim()) {
            setIsEditing(true);
            setTimeout(() => inputRef.current?.focus(), 500);
          } else {
            setIsEditing(false);
          }
        }
      } catch (e) { console.error(e); }
    };
    loadData();
  }, [listId]);

  // 2. Auto-guardado
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', async () => {
      if (hasChanges) await saveToDB(content);
    });
    return unsubscribe;
  }, [navigation, hasChanges, content]);

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

  const handleTextChange = (text: string) => {
    setContent(text);
    setHasChanges(true);
  };

  // 3. Toggle Checkbox (Lógica robusta por coincidencia de línea)
  const toggleCheckboxByText = (taskText: string, currentStatus: boolean) => {
    const lines = content.split('\n');
    let found = false;

    const newLines = lines.map(line => {
      // Busca la primera línea que contenga el texto Y un checkbox
      if (!found && line.includes(taskText) && /^\s*-\s\[([ xX])\]/.test(line)) {
        found = true;
        if (line.includes('[x]') || line.includes('[X]')) {
          return line.replace(/\[[xX]\]/, '[ ]');
        } else {
          return line.replace(/\[ \]/, '[x]');
        }
      }
      return line;
    });

    const newContent = newLines.join('\n');
    setContent(newContent);
    setHasChanges(true);
    saveToDB(newContent);
  };

  // 4. Reglas Markdown (Ajuste visual de precisión)
  const markdownRules = useMemo(() => ({
    // OJO: el 4º parametro (estilos internos de la libreria) NO debe llamarse
    // `styles`, porque opacaria el StyleSheet del componente (taskRow, taskText, etc.)
    // y la fila perderia su flexDirection:'row' (checkbox arriba, texto abajo).
    list_item: (node: ASTNode, children: any, parent: any, _mdStyles: any) => {
      const rawText = getTextFromNode(node);
      const match = rawText.trim().match(/^\[([ xX])\]\s?(.*)/);

      if (match) {
        // --- CASO CHECKBOX ---
        const isChecked = match[1].toLowerCase() === 'x';
        const taskText = match[2];

        return (
          <View key={node.key} style={styles.taskRow}>
            <TouchableOpacity
              onPress={() => toggleCheckboxByText(taskText, isChecked)}
              style={styles.checkboxTouch}
              activeOpacity={0.6}
            >
              <MaterialCommunityIcons
                name={isChecked ? "checkbox-marked" : "checkbox-blank-outline"}
                size={22}
                color={theme.primary}
              />
            </TouchableOpacity>
            <Text style={[
              styles.taskText,
              { color: theme.text },
              isChecked && { textDecorationLine: 'line-through', opacity: 0.5, color: theme.textDim }
            ]}>
              {taskText}
            </Text>
          </View>
        );
      }

      // --- CASO BULLET NORMAL ---
      return (
        <View key={node.key} style={styles.bulletRow}>
          <Text style={[styles.bulletIcon, { color: theme.primary }]}>•</Text>
          <View style={{ flex: 1, justifyContent: 'center' }}>{children}</View>
        </View>
      );
    },
    // Eliminamos el comportamiento de bloque del párrafo dentro de listas
    paragraph: (node: ASTNode, children: any, parent: any, _mdStyles: any) => {
      return (
        <Text key={node.key} style={styles.textNoMargin}>
          {children}
        </Text>
      );
    },
  }), [content, theme]);

  // 5. Herramientas
  const insertText = (textToInsert: string) => {
    const newContent =
      content.substring(0, selection.start) +
      textToInsert +
      content.substring(selection.end);
    setContent(newContent);
    setHasChanges(true);
    setTimeout(() => {
      const newPos = selection.start + textToInsert.length;
      inputRef.current?.focus();
    }, 50);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <PhoneHeader title={headerTitle} showBackButton={true} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={{ flex: 1 }}>

          {/* MODO LECTURA */}
          {!isEditing && (
            <View style={{ flex: 1 }}>
              <ScrollView contentContainerStyle={styles.scrollContent}>
                <Markdown
                  style={getMarkdownStyles(theme)}
                  rules={markdownRules}
                >
                  {content || '_Lista vacía..._'}
                </Markdown>
              </ScrollView>

              <TouchableOpacity
                style={[styles.fab, { backgroundColor: theme.primary }]}
                onPress={() => setIsEditing(true)}
              >
                <MaterialCommunityIcons name="pencil" size={28} color="#000" />
              </TouchableOpacity>
            </View>
          )}

          {/* MODO EDICIÓN */}
          {isEditing && (
            <View style={{ flex: 1 }}>
              <TextInput
                ref={inputRef}
                style={[styles.input, { color: theme.text }]}
                value={content}
                onChangeText={handleTextChange}
                onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
                multiline
                textAlignVertical="top"
                placeholder="Escribe aquí..."
                placeholderTextColor={theme.textDim}
              />

              {/* TOOLBAR */}
              <View style={[styles.toolbar, { backgroundColor: theme.card || theme.surface, borderTopColor: theme.border }]}>
                <TouchableOpacity style={styles.toolBtn} onPress={() => insertText('# ')}>
                  <Text style={[styles.toolText, { color: theme.primary }]}>H1</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.toolBtn} onPress={() => insertText('## ')}>
                  <Text style={[styles.toolText, { color: theme.primary }]}>H2</Text>
                </TouchableOpacity>
                <View style={styles.divider} />
                <TouchableOpacity style={styles.toolBtn} onPress={() => insertText('- [ ] ')}>
                  <MaterialCommunityIcons name="checkbox-marked-outline" size={24} color={theme.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.toolBtn} onPress={() => insertText('- ')}>
                  <MaterialCommunityIcons name="format-list-bulleted" size={24} color={theme.primary} />
                </TouchableOpacity>

                <View style={{ flex: 1 }} />

                <TouchableOpacity
                  style={[styles.doneBtn, { backgroundColor: theme.primary }]}
                  onPress={() => {
                    Keyboard.dismiss();
                    setIsEditing(false);
                    saveToDB(content);
                  }}
                >
                  <Text style={{ fontWeight: 'bold' }}>LISTO</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ESTILOS DE RESETEO TOTAL
const getMarkdownStyles = (theme: any) => StyleSheet.create({
  body: {
    color: theme.text,
    fontSize: 16,
    lineHeight: 24,
    margin: 0,
    padding: 0
  },
  heading1: {
    color: theme.primary,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 20,
    marginBottom: 10,
    textTransform: 'uppercase'
  },
  heading2: {
    color: theme.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: theme.border
  },
  // 🔥 CERO MÁRGENES PARA LISTAS
  bullet_list: { marginVertical: 0, paddingVertical: 0 },
  ordered_list: { marginVertical: 0, paddingVertical: 0 },
  list_item: { marginVertical: 0, margin: 0, padding: 0, flexDirection: 'row' as const },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  input: { flex: 1, padding: 20, fontSize: 16, textAlignVertical: 'top' },

  // Custom Render Styles
  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Alineación superior para textos largos
    marginTop: 4,
    marginBottom: 4,
    minHeight: 24,
  },
  checkboxTouch: {
    marginRight: 10,
    marginTop: 1, // Ajuste fino para alinear icono con la primera línea de texto
    height: 24,
    justifyContent: 'center'
  },
  taskText: {
    fontSize: 16,
    lineHeight: 24,
    flex: 1,
    includeFontPadding: false, // 🔥 Clave en Android para evitar saltos extra
    textAlignVertical: 'center'
  },

  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4
  },
  bulletIcon: {
    marginRight: 10,
    fontSize: 20,
    lineHeight: 24,
    color: '#00D4FF', // Cyan hardcoded o theme.primary si está disponible aquí
    marginTop: -2
  },
  textNoMargin: {
    fontSize: 16,
    lineHeight: 24,
    margin: 0,
    padding: 0,
    includeFontPadding: false
  },

  // Toolbar
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    height: 60,
    borderTopWidth: 1,
  },
  toolBtn: { padding: 8, marginHorizontal: 2 },
  toolText: { fontWeight: '900', fontSize: 16 },
  divider: { width: 1, height: 24, backgroundColor: '#555', marginHorizontal: 8 },
  doneBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginLeft: 'auto' },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    zIndex: 10,
  }
});

export default ListDetailScreen;
