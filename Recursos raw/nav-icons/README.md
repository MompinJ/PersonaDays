# Nav Icons — PersonaDays · v1

Iconos de **navegación** (Home · Phone · Stats · Missions · Economy · Profile) en
lenguaje P3R, con estados **inactivo** (sólido) y **activo** (corte Shard).

> **Dónde va:** `src/components/nav-icons/`
> Las rutas relativas de import asumen esa ubicación.

## Contenido

```
nav-icons/
├─ icons/
│  ├─ monolito/   inactivo · sólido limpio
│  └─ shard/      activo   · con el corte diagonal P3R
│     Home · Phone · Stats · Missions · Economy · Profile
├─ tabs.ts        TabKey, TABS (label + glifo Idle/Active), TAB_ORDER
├─ TabIcon.tsx    icono de una pestaña (active + color)
├─ TabBar.tsx     barra completa de ejemplo (estados + subrayado)
├─ index.ts · svg.d.ts
```

## Glifos

| Tab | Glifo |
| :--- | :--- |
| Home | Casa |
| Phone | Smartphone |
| Stats | **Pentágono / radar** (atado a tu spider chart) |
| Missions | **Diana / objetivo** (quest marker) |
| Economy | **Moneda** (octágono con ¥) |
| Profile | **Máscara** (persona = máscara) |

> En el lienzo `Iconos Tabs.html` hay **alternativas**: Stats (barras),
> Missions (checklist), Economy (símbolo ¥) y Profile (busto). Si prefieres
> alguna, lo cambio y regenero ese par de SVG.

## Setup

Igual que el módulo de Stats: `react-native-svg` (Expo SDK 52 ya lo trae) +
[`react-native-svg-transformer`](https://github.com/kristerkari/react-native-svg-transformer)
en `metro.config.js`. Si ya lo configuraste para los iconos de Stats, no toques nada.

## Uso

```tsx
import { TabBar, TabIcon } from '../components/tabs';
import type { TabKey } from '../components/tabs';

// Barra propia
const [tab, setTab] = useState<TabKey>('missions');
<TabBar active={tab} onChange={setTab} />

// O un icono suelto
<TabIcon tab="economy" active size={26} color={theme.primary} />
```

### Con React Navigation

```tsx
<Tab.Navigator
  tabBar={(props) => (
    <TabBar
      active={props.state.routeNames[props.state.index] as TabKey}
      onChange={(k) => props.navigation.navigate(k)}
    />
  )}
>
  {/* screens con name="home" | "phone" | "stats" | "missions" | "economy" | "profile" */}
</Tab.Navigator>
```

## Decisiones de diseño

- **Inactivo = Monolito, Activo = Shard.** El estado activo no depende solo del
  color: recibe el corte diagonal P3R. Inactivo en `theme.textDim`, activo en
  `theme.primary`, más el subrayado inclinado.
- **Derecho a 0°.** Los glifos de tab no se inclinan (máxima legibilidad a 26px).
- **`currentColor`.** Siempre tiñe con el tema; cero hardcode.
- **Esquinas afiladas** y borde superior `primary` en la barra.

Dependencias asumidas: `useTheme` (`src/themes/useTheme`) y `theme.fonts.condensed`
(Barlow Condensed) para las etiquetas. Ajusta rutas si tu estructura difiere.
