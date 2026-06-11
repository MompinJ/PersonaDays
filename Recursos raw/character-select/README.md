# Character Select — P3R style (PersonaDays)

Pantalla de **selección de protagonista** estilo *Persona 3 Reload*: cartas
verticales a pantalla casi completa, una por personaje, con el tema de color
mutando por personaje. Prototipo de alta fidelidad en HTML/CSS/JS — pensado como
**referencia visual y de interacción** para portar al codebase RN/Expo.

> Hecho para integrarse con el Sistema de Diseño P3R (`uploads/Sistema_de_Diseno_P3R.md`)
> y con `themes/palettes.ts` (`CharacterTheme` + `ThemeColors`).

---

## Cómo verlo

Abre `Character Select.html` en un navegador (o en el preview). No necesita build:
React + Babel + las fuentes de Google se cargan por CDN.

Navegación: **arrastrar** la carta (mouse o touch), flechas laterales, los dots
inferiores, o las teclas ← / →.

---

## Estructura de archivos

| Archivo | Qué es |
| :--- | :--- |
| `Character Select.html` | Markup + todo el CSS. Lienzo fijo **460×940** escalado a viewport. |
| `character-data.js` | `window.CHARACTERS` — los 11 personajes (datos + paleta). **Única fuente de datos.** |
| `character-select.js` | Controlador vanilla: escalado, render temático, transición, drag, dots. |
| `tweaks-app.jsx` | Mini-app React que solo monta el panel de Tweaks y aplica variables CSS. |
| `tweaks-panel.jsx` | Shell del panel de Tweaks (componente reutilizable, no editar). |
| `image-slot.js` | Web component `<image-slot>` para arrastrar el arte de cada personaje. |

Carga (al final del `<body>`): `character-data.js` → `character-select.js`, luego
React/Babel → `tweaks-panel.jsx` → `tweaks-app.jsx`.

---

## Modelo de datos (`character-data.js`)

```js
{
  key:'makoto',                 // id estable (también la id del image-slot: art-<key>)
  name:'MAKOTO', surname:'YUKI',// nombre grande + apellido pequeño
  kata:'マコト',                 // katakana (fondo gigante + tira vertical)
  arc:'SEES · FIELD LEADER',    // rol/unidad (NO es un arcano)
  desc:'WILD CARD',             // descriptor de una línea (sin arcano)
  tag:'MEMENTO MORI',           // tagline en el shard
  t:{ primary, secondary, bg, surface, text, dim, inverse, border, glow }
}
```

Los tokens de `t` son un espejo 1:1 de `ThemeColors` en `palettes.ts`:

| `t.*` (aquí) | `ThemeColors` (palettes.ts) |
| :--- | :--- |
| `primary` | `primary` |
| `secondary` | `secondary` |
| `bg` | `background` |
| `surface` | `surface` |
| `text` / `dim` / `inverse` | `text` / `textDim` / `textInverse` |
| `border` | `border` |
| `glow` | `shadow` (resplandor del color) |

Orden actual = orden de `palettes.ts`: Makoto, Kotone, Yukari, Akihiko, Mitsuru,
Shinjiro, Ken, Koromaru, Fuuka, Junpei, Aigis.

---

## Theming

El color **es** identidad del personaje; la **forma** (inclinaciones, shards) es
constante — el principio §3 del sistema de diseño. `theme(c)` en
`character-select.js` escribe los tokens como **CSS custom properties** sobre
`#stage`:

```
--primary --secondary --bg --surface --text --dim --inverse --border --glow
```

Todo el resto del CSS lee de esas variables, así que cambiar de personaje muta la
pantalla entera (header, marco, dots, botón) sin tocar reglas.

> ⚠️ Las transiciones CSS **no** incluyen `background-color`/`color` que dependan
> de un `var()` — al transicionarlos, el color se queda "pegado" en el valor viejo.
> Por eso el cambio de tema es instantáneo y solo se animan `box-shadow`/`transform`.

Tipografías (roles del sistema, por CDN): **Anton** (`title`), **Bebas Neue**
(`heading`), **Barlow Condensed** (`condensed`), **Big Shoulders Display**
(`display`), **Exo 2** (`body`), + **Noto Sans JP** para katakana.

---

## Anatomía de la carta (capas, de atrás a adelante)

La carta es un lienzo de capas absolutas dentro de `.card` (marco neón) →
`.card-inner` (`overflow:hidden`, esquinas cortadas con `clip-path`):

1. `.bg-romaji` — nombre romaji **gigante**, sangra por los bordes, ~13% opacidad.
2. `.bg-kata` — katakana gigante, más tenue, vertical, abajo.
3. `.ribbon` / `.ribbon.thin` — cintas velvet diagonales (secondary/primary).
4. `.spotlight` — resplandor radial del color donde "está" el personaje.
5. `.silhouette` — silueta estilizada (CSS `clip-path`), visible cuando el hueco está vacío.
6. `.portrait > <image-slot>` — hueco de arte arrastrable (transparente al estar vacío).
7. `.scrim` — degradado inferior para que lea el texto.
8. `.kata-strip` — tira vertical de katakana en el borde derecho.
9. `.info` — columna anclada abajo: `arc` · `name`+`surname` · `tag` (shard) · `descriptor`.

El marco neón = `.card` (relleno `primary`) con `.card-inner` 3px adentro: el borde
visible es el `primary` que asoma. El glow es `drop-shadow` con `--glow`.

Inclinación global: variable `--skew` (default `-9deg`), aplicada con `transform:skewX()`
y contra-inclinada en los textos hijos para que queden legibles.

---

## Interacciones

- **Drag para deslizar** (`character-select.js`): Pointer Events (mouse + touch).
  Mientras arrastras, la carta se traslada/inclina/desvanece en vivo; al soltar
  con desplazamiento > 58px dispara `step(±1)`, si no, vuelve con spring.
  Los pointerdown sobre `.nav` se ignoran para no pisar las flechas.
- **Transición = corte seco + flash a pantalla completa** (`.flash`, hijo de
  `#stage`, `z-index:90`): un wash radial del `--glow` + una cuchilla blanca/primary
  barren **toda la pantalla**. El contenido se intercambia en el pico del flash
  (~120 ms) para esconder el corte. Entrada escalonada de `.info` después.
- **Entrada de `.info`**: la clase `swap` anima los hijos y **se retira a los 720 ms**
  para que descansen en su opacidad natural (nunca se quedan invisibles por
  `animation-fill`).

---

## Tweaks (panel en vivo)

`tweaks-app.jsx` expone controles que solo escriben variables CSS sobre `#stage`:

| Tweak | Variable / efecto |
| :--- | :--- |
| Loudness (Limpia/Media/Poster) | preset de glow + nombre de fondo + cintas |
| Glow | `--glow-mult` |
| Nombre gigante + Opacidad | `--bgname-op` |
| Cintas diagonales | `display` de `.ribbon` |
| Fuente del nombre | `--name-font` |
| Inclinación | `--skew` |
| Mostrar tagline | `--tagline-show` |

El carrusel (vanilla) y el panel (React) son independientes y solo se comunican
vía esas variables CSS — no comparten estado.

---

## Huecos de arte (`<image-slot>`)

Cada personaje tiene su hueco con id `art-<key>`. El usuario arrastra una imagen y
queda recortada al retrato; doble clic reencuadra. Hay una **silueta** detrás para
que la carta se vea bien aún vacía.

> Nota del preview: la persistencia del drop escribe un sidecar en la **raíz** del
> proyecto. En esta subcarpeta el drop funciona en sesión pero puede no persistir
> entre recargas — es una restricción solo del entorno de preview, irrelevante para
> la integración en la app (ahí se usa `Image`/`expo-image` con el asset real).

---

## Notas para portar a React Native / Expo

- **Tokens**: ya mapean a `ThemeColors`. Reusa `useTheme()`; cambia el personaje
  activo en el `GameContext` y deja que el color fluya como aquí.
- **Inclinaciones**: `skewX` → `transform:[{ skewX:'-9deg' }]` y contra-skew en el
  texto hijo (igual que `PersonaShard`). El shard del tagline = un `PersonaShard`.
- **Esquinas cortadas / marco**: en web es `clip-path`; en RN usa un SVG
  (`react-native-svg`) con un `Polygon`, o capas `View` con bordes — el marco neón
  es solo dos formas (relleno primary + inner bg 3px adentro).
- **Capas**: cada `.layer` → un `<View pointerEvents="none">` absoluto. El
  `bg-romaji`/`bg-kata` gigantes son `<Text>` con `numberOfLines={1}` y overflow.
- **Flash full-screen**: un `Animated.View` absoluto sobre todo, opacidad
  0→1→0 + un degradado que barre (translateX con `Animated`). Cambia el personaje
  en el pico.
- **Drag**: `PanGubResponder`/`react-native-gesture-handler` con la misma lógica
  (umbral ~58px → siguiente/anterior; feedback en vivo translate/rotate/opacity).
- **Movimiento**: respeta §6 del sistema (entradas 150–300 ms, ease-out). El
  retiro de la clase `swap` equivale a no dejar valores finales colgados.

## Para afinar / decisiones abiertas

- Taglines y descriptores son una propuesta (mejorados, sin arcano). Ajustables en
  `character-data.js`.
- `--skew` default `-9°`; `Poster` (loudness máximo) es el estado por defecto.
- Falta el **arte real** de cada personaje (hoy: silueta + image-slot).
