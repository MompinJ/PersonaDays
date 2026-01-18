import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../themes/useTheme';
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
  const primary = theme?.primary || '#b000ff';
  const text = theme?.text || '#ffffff';
  const textDim = theme?.textDim || '#aaaaaa';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: bg, borderColor: primary, shadowColor: primary }]}> 
          {/* Anti-skew container for readable text */}
          <View style={[styles.antiSkew, { transform: [{ skewX: '10deg' }] }]}>
            <Text style={[styles.title, { color: primary }]}>{title?.toUpperCase()}</Text>
            <Text style={[styles.message, { color: text }]}>{message}</Text>

            <View style={styles.buttonsRow}>
              {buttons.map((b, i) => {
                const isCancel = b.style === 'cancel';
                const isDestructive = b.style === 'destructive';
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => onButtonPress(b)}
                    style={[
                      styles.btn,
                      isCancel ? styles.btnCancel : isDestructive ? styles.btnDestructive : styles.btnPrimary,
                      { borderColor: primary }
                    ]}
                  >
                    <View style={{ transform: [{ skewX: '-10deg' }] }}>
                      <Text style={[styles.btnText, isCancel ? { color: textDim } : { color: bg }]}>{b.text}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: {
    width: '85%',
    padding: 25,
    borderWidth: 2,
    borderRadius: 6,
    elevation: 10,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    transform: [{ skewX: '-10deg' }]
  },
  antiSkew: {
    // counter the parent skew so text is straight
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 10,
    letterSpacing: 1.5,
  },
  message: {
    fontSize: 14,
    marginBottom: 18,
    lineHeight: 20,
  },
  buttonsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 4, borderWidth: 1, marginLeft: 8 },
  btnPrimary: { backgroundColor: '#fff' },
  btnCancel: { backgroundColor: 'transparent' },
  btnDestructive: { backgroundColor: '#ff4d4f' },
  btnText: { fontWeight: '700', textTransform: 'uppercase' }
});

export default CustomAlert;
