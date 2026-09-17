import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import Svg, { Path, Line, Circle, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../themes/useTheme';

// La onda del mes: el animo dia a dia como una linea. No pretende ser un
// calendario (para eso esta la pantalla de Calendario); lo que cuenta aqui es
// la FORMA del mes: si vino de subida, de bajada o a tumbos.

export const colorAnimo = (a: number | null | undefined, theme: any): string => {
  switch (a) {
    case 1: return theme.error;
    case 2: return theme.secondary;
    case 3: return theme.textDim;
    case 4: return theme.primary;
    case 5: return theme.success;
    default: return theme.inactive;
  }
};

interface Props {
  /** 'YYYY-MM-DD' -> animo 1..5 */
  animos: Record<string, number>;
  /** 'YYYY-MM' del mes dibujado */
  mes: string;
  /** Ultimo dia con datos posibles (hoy, si el mes es el actual) */
  hastaDia: number;
  diasDelMes: number;
  height?: number;
}

export const MoodWave = ({ animos, mes, hastaDia, diasDelMes, height = 150 }: Props) => {
  const theme = useTheme();

  const puntos = useMemo(() => {
    const out: { dia: number; animo: number }[] = [];
    for (let d = 1; d <= diasDelMes; d++) {
      const clave = `${mes}-${String(d).padStart(2, '0')}`;
      if (animos[clave] != null) out.push({ dia: d, animo: animos[clave] });
    }
    return out;
  }, [animos, mes, diasDelMes]);

  // El viewBox va en pixeles reales (medidos con onLayout) en vez de unidades
  // relativas estiradas: con preserveAspectRatio="none" los puntos se
  // deformaban en ovalos.
  const [W, setW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - W) > 1) setW(w);
  };

  const H = height;
  const padTop = 10;
  const padBottom = 10;
  const usableH = H - padTop - padBottom;

  const x = (dia: number) => ((dia - 1) / Math.max(1, diasDelMes - 1)) * W;
  // 1 abajo, 5 arriba.
  const y = (animo: number) => padTop + (1 - (animo - 1) / 4) * usableH;

  // Tramos: solidos entre dias consecutivos, punteados donde hubo un hueco sin
  // escribir. Asi la forma se sigue leyendo pero los huecos no se disimulan.
  const tramos = useMemo(() => {
    const out: { d: string; hueco: boolean }[] = [];
    for (let i = 1; i < puntos.length; i++) {
      const a = puntos[i - 1];
      const b = puntos[i];
      out.push({
        d: `M ${x(a.dia)} ${y(a.animo)} L ${x(b.dia)} ${y(b.animo)}`,
        hueco: b.dia - a.dia > 1,
      });
    }
    return out;
  }, [puntos, diasDelMes, W, H]);

  // Relleno bajo la linea, solo sobre los tramos continuos.
  const areaD = useMemo(() => {
    if (puntos.length < 2) return '';
    const base = padTop + usableH;
    let d = `M ${x(puntos[0].dia)} ${base}`;
    puntos.forEach((p) => { d += ` L ${x(p.dia)} ${y(p.animo)}`; });
    d += ` L ${x(puntos[puntos.length - 1].dia)} ${base} Z`;
    return d;
  }, [puntos, diasDelMes, W, H]);

  if (puntos.length === 0) {
    return (
      <View style={styles.vacio}>
        <Text style={[styles.vacioText, { color: theme.textDim }]}>
          Marca cómo te fue cada día y aquí verás la forma del mes.
        </Text>
      </View>
    );
  }

  return (
    <View>
      <View style={{ flexDirection: 'row' }}>
        {/* Etiquetas del eje: solo los extremos, que es lo que se interpreta */}
        <View style={[styles.ejeY, { height }]}>
          <Text style={[styles.ejeTextTop, { color: theme.success, fontFamily: theme.fonts?.condensed }]}>BIEN</Text>
          <Text style={[styles.ejeTextBottom, { color: theme.error, fontFamily: theme.fonts?.condensed }]}>MAL</Text>
        </View>

        <View style={{ flex: 1 }} onLayout={onLayout}>
          {W > 0 && (
          <Svg width={W} height={H}>
            <Defs>
              <LinearGradient id="moodFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={theme.primary} stopOpacity="0.35" />
                <Stop offset="1" stopColor={theme.primary} stopOpacity="0" />
              </LinearGradient>
            </Defs>

            {/* Rejilla: una linea por nivel de animo */}
            {[1, 2, 3, 4, 5].map((n) => (
              <Line
                key={n}
                x1={0} y1={y(n)} x2={W} y2={y(n)}
                stroke={theme.border}
                strokeWidth={n === 3 ? 1 : 0.5}
                opacity={n === 3 ? 0.9 : 0.5}
              />
            ))}

            {/* Marca de hoy */}
            {hastaDia >= 1 && hastaDia <= diasDelMes && (
              <Line
                x1={x(hastaDia)} y1={padTop} x2={x(hastaDia)} y2={padTop + usableH}
                stroke={theme.primary} strokeWidth={1} strokeDasharray="4 4" opacity={0.6}
              />
            )}

            {!!areaD && <Path d={areaD} fill="url(#moodFill)" />}

            {tramos.map((t, i) => (
              <Path
                key={i}
                d={t.d}
                stroke={theme.primary}
                strokeWidth={t.hueco ? 1.5 : 2.5}
                strokeDasharray={t.hueco ? '5 4' : undefined}
                opacity={t.hueco ? 0.45 : 1}
                fill="none"
                strokeLinecap="round"
              />
            ))}

            {puntos.map((p) => (
              <Circle
                key={p.dia}
                cx={x(p.dia)}
                cy={y(p.animo)}
                r={puntos.length > 20 ? 2.5 : 3.5}
                fill={colorAnimo(p.animo, theme)}
                stroke={theme.surface}
                strokeWidth={1}
              />
            ))}
          </Svg>
          )}

          {/* Eje X: primero, mitad y ultimo dia */}
          <View style={styles.ejeX}>
            <Text style={[styles.ejeXText, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>1</Text>
            <Text style={[styles.ejeXText, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>
              {Math.round(diasDelMes / 2)}
            </Text>
            <Text style={[styles.ejeXText, { color: theme.textDim, fontFamily: theme.fonts?.condensed }]}>{diasDelMes}</Text>
          </View>
        </View>
      </View>

      {tramos.some((t) => t.hueco) && (
        <Text style={[styles.nota, { color: theme.textDim }]}>
          El tramo punteado son días que no escribiste.
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  ejeY: { width: 34, justifyContent: 'space-between', paddingVertical: 6, marginRight: 4 },
  ejeTextTop: { fontSize: 8, letterSpacing: 1 },
  ejeTextBottom: { fontSize: 8, letterSpacing: 1 },
  ejeX: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  ejeXText: { fontSize: 9, letterSpacing: 0.8 },
  nota: { fontSize: 10, marginTop: 8 },
  vacio: { paddingVertical: 22, paddingHorizontal: 6 },
  vacioText: { fontSize: 12, lineHeight: 17, textAlign: 'center' },
});

export default MoodWave;
