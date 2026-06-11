// ArcanaPurchaseModal.tsx — confirmacion de compra de un arcano + "revelado".
// La compra NO es aleatoria (sabes que compras), asi que el revelado se enmarca
// como un SELLO/invocacion (glow + OBTENIDO), no como gacha de azar.
import React from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PersonaModal } from '../UI/PersonaModal';
import { useTheme } from '../../themes/useTheme';
import { getContrastText } from '../../utils/colorUtils';
import { CutCard, StatEmblem, EffectText } from './ArcanaBits';

const { width: SW } = Dimensions.get('window');
const CARD_W = Math.min(SW * 0.42, 170);
const CARD_H = CARD_W * 1.44;

const fmt = (n: number) => Math.round(n || 0).toLocaleString('es-MX');

export interface ShopCardData {
  id: number;
  rom: string;
  name: string;
  en: string;
  statEs: string;
  efecto: string;
  color: string;
  price: number;
}

interface Props {
  visible: boolean;
  card: ShopCardData | null;
  saldo: number;
  busy?: boolean;
  obtained?: boolean;       // true = ya se compro, mostrar revelado
  onConfirm: () => void;
  onClose: () => void;
}

export const ArcanaPurchaseModal = ({ visible, card, saldo, busy, obtained, onConfirm, onClose }: Props) => {
  const theme = useTheme();
  if (!card) return null;
  const jewel = card.color;
  const modalBg = theme.surface;
  const panelBg = theme.background;
  const after = saldo - card.price;
  const canAfford = after >= 0;

  return (
    <PersonaModal visible={visible} onClose={onClose} width="88%">
      {!obtained && (
        <Pressable onPress={onClose} hitSlop={10} style={styles.close}>
          <Ionicons name="close" size={22} color={theme.textDim} />
        </Pressable>
      )}

      <View style={{ alignItems: 'center' }}>
        <Text style={[styles.heading, { color: obtained ? jewel : theme.text, fontFamily: theme.fonts?.title }]}>
          {obtained ? '¡OBTENIDO!' : 'CONFIRMAR COMPRA'}
        </Text>

        {/* Carta */}
        <CutCard w={CARD_W} h={CARD_H} color={jewel} panelBg={panelBg} screenBg={modalBg} cut={16} borderWidth={2} style={{ shadowColor: jewel, ...(obtained ? bigGlow : glow) }}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: jewel, opacity: obtained ? 0.16 : 0.08 }]} />
          <Text style={[styles.rom, { color: jewel, fontFamily: theme.fonts?.display }]}>{card.rom}</Text>
          <View style={styles.emblem}><StatEmblem stat={card.statEs} size={40} color={jewel} /></View>
          <View style={styles.foot}>
            <Text numberOfLines={1} style={[styles.name, { color: theme.text, fontFamily: theme.fonts?.title }]}>{card.name.toUpperCase()}</Text>
            <Text numberOfLines={1} style={[styles.en, { color: jewel, fontFamily: theme.fonts?.condensed }]}>{card.en}</Text>
          </View>
        </CutCard>

        {obtained ? (
          <>
            <Text style={[styles.spent, { color: theme.error, fontFamily: theme.fonts?.display }]}>−¥{fmt(card.price)}</Text>
            <Text style={[styles.effLine, { color: theme.textDim, fontFamily: theme.fonts?.body }]}>Ya puedes equiparlo en tus slots.</Text>
            <TouchableOpacity activeOpacity={0.85} onPress={onClose} style={[styles.btn, { backgroundColor: jewel }]}>
              <View style={styles.btnInner}>
                <Ionicons name="checkmark-sharp" size={20} color={getContrastText(jewel)} />
                <Text style={[styles.btnLbl, { color: getContrastText(jewel), fontFamily: theme.fonts?.title }]}>CONTINUAR</Text>
              </View>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <EffectText text={card.efecto} color={jewel} style={[styles.effLine, { color: theme.text, fontFamily: theme.fonts?.body }]} hiStyle={{ fontFamily: theme.fonts?.bold }} />

            {/* Precio + saldo resultante */}
            <View style={[styles.priceBox, { borderColor: theme.border, backgroundColor: theme.background }]}>
              <View style={styles.priceRow}>
                <Text style={[styles.priceLab, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>PRECIO</Text>
                <Text style={[styles.priceVal, { color: theme.text, fontFamily: theme.fonts?.display }]}>¥{fmt(card.price)}</Text>
              </View>
              <View style={[styles.priceDiv, { backgroundColor: theme.border }]} />
              <View style={styles.priceRow}>
                <Text style={[styles.priceLab, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>SALDO</Text>
                <Text style={[styles.priceSaldo, { color: theme.textDim, fontFamily: theme.fonts?.display }]}>
                  ¥{fmt(saldo)} <Text style={{ color: theme.textDim }}>→</Text> <Text style={{ color: canAfford ? theme.success : theme.error }}>¥{fmt(after)}</Text>
                </Text>
              </View>
            </View>

            <TouchableOpacity activeOpacity={canAfford ? 0.85 : 1} disabled={busy || !canAfford} onPress={onConfirm}
              style={[styles.btn, { backgroundColor: canAfford ? jewel : theme.surface, borderColor: theme.border, borderWidth: canAfford ? 0 : 1.5, opacity: busy ? 0.6 : 1 }]}>
              <View style={styles.btnInner}>
                <Ionicons name={canAfford ? 'cart' : 'wallet-outline'} size={20} color={canAfford ? getContrastText(jewel) : theme.textDim} />
                <Text style={[styles.btnLbl, { color: canAfford ? getContrastText(jewel) : theme.textDim, fontFamily: theme.fonts?.title }]}>
                  {canAfford ? 'CONFIRMAR' : 'SALDO INSUFICIENTE'}
                </Text>
              </View>
            </TouchableOpacity>
          </>
        )}
      </View>
    </PersonaModal>
  );
};

const glow = { elevation: 10, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } };
const bigGlow = { elevation: 18, shadowOpacity: 0.8, shadowRadius: 24, shadowOffset: { width: 0, height: 0 } };

const styles = StyleSheet.create({
  close: { position: 'absolute', top: 2, right: 2, zIndex: 10, padding: 6 },
  heading: { fontSize: 20, letterSpacing: 1, marginBottom: 16, transform: [{ skewX: '-5deg' }] },

  rom: { position: 'absolute', top: 2, right: 8, fontSize: CARD_W * 0.5, opacity: 0.14, includeFontPadding: false },
  emblem: { position: 'absolute', top: CARD_H * 0.22, left: 0, right: 0, alignItems: 'center' },
  foot: { position: 'absolute', left: 8, right: 8, bottom: 10, alignItems: 'center' },
  name: { fontSize: 15, letterSpacing: 0.3, textAlign: 'center' },
  en: { fontSize: 9, letterSpacing: 2, marginTop: 1 },

  spent: { fontSize: 30, includeFontPadding: false, marginTop: 16 },
  effLine: { fontSize: 14, textAlign: 'center', marginTop: 14, lineHeight: 20, paddingHorizontal: 4 },

  priceBox: { width: '100%', borderWidth: 1.5, borderRadius: 3, paddingVertical: 12, paddingHorizontal: 16, marginTop: 16 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceLab: { fontSize: 11, letterSpacing: 1.5 },
  priceVal: { fontSize: 22, includeFontPadding: false },
  priceSaldo: { fontSize: 16, includeFontPadding: false },
  priceDiv: { height: 1, marginVertical: 9 },

  btn: { width: '100%', paddingVertical: 15, alignItems: 'center', marginTop: 18, transform: [{ skewX: '-9deg' }] },
  btnInner: { flexDirection: 'row', alignItems: 'center', transform: [{ skewX: '9deg' }] },
  btnLbl: { fontSize: 18, letterSpacing: 1, marginLeft: 10 },
});

export default ArcanaPurchaseModal;
