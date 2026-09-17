import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Animated, Easing } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../../themes/useTheme';
import { PhoneHeader } from '../../../components/Phone/PhoneHeader';
import { PersonaShard } from '../../../components/UI/PersonaShard';
import { getContrastText } from '../../../utils/colorUtils';
import {
  getEntradas, getRacha, getAnimosDelMes, hoyClave, parseClave, esHoy,
  ANIMOS, Entrada, XP_POR_ENTRADA, STATS_DIARIO,
} from '../../../services/diaryService';

// Color del animo: del rojo (pesimo) al verde (excelente), pasando por el tema.
const colorAnimo = (a: number | null | undefined, theme: any): string => {
  switch (a) {
    case 1: return theme.error;
    case 2: return theme.secondary;
    case 3: return theme.textDim;
    case 4: return theme.primary;
    case 5: return theme.success;
    default: return theme.inactive;
  }
};

const MESES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
const DOW = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

// Primer renglon de texto util, sin marcas Markdown, para el preview.
const preview = (md: string): string => {
  const linea = (md || '')
    .split('\n')
    .map((l) => l.replace(/^\s*[-*]\s\[[ xX]\]\s?/, '').replace(/^\s*[-*]\s/, '').replace(/^#+\s*/, '').trim())
    .find((l) => l.length > 0);
  return linea || 'Sin texto';
};

const EntradaCard = ({ item, index, onPress }: { item: Entrada; index: number; onPress: () => void }) => {
  const theme = useTheme();
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 320, delay: Math.min(index, 8) * 50, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);

  const d = parseClave(item.fecha);
  const acc = colorAnimo(item.animo, theme);
  const sk = -8;
  const stagger = [0, 14, 7, 18, 10][index % 5];
  const rot = [-1.2, 1, -0.9, 1.2, -0.4][index % 5];

  return (
    <Animated.View style={[
      { opacity: anim, transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }] },
      { marginLeft: stagger, marginRight: 22 - stagger, marginBottom: 14 },
    ]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        style={[styles.card, { backgroundColor: theme.surface, borderColor: acc, transform: [{ rotate: `${rot}deg` }, { skewX: `${sk}deg` }] }]}
      >
        <View style={[styles.cardAccent, { backgroundColor: acc }]} />
        <View style={[styles.cardInner, { transform: [{ skewX: `${-sk}deg` }] }]}>
          <View style={styles.cardDate}>
            <Text style={[styles.cardDay, { color: theme.text, fontFamily: theme.fonts?.display }]}>{d.getDate()}</Text>
            <Text style={[styles.cardDow, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>{DOW[d.getDay()]}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardText, { color: theme.text, fontFamily: theme.fonts?.body }]} numberOfLines={2}>
              {preview(item.contenido)}
            </Text>
            <Text style={[styles.cardMes, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>
              {MESES[d.getMonth()]} {d.getFullYear()}
            </Text>
          </View>
          {item.animo != null && (
            <MaterialCommunityIcons name={ANIMOS[item.animo - 1].icono as any} size={22} color={acc} />
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const DiaryScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();

  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [racha, setRacha] = useState(0);
  const [animosMes, setAnimosMes] = useState<Record<string, number>>({});

  const hoy = hoyClave();
  const hoyDate = parseClave(hoy);
  const mesActual = hoy.slice(0, 7);

  const load = async () => {
    try {
      const [e, r, a] = await Promise.all([getEntradas(), getRacha(), getAnimosDelMes(mesActual)]);
      setEntradas(e);
      setRacha(r);
      setAnimosMes(a);
    } catch (err) { console.error('Error cargando diario', err); }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const entradaHoy = entradas.find((e) => e.fecha === hoy);
  const escritaHoy = !!entradaHoy && !!entradaHoy.contenido.trim();
  const pasadas = entradas.filter((e) => e.fecha !== hoy && e.contenido.trim());

  const abrir = (fecha: string) => navigation.navigate('DiaryEntry', { fecha });

  // Tira del mes: un cuadro por dia, teñido por el animo de ese dia.
  const diasDelMes = new Date(hoyDate.getFullYear(), hoyDate.getMonth() + 1, 0).getDate();

  const Header = (
    <View>
      {/* HOY */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => abrir(hoy)}
        style={[styles.hoy, { backgroundColor: theme.surface, borderColor: escritaHoy ? colorAnimo(entradaHoy?.animo, theme) : theme.primary }]}
      >
        <View style={[styles.hoyAccent, { backgroundColor: escritaHoy ? colorAnimo(entradaHoy?.animo, theme) : theme.primary }]} />
        <Text style={[styles.hoyLabel, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>
          {DOW[hoyDate.getDay()]} {hoyDate.getDate()} DE {MESES[hoyDate.getMonth()]}
        </Text>

        {escritaHoy ? (
          <>
            <Text style={[styles.hoyTexto, { color: theme.text, fontFamily: theme.fonts?.body }]} numberOfLines={3}>
              {preview(entradaHoy!.contenido)}
            </Text>
            <View style={styles.hoyPie}>
              <MaterialCommunityIcons name="check-circle" size={15} color={theme.success} />
              <Text style={[styles.hoyPieText, { color: theme.success, fontFamily: theme.fonts?.condensed }]}>
                HOY YA ESTÁ ESCRITO
              </Text>
            </View>
          </>
        ) : (
          <>
            <Text style={[styles.hoyTitulo, { color: theme.text, fontFamily: theme.fonts?.title }]}>
              ESCRIBE LO DE HOY
            </Text>
            <Text style={[styles.hoySub, { color: theme.textDim, fontFamily: theme.fonts?.body }]}>
              Te da +{XP_POR_ENTRADA} XP de {STATS_DIARIO.join(' y ')}.
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* RACHA + TIRA DEL MES */}
      <View style={[styles.mesCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.mesHead}>
          <MaterialCommunityIcons name="fire" size={17} color={racha > 0 ? theme.secondary : theme.textDim} />
          <Text style={[styles.mesRacha, { color: racha > 0 ? theme.secondary : theme.textDim, fontFamily: theme.fonts?.display }]}>
            {racha}
          </Text>
          <Text style={[styles.mesRachaLabel, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>
            {racha === 1 ? 'DÍA SEGUIDO' : 'DÍAS SEGUIDOS'}
          </Text>
          <View style={{ flex: 1 }} />
          <Text style={[styles.mesNombre, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>
            {MESES[hoyDate.getMonth()]}
          </Text>
        </View>

        <View style={styles.tira}>
          {Array.from({ length: diasDelMes }, (_, i) => {
            const dia = i + 1;
            const clave = `${mesActual}-${String(dia).padStart(2, '0')}`;
            const animo = animosMes[clave];
            const futuro = dia > hoyDate.getDate();
            return (
              <TouchableOpacity
                key={clave}
                activeOpacity={futuro ? 1 : 0.7}
                onPress={() => !futuro && abrir(clave)}
                style={[styles.tiraDia, {
                  backgroundColor: animo ? colorAnimo(animo, theme) : theme.background,
                  borderColor: dia === hoyDate.getDate() ? theme.primary : theme.border,
                  opacity: futuro ? 0.3 : 1,
                }]}
              />
            );
          })}
        </View>
        <Text style={[styles.tiraPie, { color: theme.textDim }]}>
          Cada cuadro es un día: su color es cómo te fue. Toca uno para escribirlo.
        </Text>
      </View>

      {pasadas.length > 0 && (
        <View style={styles.tagWrap}><PersonaShard label="ANTERIORES" /></View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <PhoneHeader title="DIARIO" showBackButton shard />
      <FlatList
        data={pasadas}
        keyExtractor={(i) => i.fecha}
        renderItem={({ item, index }) => (
          <EntradaCard item={item} index={index} onPress={() => abrir(item.fecha)} />
        )}
        ListHeaderComponent={Header}
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  hoy: { borderWidth: 1.5, borderRadius: 14, padding: 18, paddingLeft: 22, overflow: 'hidden', marginBottom: 16 },
  hoyAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 8 },
  hoyLabel: { fontSize: 10, letterSpacing: 1.8 },
  hoyTitulo: { fontSize: 26, letterSpacing: 0.8, marginTop: 6 },
  hoySub: { fontSize: 13, marginTop: 4 },
  hoyTexto: { fontSize: 15, lineHeight: 21, marginTop: 8 },
  hoyPie: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  hoyPieText: { fontSize: 10, letterSpacing: 1.3 },

  mesCard: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 20 },
  mesHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  mesRacha: { fontSize: 22 },
  mesRachaLabel: { fontSize: 10, letterSpacing: 1.3 },
  mesNombre: { fontSize: 10, letterSpacing: 1.5 },
  tira: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tiraDia: { width: 22, height: 22, borderRadius: 2, borderWidth: 1, transform: [{ skewX: '-12deg' }] },
  tiraPie: { fontSize: 10, marginTop: 10, lineHeight: 14 },

  tagWrap: { marginBottom: 12 },

  card: { borderWidth: 1.5, borderRadius: 3, paddingVertical: 12, paddingLeft: 16, paddingRight: 12, overflow: 'hidden' },
  cardAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6 },
  cardInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardDate: { alignItems: 'center', minWidth: 38 },
  cardDay: { fontSize: 24, includeFontPadding: false },
  cardDow: { fontSize: 9, letterSpacing: 1 },
  cardText: { fontSize: 14, lineHeight: 19 },
  cardMes: { fontSize: 9, letterSpacing: 1.2, marginTop: 3 },
});

export default DiaryScreen;
