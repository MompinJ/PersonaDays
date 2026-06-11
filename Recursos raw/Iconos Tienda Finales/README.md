# Íconos de Tienda — Finales

Los dos elegidos, en lenguaje P3R (48×48, angular, `currentColor`):

| id | Nombre | Archivo |
|----|--------|---------|
| `storefront` | **EMPORIO** | `svg/storefront.svg` |
| `tag` | **ETIQUETA** | `svg/tag.svg` |

## Uso (react-native-svg)
```tsx
import StoreIcon from '../assets/icons/tienda/storefront.svg';
<StoreIcon width={24} height={24} color={theme.primary} />
```
- `fill="currentColor"` → el color se pasa con la prop `color` (tema/oro de la tienda).
- Para inclinación P3R: envolver en `View` con `transform:[{ skewX:'-9deg' }]`.

`Iconos Finales.html` = vista previa (tamaños + tintes).
