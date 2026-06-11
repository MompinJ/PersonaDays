# Handoff: Arcanos (Tarot Mayor) — Selector & Slots · PersonaDays / P3R

## Overview
**Arcanos** son las cartas únicas de PersonaDays (app gamificada estilo *Persona 3 Reload*).
Son los 22 Arcanos Mayores del Tarot (0–XXI). Un jugador **equipa** Arcanos en **slots**
para obtener un **bonus de efecto** (aditivo) sobre sus misiones.

Esta entrega cubre la **pantalla de selección de Arcanos** (móvil): cabecera con recursos,
bandeja de slots, banner de ciclo, colección de las 22 cartas con sus 6 estados, y un
**modal de detalle** tipo carta de tarot.

### Mecánica (reglas de negocio)
- El jugador **equipa** Arcanos en slots. Cada equipamiento dura **3 días**.
- Pasados los 3 días, el Arcano usado entra en **cooldown**: se bloquea hasta el **próximo lunes**.
- El **lunes** se reinicia el ciclo y los Arcanos en cooldown vuelven a estar disponibles
  (esto garantiza **rotación** y evita usar siempre los mismos).
- El jugador **empieza con 1 slot**; puede **comprar slots extra** en la tienda (yenes).
- La posibilidad de **comprar** un Arcano se **desbloquea al subir de nivel** (cada carta tiene
  un nivel requerido). Ya desbloqueado, se compra en la **tienda con yenes** (moneda del juego).
- Un Arcano equipado **no se puede quitar** antes de que termine su ventana de 3 días.

---

## About the Design Files
Los archivos de este bundle son **referencias de diseño hechas en HTML/CSS/JSX** — un prototipo
que muestra el aspecto y comportamiento deseados, **no código de producción para copiar tal cual**.

La tarea es **recrear este diseño en el entorno del codebase destino**. Esta app es
**React Native (Expo)** con un sistema de diseño propio (ver §Sistema de diseño P3R abajo):
usa `useTheme()`, los componentes `PersonaShard`, `PersonaModal`, `PressableScale`, los iconos
vectoriales `@expo/vector-icons`, y los roles de fuente de `DEFAULT_FONTS`. **Reutiliza esos
patrones**; no introduzcas el HTML/CSS directamente.

> El prototipo usa fuentes web (Google Fonts) y CSS; en RN se mapean a las fuentes ya cargadas
> y a `StyleSheet`. Las inclinaciones (`skewX`) y formas angulares son centrales al look P3R.

---

## Fidelity
**Alta fidelidad (hi-fi).** Colores, tipografía, espaciados, estados e interacciones son
finales. Recrea la UI con precisión usando las librerías y patrones existentes del codebase.
Los **datos** (`arcanos-data.js`) son de muestra — vienen de la base de datos (SQLite) en producción.

---

## Pantalla principal: "Arcanos" (móvil, lienzo 460×940)

Layout vertical, fondo azul-marino/violeta profundo con halo violeta superior. De arriba a abajo:

### 1. Header (`.hdr`)
- Fila `space-between`, padding `22px 22px 14px`.
- **Izquierda** (`.hdr-l`, columna, gap 7):
  - *Eyebrow*: tick dorado + `ARCANOS MAYORES · 0–XXI` — Barlow Condensed 700, 12px,
    letter-spacing .3em, color oro `#D9B24A`, `skewX(-8deg)`.
  - *Título*: `ARCANOS` con las letras centrales `CA` en oro — Anton 37px, line-height .84,
    `skewX(-7deg)`, color texto `#F3EAD9`, sombra `0 3px 0 rgba(0,0,0,.5)`.
- **Derecha** (`.hdr-r`, columna, alineada a la derecha, gap 6): dos *pills* inclinadas
  (`skewX(-9deg)`, Big Shoulders 800, 18px, fondo `#241738`, borde 1.5px):
  - **Nivel**: `NV 22` (acento violeta `#A98CE6`).
  - **Yenes**: `¥12,800` (acento oro `#F2D784`).

### 2. Bandeja de slots (`.tray`, top 108)
- *Head*: título `MIS SLOTS` (Bebas Neue 21px, barra oro a la izquierda, `skewX(-8deg)`) +
  a la derecha el **ciclo**: icono calendario + `CICLO · QUEDAN 2 DÍAS` (Barlow Condensed 600,
  12.5px; "2 DÍAS" en oro).
- *Slots* (`.slots`, flex, gap 10): cada slot ocupa 1/3, alto **96px**, esquina recortada
  (clip-path bisel 14px):
  - **Lleno** (`.slot.filled`): borde teñido del color del Arcano + glow suave. Contiene:
    icono de stat (cuadro inclinado) + etiqueta del stat (Barlow 700, 9.5px, color del Arcano);
    nombre del Arcano (Anton 15px, 1 línea con elipsis); línea de efecto (Barlow 600, 11px, dim).
    Numeral romano grande en marca de agua abajo-derecha. **Pill de días** arriba-derecha:
    reloj + `2D` (fondo oro, texto fondo).
  - **Vacío** (`.slot.empty`): borde **discontinuo** gris, icono de slot (signo +) violeta,
    label `VACÍO`. Centrado.
  - **Comprar slot** (`.slot.buy`): borde discontinuo dorado, precio `¥10,000` (Big Shoulders 800,
    `#F2D784`) + label `+ Slot extra`.

### 3. Colección (`.collect`, scrolleable, top 248)
- *Head* sticky: `COLECCIÓN` (Bebas 21px, barra violeta) + contador `11 / 22 EN PODER`
  (el número "en poder" cuenta los estados active+available+cooldown).
- *Grid* (`.grid`): **3 columnas**, gap `13px 12px`. Cada celda es una **mini-carta** (`.mini`,
  aspect-ratio 118/176). Ver §Mini-carta y §Estados.

### 4. Modal de detalle (`.modal`)
Se abre al pulsar cualquier mini-carta o un slot lleno. Ver §Carta de detalle.

---

## Mini-carta de colección (`.mini`)
Estructura (de fondo a frente):
1. `.mini-metal` — marco metálico (gradiente oro por defecto), recortado con clip-path
   (esquinas biseladas 8%/6%), drop-shadow.
2. `.mini-panel` (inset 3px) — panel interior, fondo = mezcla 7% color del Arcano sobre `#1C1233`.
   - `.mini-lattice` — **retícula de rombos** (dos `repeating-linear-gradient` a ±45°, líneas de
     1px del color del Arcano al 16%), con máscara radial para difuminar bordes.
   - `.mini-glow` — halo radial del color del Arcano (centrado arriba).
   - `.mini-rom` — numeral romano gigante en marca de agua (outline, 62px, opacidad .42).
   - `.mini-emblem` — **sigilo del stat** (icono SVG, 38px) centrado al ~30% de altura.
   - `.mini-scrim` — degradado inferior para legibilidad.
   - `.mini-foot` — medallón circular con numeral (Big Shoulders, borde del color del Arcano) +
     nombre (Anton 12.5px, `skewX(-6deg)`) + efecto (Barlow 9.5px, 1 línea con elipsis).
3. `.mini-corner` ×4 — diamantes dorados en las esquinas.
4. Overlays de estado (ver abajo).

Color de cada Arcano = `--ac` (jewel-tone propio, en `arcanos-data.js`). El **marco** es metal
compartido (`--m-hi/--m-mid/--m-lo`), no depende del Arcano salvo en estado *active*.

---

## Estados (6) — tratamiento visual
Cada carta tiene `state`. Clases CSS: `.s-active .s-available .s-cooldown .s-shop .s-level`
(+ `.locked` para shop/level).

| Estado | Significado | Tratamiento |
|---|---|---|
| **active** | Equipado, efecto corriendo | Marco **oro brillante** con glow; cinta `EQUIPADO` (check) arriba-izq; pill de días `2D` arriba-der. |
| **available** | Lo tienes, sin equipar | Carta a todo color; tick verde `#67C796` arriba-der (círculo). |
| **shop** | No comprado (sí tienes nivel) | Panel **atenuado** (grayscale .7, brillo .62) + marco gris; tag `TIENDA` (carrito) arriba-centro; **chip de precio** `¥3,500` (oro) abajo-centro. |
| **level** | Bloqueado por nivel | Panel atenuado + marco gris; **candado** centrado (`.mini-mark`); chip `NV 25` (violeta) abajo-centro. |
| **cooldown** | Usado este ciclo, espera al lunes | Panel desaturado (.82 / brillo .6); **reloj** centrado (violeta); chip `LUNES` (calendario) abajo-centro. |
| **slot vacío / comprar slot** | (en la bandeja, no en grid) | Ver §Bandeja de slots. |

---

## Carta de detalle (modal · `.dcard`)
Carta grande (300px ancho, aspect 300/430) + plato de info + botón de acción.
- `.dc-metal` marco metálico; `.dc-panel` panel con `.dc-lattice` (retícula de rombos),
  `.dc-glow`, `.dc-rom` (numeral marca de agua 150px).
- `.dc-en` arriba: nombre EN (p.ej. `THE FOOL`) — Barlow 700, 13px, letter-spacing .34em.
- `.dc-emblem` centro: sigilo del stat (64px) **+ `<image-slot>`** superpuesto para soltar arte.
- `.dc-info` abajo: medallón con numeral (42px círculo) + **nombre** (Anton 26px, 1 línea) +
  **chip de stat** (icono + `CARISMA`, inclinado, color del Arcano).
- Esquinas `.dc-corner` (diamantes) + `.dc-frameline` (filo interior) — sólo en dirección Clásico.

Debajo de la carta:
- `.plate-eff` — caja de **efecto** con barra de acento inclinada: label `EFECTO · ADITIVO` +
  valor (Big Shoulders 21px; los porcentajes resaltados en el color del Arcano).
- `.plate-flavor` — línea de esencia mística en cursiva, entre puntos de acento.
- `.metarow` — línea de estado contextual (EQUIPADO·días / USADO ESTE CICLO / BLOQUEADO·NIVEL /
  DISPONIBLE EN LA TIENDA).
- **Botón de acción** (`.act`, 300×56, Anton 19px, forma de paralelogramo) según estado:
  - available → **EQUIPAR** (relleno color del Arcano). Sub: "Ocupa 1 slot · activo 3 días".
  - active → **EFECTO ACTIVO** (outline oro, check). Sub: "Se libera el LUNES · no se puede quitar antes".
  - shop → **COMPRAR · ¥3,500** (outline oro, carrito). Sub: "Tu saldo: ¥12,800".
  - level → **REQUIERE NV 25** (deshabilitado, candado). Sub: "Te faltan N niveles para comprarlo".
  - cooldown → **EN ESPERA** (deshabilitado, reloj). Sub: "Se reactiva el LUNES".

---

## Las 3 direcciones visuales de la carta (Tweak)
Atributo `data-dir` en `#stage` cambia el estilo del marco del detalle:
- **`classic`** (Clásico): marco ornamental de doble filo, retícula de rombos, esquinas en diamante.
- **`neon`** (Neón): marco angular con esquinas cortadas (cut-corner) estilo P3R, medallón
  romboidal, retícula muy tenue, glow más fuerte.
- **`veil`** (Velo): minimal — filo fino, **numeral gigante** de marca de agua, sin retícula,
  brillo etéreo.

> Es una decisión de diseño a tomar: elige UNA dirección para producción (recomendación: **Clásico**
> como base, **Neón** si se quiere más coherencia con el resto de la app P3R). No hace falta enviar
> las tres.

---

## Interactions & Behavior
- **Abrir detalle**: tap en mini-carta o slot lleno → modal con pop de entrada
  (spring scale 0.9→1 + fade, ~340ms, `cubic-bezier(.2,.8,.3,1)`). Cierra con backdrop, botón ✕ o `Esc`.
- **Entrada de grid**: cada carta sube (`translateY 14→0` + fade, 400ms, escalonada).
- **Equipar** (a implementar): al pulsar EQUIPAR, mover el Arcano a un slot libre, marcar `active`
  con `days=3`, restar disponibilidad. Si no hay slot libre → CTA a comprar slot / desequipar.
- **Comprar** (a implementar): descuenta yenes, pasa el Arcano de `shop` → `available`.
- **Cooldown/rotación** (a implementar, lado servidor/lógica de fecha): al expirar los 3 días,
  `active` → `cooldown`; el lunes, `cooldown` → `available`.
- **Reduced motion**: todas las animaciones se desactivan con `prefers-reduced-motion`.
- **Escalado**: el lienzo 460×940 se escala a viewport con `transform: scale()` (letterbox).

## State Management
Por jugador:
- `player`: `{ level, yenes }`.
- `slots`: `{ unlocked, equipped: [arcanoId|null, ...], nextPrice }`.
- `cycle`: `{ length: 3, daysLeft, resetDay: 'LUNES' }` (derivado de fechas).
- `arcanos[]`: cada uno con `state` derivado de: ¿comprado? ¿nivel suficiente? ¿equipado?
  ¿en cooldown este ciclo? (ver enum de estados). Campos: ver `arcanos-data.js`.

Estado derivado a calcular en cliente/servidor:
- `available` si comprado y no equipado y no en cooldown.
- `active` si está en `slots.equipped`.
- `cooldown` si fue usado en el ciclo actual y ya cumplió 3 días.
- `shop` si no comprado y `player.level >= arcano.level`.
- `level` si no comprado y `player.level < arcano.level`.

---

## Design Tokens

### Colores base (UI mística oro/violeta)
| Token | Hex | Uso |
|---|---|---|
| bg | `#140C22` | fondo pantalla |
| bg2 | `#1C1233` | panel de carta |
| surface | `#241738` | slots, pills, caja de efecto |
| surface2 | `#2E1F47` | chip de nivel |
| gold | `#D9B24A` | acento metálico principal |
| gold-hi | `#F2D784` | brillo dorado / numeral |
| gold-lo | `#94702A` | sombra dorada |
| violet | `#7C5BC4` | acento secundario |
| violet-hi | `#A98CE6` | nivel, cooldown |
| text | `#F3EAD9` | texto principal (pergamino) |
| dim | `#9C8FB8` | texto secundario |
| faint | `#6E6390` | texto terciario |
| border | `#3A2C52` | bordes |
| line | `#4A3868` | líneas/discontinuos |
| ok | `#67C796` | disponible (tick) |
| bad | `#D8584B` | peligro / penalización |
| warn | `#E0A93C` | aviso |

### Metal del marco (3 opciones — Tweak)
- Oro: `#F2D784 / #C79B3E / #7E5E22`
- Plata: `#E8F0F6 / #9FB4C4 / #5E7385`
- Violeta: `#D9C7F2 / #9E7BD8 / #5B3E8E`

### Color por Arcano (`--ac`)
Cada uno tiene su jewel-tone propio en `arcanos-data.js` (campo `color`). Ej.: El Loco `#E9D27A`,
El Mago `#9B6BE0`, La Muerte `#C7CDD4`, El Sol `#F0B43E`, El Mundo `#D9C66A`, etc.

### Tipografía (roles)
| Rol | Fuente | Uso |
|---|---|---|
| título / nombre | **Anton** | título de pantalla, nombre de Arcano, botones |
| números | **Big Shoulders Display** (700–900) | numerales, medallones, ¥, nivel, precios |
| headers de sección | **Bebas Neue** | "MIS SLOTS", "COLECCIÓN" |
| labels / meta | **Barlow Condensed** (600–700) | eyebrow, tags, efecto, ciclo |
| body / flavor | **Exo 2** (400/600, italic) | línea de esencia mística |
| (opcional) JP | Noto Sans JP | si se añade kana decorativo |

Regla de forma P3R: casi todo lleva inclinación (`skewX(-6deg…-9deg)`); el texto dentro de
elementos inclinados se **contra-inclina** para quedar legible.

### Otros
- Lienzo: **460×940** (móvil portrait), escalado a viewport.
- Slot alto: 96px. Mini-carta: aspect 118/176. Carta detalle: 300×430.
- Biseles/clip-paths: bandeja 14px; mini-carta 8%/6%; neón cut-corner 28–30px.
- Animaciones: pop modal 340ms `cubic-bezier(.2,.8,.3,1)`; grid stagger 400ms; micro 150–300ms.

---

## Assets
- **Iconos**: SVG inline (`arcano-icons.jsx`) — stats (conocimiento/coraje/destreza/gentileza/
  carisma), comodín, todos, y UI (lock, level, clock, cart, plus, check, bolt, cal, slot, close,
  sparkle). En el codebase, reemplazar por `@expo/vector-icons` o los SVG de stats ya existentes
  (`stats-ui/icons`).
- **Arte de cada Arcano**: pendiente. El prototipo usa `<image-slot>` como placeholder (se arrastra
  una imagen) y, por defecto, muestra el sigilo del stat. En producción, cada Arcano tendrá su
  ilustración (campo `art`/URL desde la BD). Buscar arte cuadrado/vertical de alta calidad para los
  22 Arcanos Mayores.
- **Fuentes**: Anton, Bebas Neue, Barlow Condensed, Big Shoulders Display, Exo 2 (Google Fonts).
  En la app ya están cargadas como roles (`DEFAULT_FONTS`).

---

## Sistema de diseño P3R (contexto del codebase)
La app ya tiene piezas reutilizables — **úsalas** en vez de recrear:
- `PersonaShard` — etiqueta/banner angular con punta y sombra (para tags y headers).
- `PersonaModal` — shell de pop-up con "pop" (usar para el modal de detalle).
- `PressableScale` — feedback de pulsación (no combinar con `skew`; ahí animar a mano).
- `PersonaCount` — número estilo "01" (ceros tenues + valor sólido) — útil para numerales.
- `useTheme()` + `theme.*` — el color del **avatar** (`theme.primary`) es para la UI del sistema;
  el **contenido propio** (cada Arcano) usa su **color jewel** propio. Mantener esa dualidad.
- `getContrastText(hex)` — texto legible sobre color variable (botón EQUIPAR, chips).

---

## Files (en este bundle)
- `Arcanos P3R.html` — entrada; monta el lienzo, fuentes, escalado y scripts.
- `arcanos.css` — **toda la hoja de estilo** (tokens, header, slots, grid, mini-carta, estados,
  modal/detalle, 3 direcciones, animaciones). La referencia visual canónica.
- `arcanos-data.js` — datos de muestra: `PLAYER`, `SLOTS`, `CYCLE`, y los 22 `ARCANOS`
  (numeral, nombre ES/EN, stat, efecto, flavor, color, estado, nivel/precio).
- `arcano-icons.jsx` — set de iconos SVG (`<Ico name size stroke/>`).
- `arcano-card.jsx` — `MiniCard` (celda) y `DetailCard` (modal) + `EffectText` (resalta %).
- `arcanos-app.jsx` — orquestador React (header, bandeja, banner, grid, modal, tweaks).
- `tweaks-panel.jsx` — panel de ajustes (sólo prototipo; **no portar** a producción).
- `image-slot.js` — placeholder de imagen arrastrable (sólo prototipo; reemplazar por `<Image>`).

### Para correr el prototipo
Abrir `Arcanos P3R.html` en un navegador (necesita internet para Google Fonts y React vía CDN).
Botón **Tweaks** (barra de herramientas del editor) para alternar dirección/metal/atmósfera.

> **No portar a producción**: `tweaks-panel.jsx`, `image-slot.js`, ni los `<script>` de React/Babel
> vía CDN. Son andamiaje del prototipo.
