import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Polygon, Line, Text as SvgText, Circle } from 'react-native-svg';
import { StatViewData } from '../hooks/usePlayerStats';
import { useTheme } from '../themes/useTheme';

interface Props {
  stats: StatViewData[]; // La lista COMPLETA de stats
  selectedStatsIds?: number[]; // IDs de las 5 stats a mostrar (opcional)
  size?: number;
  color?: string;
}

export const StatRadarChart = ({ stats, selectedStatsIds, size = 250, color }: Props) => {
  const theme = useTheme();
  const strokeColor = color || theme.primary;

  // 1. DEFINIR QUÉ MOSTRAR
  let statsToShow: StatViewData[] = [];

  if (selectedStatsIds && selectedStatsIds.length === 5) {
    statsToShow = selectedStatsIds.map(id => stats.find(s => s.id_stat === id)).filter(Boolean) as StatViewData[];
  } else {
    const defaultIds = [1, 5, 3, 4, 2]; // Orden visual: Conocimiento, Carisma, Destreza, Gentileza, Coraje
    statsToShow = defaultIds.map(id => stats.find(s => s.id_stat === id)).filter(Boolean) as StatViewData[];
  }

  // Si no hay suficientes, rellenar con placeholders
  while (statsToShow.length < 5) {
    statsToShow.push({ id_stat: -1, nombre_stat: '???', nivel_actual: 0 } as any);
  }

  const center = size / 2;
  const radius = (size / 2) - 40;

  // Calculamos el maximo por cada stat (si no existe usamos 99)
  const statMaxes = statsToShow.map(s => (s && (s as any).nivel_maximo) ? (s as any).nivel_maximo : 99);

  const getCoordinates = (value: number, index: number, axisMax: number) => {
    const angle = (Math.PI * 2 * index) / 5 - Math.PI / 2;
    const clampedValue = Math.min(value || 0, axisMax || 99);
    const r = (clampedValue / (axisMax || 99)) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  // Construimos puntos usando cada eje su propio max
  const dataPoints = statsToShow.map((stat, i) => {
    const val = (stat && (stat as any).nivel_actual) || 0;
    const axisMax = statMaxes[i] || 99;
    const coords = getCoordinates(val, i, axisMax);
    return `${coords.x},${coords.y}`;
  }).join(' ');

  const renderGrid = () => {
    return [1, 0.75, 0.5, 0.25].map((scale, k) => {
      const points = Array.from({ length: 5 }).map((_, i) => {
        const axisMax = statMaxes[i] || 99;
        const coords = getCoordinates(axisMax * scale, i, axisMax);
        return `${coords.x},${coords.y}`;
      }).join(' ');
      return <Polygon key={k} points={points} stroke={theme.border} strokeWidth="1" fill="none" />;
    });
  };

  const renderLabels = () => {
    return statsToShow.map((stat, i) => {
      const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      const labelRadius = radius + 20;
      const x = center + labelRadius * Math.cos(angle);
      const y = center + labelRadius * Math.sin(angle);

      let label = (stat.nombre_stat || '???').toUpperCase();
      if (label.length > 8) label = label.substring(0, 7) + '.';

      return (
        <SvgText
          key={i}
          x={x}
          y={y}
          fill={theme.text}
          fontSize="10"
          fontWeight="bold"
          textAnchor="middle"
          alignmentBaseline="middle"
        >
          {label}
        </SvgText>
      );
    });
  };

  return (
    <View style={styles.container}>
      <Svg height={size} width={size}>
        {renderGrid()}

        {Array.from({ length: 5 }).map((_, i) => {
          const axisMax = statMaxes[i] || 99;
          const end = getCoordinates(axisMax, i, axisMax);
          return <Line key={`l-${i}`} x1={center} y1={center} x2={end.x} y2={end.y} stroke={theme.border} strokeWidth="1" />;
        })}

        <Polygon points={dataPoints} fill={strokeColor} fillOpacity="0.5" stroke={strokeColor} strokeWidth="2" />

        {statsToShow.map((stat, i) => {
          const axisMax = statMaxes[i] || 99;
          const coords = getCoordinates((stat && (stat as any).nivel_actual) || 0, i, axisMax);
          return <Circle key={`d-${i}`} cx={coords.x} cy={coords.y} r="3" fill={theme.text} />;
        })}

        {renderLabels()}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', marginVertical: 20 },
});
