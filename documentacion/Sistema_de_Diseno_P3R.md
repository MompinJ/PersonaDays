# 🎭 Sistema de Diseño — PersonaDays (estilo Persona 3 Reload)

> Lenguaje visual de la app. Inspirado en la UI de **Persona 3 Reload (P3R)**:
> tipografía condensada potente, elementos **inclinados/angulados**, fondos azul
> marino con **un acento eléctrico**, profundidad por capas y sensación dinámica.
>
> **Pantalla de referencia (master class):** `src/screens/Missions/CreateMissionScreen.tsx`.
> Si dudas de cómo se ve una sección P3R bien hecha, mírala ahí.

---

## 1. Principios

1. **Nada recto a 0°.** Títulos, tags, chips, botones y campos llevan inclinación
   (`skewX`) y/o rotación. Lo cuadrado se siente muerto.
2. **Cada sección con personalidad propia.** En una misma pantalla, evita repetir
   el mismo tratamiento: varía orientación, tamaño, color, fuente y posición.
   (Ver §7 — la regla de oro.)
3. **Color = identidad del personaje; forma = identidad de la app.** Los colores
   SIEMPRE salen del tema (`theme.*`), nunca hardcodeados. La forma (inclinaciones,
   shards) es constante para todos los personajes.
4. **Profundidad por capas.** Sombras desplazadas detrás de tags/botones para el
   efecto "pop" 3D de P3R.
5. **Movimiento con propósito.** Entradas, feedback de pulsación y micro-pulsos.
   Nada estático, nada gratuito.
6. **Iconos vectoriales, jamás emojis** (`@expo/vector-icons`).

---

## 2. Color

### Tokens del tema (`src/themes/palettes.ts` → `ThemeColors`)
Se obtienen con `const theme = useTheme()` y cambian según el personaje elegido.

| Token | Uso |
| :--- | :--- |
| `primary` | Acento principal (cyan Makoto, rosa Kotone…). Shards, selección, FABs. |
| `secondary` | Acento de apoyo. Sombras de shards, color alterno en chips, rayas. |
| `background` | Fondo de pantalla (azul marino profundo). |
| `surface` | Fondo de tarjetas/inputs (un poco más claro). |
| `text` / `textDim` | Texto principal / secundario. |
| `textInverse` | Texto sobre `primary` (negro sobre cyan). |
| `border` | Líneas divisorias, bordes de cards. |
| `success` / `error` | Verde (ingresos, level up) / rojo (gastos, peligro). |
| `inactive` | Elementos apagados / fondos de chip no seleccionado. |

> **NO uses `card`** — está en la interfaz pero indefinido en las paletas. Usa `surface`.

### Reglas de color
- **Prohibido hardcodear** colores de marca (`#00D4FF`, `#fff`, etc.). Usa tokens.
- **Contraste automático:** para texto/iconos sobre un color arbitrario (categoría,
  shard) usa `getContrastText(hex)` de `src/utils/colorUtils.ts` (elige negro/blanco).
- **Dualidad (como el Calendario):** la UI del sistema usa el color del **avatar**
  (`theme.primary`); el contenido propio (categorías de finanzas, color de arco)
  usa **su propio color**.
- `success`/`error` son verde/rojo semánticos; sí se permiten para ingresos/gastos.

---

## 3. Tipografía

Fuentes globales (iguales para todos los personajes), cargadas en `App.tsx` y
expuestas como **roles** en `DEFAULT_FONTS`. Úsalas con `theme.fonts?.<rol>`.

| Rol | Fuente | Para qué |
| :--- | :--- | :--- |
| `title` | **Anton** | Headers de pantalla (shards XL), títulos de modal. |
| `display` | **Big Shoulders Display** ExtraBold | NÚMEROS grandes: balance ¥, XP, nivel, recompensa. |
| `heading` | **Bebas Neue** | Tags inclinados, chips, botones (tall caps). |
| `condensed` | **Barlow Condensed** SemiBold | Etiquetas/meta pequeñas (INGRESOS, "X/Y XP"). |
| `body` / `bold` | **Exo 2** / Exo 2 Bold | Texto normal de lectura. |

> Variar la fuente entre elementos hermanos es parte del look (PersonaShard lo hace
> solo). Reglas: títulos en Anton, números en Big Shoulders, tags/chips en Bebas.
> Todo en **MAYÚSCULAS** con `letterSpacing` para tags/labels.

**Gotcha de Fast Refresh:** al **agregar un import nuevo** (p.ej. una fuente o helper)
a veces el hot-reload no lo incluye → `ReferenceError`. Solución: **reload completo**
(RR en el emulador, o force-stop + relaunch).

---

## 4. Componentes base

### 4.1 `PersonaShard` — la etiqueta angular (★ pieza central)
`src/components/UI/PersonaShard.tsx`

Banner inclinado con **punta triangular** + **sombra desplazada** + texto rotado.
**Auto-varía** orientación, inclinación, tamaño, color, tipografía y sangría según
su texto (hash determinístico) → tags consecutivos nunca se ven iguales.

```tsx
<PersonaShard label="MOVIMIENTOS" />                       // auto-todo
<PersonaShard label="FINANZAS" height={54} fontSize={30}   // header XL
  font={theme.fonts?.title} />
<PersonaShard label="DETALLE" variant="ghost" />           // contorno
```
Props clave: `color`, `accentColor`, `font`, `rotate`, `direction` ('right'|'left'),
`variant` ('solid'|'ghost'), `height`, `fontSize`, `indent`, `seed`. Si omites
`rotate`/`direction`/tamaño/color/fuente, se auto-varían.

- **Section tag normal:** `<PersonaShard label="TEXTO" />`
- **Header de pantalla:** explícito y grande (`height 54`, `fontSize 30`, `font title`).

### 4.2 `PressableScale` — feedback de pulsación
`src/components/UI/PressableScale.tsx`. Envuelve cualquier botón/card; al pulsar hace
un **spring de escala**. `style` = visual (se anima), `containerStyle` = posición
(p.ej. FAB absoluto). NO lo uses sobre elementos con `transform: skew` (el scale
pisa el skew); ahí usa un `Animated` manual combinando ambos.

### 4.3 `PersonaCount` — número estilo "01"
`src/components/UI/PersonaCount.tsx`. Los **ceros a la izquierda van tenues/outline**
y el valor real en color sólido (como el "Owned 01" de P3R). Para niveles, rangos,
contadores, porcentajes.
```tsx
<PersonaCount value={progress} pad={2} color={theme.primary} fontSize={42} />
// 5 -> "0"(tenue)+"5"(solido) ; 75 -> "75" solido
```

### 4.4 `PersonaModal` — shell de pop-up con POP
`src/components/UI/PersonaModal.tsx`. Envoltorio para **todos los pop-ups de
"agregar/editar"**: backdrop + card P3R (acento superior, borde primary) + **pop de
entrada/salida** (spring scale 0.85→1 + fade). Incluye `KeyboardAvoidingView`.
```tsx
<PersonaModal visible={visible} onClose={onClose} title="NUEVO MOVIMIENTO">
  {/* form + botones */}
</PersonaModal>
```
> **Regla:** ningún modal de "agregar cosa" debe usar `animationType="slide/fade"`
> genérico. Todos saltan con PersonaModal.

### 4.5 `getContrastText(hex)` — `src/utils/colorUtils.ts`
Devuelve `#000`/`#fff` según luminancia. Para texto sobre fondos de color variable.

---

### 4.6 Glifos de atributos y tabs — iconos SVG con `Mask`
Iconos propios estilo P3R: **forma angular + corte diagonal "Shard"**, monocromáticos
(`currentColor` → color del tema). Técnica `react-native-svg`: un `<Mask>` con `Rect`
negro de base + `Path`s (blanco = pinta, negro = recorta, en orden → permite anillos)
y un `<Rect fill={color} mask>`. El estado **activo** añade el path Shard como capa
negra: `SHARD = 'M40,-2 L46.5,-2 L11,50 L4.5,50 Z'`.
- `components/Stats/StatGlyphs.tsx` + `stats.ts` (`STATS`, `STAT_ORDER`,
  `resolveStatKey(nombre)` con normalización de acentos), `StatIcon` (`size/color/skew`).
  Los **hábitos hijos heredan el icono del stat padre** (`id_stat_padre`).
- `components/UI/TabGlyphs.tsx` — 6 módulos (`home/phone/stats/missions/economy/profile`),
  `<TabGlyph tab size color active />`. Usado en el navbar (§10).
- `components/UI/ActionGlyphs.tsx` — FABs de Misiones (`historial/gestionar/agregar`),
  `<ActionGlyph name size color active />`. Reemplazan los iconos Ionicons de los 3 FABs.
- `components/UI/MenuGlyphs.tsx` — tiles del menú Teléfono
  (`calendario/arcos/notas/galeria/correo/ajustes`), `<MenuGlyph name size color active />`.
- Reglas: color SIEMPRE del tema; **NO** instalar `svg-transformer` — los glifos son
  componentes inline. Para añadir uno: copiar el path al estilo de `StatGlyphs` (mismo
  `SHARD`, mismo patrón `Mask`; `active` añade el corte). `viewBox 0 0 48 48`.

### 4.7 `P3RDatePicker` / `P3RCalendarPanel` — selector de fecha y calendario
`components/UI/P3RDatePicker.tsx`. Calendario angular estilo P3R que **reemplaza al
`DateTimePicker` nativo** (el azul de Material) y a `react-native-calendars`. Sin
dependencias nuevas (`Modal` + `Animated` + `react-native-svg` solo para los chevrons).
Color 100% del tema (`primary`/`secondary`/`getContrastText`). Semana **lunes-primero**
(L M X J V S D), meses en español.

- **`<P3RDatePicker visible value minDate maxDate onAccept onCancel />`** — modal completo
  (overlay scrim + pop `Easing.back`). Controlado por `visible`. `onAccept(Date)` al pulsar
  ACEPTAR. Uso: **Nueva/Editar Misión → Fecha límite** (sustituyó al picker nativo).
- **`<P3RCalendarPanel ... />`** — solo el panel (sin overlay), para incrustar. Props extra:
  - `onPick(Date)` — se dispara en **cada** tap de día (sin esperar a Aceptar).
  - `hideFooter` — oculta HOY/CANCELAR/ACEPTAR (modo "navegar mes"). 
  - `marks: Record<'yyyy-mm-dd', color>` — tinta días concretos (+ punto). 
  Uso: **Calendario** (`screens/Phone/Calendar/CalendarScreen.tsx`) con `hideFooter`,
  `marks` = rango del arco activo, `onPick` = abre el modal de misiones del día.
- **Anatomía:** cabecera shard (fecha en banner `skewX -12` Anton + año Big Shoulders con
  franja diagonal `secondary`), navegación de mes `‹ ›` (cajas anguladas), rejilla de días
  inclinados (`skewX -11`, hoy = borde `secondary`, seleccionado = relleno `primary` + glow
  + pulso), rejilla de **años** (4 columnas, tap al año del header). 
- Para usarlo en un campo: un `Pressable`/toggle propio abre el `P3RDatePicker` (`visible`).

### 4.8 `PersonaTile` — tile flotante angular
`components/UI/PersonaTile.tsx`. Tarjeta paralelograma (`skewX` leve) con una **capa
de sombra desplazada** del color de acento detrás → sensación de que "flota". El
contenido va **contra-inclinado** para quedar derecho. El feedback de pulsación es un
`Animated.spring` de escala **manual** (no `PressableScale`, que pisaría el skew).
```tsx
<PersonaTile accent={theme.primary} skew={-4} onPress={...}>{children}</PersonaTile>
<PersonaTile accent={acc} skew={-6} float={5} containerStyle={...} style={...}>{...}</PersonaTile>
```
Props: `accent` (borde + sombra, default `primary`), `skew` (default -5), `float`
(desplazamiento de sombra px, default 7), `background` (default `surface`), `style`
(padding/tamaño de la cara), `containerStyle` (posición/ancho), `onPress` (opcional →
sin él es un tile estático). Para una fila de tiles, mantén el `skew` siempre negativo
(la sombra cae abajo-derecha y la fila queda limpia); varía color/escalonado, no el signo.
Uso: rejilla del dashboard (Home) y rejilla de progreso (Profile).

### 4.9 `PersonaSlash` — slash de énfasis
`components/UI/PersonaSlash.tsx`. Barra(s) diagonal(es) finas decorativas que cruzan
detrás de un título/número (el corte dinámico de los menús de P3R). Se posiciona en
absoluto desde el padre (pasa `style` con `top`/`left`). `count > 1` dibuja varias
barras paralelas escalonadas y alternadas (las "rayas" del HUD).
```tsx
<View>
  <PersonaSlash color={theme.secondary} count={2} length={70} angle={-22} style={{ top: 10, left: -6 }} />
  <Text style={...}>{nombre}</Text>
</View>
```
Props: `color` (default `secondary`), `length` (64), `thickness` (6), `angle` (-24),
`count` (1), `gap` (9), `style`. Uso: detrás del nombre del jugador en Home y Profile.

### 4.10 `CategoryIcon` — iconos de categorías de Finanzas
`components/category-icons/` (`CategoryIcon.tsx` + `categories.ts` + `glyphPaths.ts`).
20 glifos **inline** (`react-native-svg`, misma técnica `Mask` que StatGlyphs §4.6), en
variante **Monolito** (sólida, **sin** el corte diagonal Shard — se lee mejor en tamaño
chico). NO usa `svg-transformer` (regla del proyecto: glifos inline). El `key` = nombre
del MaterialCommunityIcon original (= campo `icono` de `financial_categories`, así que NO
hubo migración de datos). `getCategory(key)` resuelve con **fallback a `cash`**. Se añadió
`dots-horizontal` (tres puntos) para "Otros". Uso: lista de movimientos, chips de categoría
del modal, y el gestor (con `skew={0}` en contextos ya inclinados para no duplicar la inclinación).
```tsx
<CategoryIcon category={getCategory(item.icono).key} size={20} skew={0} color={...} />
```

### 4.11 Arcanos — `CutCard` / `StatEmblem` / `EffectText`
`components/Arcana/ArcanaBits.tsx`. Piezas compartidas de la UI de Arcanos:
- **`CutCard`** — marco angular con **esquinas cortadas (dirección "Neón P3R")** vía
  `react-native-svg`: panel recortado + dos triángulos del color de fondo que "cortan" las
  esquinas TR/BL + un **borde neón** (`Polygon` stroke). Props: `w, h, color` (jewel del
  arcano), `panelBg, screenBg, cut, borderWidth, dim`. Es la misma técnica del marco de la
  **carta de selección de personaje** (`CharacterSelectionScreen`).
- **`StatEmblem`** — glifo del stat del arcano: los 5 base via `StatIcon`; `comodín`/`todos`
  via Ionicons (`sparkles`/`planet`).
- **`EffectText`** — resalta los **porcentajes** de la frase de efecto en el color jewel.

> **Dualidad reforzada (clave de Arcanos):** la UI del sistema usa `theme.primary` (color del
> personaje); **cada carta usa su color jewel propio** (`ARCANA_META[id].color`). El glifo
> `emporio` (storefront) se añadió a `MenuGlyphs` (§4.6) para el acceso a la tienda.

### Tag de sección
`PersonaShard`. Envolver en `sectionTagWrap` (`marginTop: 26, marginBottom: 14`).

### Chips seleccionables (categorías, stats) — "en cascada"
Cada chip **distinto**: zigzag de skew + escalonado vertical + color alterno.
```tsx
{items.map((it, i) => {
  const active = sel === it.id;
  const sk = [-16, 13, -11, 16, -13][i % 5];          // alterna DIRECCIÓN
  const st = [0, 20, 6, 16, 2][i % 5];                // escalonado VERTICAL
  const cc = i % 2 === 0 ? theme.primary : theme.secondary; // alterna COLOR
  return (
    <TouchableOpacity style={[styles.chip, { marginTop: st, borderColor: cc,
        backgroundColor: active ? cc : theme.surface, transform: [{ skewX: `${sk}deg` }] }]}>
      <Text style={[styles.chipText, { color: active ? getContrastText(cc) : theme.textDim,
        fontFamily: theme.fonts?.heading, transform: [{ skewX: `${-sk}deg` }] }]}>{label}</Text>
    </TouchableOpacity>
  );
})}
```
- Chip: `borderWidth 1.5`, sin radio o radio 2 (afilado), `transform skewX`.
- El texto SIEMPRE contra-inclinado (`-sk`) para quedar legible.
- Contenedor `chipRow`: `alignItems: 'flex-start'` (para que el escalonado baje) +
  `paddingBottom` que cubra el escalón más alto.

### Fila disruptiva (barra de bala) — listas P3R
Para listas de ítems (no formularios). Usado en: `CompletedMissionsScreen` (historial),
`MissionItem` (Requests), `ManageMissionsScreen`, `NoteCard` (Notas). Inspirado en la
lista de Social Links / party de P3R: barras **inclinadas y escalonadas en zigzag**.
```tsx
const accent = tipo === 'BOSS' ? theme.error : (i % 2 === 0 ? theme.primary : theme.secondary);
const sk = -8;
const stagger = [0, 16, 8, 20, 12][i % 5];   // sangría horizontal (zigzag)
const rot = [-1.3, 1, -1, 1.3, -0.5][i % 5]; // rotación leve por índice
// Wrapper: marginLeft: stagger, marginRight: 24 - stagger + entrada animada
// Card: transform [{ rotate }, { skewX: sk }], borderColor: accent + acento lateral
// Inner: transform [{ skewX: -sk }] (contra-inclina el contenido)
```
- **Acento lateral** grueso inclinado + **borde** de color por tipo (BOSS=`error`, resto
  alterna `primary`/`secondary`).
- **Tag flotante** en la esquina superior (estilo LEADER/PARTY): chip absoluto pequeño
  (`top: -9`), contra-inclinado; muestra el tipo o el stat.
- A la izquierda: **nombre grande** (`heading`) + meta; a la derecha: **número grande**
  (`display`, ej. `+50` XP) + unidad / `¥`.
- Entrada: fade + `translateX -28→0` con stagger por índice (delay `i*55–70ms`).

### Botón angular (dificultad, toggles, footer)
`transform: [{ skewX: '-10deg' a '-12deg' }]` en el botón + **contra-skew** en cada
hijo (texto, icono). Radio chico (2–3) para esquinas afiladas.

### Card / input "protagonista" (OBJETIVO)
Card con **acento grueso inclinado** a la izquierda + **raya diagonal** (`secondary`)
cruzando abajo (estilo banner "YUKARI TAKEBA") + texto/placeholder grande en MAYÚSCULAS.
`overflow: 'hidden'` para recortar la raya. Ver `objetivoCard/objetivoAccent/objetivoStripe`.

### Número grande (RECOMPENSA, balance, XP)
Sin icono decorativo. Símbolo + número en **`display`** (Big Shoulders), `fontSize 40`,
símbolo en `primary`, número en `text`. Card con `cardAccent` inclinado.

### Toggle de estado (no usar Switch nativo)
Botón angular que se **rellena** de `primary` al activarse, con icono (flag) + label
("CON LÍMITE"/"SIN LÍMITE") + punto indicador. Todo contra-inclinado.

### Selector de días (`DaySelector`)
Días como **parallelogramos** (skew variado por día), fuente `heading`, **pulso**
animado al pulsar. Fuera de cualquier caja; el texto auxiliar va suelto con una
rayita de acento, no encerrado en un div.

---

## 6. Movimiento

| Animación | Dónde | Specs |
| :--- | :--- | :--- |
| Entrada de pantalla | Screens | fade + `translateY` 18→0, ~420ms `Easing.out(cubic)`, una vez. |
| Stagger de lista | Tarjetas (MissionItem) | entrada por índice, delay 45ms, translateX -24→0. |
| Press feedback | Botones/cards/FAB | `Animated.spring` scale → 0.9, vuelve a 1 (`PressableScale`). |
| Pop de modal | Detalle/Alert | spring scale 0.85→1 + fade. Salida: timing 150ms. |
| Barra de XP | StatRow | width 0→% animado, 700ms ease-out. |
| Radar | StatRadarChart | scale 0.6→1 + fade (se "expande"). |
| Donut | SpendingDonut | barrido `strokeDashoffset` 750ms. |
| Pulso de día | DaySelector | scale 1→1.25→1 con spring. |
| Fila disruptiva | Listas (historial/requests/notas) | fade + translateX -28→0, stagger por índice. |
| Giro del revólver | RevolverNav | rotación por `requestAnimationFrame` + `easeOutBack`, snap a 60°. |
| Pop del datepicker | P3RDatePicker | scale 0.86→1 + fade, `Easing.out(back)` ~260ms. |
| Pulso de día (picker) | P3RCalendarPanel | scale 1→1.18→1 al seleccionar un día. |

Reglas: micro-interacciones 150–300ms, `transform`/`opacity`, ease-out al entrar,
no bloquear input. Props de SVG no soportan native driver (usa `useNativeDriver:false`).

---

## 7. Layout, espaciado y la REGLA DE ORO

- **Aire entre secciones:** tag→contenido y entre secciones, generoso
  (`sectionTagWrap marginTop ~26`). P3R respira; lo apretado se siente cutre.
- **Ritmo de 4/8.** Paddings/gaps múltiplos de ~4.
- **FABs** con `theme.textInverse` (no `#fff`) por temas de primary claro.

### ⭐ Regla de oro: "cada sección, su propio carácter"
En una pantalla, NO repitas el mismo tratamiento. Combina y varía:
**tamaño · orientación (izq/der) · grado de inclinación · color (primary/secondary) ·
posición (escalonado/sangría) · tipografía · tamaño de texto.**
`PersonaShard` ya lo hace solo entre tags; en chips y secciones, hazlo a mano
(zigzag + cascada + colores alternos). Resultado: cohesión sin monotonía.

---

## 8. Anti-patrones (NO hacer)

- ❌ Colores hardcodeados (`#00D4FF`, `#fff`, verde/rojo material). → tokens.
- ❌ Elementos a 0° / cuadrados perfectos / todos iguales en una fila.
- ❌ Emojis como iconos. → `@expo/vector-icons`.
- ❌ `Switch` nativo para estados. → toggle angular propio.
- ❌ Texto blanco fijo sobre color variable. → `getContrastText`.
- ❌ `theme.card` (indefinido). → `theme.surface`.
- ❌ Secciones pegadas sin aire.

---

## 9. Inventario de piezas reutilizables

- `components/UI/PersonaShard.tsx` — tag/header angular con auto-variación.
- `components/UI/PersonaCount.tsx` — número estilo "01" (ceros tenues + valor sólido).
- `components/UI/PersonaModal.tsx` — shell de pop-up con pop (todos los "agregar/editar").
- `components/UI/PersonaTile.tsx` — tile flotante angular (sombra de acento desplazada). Ver §4.8.
- `components/UI/PersonaSlash.tsx` — slash de énfasis (rayas diagonales detrás de un título). Ver §4.9.
- `components/UI/PressableScale.tsx` — feedback de pulsación.
- `components/UI/CustomAlert.tsx` — alerta global con pop + botones temáticos.
- `components/UI/TabGlyphs.tsx` — glifos SVG de los 6 módulos (navbar). Ver §4.6.
- `components/UI/ActionGlyphs.tsx` — glifos de los FABs de Misiones. Ver §4.6.
- `components/UI/MenuGlyphs.tsx` — glifos de los tiles del Teléfono. Ver §4.6.
- `components/UI/P3RDatePicker.tsx` — `P3RDatePicker` (modal) + `P3RCalendarPanel`
  (panel incrustable). Selector de fecha y calendario P3R. Ver §4.7.
- `components/Stats/StatGlyphs.tsx` + `StatIcon/StatCard/StatChipCascade` + `stats.ts`
  (`resolveStatKey`) — iconos de los 5 atributos. Ver §4.6.
- `components/category-icons/` — `CategoryIcon` + `categories.ts` (20 categorías de Finanzas,
  variante Monolito inline). Ver §4.10.
- `components/Arcana/ArcanaBits.tsx` — `CutCard` (marco Neón cut-corner) + `StatEmblem` +
  `EffectText`. `ArcanaDetailModal.tsx` (detalle/equipar) + `ArcanaPurchaseModal.tsx`
  (confirmar compra + revelado "sello"). Ver §4.11 y §11.
- `components/Navigation/RevolverNav.tsx` — navbar cilindro. Ver §10.
- `hooks/useFocusEntrance.ts` — re-ejecuta la entrada (`translateY`) en cada foco de pantalla.
- `components/UI/Skeleton.tsx` — placeholders con shimmer (`SkeletonCard/ListSkeleton/...`)
  mientras carga la primera vez (evita el blanco entre transiciones).
- `context/EventFlashContext.tsx` — `useEventFlash().flash(...)` → overlay tipo "slam"
  para eventos (misión completada, subida de nivel, recompensa de arco).
- `utils/colorUtils.ts` — `getContrastText`.
- `themes/palettes.ts` — tokens + `DEFAULT_FONTS` (roles).
- `themes/useTheme.ts` — `useTheme()` (puente al GameContext).

> **Estado del rollout P3R:** Finanzas (+ rediseño del gestor de categorías como filas de
> bala + iconos propios §4.10), Misiones (CreateMission es el modelo), Stats, Arcos,
> Phone/Calendario/Notas, CustomAlert, onboarding, **navbar revólver**, datepicker/calendario.
> **Esta sesión se consolidaron:** **Home** (dashboard con `PersonaTile`/`PersonaSlash`),
> **Profile** (identidad + meta-progreso), **CharacterSelection** (rediseño total: carta
> vertical Neón cut-corner + drag/flash), y **Arcanos** (colección + tienda, §11). El selector
> nativo y `react-native-calendars` siguen **fuera de uso**. Pendiente: arte real de personajes
> y de arcanos (hoy placeholder).

---

## 10. Navbar Revólver

Barra de navegación = **cilindro de revólver** (6 cámaras = 6 módulos). Se gira para
cambiar de módulo; la cámara que queda **arriba** es el módulo activo.

- **Archivos:** `components/Navigation/RevolverNav.tsx` + `RevolverTabBar` en
  `navigation/AppNavigator.tsx` (se inyecta como `tabBar` custom del `Tab.Navigator`;
  la barra default se oculta).
- **Mecánica (sin reanimated):** `PanResponder` para arrastrar → gira; al soltar hace
  **snap a 60°** con momentum y abre el módulo de la cámara superior. También se puede
  **tocar una cámara lateral** para saltar a ella. La rotación se anima por
  `requestAnimationFrame` + `easeOutBack`. Sincroniza con `activeIndex` (navegación externa).
- **Geometría (clave del look):** óvalo **ancho y plano**, empujado abajo (solo asoma el
  arco superior, no invasivo). El **anillo de cámaras** (`Rx`, estrecho → las laterales
  caen DENTRO de la pantalla) está **DESACOPLADO** de la **cara del óvalo** (`RFx`, ancha
  → cubre el ancho). `RYR`/`RFy` dan el aplanado vertical y el cuerpo. Las cámaras
  laterales quedan **dentro** del borde del óvalo (no cruzar la línea). La cámara activa
  se **eleva** (`RAISE`) + glow; el **label va DEBAJO** del icono (no roba pantalla arriba).
- **Iconos:** `TabGlyph` (§4.6) con corte Shard en el activo. Todo color del tema.
- **Orden de módulos = vecinos.** Lo define el orden de `Tab.Screen`. Actual:
  `Home (default, centro) · Misiones (der) · Finanzas · Perfil · Teléfono · Stats (izq)`.
- **Convivencia con el contenido:** las pantallas de tabs llevan `paddingBottom ~160`
  para no quedar tapadas por la banda; los **FABs** (Requests/Finanzas) se elevan por
  encima de la banda (`bottom >= ~160`) o quedan no-clickeables (la banda captura el toque).
- **Sin "recarga":** se **eliminó** la animación de rebote vertical (`kick`/`finalize`) que
  subía y bajaba todo el cilindro al cambiar de módulo. Ahora el cambio es limpio: solo gira
  (rotación con `easeOutBack`), sin movimiento vertical del tambor.

---

## 11. Arcanos — Colección y Tienda (UI)

Dos pantallas distintas (datos distintos). **Dirección visual elegida: "Neón P3R"** (marco
cut-corner `CutCard` §4.11). UI del sistema = `theme.primary`; cada carta = su **color jewel**
propio (`src/data/arcanaMeta.ts` → `ARCANA_META[id].color`, junto con `en`/`flavor`; el resto
—rom, nombre, stat, frase de efecto— sale de la tabla `arcanos`).

### Colección / Loadout — `screens/Arcana/ArcanaScreen.tsx`
Gestiona lo que **posees** (`getPlayerArcanaOverview`). NO muestra lo no comprado (eso es la
tienda). Header (NV/¥) + **bandeja de slots** + grid de mini-cartas + `ArcanaDetailModal`.
- **4 estados de carta poseída** (de `locked`/`enCooldown`): `available` (tick verde),
  `locked` (equipado en sus 3 días → candado + `Nd`, no se quita), `active` (equipado libre →
  `EQUIP`, se puede quitar), `cooldown` (atenuado + `LUN`, espera al lunes).
- **Slot tray:** lleno (carta + días/LIBRE) · vacío (punteado) · comprar slot (lleva a la tienda).
- Equipar busca el primer slot libre; quitar/bloqueos respetan `arcanaService` (alertas con el `reason`).

### Tienda — `screens/Arcana/ArcanaShopScreen.tsx`
Gasta yenes. Header con **cartera** (¥ + NV). De arriba a abajo:
- **Slots de equipo:** **máx 3** (decidido); precios reales del backend (`SLOT_PRICES` ¥25k/¥75k).
- **Boosts & consumibles:** filas **placeholder teaser ("PRONTO")**, sin lógica (mecánica futura;
  se quitan/linkean cuando el back las defina). El "desbloqueo anticipado" quedó **descartado**.
- **Catálogo 0–XXI:** filtros (Todos/Comprar/En poder/Bloqueados) + estados `buy`/`owned`/`level`
  (precio real `arcanaPrice`, candado + NV requerido). Tap comprable → `ArcanaPurchaseModal`.
- **Revelado = "sello/OBTENIDO"** (glow + `−¥precio`), **no gacha aleatorio** (sabes qué compras).
- **Destacados rotativos: OMITIDOS** (su rotación/oferta no está decidida; no inventar mecánicas).

### Accesos
- **Tienda:** tile **EMPORIO** en el menú del **Teléfono** (glifo `emporio`/storefront) +
  botón con el mismo glifo en el header de la colección.
- **Colección:** banner "ARCANOS" en **Home** + botón "MIS ARCANOS" en **Perfil**.

> **Arte placeholder:** el centro de cada carta usa el `StatEmblem` como esqueleto. Cuando haya
> ilustración real de los 22 arcanos (y de los personajes), va en ese hueco del panel.
> Ver `documentacion/Sistema_de_Arcanos.md` para la mecánica/economía (backend).
