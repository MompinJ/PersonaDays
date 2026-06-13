# Modulo de Arcos (Narrativa / Capsula del tiempo)

## Proposito General
Gestiona las etapas de vida del jugador ("Arcos"). Cada arco es un contenedor de
misiones, define el enfoque actual del personaje, y al cerrarse se convierte en una
**capsula del tiempo**: guarda su banda sonora (anthem), una galeria de fotos, una
frase que lo define, un journal de reflexiones, y una pantalla de **resultados** con
el crecimiento real del personaje.

**Regla Principal:** Solo puede haber **1 Arco Activo** simultaneamente.

---

## Ciclo de vida y estado

Un arco **nace ACTIVO** (con `fecha_inicio`, sin `fecha_fin`) y solo pasa a
**COMPLETADO** cuando el usuario lo cierra. No se programa fecha de fin de antemano
(el date-picker de fin se quito del formulario).

**Fuente unica del estado:** la columna `estado`, leida por el helper
`getArcState(arc)` en `arcService.ts`. Antes el estado se derivaba de las fechas en
cada pantalla (inconsistente: un arco completado con fecha futura se veia mal); ya no.
Estados: `ACTIVO`, `COMPLETADO`, `ABANDONADO`. No existe "PENDIENTE/PROGRAMADO".

**Medida de progreso = TIEMPO, no misiones.** La tarjeta y el detalle muestran los
**dias** que ha durado el arco (`arcElapsedDays(arc)`: activo = hoy - inicio;
completado = fin - inicio; minimo 1), NO un porcentaje de misiones completadas.

---

## Cierre del arco (recompensa + snapshots)

Centralizado en `arcService.ts` -> `finalizeArcWithRewards(arc, player)`, todo en una
transaccion. Al finalizar:

1. Calcula el **XP escalado** (ver mas abajo) y lo guarda en `xp_otorgado`.
2. Toma el **snapshot_fin** de stats (ANTES de aplicar el bonus, para que el radar
   refleje el crecimiento real sin inflarlo).
3. **Archiva** (`activa=0`) las misiones tipo ARCO no completadas: cuentan como falladas.
4. Marca `estado='COMPLETADO'` y fija `fecha_fin`.
5. Otorga el XP al `id_stat_relacionado` y recalcula nivel de stat + nivel de jugador.

Ambas vias de cierre usan el mismo servicio: swipe en `ArcsScreen` y boton en
`ArcDetailScreen`. Las dos navegan luego a la pantalla de resultados (`ArcResults`).

### XP escalado por dias + esfuerzo
```
xp = round( clamp(dias * 25, 250, 3000) * factor_completitud )
```
`factor_completitud` = misiones ARCO completadas/total, `clamp(0.25, 1)`; si no hay
misiones ARCO, factor = 1. Detalle y justificacion en `Sistema_de_Progresion.md` (seccion 8).

### Snapshots de stats (para el radar comparativo)
`jugador_stat` solo guarda el estado actual (no hay historial), asi que para comparar
"inicio vs fin" se fotografian las stats como JSON:
- `snapshot_inicio`: al **crear** el arco (en `ManageArcModal`).
- `snapshot_fin`: al **finalizar**.

Ambos via `buildStatsSnapshot()` (misma query LEFT JOIN stats/jugador_stat que
`usePlayerStats`). Formato de cada entrada (`ArcoStatSnapshot`): `{ id_stat, nombre,
nivel_actual, experiencia_actual, nivel_maximo }`.

---

## Anthem (banda sonora)

Cada arco puede tener una cancion que marco la etapa: titulo (`anthem_titulo`), link
(`anthem_url`) y caratula cacheada (`anthem_cover_url`).

**Enriquecimiento via Spotify oEmbed** (`anthemService.ts` -> `fetchAnthemMeta`): al
pegar un link de Spotify, se consulta `https://open.spotify.com/oembed?url=...`
(publico, **sin API key ni OAuth**) que devuelve la caratula (`thumbnail_url`) y el
titulo. En `ManageArcModal`, al salir del campo del link se trae la caratula (con
preview) y se autocompleta el titulo si esta vacio. Falla en silencio sin red o con
links no-Spotify (Apple Music etc. quedan como link clickeable sin caratula).

El anthem se muestra (con caratula) y es **clickeable** (`Linking.openURL`) en la
tarjeta, el detalle y la pantalla de resultados.

> Limitacion: oEmbed da caratula + titulo, no artista/album/duracion. Para esa
> metadata mas rica haria falta la Spotify Web API (con credenciales).

---

## Galeria de fotos (Memories)

Tabla `arco_fotos` + `arcPhotoService.ts` + componente `ArcGallery`.

- Picker con **expo-image-picker**; la imagen elegida se **copia** a
  `documentDirectory/arc_photos/` con `expo-file-system/legacy` (las URIs del picker
  son efimeras).
- En la DB se guarda **solo el nombre relativo** (`archivo`); la ruta absoluta se
  reconstruye con `documentDirectory` al leer (el prefijo cambia entre reinstalaciones).
- `ArcGallery` editable (detalle de arco activo): tile para añadir + long-press para
  borrar. Read-only (resultados): solo muestra. La tarjeta HERO muestra un carrusel.
- **Backup:** las fotos NO se incluyen en el backup (que exporta solo el .db). Al leer
  se valida `getInfoAsync().exists`; si falta el archivo se muestra un placeholder.

> **expo-image-picker es modulo nativo:** requiere **rebuild del dev build** para
> funcionar (añadir foto). El resto (leer fotos, caratula de Spotify) funciona con
> solo recargar JS. Plugin configurado en `app.json` con `photosPermission`.

---

## Pantallas y Componentes

### 1. ArcsScreen (`src/screens/Phone/Arcs/ArcsScreen.tsx`)
- Pestañas `ACTIVOS` / `HISTORIAL` (filtradas por `getArcState`).
- Arco activo: tarjeta grande (`ArcCard mode="HERO"`) en `Swipeable`; swipe a la
  derecha finaliza (con confirmacion) -> navega a `ArcResults`.
- Validacion de creacion: bloquea si ya existe uno `estado='ACTIVO'`.
- Tap en un arco: ACTIVO -> `ArcDetail`; COMPLETADO -> `ArcResults`.

### 2. ArcDetailScreen (`src/screens/Phone/Arcs/ArcDetailScreen.tsx`)
Modo zen **editable** del arco activo:
- Frase protagonica, dias en el arco (TIEMPO), atributo que nutre.
- Anthem (caratula + link clickeable).
- Galeria (`ArcGallery` editable).
- Misiones tipo ARCO con su estado.
- Journal (`resumen_final`) editable (TextInput, guarda en `onBlur`).
- Botones Editar / Finalizar (este ultimo -> `ArcResults`).

Para un arco COMPLETADO no se entra aqui (se va directo a `ArcResults`).

### 3. ArcResultsScreen (`src/screens/Phone/Arcs/ArcResultsScreen.tsx`) — ruta `ArcResults`
Pantalla de **resultados** (al finalizar y como vista de historial). Re-lee el arco
fresco de la DB (el objeto de params no trae snapshot_fin/xp). Secciones:
- Header: nombre, frase, fechas, duracion en dias.
- XP otorgado (numero grande).
- **Radar comparativo** inicio-vs-fin (`StatRadarChart` con `baselineValues`).
- Grind del periodo (diarias + semanales completadas, via `logs.id_arco`).
- Misiones ARCO logradas vs falladas.
- Memories (carrusel read-only, solo si hay fotos).
- Anthem + Journal.
- Balance financiero (rango de fechas en `finanzas`, poco protagonismo).

### 4. ArcCard (`src/components/Arcs/ArcCard.tsx`)
- Modo `HERO` (tarjeta grande) y `DEFAULT` (listas).
- Muestra: titulo, badge de estado, frase, fechas, fila de anthem (caratula +
  clickeable), **dias en el arco** (numero grande), y en HERO un carrusel de fotos.

### 5. ManageArcModal (`src/components/Arcs/ManageArcModal.tsx`)
Formulario crear/editar: titulo, descripcion, frase, anthem (titulo + link con fetch
de caratula), fecha de inicio (NO de fin), color, stat relacionado. Al **crear**
inyecta `snapshot_inicio`. No editable si el arco esta COMPLETADO.

### 6. StatRadarChart (`src/components/Stats/StatRadarChart.tsx`)
Radar de stats reutilizable. Prop opcional `baselineValues` (mapa `id_stat -> nivel`):
dibuja una segunda serie punteada/tenue (inicio) debajo de la solida (fin).

---

## Base de Datos

### Tabla: `arcos`
| Campo | Tipo | Notas |
| :--- | :--- | :--- |
| `id_arco` | PK | |
| `nombre` | TEXT | |
| `descripcion` | TEXT | |
| `fecha_inicio` | TEXT | 'yyyy-mm-dd' |
| `fecha_fin` | TEXT | NULL hasta que el usuario finaliza |
| `id_arco_padre` | INTEGER | inerte (sub-arcos retirados) |
| `id_stat_relacionado` | INTEGER | FK a stats (recibe el XP de cierre) |
| `color_hex` | TEXT | default legacy '#00D4FF' -> `arcDisplayColor` usa el color del tema |
| `estado` | TEXT | 'ACTIVO' / 'COMPLETADO' / 'ABANDONADO' (fuente unica) |
| `resumen_final` | TEXT | journal / reflexiones |
| `anthem_titulo` | TEXT | (v3) |
| `anthem_url` | TEXT | (v3) |
| `anthem_cover_url` | TEXT | caratula cacheada de Spotify (v4) |
| `frase_protagonica` | TEXT | frase que define el arco (v3) |
| `snapshot_inicio` | TEXT | JSON de stats al crear (v3) |
| `snapshot_fin` | TEXT | JSON de stats al finalizar (v3) |
| `xp_otorgado` | INTEGER | XP escalado del cierre (v3) |

### Tabla: `arco_fotos`
| Campo | Tipo | Notas |
| :--- | :--- | :--- |
| `id_foto` | PK | |
| `id_arco` | INTEGER | FK |
| `archivo` | TEXT | nombre relativo dentro de documentDirectory/arc_photos/ |
| `fecha` | TEXT | |
| `caption` | TEXT | (reservado) |

**Migraciones:** v3 (columnas de arcos + tabla `arco_fotos` + indices `idx_logs_arco`,
`idx_arco_fotos_arco`) y v4 (`anthem_cover_url`). Via `ensureColumn` idempotente en
`database.ts`; reflejadas tambien en el `CREATE TABLE` base.

### Logs
`logs.id_arco` se puebla en `missionService.completeMission` con el arco ACTIVO del
momento; de ahi sale el "Grind" del periodo (diarias/semanales).
