import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../themes/useTheme';
import { PersonaModal } from '../UI/PersonaModal';
import { PersonaShard } from '../UI/PersonaShard';
import { getContrastText } from '../../utils/colorUtils';
import { abonar, desabonar, Liquidacion } from '../../services/economyService';

type Props = {
  parte: Liquidacion | null;
  concepto?: string | null;
  onClose: () => void;
  onDone: () => void;
};

const fmt = (n: number) => Math.round(n || 0).toLocaleString('es-MX');
const num = (s: string) => parseFloat((s || '').replace(',', '.')) || 0;

/**
 * Registrar que una parte del movimiento ya volvio. Admite el total de golpe y
 * tambien entradas sueltas ("llegaron 150 de los 300"). El origen es un
 * concepto libre, no necesariamente una persona.
 */
export const SettleModal = ({ parte, concepto, onClose, onDone }: Props) => {
  const theme = useTheme();
  const [monto, setMonto] = useState('');
  const [guardando, setGuardando] = useState(false);

  const falta = parte ? Math.max(0, (parte.monto || 0) - (parte.monto_pagado || 0)) : 0;
  const yaPago = parte?.monto_pagado || 0;

  // Prellenamos con lo que falta: el caso comun es que paguen todo de golpe.
  useEffect(() => {
    if (parte) setMonto(String(Math.round(falta)));
  }, [parte?.id_liquidacion]);

  const aplicar = async (completo: boolean) => {
    if (!parte || guardando) return;
    setGuardando(true);
    try {
      await abonar(parte.id_liquidacion, completo ? undefined : num(monto));
      onDone();
      onClose();
    } finally {
      setGuardando(false);
    }
  };

  const revertir = async () => {
    if (!parte || guardando) return;
    setGuardando(true);
    try {
      await desabonar(parte.id_liquidacion);
      onDone();
      onClose();
    } finally {
      setGuardando(false);
    }
  };

  const abono = Math.min(num(monto), falta);
  const restante = falta - abono;

  return (
    <PersonaModal visible={!!parte} onClose={onClose} title="YA VOLVIÓ">
      <View style={styles.tag}><PersonaShard label={(parte?.contraparte || 'SIN CONCEPTO').toUpperCase()} height={24} fontSize={11} color={theme.secondary} /></View>

      {!!concepto && (
        <Text style={[styles.concepto, { color: theme.textDim }]} numberOfLines={2}>{concepto}</Text>
      )}

      <View style={[styles.resumen, { borderColor: theme.border, backgroundColor: theme.background }]}>
        <View style={styles.resumenLine}>
          <Text style={[styles.resumenLabel, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>ESPERADO</Text>
          <Text style={[styles.resumenVal, { color: theme.text, fontFamily: theme.fonts?.display }]}>¥{fmt(parte?.monto || 0)}</Text>
        </View>
        {yaPago > 0 && (
          <View style={styles.resumenLine}>
            <Text style={[styles.resumenLabel, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>YA VOLVIÓ</Text>
            <Text style={[styles.resumenVal, { color: theme.success, fontFamily: theme.fonts?.display }]}>¥{fmt(yaPago)}</Text>
          </View>
        )}
        <View style={styles.resumenLine}>
          <Text style={[styles.resumenLabel, { color: theme.text, fontFamily: theme.fonts?.condensed }]}>FALTA</Text>
          <Text style={[styles.resumenTotal, { color: theme.secondary, fontFamily: theme.fonts?.display }]}>¥{fmt(falta)}</Text>
        </View>
      </View>

      <View style={styles.tag}><PersonaShard label="CUÁNTO LLEGÓ" variant="ghost" height={22} fontSize={10} /></View>
      <View style={[styles.montoCard, { borderColor: theme.success, backgroundColor: theme.background }]}>
        <Text style={[styles.yen, { color: theme.success, fontFamily: theme.fonts?.display }]}>¥</Text>
        <TextInput
          keyboardType="numeric"
          value={monto}
          onChangeText={setMonto}
          placeholder="0"
          placeholderTextColor={theme.textDim}
          style={[styles.montoInput, { color: theme.text, fontFamily: theme.fonts?.display }]}
        />
      </View>

      {restante > 0.005 && abono > 0 && (
        <Text style={[styles.pista, { color: theme.textDim }]}>
          Quedarán ¥{fmt(restante)} pendientes.
        </Text>
      )}

      <View style={styles.acciones}>
        {yaPago > 0 && (
          <TouchableOpacity onPress={revertir} style={styles.revertir} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="undo-variant" size={20} color={theme.error} />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={onClose} style={styles.cancelar}>
          <Text style={{ color: theme.textDim, fontFamily: theme.fonts?.bold, letterSpacing: 1 }}>CANCELAR</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => aplicar(false)}
          activeOpacity={0.9}
          disabled={guardando || abono <= 0}
          style={[styles.ok, { backgroundColor: theme.success, opacity: guardando || abono <= 0 ? 0.5 : 1 }]}
        >
          <Text style={[styles.okText, { color: getContrastText(theme.success), fontFamily: theme.fonts?.heading }]}>
            {abono >= falta - 0.005 ? 'LIQUIDAR' : 'REGISTRAR'}
          </Text>
        </TouchableOpacity>
      </View>
    </PersonaModal>
  );
};

const styles = StyleSheet.create({
  tag: { marginTop: 6, marginBottom: 10 },
  concepto: { fontSize: 12, marginBottom: 12 },

  resumen: { borderWidth: 1.5, borderRadius: 4, padding: 12 },
  resumenLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  resumenLabel: { fontSize: 10, letterSpacing: 1.4 },
  resumenVal: { fontSize: 15 },
  resumenTotal: { fontSize: 22 },

  montoCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderRadius: 4, paddingVertical: 8, paddingHorizontal: 16 },
  yen: { fontSize: 28, marginRight: 8 },
  montoInput: { flex: 1, fontSize: 34, padding: 0, includeFontPadding: false },

  pista: { fontSize: 12, marginTop: 8 },

  acciones: { flexDirection: 'row', alignItems: 'center', marginTop: 20 },
  revertir: { padding: 8 },
  cancelar: { paddingVertical: 12, paddingHorizontal: 14, marginRight: 6 },
  ok: { paddingVertical: 12, paddingHorizontal: 24, transform: [{ skewX: '-12deg' }] },
  okText: { fontSize: 15, letterSpacing: 1.4, transform: [{ skewX: '12deg' }] },
});

export default SettleModal;
