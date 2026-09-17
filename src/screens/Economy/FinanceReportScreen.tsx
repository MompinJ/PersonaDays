import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Easing } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../themes/useTheme';
import { PersonaShard } from '../../components/UI/PersonaShard';
import { PressableScale } from '../../components/UI/PressableScale';
import { CategoryIcon, getCategory } from '../../components/category-icons';
import { getContrastText, distinguishColors } from '../../utils/colorUtils';
import {
  getPeriodSummary, getBreakdownByCategory, getMonthlySeries, getTopExpenses,
  getReceivables, getFirstTransactionDate,
  PeriodSummary, CategoryBreakdown, MonthPoint, Transaction, Receivable, TipoMovimiento,
} from '../../services/economyService';

const yen = (n: number) => `¥${Math.round(Math.abs(n || 0)).toLocaleString('es-MX')}`;
const MES_ABBR = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const pad = (n: number) => String(n).padStart(2, '0');
const stamp = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} 00:00:00`;

type PeriodKey = 'MES' | 'ANTERIOR' | 'TRIMESTRE' | 'ANIO' | 'TODO';
const PERIODOS: { key: PeriodKey; label: string }[] = [
  { key: 'MES', label: 'ESTE MES' },
  { key: 'ANTERIOR', label: 'MES PASADO' },
  { key: 'TRIMESTRE', label: '3 MESES' },
  { key: 'ANIO', label: 'ESTE AÑO' },
  { key: 'TODO', label: 'TODO' },
];

/**
 * Ventana del periodo elegido y la ventana EQUIVALENTE anterior, para poder
 * decir "gastaste 30% mas que el mes pasado". 'TODO' no tiene comparable.
 */
const resolverPeriodo = (key: PeriodKey, desde: string | null) => {
  const hoy = new Date();
  const y = hoy.getFullYear();
  const m = hoy.getMonth();
  const finHoy = stamp(new Date(y, m, hoy.getDate() + 1));

  switch (key) {
    case 'MES':
      return {
        start: stamp(new Date(y, m, 1)), end: stamp(new Date(y, m + 1, 1)),
        prevStart: stamp(new Date(y, m - 1, 1)), prevEnd: stamp(new Date(y, m, 1)),
        titulo: hoy.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }).toUpperCase(),
        compara: 'EL MES PASADO',
      };
    case 'ANTERIOR': {
      const ref = new Date(y, m - 1, 1);
      return {
        start: stamp(ref), end: stamp(new Date(y, m, 1)),
        prevStart: stamp(new Date(y, m - 2, 1)), prevEnd: stamp(ref),
        titulo: ref.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }).toUpperCase(),
        compara: 'EL MES ANTERIOR',
      };
    }
    case 'TRIMESTRE':
      return {
        start: stamp(new Date(y, m - 2, 1)), end: stamp(new Date(y, m + 1, 1)),
        prevStart: stamp(new Date(y, m - 5, 1)), prevEnd: stamp(new Date(y, m - 2, 1)),
        titulo: 'ÚLTIMOS 3 MESES', compara: 'LOS 3 PREVIOS',
      };
    case 'ANIO':
      return {
        start: stamp(new Date(y, 0, 1)), end: stamp(new Date(y + 1, 0, 1)),
        prevStart: stamp(new Date(y - 1, 0, 1)), prevEnd: stamp(new Date(y, 0, 1)),
        titulo: String(y), compara: String(y - 1),
      };
    default:
      return {
        start: desde || '0000-01-01 00:00:00', end: finHoy,
        prevStart: null, prevEnd: null,
        titulo: 'TODO EL HISTORIAL', compara: null,
      };
  }
};

/**
 * Rellena con ceros los meses sin movimientos dentro de la ventana.
 * getMonthlySeries solo devuelve los meses que existen en la tabla, asi que un
 * mes en blanco desaparecia del eje y la grafica mentia sobre el hueco.
 */
const completarMeses = (serie: MonthPoint[], meses: number): MonthPoint[] => {
  const porMes: Record<string, MonthPoint> = {};
  serie.forEach((p) => { porMes[p.mes] = p; });
  const hoy = new Date();
  const out: MonthPoint[] = [];
  for (let i = meses - 1; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    out.push(porMes[key] || { mes: key, ingresos: 0, gastos: 0 });
  }
  return out;
};

// Dias del periodo, acotados a hoy (un mes en curso no lleva 30 dias todavia).
const diasDelPeriodo = (start: string, end: string) => {
  const a = new Date(start.replace(' ', 'T')).getTime();
  const b = Math.min(new Date(end.replace(' ', 'T')).getTime(), Date.now());
  return Math.max(1, Math.round((b - a) / 86400000));
};

// ---------- Tarjeta de cifra (paralelogramo con acento) ----------
const Tile = ({ label, value, accent, sub }: { label: string; value: string; accent: string; sub?: string }) => {
  const theme = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.tileAccent, { backgroundColor: accent }]} />
      <Text style={[styles.tileLabel, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>{label}</Text>
      <Text style={[styles.tileValue, { color: accent, fontFamily: theme.fonts?.display }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {!!sub && <Text style={[styles.tileSub, { color: theme.textDim }]} numberOfLines={1}>{sub}</Text>}
    </View>
  );
};

// ---------- Barra horizontal animada de una categoria ----------
const CatBar = ({ cat, color, max, total, delay, open, onPress }: {
  cat: CategoryBreakdown; color: string; max: number; total: number; delay: number; open: boolean; onPress: () => void;
}) => {
  const theme = useTheme();
  const anim = useRef(new Animated.Value(0)).current;
  const pct = total > 0 ? (cat.neto / total) * 100 : 0;
  const ancho = max > 0 ? Math.max(3, (cat.neto / max) * 100) : 0;

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 620, delay, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [cat.neto, delay]);

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.catBlock}>
      <View style={styles.catHead}>
        <View style={[styles.catSwatch, { backgroundColor: color }]}>
          <CategoryIcon category={getCategory(cat.icono || 'tag').key} size={15} skew={0} color={getContrastText(color)} />
        </View>
        <Text style={[styles.catName, { color: theme.text, fontFamily: theme.fonts?.bold }]} numberOfLines={1}>{cat.nombre}</Text>
        <Text style={[styles.catPct, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>{pct.toFixed(0)}%</Text>
        <Text style={[styles.catValue, { color: theme.text, fontFamily: theme.fonts?.display }]}>{yen(cat.neto)}</Text>
      </View>
      <View style={[styles.catTrack, { backgroundColor: theme.inactive }]}>
        <Animated.View
          style={[styles.catFill, {
            backgroundColor: color,
            width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${ancho}%`] }),
          }]}
        />
      </View>
      {open && (
        <View style={styles.catDetail}>
          <Text style={[styles.catDetailText, { color: theme.textDim }]}>
            {cat.movimientos} {cat.movimientos === 1 ? 'movimiento' : 'movimientos'} · {yen(cat.promedio)} en promedio
          </Text>
          {cat.bruto !== cat.neto && (
            <Text style={[styles.catDetailText, { color: theme.secondary }]}>
              Pagaste {yen(cat.bruto)} pero volvieron {yen(cat.bruto - cat.neto)}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

export const FinanceReportScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();

  const [periodo, setPeriodo] = useState<PeriodKey>('MES');
  const [tipoDesglose, setTipoDesglose] = useState<TipoMovimiento>('GASTO');
  const [desde, setDesde] = useState<string | null>(null);
  const [resumen, setResumen] = useState<PeriodSummary | null>(null);
  const [prev, setPrev] = useState<PeriodSummary | null>(null);
  const [cats, setCats] = useState<CategoryBreakdown[]>([]);
  const [catsPrev, setCatsPrev] = useState<CategoryBreakdown[]>([]);
  const [serie, setSerie] = useState<MonthPoint[]>([]);
  const [top, setTop] = useState<Transaction[]>([]);
  const [deudas, setDeudas] = useState<Receivable[]>([]);
  const [abierta, setAbierta] = useState<string | null>(null);

  const rango = useMemo(() => resolverPeriodo(periodo, desde), [periodo, desde]);

  const intro = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(intro, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);

  useFocusEffect(useCallback(() => {
    getFirstTransactionDate().then(setDesde).catch(() => setDesde(null));
  }, []));

  useEffect(() => {
    let vivo = true;
    const cargar = async () => {
      try {
        // La evolucion siempre mira los ultimos 6 meses: con el periodo "mes"
        // la serie seria un solo punto y no contaria ninguna historia.
        const hoy = new Date();
        const serieStart = stamp(new Date(hoy.getFullYear(), hoy.getMonth() - 5, 1));
        const serieEnd = stamp(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1));

        const [r, c, s, t, d] = await Promise.all([
          getPeriodSummary(rango.start, rango.end),
          getBreakdownByCategory(rango.start, rango.end, tipoDesglose),
          getMonthlySeries(serieStart, serieEnd),
          getTopExpenses(rango.start, rango.end, 5),
          getReceivables(),
        ]);
        if (!vivo) return;
        setResumen(r); setCats(c); setSerie(completarMeses(s, 6)); setTop(t); setDeudas(d);

        if (rango.prevStart && rango.prevEnd) {
          const [rp, cp] = await Promise.all([
            getPeriodSummary(rango.prevStart, rango.prevEnd),
            getBreakdownByCategory(rango.prevStart, rango.prevEnd, tipoDesglose),
          ]);
          if (!vivo) return;
          setPrev(rp); setCatsPrev(cp);
        } else {
          setPrev(null); setCatsPrev([]);
        }
      } catch (e) {
        console.error('Error cargando desglose', e);
      }
    };
    cargar();
    return () => { vivo = false; };
  }, [rango, tipoDesglose]);

  // Colores derivados una sola vez para toda la serie, igual que en el donut.
  const colores = useMemo(
    () => distinguishColors(cats.map((c) => c.color), theme.primary),
    [cats, theme.primary]
  );

  const totalDesglose = cats.reduce((s, c) => s + c.neto, 0);
  const maxCat = cats.reduce((m, c) => Math.max(m, c.neto), 0);
  const dias = diasDelPeriodo(rango.start, rango.end);
  const gastoDiario = (resumen?.gastosNetos || 0) / dias;
  const tasaAhorro = (resumen?.ingresosNetos || 0) > 0
    ? ((resumen!.ingresosNetos - resumen!.gastosNetos) / resumen!.ingresosNetos) * 100
    : null;
  const pendienteTotal = deudas.reduce((s, r) => s + r.pendiente, 0);

  // Variacion por categoria contra el periodo equivalente anterior.
  const variaciones = useMemo(() => {
    if (!catsPrev.length && !cats.length) return [];
    const antes: Record<string, number> = {};
    catsPrev.forEach((c) => { antes[c.nombre] = c.neto; });
    return cats
      .map((c) => {
        const ant = antes[c.nombre] || 0;
        const delta = c.neto - ant;
        const pct = ant > 0 ? (delta / ant) * 100 : null;
        return { nombre: c.nombre, color: c.color, delta, pct, nuevo: ant === 0 };
      })
      .filter((v) => Math.abs(v.delta) > 0.5)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 5);
  }, [cats, catsPrev]);

  const maxSerie = serie.reduce((m, p) => Math.max(m, p.ingresos, p.gastos), 0);

  const Tag = ({ text }: { text: string }) => (
    <View style={styles.tagWrap}><PersonaShard label={text} /></View>
  );

  const Vacio = ({ texto }: { texto: string }) => (
    <Text style={[styles.vacio, { color: theme.textDim }]}>{texto}</Text>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.topHeader}>
        <PressableScale style={[styles.backBtn, { borderColor: theme.border, backgroundColor: theme.surface }]} onPress={() => navigation.goBack()} scaleTo={0.88}>
          <Ionicons name="chevron-back" size={22} color={theme.primary} />
        </PressableScale>
        <PersonaShard label="DESGLOSE" height={50} fontSize={28} font={theme.fonts?.title} />
      </View>

      <Animated.View style={{ flex: 1, opacity: intro, transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 150 }} showsVerticalScrollIndicator={false}>

          {/* PERIODO */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {PERIODOS.map((p, i) => {
              const on = periodo === p.key;
              const acc = i % 2 === 0 ? theme.primary : theme.secondary;
              return (
                <TouchableOpacity
                  key={p.key}
                  activeOpacity={0.85}
                  onPress={() => { setPeriodo(p.key); setAbierta(null); }}
                  style={[styles.chip, { borderColor: acc, backgroundColor: on ? acc : theme.surface }]}
                >
                  <Text style={[styles.chipText, { color: on ? getContrastText(acc) : theme.textDim, fontFamily: theme.fonts?.heading }]}>{p.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={[styles.periodoTitulo, { color: theme.text, fontFamily: theme.fonts?.title }]}>{rango.titulo}</Text>

          {/* RESUMEN */}
          <View style={styles.tileGrid}>
            <Tile label="INGRESOS" value={yen(resumen?.ingresosNetos || 0)} accent={theme.success} />
            <Tile label="GASTOS" value={yen(resumen?.gastosNetos || 0)} accent={theme.error} />
          </View>
          <View style={styles.tileGrid}>
            <Tile
              label="TE QUEDÓ"
              value={`${(resumen?.balance || 0) < 0 ? '-' : ''}${yen(resumen?.balance || 0)}`}
              accent={(resumen?.balance || 0) >= 0 ? theme.success : theme.error}
              sub={tasaAhorro != null ? `${tasaAhorro.toFixed(0)}% de lo que entró` : undefined}
            />
            <Tile
              label="POR DÍA"
              value={yen(gastoDiario)}
              accent={theme.primary}
              sub={`${resumen?.movimientos || 0} movimientos`}
            />
          </View>

          {/* COMPARATIVA GLOBAL */}
          {prev && rango.compara && (
            <View style={[styles.compareCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {(() => {
                const ant = prev.gastosNetos;
                const act = resumen?.gastosNetos || 0;
                const delta = act - ant;
                const pct = ant > 0 ? (delta / ant) * 100 : null;
                const peor = delta > 0;
                return (
                  <>
                    <MaterialCommunityIcons
                      name={peor ? 'trending-up' : 'trending-down'}
                      size={22}
                      color={peor ? theme.error : theme.success}
                    />
                    <Text style={[styles.compareText, { color: theme.text, fontFamily: theme.fonts?.body }]}>
                      {pct == null
                        ? `Gastaste ${yen(act)}. No hay con qué comparar en ${rango.compara.toLowerCase()}.`
                        : `Gastaste ${yen(Math.abs(delta))} ${peor ? 'más' : 'menos'} que ${rango.compara.toLowerCase()} (${pct > 0 ? '+' : ''}${pct.toFixed(0)}%).`}
                    </Text>
                  </>
                );
              })()}
            </View>
          )}

          {/* DESGLOSE POR CATEGORIA */}
          <Tag text="A DÓNDE SE FUE" />
          <View style={styles.toggleRow}>
            {(['GASTO', 'INGRESO'] as const).map((t) => {
              const on = tipoDesglose === t;
              const acc = t === 'GASTO' ? theme.error : theme.success;
              return (
                <TouchableOpacity
                  key={t}
                  activeOpacity={0.85}
                  onPress={() => { setTipoDesglose(t); setAbierta(null); }}
                  style={[styles.toggleBtn, { borderColor: acc, backgroundColor: on ? acc : theme.surface }]}
                >
                  <Text style={[styles.toggleText, { color: on ? getContrastText(acc) : theme.textDim, fontFamily: theme.fonts?.heading }]}>
                    {t === 'GASTO' ? 'GASTOS' : 'INGRESOS'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {cats.length === 0 ? (
              <Vacio texto="Sin movimientos en este periodo." />
            ) : (
              <>
                {cats.map((c, i) => (
                  <CatBar
                    key={`${c.id_categoria ?? 'x'}-${c.nombre}`}
                    cat={c}
                    color={colores[i]}
                    max={maxCat}
                    total={totalDesglose}
                    delay={i * 70}
                    open={abierta === c.nombre}
                    onPress={() => setAbierta(abierta === c.nombre ? null : c.nombre)}
                  />
                ))}
                <Text style={[styles.cardFoot, { color: theme.textDim }]}>Toca una categoría para ver el detalle.</Text>
              </>
            )}
          </View>

          {/* VARIACIONES */}
          {variaciones.length > 0 && rango.compara && (
            <>
              <Tag text={`VS ${rango.compara}`} />
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                {variaciones.map((v) => {
                  const sube = v.delta > 0;
                  const acc = sube ? theme.error : theme.success;
                  return (
                    <View key={v.nombre} style={styles.varRow}>
                      <View style={[styles.varDot, { backgroundColor: v.color || theme.primary }]} />
                      <Text style={[styles.varName, { color: theme.text, fontFamily: theme.fonts?.bold }]} numberOfLines={1}>{v.nombre}</Text>
                      <MaterialCommunityIcons name={sube ? 'arrow-up-bold' : 'arrow-down-bold'} size={14} color={acc} />
                      <Text style={[styles.varDelta, { color: acc, fontFamily: theme.fonts?.display }]}>
                        {yen(v.delta)}
                      </Text>
                      <Text style={[styles.varPct, { color: theme.textDim }]}>
                        {v.nuevo ? 'nuevo' : `${v.pct! > 0 ? '+' : ''}${v.pct!.toFixed(0)}%`}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {/* EVOLUCION 6 MESES */}
          <Tag text="ÚLTIMOS 6 MESES" />
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {maxSerie <= 0 ? (
              <Vacio texto="Todavía no hay historial suficiente." />
            ) : (
              <>
                <View style={styles.serieRow}>
                  {serie.map((p) => {
                    const mes = Number(p.mes.slice(5, 7)) - 1;
                    const hIn = maxSerie > 0 ? Math.max(2, (p.ingresos / maxSerie) * 90) : 2;
                    const hGa = maxSerie > 0 ? Math.max(2, (p.gastos / maxSerie) * 90) : 2;
                    return (
                      <View key={p.mes} style={styles.serieCol}>
                        <View style={styles.serieBars}>
                          <View style={[styles.serieBar, { height: hIn, backgroundColor: theme.success }]} />
                          <View style={[styles.serieBar, { height: hGa, backgroundColor: theme.error }]} />
                        </View>
                        <Text style={[styles.serieLabel, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>{MES_ABBR[mes]}</Text>
                      </View>
                    );
                  })}
                </View>
                <View style={styles.serieLegend}>
                  <View style={[styles.legendDot, { backgroundColor: theme.success }]} />
                  <Text style={[styles.legendText, { color: theme.textDim }]}>Ingresos</Text>
                  <View style={[styles.legendDot, { backgroundColor: theme.error, marginLeft: 16 }]} />
                  <Text style={[styles.legendText, { color: theme.textDim }]}>Gastos</Text>
                </View>
              </>
            )}
          </View>

          {/* TOP GASTOS */}
          <Tag text="LOS MÁS CAROS" />
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {top.length === 0 ? (
              <Vacio texto="Sin gastos en este periodo." />
            ) : top.map((t, i) => (
              <View key={t.id_finanza} style={styles.topRow}>
                <Text style={[styles.topRank, { color: theme.textDim, fontFamily: theme.fonts?.display }]}>{i + 1}</Text>
                <View style={[styles.topSwatch, { backgroundColor: t.cat_color || theme.inactive }]}>
                  <CategoryIcon category={getCategory(t.cat_icono || 'tag').key} size={15} skew={0} color={getContrastText(t.cat_color || undefined)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.topDesc, { color: theme.text, fontFamily: theme.fonts?.bold }]} numberOfLines={1}>
                    {t.descripcion || 'Sin descripción'}
                  </Text>
                  <Text style={[styles.topSub, { color: theme.textDim }]} numberOfLines={1}>
                    {t.categoria || '—'}
                    {t.cobrado > 0 ? ` · pagaste ${yen(t.monto)}, volvieron ${yen(t.cobrado)}` : ''}
                  </Text>
                </View>
                <Text style={[styles.topAmount, { color: theme.error, fontFamily: theme.fonts?.display }]}>{yen(t.neto)}</Text>
              </View>
            ))}
          </View>

          {/* POR COBRAR */}
          {deudas.length > 0 && (
            <>
              <Tag text="POR RECUPERAR" />
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.secondary }]}>
                <View style={styles.debtHead}>
                  <Text style={[styles.debtHeadLabel, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>DINERO QUE AÚN NO VUELVE</Text>
                  <Text style={[styles.debtHeadValue, { color: theme.secondary, fontFamily: theme.fonts?.display }]}>{yen(pendienteTotal)}</Text>
                </View>
                {deudas.map((r) => (
                  <View key={r.id_liquidacion} style={styles.debtRow}>
                    <View style={[styles.varDot, { backgroundColor: r.cat_color || theme.secondary }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.debtWho, { color: theme.text, fontFamily: theme.fonts?.bold }]} numberOfLines={1}>{r.contraparte || 'Sin concepto'}</Text>
                      <Text style={[styles.debtWhat, { color: theme.textDim }]} numberOfLines={1}>{r.descripcion || 'Sin descripción'}</Text>
                    </View>
                    <Text style={[styles.debtAmount, { color: theme.secondary, fontFamily: theme.fonts?.display }]}>{yen(r.pendiente)}</Text>
                  </View>
                ))}
                <Text style={[styles.cardFoot, { color: theme.textDim }]}>Se registran desde el movimiento, en Finanzas.</Text>
              </View>
            </>
          )}

        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  topHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 8, paddingBottom: 10, gap: 14 },
  backBtn: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },

  chipRow: { paddingVertical: 6, paddingRight: 16, gap: 10 },
  chip: { borderWidth: 1.5, borderRadius: 3, paddingVertical: 8, paddingHorizontal: 14, transform: [{ skewX: '-11deg' }] },
  chipText: { fontSize: 12, letterSpacing: 1.2, transform: [{ skewX: '11deg' }] },

  periodoTitulo: { fontSize: 22, letterSpacing: 1, marginTop: 14, marginBottom: 12 },

  tileGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  tile: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 13, paddingLeft: 16, overflow: 'hidden' },
  tileAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6 },
  tileLabel: { fontSize: 10, letterSpacing: 1.6 },
  tileValue: { fontSize: 24, marginTop: 2 },
  tileSub: { fontSize: 10, marginTop: 2 },

  compareCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, padding: 13, marginTop: 4 },
  compareText: { flex: 1, fontSize: 13, lineHeight: 18 },

  tagWrap: { marginTop: 24, marginBottom: 12 },

  toggleRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  toggleBtn: { flex: 1, borderWidth: 1.5, borderRadius: 3, paddingVertical: 9, alignItems: 'center', transform: [{ skewX: '-11deg' }] },
  toggleText: { fontSize: 13, letterSpacing: 1.3, transform: [{ skewX: '11deg' }] },

  card: { borderWidth: 1, borderRadius: 12, padding: 14 },
  cardFoot: { fontSize: 11, marginTop: 10, textAlign: 'center' },
  vacio: { fontSize: 13, textAlign: 'center', paddingVertical: 16 },

  // Barra de categoria
  catBlock: { marginBottom: 14 },
  catHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  catSwatch: { width: 24, height: 24, borderRadius: 2, justifyContent: 'center', alignItems: 'center' },
  catName: { flex: 1, fontSize: 14 },
  catPct: { fontSize: 12, letterSpacing: 0.5 },
  catValue: { fontSize: 15, minWidth: 64, textAlign: 'right' },
  catTrack: { height: 10, borderRadius: 2, overflow: 'hidden', transform: [{ skewX: '-12deg' }] },
  catFill: { height: '100%' },
  catDetail: { marginTop: 7, paddingLeft: 32 },
  catDetailText: { fontSize: 11, lineHeight: 16 },

  // Variaciones
  varRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7 },
  varDot: { width: 10, height: 10, borderRadius: 3, transform: [{ skewX: '-20deg' }] },
  varName: { flex: 1, fontSize: 14 },
  varDelta: { fontSize: 15 },
  varPct: { fontSize: 11, minWidth: 46, textAlign: 'right' },

  // Serie mensual
  serieRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 110 },
  serieCol: { flex: 1, alignItems: 'center' },
  serieBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 92 },
  serieBar: { width: 9, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  serieLabel: { fontSize: 9, letterSpacing: 0.8, marginTop: 5 },
  serieLegend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  legendDot: { width: 9, height: 9, borderRadius: 2, marginRight: 5, transform: [{ skewX: '-20deg' }] },
  legendText: { fontSize: 11 },

  // Top gastos
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  topRank: { fontSize: 17, width: 16, textAlign: 'center' },
  topSwatch: { width: 26, height: 26, borderRadius: 2, justifyContent: 'center', alignItems: 'center' },
  topDesc: { fontSize: 14 },
  topSub: { fontSize: 11, marginTop: 1 },
  topAmount: { fontSize: 16 },

  // Por cobrar
  debtHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  debtHeadLabel: { flex: 1, fontSize: 10, letterSpacing: 1.5 },
  debtHeadValue: { fontSize: 20 },
  debtRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  debtWho: { fontSize: 14 },
  debtWhat: { fontSize: 11, marginTop: 1 },
  debtAmount: { fontSize: 15 },
});

export default FinanceReportScreen;
