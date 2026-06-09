# Iconos de Menú — PersonaDays

Set de iconos para los módulos del menú, en lenguaje angular P3R.
Grid 48×48, esquinas 0px, **monocromáticos (`currentColor`)** para teñirse con
`theme.primary` del protagonista activo.

## Archivos

```
svg/menu/
├─ calendario.svg   · calendario-activo.svg   (bloque + día marcado)
├─ arcos.svg        · arcos-activo.svg         (arco facetado + hito)
├─ notas.svg        · notas-activo.svg         (hoja doblada + líneas)
├─ galeria.svg      · galeria-activo.svg       (marco + cumbres + chispa)
├─ correo.svg       · correo-activo.svg        (sobre angular)
├─ ajustes.svg      · ajustes-activo.svg       (faders, sin engranaje)
└─ alt/             alternativas (elegir si prefieres otro glifo)
   ├─ arcos_flag.svg · arcos_steps.svg
   ├─ ajustes_hsliders.svg
   ├─ galeria_stack.svg
   └─ notas_pencil.svg
```

- `nombre.svg` = estado **inactivo** (Monolito sólido).
- `nombre-activo.svg` = estado **activo**, con el corte diagonal **Shard** sustraído.

## Uso en react-native-svg

Con [`react-native-svg-transformer`](https://github.com/kristerkari/react-native-svg-transformer):

```tsx
import CalendarioIcon from '../../assets/icons/menu/calendario.svg';
import CalendarioOn   from '../../assets/icons/menu/calendario-activo.svg';

// fill="currentColor" → en RN se controla con la prop `color`
const Icon = active ? CalendarioOn : CalendarioIcon;
<Icon width={40} height={40} color={active ? theme.primary : theme.text} />
```

Mapa módulo → icono (para resolver dinámico):

```ts
import Calendario from './menu/calendario.svg';
import CalendarioOn from './menu/calendario-activo.svg';
import Arcos from './menu/arcos.svg';
import ArcosOn from './menu/arcos-activo.svg';
import Notas from './menu/notas.svg';
import NotasOn from './menu/notas-activo.svg';
import Galeria from './menu/galeria.svg';
import GaleriaOn from './menu/galeria-activo.svg';
import Correo from './menu/correo.svg';
import CorreoOn from './menu/correo-activo.svg';
import Ajustes from './menu/ajustes.svg';
import AjustesOn from './menu/ajustes-activo.svg';

export const MENU_ICONS = {
  calendario: { off: Calendario, on: CalendarioOn },
  arcos:      { off: Arcos,      on: ArcosOn },
  notas:      { off: Notas,      on: NotasOn },
  galeria:    { off: Galeria,    on: GaleriaOn },
  correo:     { off: Correo,     on: CorreoOn },
  ajustes:    { off: Ajustes,    on: AjustesOn },
} as const;
```

## Notas
- **No** hardcodear color en el SVG: dejar `currentColor` y pasar `color={theme.primary}`.
- Para el ángulo P3R, envolver en un `<View>` con `transform: [{ skewX: '-12deg' }]`
  (los archivos vienen derechos a 0° para máxima legibilidad).
- ¿Prefieres una alternativa de `alt/`? Renómbrala (p.ej. `arcos_flag.svg` → `arcos.svg`)
  o dime cuál y te regenero el par inactivo/activo.
