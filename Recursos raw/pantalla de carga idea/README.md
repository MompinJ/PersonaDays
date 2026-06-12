# 🌙 Pantalla de Carga — PersonaDays (P3R)

Splash / loading screen de **PersonaDays** en el lenguaje visual Persona 3 Reload.
Es un **prototipo de referencia en HTML + React (Babel in-browser)** — la app real es
React Native (Expo). Aquí se define el *look*, la animación y la anatomía; abajo van
las notas para portarlo.

> **Emblema elegido:** **Rueda Ritual** (pentagrama dentro de un anillo de marcas que
> gira lento). Es el mismo símbolo del logo — ver `../logo/`.

---

## ▶️ Cómo verlo
Abre **`Pantalla de Carga.html`** en el navegador. No requiere build ni servidor;
React, ReactDOM y Babel se cargan por CDN y las fuentes por Google Fonts.

## 📁 Archivos
| Archivo | Qué es |
| :--- | :--- |
| `Pantalla de Carga.html` | Shell: tokens CSS del tema, layout, animaciones, escala del lienzo. Monta React en `#stage`. |
| `carga-app.jsx` | Toda la lógica: temas por personaje, los 4 emblemas, el loader, la secuencia de entrada y el panel de Tweaks. |
| `tweaks-panel.jsx` | Panel de Tweaks reusable (protocolo del host + controles). No editar para esta pantalla. |

---

## 🎨 Sistema visual

**Lienzo fijo** `460 × 940` (proporción móvil) escalado a la ventana con
`transform: scale()` y centrado sobre negro (letterbox). Ver `fit()` al final de `carga-app.jsx`.

**Tokens de color** (CSS vars en `#stage`, reescritos por JS según el personaje):
`--acc` (acento), `--acc2`, `--acc-lo/-hi`, `--ink` (fondo), `--ink2`, `--text`,
`--dim`, `--faint`, `--ink-on` (texto sobre acento), `--glow`.
→ En la app real estos mapean a `theme.*` de `src/themes/palettes.ts` (`useTheme()`).

**Temas por personaje** — objeto `THEMES` en `carga-app.jsx` (los 11 de SEES: Makoto,
Kotone, Yukari, Akihiko, Mitsuru, Shinjiro, Ken, Fuuka, Junpei, Aigis). Color = identidad
del personaje; la forma (pentagrama, shards, inclinaciones) es constante.

**Tipografía** (roles, = `DEFAULT_FONTS`):
- `Anton` → wordmark / títulos
- `Big Shoulders Display` → números (el contador `%`)
- `Bebas Neue` → tagline
- `Barlow Condensed` → etiquetas meta (NOW LOADING, fases, SEES)
- `Exo 2` → cuerpo

---

## 🧩 Anatomía
- **Header:** pestaña `SEES · NIGHT OPS` (sup-izq) + `VER 3.0` (sup-der).
- **Centro:** eyebrow `THE REAL LIFE RPG` · **emblema** con halo pulsante · wordmark
  `PERSONA`+`DAYS` (DAYS en acento) · tagline `MEMENTO MORI`.
- **Loader (abajo):** `NOW LOADING` + contador `000–100 %` (ceros a la izquierda tenues,
  estilo PersonaCount) · barra angular (`skewX`) que se llena con sheen + ticks · línea de
  estado con **fases** (`PHASES` en JS: ESTABLECIENDO VÍNCULO → … → BIENVENIDO, PROTAGONISTA).
- **Fondo:** marca de agua `III` (Persona 3), líneas de velocidad diagonales, y un sigilo
  rotatorio (se **oculta** cuando el emblema es `rueda` para no duplicar el pentagrama).

## 🎞️ Movimiento
- **Entrada (sutil):** fade + `translateY` escalonado por elemento (`.seq`, clase `.reveal`).
- **Halo:** pulso lento. **Rueda:** el anillo de marcas gira (`.rueda-spin`, 42 s).
- **Loader:** el `%` corre 0→100 en `t.speed` segundos, mantiene 100 y reinicia (loop demo).
- Todo respeta `prefers-reduced-motion` (se desactivan animaciones; el contenido queda visible).

## 🎛️ Tweaks (barra de herramientas → Tweaks)
Estado en `TWEAK_DEFAULTS` (bloque `EDITMODE`). Claves:
`character` (tema), `motif` (`rueda` | `shard` | `luna` | `penta`), `tagline`,
`speed` (s), `speedlines` (bool), `watermark` (bool).

---

## 🔌 Portar a React Native (Expo)
- **Emblema y sigilos** son SVG puro → reusar los `d`/coords con `react-native-svg`
  (`Svg`, `Path`, `Circle`, `Polygon`, `Line`). Los helpers `pentagramPath` / `pentaPts`
  son portables tal cual.
- **Tokens** → cambiar `var(--acc)` por `theme.primary`, `--ink` por `theme.background`,
  `--ink-on` por `theme.textInverse`, etc. (no hardcodear; usar `useTheme()`).
- **Contador** → `Animated` 0→100; **barra** → ancho animado (`useNativeDriver:false` para layout).
- **Rotación de la rueda** → `Animated.loop` + `interpolate` a `rotate`.
- **Fuentes** → ya cargadas como roles en `App.tsx`; usar `theme.fonts?.title|display|heading|condensed`.
- La marca de agua, líneas de velocidad y vignette son decorado opcional.
