import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../themes/useTheme';
import { getContrastText } from '../../utils/colorUtils';
import type { AlertButton } from '../../context/AlertContext';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  buttons: AlertButton[];
  onRequestClose: () => void;
  onButtonPress: (btn: AlertButton) => void;
}

const CustomAlert = ({ visible, title, message, buttons, onRequestClose, onButtonPress }: Props) => {
  const theme = useTheme();
  const bg = theme?.background || '#0f1014';
  const surface = theme?.surface || '#1a1c22';
  const primary = theme?.primary || '#b000ff';
  const error = theme?.error || '#ff4d4f';
  const text = theme?.text || '#ffffff';
  const textDim = theme?.textDim || '#aaaaaa';
  const textInverse = theme?.textInverse || '#000000';

  // Pop de entrada (escala con resorte); la salida usa el fade nativo del Modal
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      anim.setValue(0);
      Animated.spring(anim, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <View style={styles.overlay}>
        <Animated.View style={{ width: '85%', transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }}>
          <View style={[styles.card, { backgroundColor: bg, borderColor: primary, shadowColor: primary }]}>
            {/* Anti-skew container for readable text */}
            <View style={[styles.antiSkew, { transform: [{ skewX: '10deg' }] }]}>
              <Text style={[styles.title, { color: primary, fontFamily: theme.fonts?.title }]}>{title?.toUpperCase()}</Text>
              <Text style={[styles.message, { color: text, fontFamily: theme.fonts?.body }]}>{message}</Text>

              <View style={styles.buttonsRow}>
                {buttons.map((b, i) => {
                  const isCancel = b.style === 'cancel';
                  const isDestructive = b.style === 'destructive';
                  const btnBg = isCancel ? surface : isDestructive ? error : primary;
                  const btnTextColor = isCancel ? textDim : getContrastText(isDestructive ? error : primary) || textInverse;
                  return (
                    <TouchableOpacity
                      key={i}
                      activeOpacity={0.85}
                      onPress={() => onButtonPress(b)}
                      style={[styles.btn, { backgroundColor: btnBg, borderColor: isCancel ? theme.border : btnBg }]}
                    >
                      <View style={{ transform: [{ skewX: '-10deg' }] }}>
                        <Text style={[styles.btnText, { color: btnTextColor, fontFamily: theme.fonts?.heading }]}>{b.text}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: {
    width: '100%',
    padding: 25,
    borderWidth: 2,
    borderRadius: 6,
    elevation: 10,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    transform: [{ skewX: '-10deg' }],
  },
  antiSkew: {},
  title: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 10,
    letterSpacing: 1.5,
  },
  message: {
    fontSize: 14,
    marginBottom: 18,
    lineHeight: 20,
  },
  buttonsRow: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 10 },
  btn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 4, borderWidth: 1, marginLeft: 8 },
  btnText: { fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
});

export default CustomAlert;
