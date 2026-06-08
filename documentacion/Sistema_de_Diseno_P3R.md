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

## 5. Patrones de elementos (recetas)

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
- `components/UI/PressableScale.tsx` — feedback de pulsación.
- `components/UI/CustomAlert.tsx` — alerta global con pop + botones temáticos.
- `utils/colorUtils.ts` — `getContrastText`.
- `themes/palettes.ts` — tokens + `DEFAULT_FONTS` (roles).
- `themes/useTheme.ts` — `useTheme()` (puente al GameContext).

> **Estado del rollout P3R:** Finanzas, Misiones (completo, CreateMission es el modelo),
> Stats, CustomAlert y onboarding ya consolidados. Pendiente: Arcos, Phone/Calendario/
> Notas, Home/Profile.
