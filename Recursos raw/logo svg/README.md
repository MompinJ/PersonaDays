# 🎴 Logo — PersonaDays (P3R)

Exploración del **logotipo / isotipo** de **PersonaDays** en el lenguaje Persona 3 Reload.
Son **prototipos de referencia en HTML + React (Babel in-browser)** presentados sobre un
*design canvas* comparable (arrastrar para reordenar, doble clic para ver a pantalla
completa). Cada emblema es **SVG/CSS puro** y se tiñe con tokens (`--acc`, `--ink`, …),
así que es temable por personaje y portable a `react-native-svg`.

> ## ✅ Dirección elegida
> **Rueda Ritual** — el **pentagrama** dentro de un anillo de marcas tipo reloj/zodiaco
> (cresta SEES × pentáculo). Vive en **`cresta-pentaculo.jsx` → `SealC`** y ya está
> integrada en la **pantalla de carga** (`../carga/`, emblema `rueda`).

---

## ▶️ Cómo verlo
Abre cualquiera de los `.html` en el navegador (sin build). Todos comparten
`design-canvas.jsx`.

## 📁 Archivos
| Archivo | Contenido |
| :--- | :--- |
| **`PersonaDays Cresta Pentaculo.html`** + `cresta-pentaculo.jsx` | ⭐ La fusión final. 3 tratamientos: **A Sello Arcano**, **B Medallón Penta**, **C Rueda Ritual** (← la elegida). |
| `PersonaDays Logo v3.html` + `logo-v3.jsx` | 8 ideas: calendario, llave Velvet, cresta SEES, reloj de arena, pentáculo, insignia, constelación, lettermark «P». |
| `PersonaDays Logo v2.html` + `logo-v2.jsx` | 8 ideas: estrella (stat+VOLT), mariposa, máscara dual, día/noche, monograma PD, ascenso, ojo, torre. |
| `PersonaDays Logo.html` + `logo-content.jsx` | Primera tanda (5): shard, arcano, pentágono, luna, wordmark. *(Histórico.)* |
| `design-canvas.jsx` | Wrapper del canvas pan/zoom (starter component). No editar. |

> Orden cronológico: v1 → v2 → v3 → **Cresta Pentáculo (final)**. Las versiones previas se
> conservan como historial de exploración.

---

## 🎨 Sistema de cada tarjeta
- Lienzo oscuro azul-marino (tokens `--ink/--ink2`) con acento `--acc` (cyan Makoto por
  defecto) — mismos tokens que la app (`theme.*` de `palettes.ts`).
- **Emblema** centrado (con glow), **wordmark** `PERSONA`+`DAYS` (DAYS en acento), y abajo
  una **prueba de ícono de app** (squircle 56 px) para validar legibilidad a tamaño chico.
- Tipografía por roles: `Anton` (wordmark), `Bebas Neue` / `Barlow Condensed` (etiquetas).

## 🔢 La Rueda Ritual (geometría)
En `cresta-pentaculo.jsx`:
- `pentagramPath(cx,cy,r)` — traza el pentagrama (estrella de 5 puntas de un solo trazo,
  orden de vértices `[0,2,4,1,3]`).
- `pentaPts(cx,cy,r)` — los 5 vértices (para nodos / pentágono).
- `gearPath(...)` — el engrane (lo usan A y B; C usa marcas/ticks en su lugar).
- C añade: anillo exterior + 30 marcas (cada 6ª resaltada) que **giran**, pentágono interior
  invertido, pentagrama de doble trazo y nodos `--acc-hi`.

---

## 🔌 Portar a React Native (Expo)
- Reusar los `d` de `pentagramPath` y demás coords con `react-native-svg`
  (`Svg`, `Path`, `Polygon`, `Circle`, `Line`, `G`).
- Sustituir `var(--acc)` → `theme.primary`, `var(--ink)` → `theme.background`,
  `var(--acc-hi)` → mezcla clara del primario, etc. (vía `useTheme()`; nunca hardcodear).
- Para el **ícono de app** exportar el emblema a PNG en los tamaños de iOS/Android
  (1024, 512, 192…) sobre fondo `--ink`. El pentagrama aguanta bien a tamaño pequeño.
- La rotación del anillo (opcional para un splash animado) → `Animated.loop` + `rotate`.

## ➡️ Siguientes pasos sugeridos
- Bloquear color por personaje (ya soportado por tokens).
- Versión horizontal (emblema + wordmark en fila) para headers.
- Exportables limpios: SVG del emblema + set de íconos de app.
