import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Polygon, Line, Text as SvgText, Circle } from 'react-native-svg';
import { StatViewData } from '../../hooks/usePlayerStats';
import { useTheme } from '../../themes/useTheme';

interface Props {
  stats: StatViewData[]; // La lista COMPLETA de stats disponibles
  selectedStatsIds?: number[]; // IDs seleccionados (puede ser undefined)
  size?: number;
  color?: string;
}

export const StatRadarChart = ({ stats, selectedStatsIds, size = 250, color }: Props) => {
  const theme = useTheme();
  const strokeColor = color || theme.primary;

  // 1. DEFINIR QUÉ MOSTRAR (Lógica Dinámica)
  const statsToShow = useMemo(() => {
    let result: StatViewData[] = [];

    if (selectedStatsIds && selectedStatsIds.length > 0) {
      // A. Si hay selección manual, respetamos estrictamente esa lista
      result = selectedStatsIds
        .map(id => stats.find(s => s.id_stat === id))
        .filter(Boolean) as StatViewData[];
    } else {
      // B. Si NO hay selección, mostramos TODOS los stats disponibles
      // Ordenamos por ID o nombre para consistencia visual
      result = [...stats].sort((a, b) => a.id_stat - b.id_stat);
    }

    // C. Mínimo de seguridad: Para que el gráfico tenga forma (área), necesitamos al menos 3 puntos.
    // Si hay menos de 3, rellenamos con placeholders invisibles o repetimos para no romper el SVG.
    // Aunque en tu caso, si tienes 1 o 2 stats, se verá una línea o punto.
    return result;
  }, [stats, selectedStatsIds]);

  const totalVars = statsToShow.length || 1; // Evitar división por cero
  const center = size / 2;
  const radius = (size / 2) - 40; // Margen para etiquetas

  // Calculamos el máximo individual por eje (si nivel_maximo es 0 o null, usamos 100 por defecto)
  const statMaxes = statsToShow.map(s => (s as any).nivel_maximo || 100);

  // FUNCIÓN MAESTRA DE COORDENADAS (Dinámica)
  const getCoordinates = (value: number, index: number, axisMax: number) => {
    // Aquí está la magia: dividimos el círculo (2PI) entre el número total de variables
    const angle = (Math.PI * 2 * index) / totalVars - Math.PI / 2; 
    
    const clampedValue = Math.min(value || 0, axisMax);
    const r = (clampedValue / axisMax) * radius;
    
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  // Construimos el string de puntos para el polígono relleno (DATA)
  const dataPoints = statsToShow.map((stat, i) => {
    const val = (stat as any).nivel_actual || 0;
    const axisMax = statMaxes[i];
    const coords = getCoordinates(val, i, axisMax);
    return `${coords.x},${coords.y}`;
  }).join(' ');

  // Renderiza la "telaraña" de fondo
  const renderGrid = () => {
    // Si hay menos de 3 variables, la grilla no se ve bien como polígono, pero lo manejamos igual.
    return [1, 0.75, 0.5, 0.25].map((scale, k) => {
      const points = statsToShow.map((_, i) => {
        const axisMax = statMaxes[i];
        // Calculamos el punto al X% del radio máximo
        const coords = getCoordinates(axisMax * scale, i, axisMax);
        return `${coords.x},${coords.y}`;
      }).join(' ');
      
      return (
        <Polygon 
          key={`grid-${k}`} 
          points={points} 
          stroke={theme.border} 
          strokeWidth="1" 
          fill={k === 0 ? theme.surface : "none"} // Fondo opcional en el anillo externo
          fillOpacity="0.3"
        />
      );
    });
  };

  const renderLabels = () => {
    return statsToShow.map((stat, i) => {
      const angle = (Math.PI * 2 * i) / totalVars - Math.PI / 2;
      const labelRadius = radius + 25; // Un poco más lejos para el texto
      const x = center + labelRadius * Math.cos(angle);
      const y = center + labelRadius * Math.sin(angle);

      let label = (stat.nombre_stat || '???').toUpperCase();
      // Acortar nombres muy largos si son muchos stats para que no se encimen
      if (totalVars > 5 && label.length > 6) label = label.substring(0, 5) + '.';

      return (
        <SvgText
          key={`label-${i}`}
          x={x}
          y={y}
          fill={theme.text}
          fontSize={totalVars > 6 ? "9" : "11"} // Ajustar fuente si hay muchos
          fontWeight="bold"
          textAnchor="middle"
          alignmentBaseline="middle"
        >
          {label}
        </SvgText>
      );
    });
  };

  if (totalVars === 0) return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      <Svg height={size} width={size}>
        {/* 1. Grilla de Fondo */}
        {renderGrid()}

        {/* 2. Ejes (Líneas desde el centro) */}
        {statsToShow.map((_, i) => {
          const axisMax = statMaxes[i];
          const end = getCoordinates(axisMax, i, axisMax);
          return (
            <Line 
              key={`axis-${i}`} 
              x1={center} 
              y1={center} 
              x2={end.x} 
              y2={end.y} 
              stroke={theme.border} 
              strokeOpacity="0.5"
              strokeWidth="1" 
            />
          );
        })}

        {/* 3. Polígono de Datos (El Fill) */}
        <Polygon 
          points={dataPoints} 
          fill={strokeColor} 
          fillOpacity="0.4" 
          stroke={strokeColor} 
          strokeWidth="2" 
        />

        {/* 4. Puntos en los vértices */}
        {statsToShow.map((stat, i) => {
          const axisMax = statMaxes[i];
          const coords = getCoordinates((stat as any).nivel_actual || 0, i, axisMax);
          return (
            <Circle 
              key={`dot-${i}`} 
              cx={coords.x} 
              cy={coords.y} 
              r="3" 
              fill={theme.background} // Centro del punto color fondo
              stroke={strokeColor}    // Borde del color principal
              strokeWidth="2"
            />
          );
        })}

        {/* 5. Etiquetas */}
        {renderLabels()}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', marginVertical: 20 },
});
