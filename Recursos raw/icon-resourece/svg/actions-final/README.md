# Iconos de Acción (FAB) — FINAL · PersonaDays

Los 3 elegidos para el stack flotante. Lenguaje angular P3R, grid 48×48,
esquinas 0px, **`currentColor`** (se tiñen con `theme.primary`).

```
svg/actions-final/
├─ historial.svg   ← Reloj facetado  (octágono + manecillas)   · reemplaza el reloj
├─ gestionar.svg   ← Consola [≡]     (corchetes + líneas)      · reemplaza el engranaje
└─ agregar.svg     ← Estallido       (cruz de 4 shards + núcleo)· reemplaza el +
```

| Archivo | Botón | FAB |
| :-- | :-- | :-- |
| `historial.svg` | Historial de misiones completadas | aro (borde + glifo `primary`) |
| `gestionar.svg` | Gestionar todas las misiones | aro (borde + glifo `primary`) |
| `agregar.svg` | Nueva misión | relleno (fondo `primary`, glifo `textInverse`) |

## Uso en react-native-svg

```tsx
import Historial from '../../assets/icons/actions/historial.svg';
import Gestionar from '../../assets/icons/actions/gestionar.svg';
import Agregar   from '../../assets/icons/actions/agregar.svg';

// FABs de aro
<View style={fabRing}><Historial width={24} height={24} color={theme.primary} /></View>
<View style={fabRing}><Gestionar width={24} height={24} color={theme.primary} /></View>

// FAB principal (relleno) — glifo oscuro sobre primary
<View style={[fabSolid, { backgroundColor: theme.primary }]}>
  <Agregar width={30} height={30} color={theme.textInverse} />
</View>
```

## Notas
- **No** hardcodear color: dejar `currentColor` y pasar `color`.
- Vienen a 0°; para el ángulo P3R envuelve en `<View>` con `transform:[{skewX:'-12deg'}]`.
- Las otras propuestas siguen en `svg/actions/` por si quieres recuperarlas.
