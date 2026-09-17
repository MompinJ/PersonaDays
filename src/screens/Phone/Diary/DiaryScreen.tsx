import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Animated, Easing } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../../themes/useTheme';
import { PhoneHeader } from '../../../components/Phone/PhoneHeader';
import { PersonaShard } from '../../../components/UI/PersonaShard';
import { PersonaPanel, PersonaDivider } from '../../../components/UI/PersonaPanel';
import { getContrastText } from '../../../utils/colorUtils';
import {
  getEntradas, getRacha, getResumenMes, hoyClave, parseClave,
  ANIMOS, Entrada, ResumenMes, XP_POR_ENTRADA, STATS_DIARIO,
} from '../../../services/diaryService';
import { MoodWave, colorAnimo } from '../../../components/Diary/MoodWave';

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
        style={[styles.card, { backgroundColor: theme.surface, borderLeftColor: acc, transform: [{ rotate: `${rot}deg` }, { skewX: `${sk}deg` }] }]}
      >
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
  const [mesResumen, setMesResumen] = useState<ResumenMes>({ animos: {}, escritos: 0, promedio: null });

  const hoy = hoyClave();
  const hoyDate = parseClave(hoy);
  const mesActual = hoy.slice(0, 7);

  const load = async () => {
    try {
      const [e, r, m] = await Promise.all([getEntradas(), getRacha(), getResumenMes(mesActual)]);
      setEntradas(e);
      setRacha(r);
      setMesResumen(m);
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
        style={styles.hoyTouch}
      >
        <PersonaPanel
          accent={escritaHoy ? colorAnimo(entradaHoy?.animo, theme) : theme.primary}
          cut={24}
          style={styles.hoy}
        >
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
        </PersonaPanel>
      </TouchableOpacity>

      {/* RACHA + ONDA DEL MES.
          Era una tira de cuadros por dia, pero parecia un calendario malo (no
          se distinguia que dia era cada cuadro) y el Calendario de verdad ya
          da acceso a cada entrada. Lo que aporta esta tarjeta es otra cosa: la
          FORMA del mes. */}
      <PersonaPanel accent={theme.primary} cut={22} style={styles.mesCard}>
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

        <MoodWave
          animos={mesResumen.animos}
          mes={mesActual}
          hastaDia={hoyDate.getDate()}
          diasDelMes={diasDelMes}
        />

        <PersonaDivider style={{ marginTop: 12 }} />
        <View style={styles.mesPie}>
          <Text style={[styles.mesPieText, { color: theme.textDim }]}>
            {mesResumen.escritos} {mesResumen.escritos === 1 ? 'día escrito' : 'días escritos'} de {hoyDate.getDate()}
          </Text>
          {mesResumen.promedio != null && (
            <Text style={[styles.mesPieText, { color: colorAnimo(Math.round(mesResumen.promedio), theme) }]}>
              ánimo medio {mesResumen.promedio.toFixed(1)}
            </Text>
          )}
        </View>
      </PersonaPanel>

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

  hoyTouch: { marginBottom: 16 },
  hoy: { paddingVertical: 18, paddingLeft: 24, paddingRight: 18 },
  hoyLabel: { fontSize: 10, letterSpacing: 1.8 },
  hoyTitulo: { fontSize: 26, letterSpacing: 0.8, marginTop: 6 },
  hoySub: { fontSize: 13, marginTop: 4 },
  hoyTexto: { fontSize: 15, lineHeight: 21, marginTop: 8 },
  hoyPie: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  hoyPieText: { fontSize: 10, letterSpacing: 1.3 },

  mesCard: { paddingVertical: 14, paddingLeft: 20, paddingRight: 14, marginBottom: 20 },
  mesHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  mesRacha: { fontSize: 22 },
  mesRachaLabel: { fontSize: 10, letterSpacing: 1.3 },
  mesNombre: { fontSize: 10, letterSpacing: 1.5 },
  mesPie: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10 },
  mesPieText: { fontSize: 11 },

  tagWrap: { marginBottom: 12 },

  card: { borderLeftWidth: 7, paddingVertical: 12, paddingLeft: 14, paddingRight: 12 },
  cardInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardDate: { alignItems: 'center', minWidth: 38 },
  cardDay: { fontSize: 24, includeFontPadding: false },
  cardDow: { fontSize: 9, letterSpacing: 1 },
  cardText: { fontSize: 14, lineHeight: 19 },
  cardMes: { fontSize: 9, letterSpacing: 1.2, marginTop: 3 },
});

export default DiaryScreen;
