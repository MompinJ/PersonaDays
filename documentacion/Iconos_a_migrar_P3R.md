# Iconos genéricos a migrar a estilo P3R

> Inventario de TODOS los iconos de librería genérica (`@expo/vector-icons`:
> **Ionicons** y **MaterialCommunityIcons**) que conviene reemplazar por glifos
> custom estilo Persona 3 Reload (técnica `Mask` SVG inline, ver
> `Sistema_de_Diseno_P3R.md` §4.6). NO incluye los glifos ya custom
> (StatGlyphs, TabGlyphs, MenuGlyphs, ActionGlyphs, CategoryIcon, StatEmblem).
>
> Total: ~92 usos · ~70 nombres distintos. Marca `[x]` cuando el glifo nuevo
> esté hecho y cableado.

Librería: **(I)** = Ionicons · **(M)** = MaterialCommunityIcons.

---

## A. Navegación (back / chevrons)

- [ ] `chevron-back` (I) — atrás/anterior. ManageCategoriesScreen:215, ArcanaScreen:137, ArcanaShopScreen:135, CharacterSelectionScreen:179
- [ ] `chevron-forward` (I) — avanzar/entrar (affordance "toca para ir"). ManageMissionsScreen:146, HomeScreen:125, ProfileScreen:153/166/177, SettingsScreen:292, CharacterSelectionScreen:184
- [ ] `arrow-back` (I) — volver (topBar). ArcDetailScreen:87
- [ ] `arrow-left` (M) — volver (cabecera Teléfono). PhoneHeader:48
- [ ] `chevron-right` (M) — entrar a detalle (fila de nota). ListsMenuScreen:97

## B. Acciones CRUD (agregar / editar / borrar / cerrar / confirmar)

- [ ] `add` (I) — añadir/crear "+". AddStatButton:17, ArcanaScreen:177 (comprar slot) y :224 (slot vacío), ArcsScreen:197 (FAB crear arco)
- [ ] `add-circle` (I) — comprar siguiente slot. ArcanaShopScreen:163
- [ ] `plus` (M) — FAB crear. EconomyScreen:263 (nuevo movimiento), ListsMenuScreen:221 (nueva nota)
- [ ] `plus-thick` (M) — guardar/crear categoría. ManageCategoriesScreen:200
- [ ] `create` (I) — editar nombre. SettingsScreen:190
- [ ] `pencil` (M) — editar nota (entrar a modo edición). ListDetailScreen:250
- [ ] `trash` (I) — borrar todos los arcos. SettingsScreen:249
- [ ] `trash-can` (M) — borrar categoría. ManageCategoriesScreen:49
- [ ] `trash-can-outline` (M) — eliminar nota. ListDetailScreen:222
- [ ] `close` (I) — cerrar modal. ArcanaDetailModal:45, ArcanaPurchaseModal:52
- [ ] `close-circle` (I) — limpiar/quitar valor (la hora). CreateMissionScreen:486
- [ ] `arrow-undo` (I) — deshacer/revertir (devolver a pendientes). MissionDetailModal:183

## C. Confirmación / completado / selección

- [ ] `checkmark` (I) — seleccionado/poseído. ArcanaScreen:273 (active) y :281 (available), ArcanaShopScreen:256 ("EN PODER"), ManageArcModal:120 (color elegido)
- [ ] `checkmark-circle` (I) — completar / stat seleccionado. MissionItem:67 (swipe COMPLETAR), SelectGraphStatsModal:80, ArcanaShopScreen:163 (slot activo)
- [ ] `checkmark-done` (I) — todo hecho/completado. CompletedMissionsScreen:56 (fila historial), HomeScreen:157 ("día completo")
- [ ] `checkmark-done-circle-outline` (I) — estado vacío "sin misiones". MissionsScreen:248
- [ ] `checkmark-sharp` (I) — confirmar/aceptar. ArcanaPurchaseModal:78 (CONTINUAR), CharacterSelectionScreen:317 ("I AM THOU")
- [ ] `check` (M) — finalizar (swipe FINALIZAR arco). ArcsScreen:100
- [ ] `check-bold` (M) — color seleccionado (swatch). ManageCategoriesScreen:170

## D. Tiempo / fecha / recurrencia / notificaciones

- [ ] `calendar` (I) — fecha límite. CreateMissionScreen:453; insight "MEJOR DÍA" TrendsScreen:180; tile "DÍAS" ProfileScreen:72
- [ ] `calendar-outline` (I) — fechas/periodo/ciclo. ArcanaScreen:162 (ciclo slots), ArcDetailScreen:98, ManageArcModal:91 (fecha inicio); MissionItem:84 (planificado, par con `flash`)
- [ ] `time` (I) — en espera/cooldown · vencimiento. MissionDetailModal:136 (fecha, rojo si vencida), ArcanaDetailModal:118 (EN ESPERA), ArcanaScreen:286 (cooldown), ArcanaShopScreen:181 (teaser ROMPER ESPERA)
- [ ] `time-outline` (I) — plazo/fecha de expiración. MissionItem:142
- [ ] `alarm` / `alarm-outline` (I) — hora asignada (relleno) / sin hora (contorno). CreateMissionScreen:475
- [ ] `alarm-outline` (I) — hora de la misión. MissionItem:130
- [ ] `repeat` (I) — recurrente/se repite. MissionItem:138, MissionDetailModal:130, ManageMissionsScreen:139 (par con `flash-outline`)
- [ ] `notifications` / `notifications-outline` (I) — aviso activo / desactivado. CreateMissionScreen:493; `notifications` también en MissionItem:133 y SettingsScreen:204 (recordatorios)
- [ ] `flag` / `flag-outline` (I) — meta/fecha tope (con límite / sin límite). CreateMissionScreen:441; `flag-outline` en ManageArcModal:95 (fecha fin)

## E. Finanzas

- [ ] `arrow-up-bold` (M) — ingreso (dinero entra). EconomyScreen:135, ManageCategoriesScreen:154 (chip INGRESO)
- [ ] `arrow-down-bold` (M) — gasto (dinero sale). EconomyScreen:143, ManageCategoriesScreen:154 (chip GASTO)
- [ ] `cash` (I) — dinero/yenes. TrendsScreen:182 (insight YENES), ArcanaShopScreen:181 (teaser DOBLE YENES)
- [ ] `chart-donut` (M) — gráfico de distribución (estado vacío del donut). EconomyScreen:179
- [ ] `wallet-outline` (M) — finanzas/sin movimientos (estado vacío). EconomyScreen:245
- [ ] `wallet-outline` (I) — saldo insuficiente. ArcanaPurchaseModal:105 (par con `cart`)
- [ ] `cart` (I) — comprar/confirmar compra. ArcanaPurchaseModal:105
- [ ] `tune-vertical` (M) — administrar/ajustar (gestionar categorías). EconomyScreen:226

## F. Arcanos / poder

- [ ] `sparkles` (I) — magia/comodín/Arcanos. ArcanaBits:52 (comodín, par con `planet`), HomeScreen:122 (acceso ARCANOS), ProfileScreen:150 (MIS ARCANOS)
- [ ] `planet` (I) — "todos los stats"/efecto global. ArcanaBits:52
- [ ] `flash` (I) — activar/equipar (poder) · recomendado hoy · impulso. ArcanaDetailModal:118 (EQUIPAR), TrendsScreen:181 (PROMEDIO), ArcanaShopScreen:181 (IMPULSO XP); MissionItem:84 (recomendado hoy, par con `calendar-outline`)
- [ ] `flash-outline` (I) — una sola vez (puntual). ManageMissionsScreen:139
- [ ] `remove-circle-outline` (I) — desequipar/quitar. ArcanaDetailModal:118
- [ ] `lock-closed` (I) — bloqueado (días/nivel). ArcanaDetailModal:118, ArcanaScreen:273, ArcanaShopScreen:163 y :262
- [ ] `lock-open` (I) — desbloqueo anticipado (teaser). ArcanaShopScreen:181
- [ ] `albums-outline` (I) — colección vacía. ArcanaScreen:193

## G. Perfil / progreso / sistema

- [ ] `flame` (I) — racha/constancia. HomeScreen:98, ProfileScreen:69 (tile RACHA)
- [ ] `star` (I) — prestigio/mérito. ProfileScreen:70 (tile PRESTIGIO)
- [ ] `barbell` (I) — esfuerzo/entrenamiento. ProfileScreen:71 (tile ESFUERZO)
- [ ] `settings-sharp` (I) — ajustes/configurar. StatsScreen:123 (configurar gráfico), ProfileScreen:83 (engrane)
- [ ] `construct-outline` (I) — configuración/herramientas. ProfileScreen:174
- [ ] `people-circle-outline` (I) — cambiar persona/avatar. ProfileScreen:163
- [ ] `person-circle` (I) — configurar personaje. SettingsScreen:182
- [ ] `trending-up` (I) — tendencia/progreso (estado vacío Tendencias). TrendsScreen:151
- [ ] `star-four-points` (M) — atributo/stat del arco (chip). ArcDetailScreen:121

## H. Notas / markdown

- [ ] `note-text-outline` (M) — notas (estado vacío). ListsMenuScreen:205
- [ ] `checkbox-marked` / `checkbox-blank-outline` (M) — tarea hecha / pendiente (toggle). ListDetailScreen:166
- [ ] `checkbox-marked-outline` (M) — insertar checkbox (toolbar). ListDetailScreen:280
- [ ] `format-list-bulleted` (M) — insertar viñeta (toolbar). ListDetailScreen:283

## I. Datos / respaldo / mantenimiento

- [ ] `cloud-upload` (I) — exportar respaldo. SettingsScreen:222
- [ ] `cloud-download` (I) — restaurar respaldo. SettingsScreen:230
- [ ] `layers` (I) — stats duplicados. SettingsScreen:242
- [ ] `warning` (I) — peligro/acción destructiva. SettingsScreen:265 (RESET DATA)
- [ ] `link` (I) — vinculado a un arco. CreateMissionScreen:358

## J. Estados vacíos varios (placeholders)

- [ ] `moon-outline` (I) — nada completado hoy (noche/descanso). CompletedMissionsScreen:202
- [ ] `file-tray-outline` (I) — sin resultados con esos filtros. ManageMissionsScreen:218
- [ ] `book-open-page-variant-outline` (M) — sin arco activo (capítulo/historia). ArcsScreen:170
- [ ] `trophy-outline` (M) — sin capítulos completados (logro). ArcsScreen:187
- [ ] `tag-off-outline` (M) — sin categorías. ManageCategoriesScreen:231

---

## Notas

- **Pares relleno/contorno** (probablemente quieras diseñar los dos): `flag`/`flag-outline`,
  `alarm`/`alarm-outline`, `notifications`/`notifications-outline`, `lock-closed`/`lock-open`,
  `checkbox-marked`/`checkbox-blank-outline`, `cart`/`wallet-outline`.
- **Significado dual** (mismo nombre, distinto sentido según contexto): `flash` (equipar / recomendado-hoy / impulso),
  `time` (cooldown / vencimiento), `calendar`/`calendar-outline` (fecha límite / ciclo / planificado),
  `wallet-outline` existe en AMBAS librerías con sentido distinto (sin-movimientos vs saldo-insuficiente).
- Iconos que se pintan desde datos/props (mismo render, varios literales): tiles de PROGRESO
  (ProfileScreen:135 → flame/star/barbell/calendar), filas de Ajustes (SettingsScreen:287 →
  person-circle/create/cloud-upload/cloud-download/layers/trash), insights (TrendsScreen:283 →
  calendar/flash/cash), botón de acción de arcano (ArcanaDetailModal:118 → flash/remove-circle-outline/lock-closed/time),
  teasers de tienda (ArcanaShopScreen:181 → cash/flash/time/lock-open).
- Import muerto (no usado): `MaterialCommunityIcons` en `Phone.tsx` y en `AddTransactionModal.tsx`.
