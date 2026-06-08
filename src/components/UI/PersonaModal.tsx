import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, StyleSheet, Animated, Easing, KeyboardAvoidingView, Platform, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../../themes/useTheme';

interface Props {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;            // titulo opcional (Anton + acento inclinado)
  width?: number | string;   // ancho del card (default '88%')
  cardStyle?: StyleProp<ViewStyle>;
}

// Shell de modal estilo Persona 3 Reload: backdrop + card con acento superior,
// y POP de entrada/salida (spring scale + fade). Reutilizable para todos los
// pop-ups de "agregar/editar". Mantiene KeyboardAvoidingView para inputs.
export const PersonaModal = ({ visible, onClose, children, title, width, cardStyle }: Props) => {
  const theme = useTheme();
  const [show, setShow] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setShow(true);
      anim.setValue(0);
      Animated.spring(anim, { toValue: 1, friction: 7, tension: 80, useNativeDriver: true }).start();
    } else if (show) {
      Animated.timing(anim, { toValue: 0, duration: 150, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
        if (finished) setShow(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return (
    <Modal visible={show} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: anim }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kav}>
          <Animated.View
            style={{
              width: (width as any) || '88%',
              transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
            }}
          >
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.primary, shadowColor: theme.primary }, cardStyle]}>
              <View style={[styles.topAccent, { backgroundColor: theme.primary }]} />
              {title ? (
                <View style={styles.titleRow}>
                  <View style={[styles.titleAccent, { backgroundColor: theme.primary }]} />
                  <Text style={[styles.title, { color: theme.text, fontFamily: theme.fonts?.title }]}>{title.toUpperCase()}</Text>
                </View>
              ) : null}
              {children}
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  kav: { width: '100%', alignItems: 'center' },
  card: {
    borderWidth: 2,
    borderRadius: 8,
    padding: 20,
    paddingTop: 22,
    overflow: 'hidden',
    elevation: 12,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  topAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  titleAccent: { width: 6, height: 24, marginRight: 10, transform: [{ skewX: '-20deg' }] },
  title: { fontSize: 22, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
});

export default PersonaModal;
