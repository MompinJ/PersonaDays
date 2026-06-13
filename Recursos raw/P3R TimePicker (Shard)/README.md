# ⏰ P3R TimePicker — variante **SHARD**

Selector de **hora (hora · minutos)** estilo **Persona 3 Reload** para **PersonaDays**.
Pop-up oscuro, angular y con energía, pensado para **reemplazar el selector de hora
nativo** de Android / del navegador que rompe la estética. Hermano del `P3R DatePicker`.

- **24H ↔ 12H intercalable** dentro del propio pop-up (toggle `24H / 12H`).
  El valor interno no cambia al intercalar — sólo la presentación.
- **3 opciones de UX** seleccionables por la prop `variant` → tú eliges una.
- Botón **«Ahora»**, **pulso** animado al cambiar, colon parpadeante.
- Pop-up **escalable** (`width: min(92vw, 320px)`) — móvil y desktop.
- **Color 100% por variables** (`--accent` / `--accent2`): se retiñe con el protagonista activo.
- Cierra con **Esc** o clic en el backdrop. Aislado bajo `.p3rtp`.

---

## ⭐ Las 3 opciones (elige una para Claude Code)

| Opción | `variant` | Cómo es | Minutos |
|---|---|---|---|
| **A · STEPPERS** | `"steppers"` *(default)* | Columnas `HH : MM` con flechas ‹arriba/abajo›. Mantén pulsado = avance rápido. La más compacta y "P3R". | 1 a 1 (`minuteStep`) |
| **B · WHEEL** | `"wheel"` | Ruedas con scroll + banda central iluminada. Gesto rápido tipo móvil. | 1 a 1 |
| **C · GRID** | `"grid"` | Rejilla por pestañas `HORA / MIN` (igual que la rejilla de años del DatePicker). | Pasos (`gridStep`, def. 5) |

> Abre `demo.html` para probar las tres lado a lado con todos los temas.
> **Para escoger:** dile a Claude Code, p. ej. *"usa la opción B (`variant="wheel"`)"*.

---

## 📁 Archivos

| Archivo | Qué es | ¿Obligatorio? |
|---|---|---|
| `p3r-timepicker-core.js` | Helpers de hora (24↔12, formato, `coerce`). Expone `window.P3RTime`. | ✅ |
| `p3r-timepicker.css` | Estilos aislados bajo `.p3rtp`. Tema por variables. Las 3 variantes. | ✅ |
| `p3r-timepicker.jsx` | Componentes React: `P3RTimePicker` (campo + pop-up) y `P3RTimePanel` (solo panel). | ✅ |
| `demo.html` | Demo funcional con las 3 opciones y theming. | Referencia |

> **Fuentes:** Anton, Bebas Neue, Barlow Condensed, Big Shoulders Display y Exo 2
> (las mismas del sistema P3R). Cárgalas desde Google Fonts como en `demo.html`.

---

## 🚀 Uso (React + Babel, como en el proyecto)

```html
<!-- fuentes P3R -->
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Bebas+Neue&family=Barlow+Condensed:wght@500;600;700&family=Big+Shoulders+Display:wght@600;700;800&family=Exo+2:wght@400;600;700&display=swap" rel="stylesheet">
<link href="p3r-timepicker.css" rel="stylesheet">

<!-- React + Babel ya cargados en tu app -->
<script src="p3r-timepicker-core.js"></script>
<script type="text/babel" src="p3r-timepicker.jsx"></script>
```

```jsx
const [hora, setHora] = useState(null);   // {h, m} | null

<P3RTimePicker
  value={hora}
  onChange={setHora}      // se dispara al pulsar "Aceptar"
  variant="steppers"      // <-- la opción que elijas: 'steppers' | 'wheel' | 'grid'
  defaultMode="24"        // formato inicial; el usuario intercala dentro
/>
```

---

## ⚙️ Props de `P3RTimePicker`

| Prop | Tipo | Default | Descripción |
|---|---|---|---|
| `value` | `{h,m} \| "HH:MM" \| Date \| null` | `null` | Hora seleccionada (modelo `{h:0-23, m:0-59}`). |
| `onChange` | `(t: {h,m}) => void` | — | Se llama al pulsar **Aceptar** con la hora elegida. |
| `variant` | `'steppers' \| 'wheel' \| 'grid'` | `'steppers'` | **La opción de UX.** |
| `defaultMode` | `'24' \| '12'` | `'24'` | Formato inicial. El toggle interno permite intercalar. |
| `minuteStep` | `number` | `1` | Salto de minutos en **steppers** (p. ej. `5`). |
| `gridStep` | `number` | `5` | Granularidad de minutos en **grid** (12 celdas con `5`). |
| `accent` | `string` (CSS color) | azul P3R | Color primario del tema. |
| `accent2` | `string` (CSS color) | cyan P3R | Color secundario (banda, outline, colon, raya). |
| `placeholder` | `string` | `"Elegir hora"` | Texto del campo vacío. |
| `className` / `style` | — | — | Se aplican al contenedor `.p3rtp`. |

### El modelo de valor

El valor interno **siempre** es `{ h: 0-23, m: 0-59 }` (24h canónico). Intercalar a
`12H` es sólo presentación: `08:30` ⇄ `08:30 AM` es el mismo objeto `{h:8, m:30}`.
Helpers en `window.P3RTime`: `to12(h)`, `from12(h12, ampm)`, `fmt(t, mode)`, `now()`, `coerce(v)`.

---

## 🎨 Theming

Todo el color sale de dos variables. Por prop (arriba) **o** global:

```css
.p3rtp { --accent: #3D7BFF;  --accent2: #16C7E6; }
```

| Tema | `--accent` | `--accent2` |
|---|---|---|
| Azul P3R | `#3D7BFF` | `#16C7E6` |
| Verde menta | `#2BE6A6` | `#7CF3CC` |
| Kotone | `#FF5BA0` | `#FFB0D2` |
| Ren | `#FF3B4A` | `#FF9098` |
| Aigis | `#F4B43A` | `#FFDD96` |

---

## 🧩 Solo el panel (sin campo)

Si ya tienes tu propio modal y sólo quieres el selector:

```jsx
<div className="p3rtp" style={{ '--accent': '#3D7BFF', '--accent2': '#16C7E6' }}>
  <P3RTimePanel
    value={{ h: 8, m: 30 }}
    variant="wheel"
    mode={mode} onMode={setMode}   // controla el toggle 24/12 desde fuera
    onAccept={(t) => setHora(t)}
    onCancel={() => {}}
  />
</div>
```

---

## 📱 Notas de integración

- **Escala:** el modal usa `min(92vw, 320px)`; suficiente para móvil. Cámbialo en `.p3rtp-modal`.
- **z-index:** el overlay va en `9999`. Súbelo si tu app tiene capas más altas.
- **Aislamiento:** todo cuelga de `.p3rtp`; no choca con tus estilos.
- **Wheel:** usa `scroll-snap` nativo + máscara de desvanecido; sin librerías.
- **Steppers:** las flechas tienen **auto-repeat** al mantener pulsado (pointer events).
- **Sin dependencias** más allá de React. Los helpers son JS puro y portables a Vue/Svelte
  (reusa `p3r-timepicker-core.js` y recrea la vista con el mismo CSS).
