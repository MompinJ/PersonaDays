# Stats UI — PersonaDays · v1

Módulo limpio y autocontenido de los **5 atributos sociales**: iconos propios
(dirección **Shard**, inclinados 12°) + los componentes **StatChipCascade** y
**StatCard**.

> **Dónde va:** `src/components/stats/`
> Las rutas relativas de import asumen esa ubicación (ver más abajo).

## Contenido

```
stats/
├─ icons/                     SVG monocromáticos (currentColor)
│  ├─ StatKnowledge.svg        CONOCIMIENTO  · libro abierto
│  ├─ StatGuts.svg             CORAJE        · llama
│  ├─ StatProficiency.svg      DESTREZA      · engranaje
│  ├─ StatKindness.svg         GENTILEZA     · corazón facetado
│  └─ StatCharm.svg            CARISMA       · chispa
├─ stats.ts                   StatKey, STATS (label + icono), STAT_ORDER
├─ StatIcon.tsx               icono de un stat (color + skew)
├─ StatChipCascade.tsx        chips seleccionables "en cascada"
├─ StatCard.tsx               tarjeta de stat (icono + nivel + XP)
├─ index.ts                   barrel de exports
└─ svg.d.ts                   tipado de *.svg (bórralo si ya lo tienes)
```

## Setup (una vez)

Necesita `react-native-svg` (Expo SDK 52 ya lo trae) y, para importar los
`.svg` como componentes, [`react-native-svg-transformer`](https://github.com/kristerkari/react-native-svg-transformer):

```js
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer/expo');
config.resolver.assetExts = config.resolver.assetExts.filter((e) => e !== 'svg');
config.resolver.sourceExts.push('svg');
module.exports = config;
```

## Uso

```tsx
import { StatIcon, StatChipCascade, StatCard } from '../components/stats';
import { useTheme } from '../themes/useTheme';

const theme = useTheme();

// 1) Icono suelto (se tiñe con el personaje activo)
<StatIcon stat="coraje" size={28} color={theme.primary} />
<StatIcon stat="conocimiento" size={24} color={theme.primary} skew={0} /> {/* derecho para tab bar */}

// 2) Selector de impacto (qué stat sube la misión)
const [stat, setStat] = useState<StatKey>('conocimiento');
<StatChipCascade selected={stat} onSelect={setStat} />

// 3) Tarjeta de stat
<StatCard stat="carisma" level={7} xp={1360} xpMax={2000} />
```

## Decisiones de diseño

- **Color = personaje, forma = app.** Los iconos son `currentColor`: pásales
  `color={theme.primary}` (o el color de categoría). Nunca hardcodear.
- **Inclinación 12° por defecto.** Los SVG nacen **derechos a 0°** (reutilizables
  y legibles); `StatIcon` aplica el skew con un `<View>`. Usa `skew={0}` donde
  necesites el glifo recto (tab bar, listas densas). En los chips el icono va
  derecho y el contenedor entero contra-inclina.
- **Esquinas afiladas (0px)** en chips y card, fiel a P3R.

## Dependencias del proyecto que se asumen

| Import | De dónde |
| :--- | :--- |
| `useTheme` | `src/themes/useTheme` |
| `getContrastText` | `src/utils/colorUtils` |
| `PersonaCount` | `src/components/UI/PersonaCount` |

Ajusta las rutas si tu estructura difiere. `StatCard` usa `PersonaCount` para el
nivel (ceros tenues + valor sólido); si tu export no es default, cámbialo en el
import.

## Mapear a la base de datos

`StatKey` usa los nombres ES (`conocimiento`, `coraje`, …). Si en SQLite tu stat
tiene otro id, edita las llaves de `STATS` en `stats.ts` o agrega un mapa
`dbId → StatKey`. Los **stats personalizados (hijos)** heredan el icono de su
stat padre: resuelve el padre y pásalo a `StatIcon`.
