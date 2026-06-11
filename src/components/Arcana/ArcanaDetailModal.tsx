// ArcanaDetailModal.tsx — modal de detalle de una carta de arcano (loadout).
// Carta tarot grande (Neon P3R, cut-corner) + plato de efecto + flavor + estado
// + boton de accion segun estado (EQUIPAR / DESEQUIPAR / bloqueado / cooldown).
import React from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PersonaModal } from '../UI/PersonaModal';
import { useTheme } from '../../themes/useTheme';
import { getContrastText } from '../../utils/colorUtils';
import { CutCard, StatEmblem, EffectText } from './ArcanaBits';
import { ArcanaCard, formatArcanaDate, daysUntil } from '../../data/arcanaMeta';

const { width: SW } = Dimensions.get('window');
const CARD_W = Math.min(SW * 0.56, 230);
const CARD_H = CARD_W * 1.42;

interface Props {
  visible: boolean;
  card: ArcanaCard | null;
  busy?: boolean;
  onClose: () => void;
  onEquip: (card: ArcanaCard) => void;
  onUnequip: (card: ArcanaCard) => void;
}

export const ArcanaDetailModal = ({ visible, card, busy, onClose, onEquip, onUnequip }: Props) => {
  const theme = useTheme();
  if (!card) return null;
  const jewel = card.color;
  const modalBg = theme.surface; // fondo del PersonaModal (para cortar esquinas)
  const panelBg = theme.background;

  const meta = (() => {
    switch (card.state) {
      case 'active':   return { color: theme.success, text: 'EQUIPADO · LIBRE PARA QUITAR' };
      case 'locked':   return { color: jewel, text: `EQUIPADO · QUEDAN ${daysUntil(card.bloqueadoHasta)} DÍA${daysUntil(card.bloqueadoHasta) === 1 ? '' : 'S'}` };
      case 'cooldown': return { color: theme.textDim, text: 'USADO ESTE CICLO' };
      default:         return { color: theme.textDim, text: 'EN TU COLECCIÓN' };
    }
  })();

  return (
    <PersonaModal visible={visible} onClose={onClose} width="90%">
      <Pressable onPress={onClose} hitSlop={10} style={styles.close}>
        <Ionicons name="close" size={22} color={theme.textDim} />
      </Pressable>

      <View style={{ alignItems: 'center' }}>
        {/* ---- Carta tarot ---- */}
        <CutCard w={CARD_W} h={CARD_H} color={jewel} panelBg={panelBg} screenBg={modalBg} cut={22} borderWidth={2.5} style={{ shadowColor: jewel, ...glowShadow }}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: jewel, opacity: 0.08 }]} />
          <View style={[styles.cardGlow, { backgroundColor: jewel }]} />
          <Text style={[styles.dcEn, { color: jewel, fontFamily: theme.fonts?.condensed }]} numberOfLines={1}>{card.en}</Text>
          <Text style={[styles.dcRom, { color: jewel, fontFamily: theme.fonts?.display }]}>{card.rom}</Text>
          <View style={styles.dcEmblem}>
            <StatEmblem stat={card.statEs} size={64} color={jewel} />
          </View>
          <View style={styles.dcInfo}>
            <View style={[styles.dcMedal, { borderColor: jewel }]}>
              <Text style={[styles.dcMedalT, { color: jewel, fontFamily: theme.fonts?.display }]}>{card.rom}</Text>
            </View>
            <Text numberOfLines={1} style={[styles.dcName, { color: theme.text, fontFamily: theme.fonts?.title }]}>{card.name.toUpperCase()}</Text>
            <View style={[styles.dcStat, { borderColor: jewel }]}>
              <StatEmblem stat={card.statEs} size={13} color={jewel} />
              <Text style={[styles.dcStatT, { color: jewel, fontFamily: theme.fonts?.condensed }]}>{card.statEs.toUpperCase()}</Text>
            </View>
          </View>
        </CutCard>

        {/* ---- Plato de efecto ---- */}
        <View style={[styles.plate, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <View style={[styles.plateAccent, { backgroundColor: jewel }]} />
          <Text style={[styles.plateLab, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>EFECTO · ADITIVO</Text>
          <EffectText
            text={card.efecto}
            color={jewel}
            style={[styles.plateVal, { color: theme.text, fontFamily: theme.fonts?.body }]}
            hiStyle={{ fontFamily: theme.fonts?.bold }}
          />
        </View>

        {/* ---- Flavor ---- */}
        <Text style={[styles.flavor, { color: theme.textDim, fontFamily: theme.fonts?.body }]}>“{card.flavor}”</Text>

        {/* ---- Estado ---- */}
        <View style={styles.metarow}>
          <View style={[styles.metaDot, { backgroundColor: meta.color }]} />
          <Text style={[styles.metaText, { color: meta.color, fontFamily: theme.fonts?.condensed }]}>{meta.text}</Text>
        </View>

        {/* ---- Accion ---- */}
        {card.state === 'available' && (
          <ActionButton label="EQUIPAR" icon="flash" fill={jewel} ink={getContrastText(jewel)} theme={theme} disabled={busy} onPress={() => onEquip(card)} sub="Ocupa 1 slot · activo 3 días" />
        )}
        {card.state === 'active' && (
          <ActionButton label="DESEQUIPAR" icon="remove-circle-outline" outline={jewel} theme={theme} disabled={busy} onPress={() => onUnequip(card)} sub="Pasará a espera hasta el lunes" />
        )}
        {card.state === 'locked' && (
          <ActionButton label="BLOQUEADO" icon="lock-closed" disabledLook theme={theme} disabled sub={`Se libera el ${formatArcanaDate(card.bloqueadoHasta)}`} />
        )}
        {card.state === 'cooldown' && (
          <ActionButton label="EN ESPERA" icon="time" disabledLook theme={theme} disabled sub={`Disponible el ${formatArcanaDate(card.disponibleDesde)}`} />
        )}
      </View>
    </PersonaModal>
  );
};

const ActionButton = ({ label, icon, fill, ink, outline, disabledLook, theme, disabled, onPress, sub }: any) => {
  const borderC = outline || (disabledLook ? theme.border : fill);
  const bgC = fill || 'transparent';
  const txtC = fill ? ink : (disabledLook ? theme.textDim : outline);
  return (
    <View style={{ alignItems: 'center', marginTop: 18 }}>
      <TouchableOpacity activeOpacity={disabled ? 1 : 0.85} disabled={disabled} onPress={onPress}
        style={[styles.act, { backgroundColor: bgC, borderColor: borderC, opacity: disabled && !disabledLook ? 0.6 : 1 }]}>
        <View style={styles.actInner}>
          <Ionicons name={icon} size={20} color={txtC} />
          <Text style={[styles.actLbl, { color: txtC, fontFamily: theme.fonts?.title }]}>{label}</Text>
        </View>
      </TouchableOpacity>
      {sub ? <Text style={[styles.actSub, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>{sub}</Text> : null}
    </View>
  );
};

const glowShadow = { elevation: 14, shadowOpacity: 0.55, shadowRadius: 18, shadowOffset: { width: 0, height: 0 } };

const styles = StyleSheet.create({
  close: { position: 'absolute', top: 2, right: 2, zIndex: 10, padding: 6 },

  cardGlow: { position: 'absolute', top: -CARD_H * 0.2, alignSelf: 'center', width: CARD_W * 0.9, height: CARD_H * 0.6, borderRadius: CARD_W, opacity: 0.18 },
  dcEn: { position: 'absolute', top: 12, left: 0, right: 0, textAlign: 'center', fontSize: 12, letterSpacing: 4 },
  dcRom: { position: 'absolute', top: CARD_H * 0.16, left: 0, right: 0, textAlign: 'center', fontSize: CARD_W * 0.62, opacity: 0.14, includeFontPadding: false },
  dcEmblem: { position: 'absolute', top: CARD_H * 0.27, left: 0, right: 0, alignItems: 'center' },
  dcInfo: { position: 'absolute', left: 0, right: 0, bottom: 16, alignItems: 'center', paddingHorizontal: 10 },
  dcMedal: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  dcMedalT: { fontSize: 20, includeFontPadding: false },
  dcName: { fontSize: 22, letterSpacing: 0.5, textAlign: 'center', transform: [{ skewX: '-5deg' }] },
  dcStat: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 2, paddingHorizontal: 8, paddingVertical: 3, marginTop: 8, transform: [{ skewX: '-10deg' }] },
  dcStatT: { fontSize: 11, letterSpacing: 1.5, marginLeft: 5 },

  plate: { width: '100%', borderWidth: 1.5, borderRadius: 3, paddingVertical: 12, paddingHorizontal: 16, paddingLeft: 18, marginTop: 20, overflow: 'hidden' },
  plateAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, transform: [{ skewX: '-12deg' }], marginLeft: -2 },
  plateLab: { fontSize: 11, letterSpacing: 2, marginBottom: 4 },
  plateVal: { fontSize: 15, lineHeight: 21 },

  flavor: { fontSize: 13, fontStyle: 'italic', textAlign: 'center', marginTop: 14, paddingHorizontal: 8 },

  metarow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  metaDot: { width: 8, height: 8, marginRight: 8, transform: [{ rotate: '45deg' }] },
  metaText: { fontSize: 12, letterSpacing: 1.5 },

  act: { width: 270, paddingVertical: 15, borderWidth: 2, alignItems: 'center', transform: [{ skewX: '-10deg' }] },
  actInner: { flexDirection: 'row', alignItems: 'center', transform: [{ skewX: '10deg' }] },
  actLbl: { fontSize: 19, letterSpacing: 1, marginLeft: 10 },
  actSub: { fontSize: 12, letterSpacing: 0.5, marginTop: 8, textAlign: 'center' },
});

export default ArcanaDetailModal;
