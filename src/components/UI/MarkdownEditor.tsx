import React, { useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Keyboard,
} from 'react-native';
import Markdown, { ASTNode } from 'react-native-markdown-display';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../themes/useTheme';

// Editor Markdown compartido (Notas y Diario). Antes vivia dentro de
// ListDetailScreen; se extrajo para no tener dos copias del mismo renderer
// divergiendo (los checkboxes, las vinetas y la numeracion son delicados).

interface Selection { start: number; end: number; }

// Texto plano de un nodo, recursivo: lo necesita el checkbox para localizar su
// linea dentro del contenido crudo.
const getTextFromNode = (node: ASTNode): string => {
  if (node.type === 'text') return node.content || '';
  if (node.children) return node.children.map(getTextFromNode).join('');
  return '';
};

interface Props {
  value: string;
  onChange: (text: string) => void;
  /** Guardado inmediato: los checkboxes se alternan en modo lectura, sin pasar por LISTO. */
  onCommit?: (text: string) => void;
  editing: boolean;
  onEditingChange: (v: boolean) => void;
  placeholder?: string;
  /** Texto en modo lectura cuando no hay contenido. */
  emptyText?: string;
  /** Bloque fijo sobre el contenido en modo lectura (ej: el contexto del dia). */
  readHeader?: React.ReactNode;
}

export const MarkdownEditor = ({
  value, onChange, onCommit, editing, onEditingChange,
  placeholder = 'Escribe aquí...', emptyText = '_Vacío..._', readHeader,
}: Props) => {
  const theme = useTheme();
  // La barra de gestos de Android se come el pie de la pantalla: sin este
  // respiro, LISTO queda debajo de ella y pulsarlo manda al escritorio.
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [selection, setSelection] = useState<Selection>({ start: 0, end: 0 });

  // Alterna un checkbox buscando su linea por el texto de la tarea.
  const toggleCheckbox = (taskText: string) => {
    let found = false;
    const next = value.split('\n').map((line) => {
      if (!found && line.includes(taskText) && /^\s*-\s\[([ xX])\]/.test(line)) {
        found = true;
        return /\[[xX]\]/.test(line) ? line.replace(/\[[xX]\]/, '[ ]') : line.replace(/\[ \]/, '[x]');
      }
      return line;
    }).join('\n');
    onChange(next);
    onCommit?.(next);
  };

  const rules = useMemo(() => ({
    // OJO: el 4o parametro (estilos internos de la libreria) NO debe llamarse
    // `styles`, porque opacaria el StyleSheet de este archivo y las filas
    // perderian su flexDirection:'row'.
    list_item: (node: ASTNode, children: any, parent: any, _mdStyles: any) => {
      const raw = getTextFromNode(node);
      const match = raw.trim().match(/^\[([ xX])\]\s?(.*)/);

      if (match) {
        const isChecked = match[1].toLowerCase() === 'x';
        const taskText = match[2];
        return (
          <View key={node.key} style={styles.taskRow}>
            <TouchableOpacity onPress={() => toggleCheckbox(taskText)} style={styles.checkboxTouch} activeOpacity={0.6}>
              <MaterialCommunityIcons
                name={isChecked ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={22}
                color={theme.primary}
              />
            </TouchableOpacity>
            <Text style={[
              styles.taskText,
              { color: theme.text },
              isChecked && { textDecorationLine: 'line-through', opacity: 0.5, color: theme.textDim },
            ]}>
              {taskText}
            </Text>
          </View>
        );
      }

      // Lista numerada: `parent` es la cadena de ancestros. node.index es
      // 0-based y `start` respeta una lista que empiece en otro numero.
      const ordered = Array.isArray(parent) && parent.some((p: any) => p?.type === 'ordered_list');
      if (ordered) {
        const lista: any = parent.find((p: any) => p?.type === 'ordered_list');
        const inicio = lista?.attributes?.start;
        const numero = inicio ? inicio + node.index : node.index + 1;
        return (
          <View key={node.key} style={styles.bulletRow}>
            <Text style={[styles.orderedIcon, { color: theme.primary }]}>{numero}.</Text>
            <View style={{ flex: 1, justifyContent: 'center' }}>{children}</View>
          </View>
        );
      }

      return (
        <View key={node.key} style={styles.bulletRow}>
          <Text style={[styles.bulletIcon, { color: theme.primary }]}>•</Text>
          <View style={{ flex: 1, justifyContent: 'center' }}>{children}</View>
        </View>
      );
    },
    // Sin comportamiento de bloque dentro de las listas.
    paragraph: (node: ASTNode, children: any) => (
      <Text key={node.key} style={styles.textNoMargin}>{children}</Text>
    ),
  }), [value, theme]);

  const insert = (text: string) => {
    onChange(value.substring(0, selection.start) + text + value.substring(selection.end));
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // La lista numerada continua la numeracion anterior en vez de reiniciar en 1.
  const insertNumbered = () => {
    const antes = value.substring(0, selection.start);
    const lineaActual = antes.slice(antes.lastIndexOf('\n') + 1);
    const salto = lineaActual.trim().length > 0 ? '\n' : '';
    const previas = antes.split('\n');
    let numero = 1;
    for (let i = previas.length - 1; i >= 0; i--) {
      const m = previas[i].match(/^\s*(\d+)[.)]\s/);
      if (m) { numero = parseInt(m[1], 10) + 1; break; }
      if (previas[i].trim() !== '') break;  // se corto la lista
    }
    insert(`${salto}${numero}. `);
  };

  if (!editing) {
    return (
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.readContent}>
          {readHeader}
          <Markdown style={markdownStyles(theme)} rules={rules}>
            {value || emptyText}
          </Markdown>
        </ScrollView>
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.primary, bottom: 30 + insets.bottom }]}
          onPress={() => onEditingChange(true)}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="pencil" size={26} color={theme.textInverse} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <TextInput
        ref={inputRef}
        style={[styles.input, { color: theme.text }]}
        value={value}
        onChangeText={onChange}
        onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
        multiline
        textAlignVertical="top"
        placeholder={placeholder}
        placeholderTextColor={theme.textDim}
      />

      <View style={[styles.toolbar, { backgroundColor: theme.surface, borderTopColor: theme.border, height: 60 + insets.bottom, paddingBottom: 10 + insets.bottom }]}>
        <TouchableOpacity style={styles.toolBtn} onPress={() => insert('# ')}>
          <Text style={[styles.toolText, { color: theme.primary }]}>H1</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolBtn} onPress={() => insert('## ')}>
          <Text style={[styles.toolText, { color: theme.primary }]}>H2</Text>
        </TouchableOpacity>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <TouchableOpacity style={styles.toolBtn} onPress={() => insert('- [ ] ')}>
          <MaterialCommunityIcons name="checkbox-marked-outline" size={23} color={theme.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolBtn} onPress={() => insert('- ')}>
          <MaterialCommunityIcons name="format-list-bulleted" size={23} color={theme.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolBtn} onPress={insertNumbered}>
          <MaterialCommunityIcons name="format-list-numbered" size={23} color={theme.primary} />
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        <TouchableOpacity
          style={[styles.doneBtn, { backgroundColor: theme.primary }]}
          onPress={() => { Keyboard.dismiss(); onEditingChange(false); onCommit?.(value); }}
        >
          <Text style={{ fontWeight: 'bold', color: theme.textInverse }}>LISTO</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const markdownStyles = (theme: any) => StyleSheet.create({
  body: { color: theme.text, fontSize: 16, lineHeight: 24, margin: 0, padding: 0 },
  heading1: { color: theme.primary, fontSize: 24, fontWeight: '900', marginTop: 20, marginBottom: 10, textTransform: 'uppercase' },
  heading2: { color: theme.text, fontSize: 20, fontWeight: 'bold', marginTop: 15, marginBottom: 5, borderBottomWidth: 1, borderBottomColor: theme.border },
  // Cero margenes para listas: la fila la dibuja la regla custom.
  bullet_list: { marginVertical: 0, paddingVertical: 0 },
  ordered_list: { marginVertical: 0, paddingVertical: 0 },
  list_item: { marginVertical: 0, margin: 0, padding: 0, flexDirection: 'row' as const },
});

const styles = StyleSheet.create({
  readContent: { padding: 20, paddingBottom: 110 },
  input: { flex: 1, padding: 20, fontSize: 16, textAlignVertical: 'top' },

  taskRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 4, marginBottom: 4, minHeight: 24 },
  checkboxTouch: { marginRight: 10, marginTop: 1, height: 24, justifyContent: 'center' },
  taskText: { fontSize: 16, lineHeight: 24, flex: 1, includeFontPadding: false, textAlignVertical: 'center' },

  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  bulletIcon: { marginRight: 10, fontSize: 20, lineHeight: 24, marginTop: -2 },
  // minWidth fijo: sin el, "10." empuja su texto mas a la derecha que "1.".
  orderedIcon: { marginRight: 8, minWidth: 22, fontSize: 16, lineHeight: 24, fontWeight: '900', textAlign: 'right' },
  textNoMargin: { fontSize: 16, lineHeight: 24, margin: 0, padding: 0, includeFontPadding: false },

  toolbar: { flexDirection: 'row', alignItems: 'center', padding: 10, height: 60, borderTopWidth: 1 },
  toolBtn: { padding: 8, marginHorizontal: 2 },
  toolText: { fontWeight: '900', fontSize: 16 },
  divider: { width: 1, height: 24, marginHorizontal: 8 },
  doneBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },

  fab: { position: 'absolute', right: 20, bottom: 30, width: 58, height: 58, borderRadius: 29, justifyContent: 'center', alignItems: 'center', elevation: 5, zIndex: 10 },
});

export default MarkdownEditor;
