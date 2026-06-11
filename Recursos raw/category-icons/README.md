# Category Icons — PersonaDays · Finanzas

Set de **20 iconos** para las categorías del módulo de gastos/ingresos
(Movimientos), en lenguaje **P3R** (angular, esquinas 0px, `currentColor`).
Dos direcciones de estilo por categoría: **Monolito** (sólido) y **Shard**
(un corte diagonal — la recomendada).

> **Para Claude Code:** este es un paquete autónomo. Cópialo tal cual a
> `src/components/category-icons/`. Las rutas de import son relativas a esa
> ubicación. No inventa colores ni tipografías: todo es `currentColor` + el
> color que tú pases.

---

## 1. Dónde va

```
src/components/category-icons/
├─ icons/
│  ├─ monolito/   20 .svg · sólido limpio
│  └─ shard/      20 .svg · con el corte diagonal P3R   ← usado por defecto
├─ categories.ts     CategoryKey · CATEGORIES · CATEGORY_ORDER · getCategory
├─ CategoryIcon.tsx   componente: <CategoryIcon category color size skew />
├─ index.ts           barrel de exports
├─ svg.d.ts           tipado de imports *.svg (borrar si ya lo tienes)
└─ README.md
```

Los nombres de archivo `.svg` = el `key` de cada categoría = **el nombre del
MaterialCommunityIcon original** (`food`, `bus`, `gamepad-variant`, …). Así la
migración de datos es directa: el campo que hoy guarda el nombre del MCI sigue
funcionando como key.

---

## 2. Setup (una sola vez)

Requiere `react-native-svg` (Expo SDK 52 ya lo trae) y
[`react-native-svg-transformer`](https://github.com/kristerkari/react-native-svg-transformer).
**Si ya lo configuraste para `stats-ui` o `nav-icons`, no toques nada** y salta
al paso 3.

`metro.config.js`:

```js
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');
config.resolver.assetExts = config.resolver.assetExts.filter((e) => e !== 'svg');
config.resolver.sourceExts.push('svg');
module.exports = config;
```

Los SVG usan `fill="currentColor"` → en RN se controla con la prop `color`.

---

## 3. Uso

```tsx
import { CategoryIcon, getCategory } from '../components/category-icons';
import type { CategoryKey } from '../components/category-icons';

// Icono con su color propio (regla de dualidad: el contenido usa SU color)
<CategoryIcon category="food" size={28} />

// Teñido con el protagonista activo (UI del sistema)
<CategoryIcon category="bus" size={26} color={theme.primary} />

// Derecho a 0° para listas densas / tab bars
<CategoryIcon category="home" size={22} skew={0} />
```

### Resolver desde la BD

El movimiento guarda el nombre del MCI como `category`. Resuélvelo seguro:

```tsx
const cat = getCategory(mov.category); // fallback a 'cash' si no existe
<View style={{ borderColor: cat.color }}>
  <CategoryIcon category={cat.key} color={cat.color} />
</View>
<Text>{cat.es}</Text>
```

### Selector de categoría (chips en cascada)

`CATEGORY_ORDER` da el orden canónico. Para el patrón "en cascada" del sistema
de diseño (zigzag de skew + escalonado + color propio de cada chip):

```tsx
import { CATEGORY_ORDER, CATEGORIES, CategoryIcon } from '../components/category-icons';

{CATEGORY_ORDER.map((key, i) => {
  const cat = CATEGORIES[key];
  const sel = value === key;
  const sk = [-15, 12, -11, 15, -13][i % 5];   // alterna dirección
  const st = [0, 20, 6, 18, 4][i % 5];          // escalonado vertical
  return (
    <TouchableOpacity key={key} onPress={() => onChange(key)}
      style={[styles.chip, { marginTop: st, borderColor: cat.color,
        backgroundColor: sel ? cat.color : theme.surface,
        transform: [{ skewX: `${sk}deg` }] }]}>
      <CategoryIcon category={key} size={22} skew={sk}
        color={sel ? '#04101F' : cat.color} />
      <Text style={[styles.chipText, { transform: [{ skewX: `${-sk}deg` }],
        color: sel ? '#04101F' : theme.text, fontFamily: theme.fonts?.heading }]}>
        {cat.es}
      </Text>
    </TouchableOpacity>
  );
})}
```

---

## 4. Reglas (no romper)

- **`currentColor` siempre.** Cero color hardcodeado en el SVG. El color entra
  por la prop `color`; si la omites, usa `CATEGORIES[key].color`.
- **Dualidad.** Contenido (categoría) → su propio color. UI del sistema →
  `theme.primary`. Pasa explícitamente `color={theme.primary}` cuando aplique.
- **El color de la BD manda.** El `color` en `categories.ts` es solo un default
  bonito; si el usuario eligió un color para su categoría, pásalo y gana.
- **Inclinación = contenedor, glifo a 0°.** `CategoryIcon` ya lo hace: el
  `<View>` lleva el `skewX` y el glifo nace derecho (legible). Usa `skew={0}`
  en listas densas.

---

## 5. Glifos

| key (= MCI) | Categoría | Glifo P3R |
|---|---|---|
| `food` | Comida | Tenedor + cuchillo |
| `bus` | Transporte | Autobús |
| `car` | Auto / gasolina | Coche |
| `cart` | Compras | Carrito |
| `shopping` | Bolsas | Bolsa con asa |
| `gamepad-variant` | Videojuegos | Control |
| `movie` | Entretenimiento | Claqueta |
| `home` | Hogar / renta | Casa |
| `hospital-box` | Salud | Cruz médica |
| `school` | Educación | Birrete |
| `book-open-variant` | Libros / estudio | Libro abierto con renglones |
| `gift` | Regalos | Caja + moño |
| `cash` | Efectivo | Billete |
| `credit-card` | Tarjeta | Tarjeta + chip |
| `bank` | Banco | Frontón + columnas |
| `tools` | Herramientas | Llave + desarmador |
| `airplane` | Viajes | Avión |
| `paw` | Mascotas | Huella |
| `tshirt-crew` | Ropa | Playera |
| `glass-cocktail` | Bebidas / salidas | Copa |

> El glifo `book-open-variant` lleva renglones para diferenciarlo del icono de
> stat **Conocimiento** (libro abierto liso) que ya existe en `stats-ui`.

Falta la dirección **Volt** (doble corte) como archivos: se generan desde
`Iconos Categorias P3R/category-lib.js` con `P3RCats.svgFile(key, 'C')` si la
necesitas.
