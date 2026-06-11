# 🎴 P3R DatePicker — variante **SHARD**

Selector de fecha (date picker) estilo **Persona 3 Reload** para **PersonaDays**.
Pop-up oscuro, angular y con energía, pensado para **reemplazar el selector de
fecha nativo** de Android / del navegador que rompe la estética.

- Selección de **día · mes · año** (tap en el año → rejilla de años).
- Navegación de mes con flechas `‹ ›`.
- Botón **«Hoy»**, marca del **día actual**, **pulso** animado al seleccionar.
- Pop-up **escalable** (`width: min(92vw, 340px)`) — se ve bien en móvil y desktop.
- **Color 100% por variables** (`--accent` / `--accent2`): se retiñe con el protagonista activo.
- Español, semana **lunes-primero** (L M X J V S D).
- Cierra con **Esc** o clic en el backdrop.

---

## 📁 Archivos

| Archivo | Qué es | ¿Obligatorio? |
|---|---|---|
| `p3r-datepicker-core.js` | Helpers de fecha (meses/días ES, rejilla, comparación). Expone `window.P3RCal`. | ✅ |
| `p3r-datepicker.css` | Estilos aislados bajo `.p3rdp`. Define el tema por variables. | ✅ |
| `p3r-datepicker.jsx` | Componentes React: `P3RDatePicker` (campo + pop-up) y `P3RCalendar` (solo panel). | ✅ |
| `demo.html` | Demo funcional con theming. | Referencia |

> **Fuentes:** usa Anton, Bebas Neue, Barlow Condensed, Big Shoulders Display y Exo 2
> (las mismas del sistema P3R). Cárgalas desde Google Fonts como en `demo.html`.

---

## 🚀 Uso (React + Babel, como en el proyecto)

```html
<!-- fuentes P3R -->
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Bebas+Neue&family=Barlow+Condensed:wght@500;600;700&family=Big+Shoulders+Display:wght@600;700;800&family=Exo+2:wght@400;600;700&display=swap" rel="stylesheet">
<link href="p3r-datepicker.css" rel="stylesheet">

<!-- React + Babel ya cargados en tu app -->
<script src="p3r-datepicker-core.js"></script>
<script type="text/babel" src="p3r-datepicker.jsx"></script>
```

```jsx
const [fecha, setFecha] = useState(null);   // Date | null

<P3RDatePicker
  value={fecha}
  onChange={setFecha}        // se dispara al pulsar "Aceptar"
/>
```

---

## ⚙️ Props de `P3RDatePicker`

| Prop | Tipo | Default | Descripción |
|---|---|---|---|
| `value` | `Date \| null` | `null` | Fecha seleccionada. |
| `onChange` | `(d: Date) => void` | — | Se llama al pulsar **Aceptar** con la fecha elegida. |
| `accent` | `string` (CSS color) | tema azul | Color primario del tema. |
| `accent2` | `string` (CSS color) | tema azul | Color secundario (outline del año, día de hoy, raya). |
| `minDate` | `Date` | — | Fecha mínima seleccionable (las anteriores quedan deshabilitadas). |
| `maxDate` | `Date` | — | Fecha máxima seleccionable. |
| `placeholder` | `string` | `"Elegir fecha"` | Texto del campo cuando no hay valor. |
| `className` / `style` | — | — | Se aplican al contenedor `.p3rdp`. |

### Ejemplos

```jsx
// Solo fechas futuras (p. ej. fecha de un encargo)
<P3RDatePicker value={f} onChange={setF} minDate={new Date()} />

// Tema del protagonista activo
<P3RDatePicker value={f} onChange={setF} accent="#FF5BA0" accent2="#FFB0D2" />  // Kotone
```

---

## 🎨 Theming

Todo el color sale de dos variables. Puedes pasarlas por prop (arriba) **o**
definirlas globalmente para tu app:

```css
.p3rdp {
  --accent:  #3D7BFF;  /* primario */
  --accent2: #16C7E6;  /* secundario */
}
```

Paletas P3R de referencia:

| Tema | `--accent` | `--accent2` |
|---|---|---|
| Azul P3R | `#3D7BFF` | `#16C7E6` |
| Verde menta | `#2BE6A6` | `#7CF3CC` |
| Kotone | `#FF5BA0` | `#FFB0D2` |
| Ren | `#FF3B4A` | `#FF9098` |
| Aigis | `#F4B43A` | `#FFDD96` |

> Las demás variables (`--surface`, `--ink`, `--border`, `--scrim`…) controlan el
> fondo oscuro y se pueden ajustar si algún día quieres un modo claro.

---

## 🧩 Solo el panel (sin campo)

Si ya tienes tu propio modal/contenedor y solo quieres el calendario:

```jsx
<div className="p3rdp" style={{ '--accent': '#3D7BFF', '--accent2': '#16C7E6' }}>
  <P3RCalendar
    value={fecha}
    minDate={...} maxDate={...}
    onPick={(d) => {}}          // cada vez que se toca un día
    onAccept={(d) => setFecha(d)}
    onCancel={() => {}}
  />
</div>
```

---

## 📱 Notas de integración

- **Escala:** el modal usa `min(92vw, 340px)`; no necesitas más para móvil.
  Si lo quieres más grande/chico, cambia ese valor en `.p3rdp-modal`.
- **z-index:** el overlay va en `z-index: 9999`. Súbelo si tu app tiene capas más altas.
- **Aislamiento:** todo cuelga de `.p3rdp`, así que no choca con los estilos de tu app.
- **Sin dependencias** más allá de React. Los helpers de fecha son JS puro.
- **Portado a otro framework:** la lógica vive en `p3r-datepicker-core.js` (agnóstico).
  Puedes reusarla en Vue/Svelte/etc. y solo recrear la capa de vista con el mismo CSS.
