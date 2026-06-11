# Handoff: Tienda de Arcanos · PersonaDays / P3R

> **Para Claude Code:** Esto es una **referencia de diseño en HTML/CSS/JSX** (prototipo), no
> código de producción. Recrea la pantalla en el codebase real (React Native / Expo, sistema P3R).
> **Muchos valores son PLACEHOLDER y varias mecánicas no están decididas — NO las implementes
> sin antes validarlas con el dueño del proyecto.** Ver §⚠️ DECISIONES PENDIENTES.

---

## ⚠️ DECISIONES PENDIENTES — VALIDAR ANTES DE IMPLEMENTAR
Estas cosas están puestas en el prototipo para *mostrar el concepto*, pero **no son definitivas**.
Pregunta al dueño antes de codificarlas:

1. **Slots de equipo (precios y tope).**
   - En el proto: tienes 2 slots; Slot 3 = ¥10,000, Slot 4 = ¥25,000, Slot 5 = ¥50,000 (tope).
   - ❓ ¿Cuántos slots máximos? ¿Curva de precio real? ¿Se desbloquean por nivel además de pagar?
   - ❓ ¿El siguiente slot sólo aparece tras comprar el anterior (como en el proto), o todos a la vez?

2. **Boosts temporales** (DOBLE YENES, IMPULSO XP).
   - En el proto: son una **idea/teaser** ("PRONTO"). Duraciones (30 min / 1 h) y precios inventados.
   - ❓ ¿Entran en esta versión o se quedan fuera? ¿Duración, efecto exacto, stackeo, precio?

3. **Consumibles** (ROMPER ESPERA, DESBLOQUEO ANTICIPADO).
   - En el proto: ROMPER ESPERA libera un Arcano en cooldown; DESBLOQUEO ANTICIPADO marcado
     "Próximamente". Son **conceptos**, no confirmados.
   - ❓ ¿Romper el cooldown rompe la mecánica de rotación? ¿Se permite? ¿A qué precio?
   - ❓ ¿"Desbloqueo anticipado" (comprar un Arcano sin tener el nivel) debería existir siquiera?

4. **Precios de los Arcanos** (`tienda-data.js → PRICES`).
   - Todos son **placeholder** (rangos ¥2,500–¥20,000 según rareza percibida). Falta balance económico real.

5. **Destacados rotativos** (`FEATURED`) y **rotación**.
   - En el proto: 3 fijos (1 oferta -20%, 1 destacado, 1 teaser) y un contador "ROTA EN 2D 06H" decorativo.
   - ❓ ¿Cómo se eligen los destacados (aleatorio, curado, por nivel)? ¿Cada cuánto rota? ¿La oferta es real?

6. **Animación de revelado (gacha/sobre).**
   - Se aplica a la **compra de Arcanos**. ❓ ¿Aplica también a slots/boosts, o esos son compra directa?
   - ❓ ¿El revelado tiene sentido si el jugador ya sabe qué Arcano compra? (no es aleatorio).
     Quizá deba enmarcarse como "invocación/sello", no como gacha de azar. **Confirmar el framing.**

7. **Moneda y economía.** Saldo inicial ¥12,800 es placeholder. Falta definir fuentes de yenes.

> Si el dueño no ha decidido algo, **deja la sección como teaser deshabilitado** (como en el proto)
> en vez de inventar la mecánica.

---

## Qué es esta pantalla
**Tienda** independiente donde el jugador gasta **yenes** (moneda del juego). Pantalla móvil,
estilo *Persona 3 Reload*, con **saldo siempre visible**. De arriba a abajo:

1. **Header** — eyebrow "EMPORIO · ARCANOS", título `TIENDA`, y **billetera** (saldo ¥ + nivel),
   siempre visibles (sticky sobre degradado del fondo).
2. **DESTACADOS** (rotativos) — carrusel horizontal: oferta del día (precio tachado), destacado,
   y teaser "PRÓXIMAMENTE" (bloqueado por nivel). Contador de rotación.
3. **SLOTS DE EQUIPO** — comprar slots extra para equipar más Arcanos (ver §Decisiones #1).
4. **BOOSTS & CONSUMIBLES** — filas teaser ("PRONTO"), ver §Decisiones #2 y #3.
5. **CATÁLOGO · 0–XXI** — los 22 Arcanos Mayores con filtros (Todos / Comprar / En poder /
   Bloqueados). Cada carta muestra precio, "EN PODER", o candado + nivel requerido.

### Flujo de compra (Arcano)
Tap en carta comprable → **modal de confirmación** (carta + precio + saldo resultante) →
CONFIRMAR → **animación de revelado**: carta sellada que el usuario **toca para voltear**
(flip 3D + destello + rayos), revela el Arcano, "¡OBTENIDO! −¥precio" → CONTINUAR.
La carta pasa a estado **EN PODER** y el saldo se descuenta.

> El revelado es visual; la compra **no es aleatoria** (sabes qué compras). Ver §Decisiones #6.

---

## Estados de carta en el catálogo
| Estado | Significado | Tratamiento |
|---|---|---|
| **buy** | Comprable (tienes el nivel, no lo posees) | Carta a color + **chip de precio** dorado. Tap → confirmar compra. |
| **owned** | Ya lo tienes | Carta atenuada + cinta verde "EN PODER". Tap → aviso. |
| **level** | Bloqueado por nivel | Carta gris + candado + chip "NV xx". Tap → aviso de nivel. |

(Reusa la base visual `.mini` del selector de Arcanos — misma carta, distinto pie.)

---

## Mapa de archivos
| Archivo | Qué es | ¿Portar a producción? |
|---|---|---|
| `Tienda Arcanos.html` | Entrada: lienzo 460×940, fuentes, escalado, carga de scripts | Referencia |
| `tienda.css` | **Estilos propios de la tienda** (header, destacados, slots, filas, modal, revelado, toast) | Referencia visual canónica |
| `arcanos.css` | Tokens + base de carta `.mini` (compartido con el selector) | Referencia (ya existe del selector) |
| `tienda-data.js` | **PLACEHOLDER**: precios, destacados, tiers de slot, boosts, consumibles, timer | Reemplazar por BD/economía real |
| `arcanos-data.js` | **PLACEHOLDER**: los 22 Arcanos (de la BD en producción) | Reemplazar por BD |
| `arcano-icons.jsx` | Iconos SVG (`<Ico name size stroke/>`) | Mapear a `@expo/vector-icons` / SVGs existentes |
| `tienda-card.jsx` | `ShopCard`, `FeaturedCard`, `SlotShop`, `ItemRow`, `RevealFront` | Recrear como componentes RN |
| `tienda-app.jsx` | Orquestador (estado, compra, confirmar, revelar, filtros, toast) | Recrear lógica en RN |
| `tweaks-panel.jsx` | Panel de ajustes del prototipo | **NO portar** |
| `image-slot.js` | Placeholder de imagen arrastrable | **NO portar** (usar `<Image>`) |

> **No portar:** `tweaks-panel.jsx`, `image-slot.js`, ni los `<script>` de React/Babel por CDN.
> Son andamiaje del prototipo.

---

## Sistema de diseño P3R (reusar, NO reinventar)
Mantén coherencia con el selector de Arcanos y el resto de la app:
- **Tokens** en `arcanos.css` (`:root`/`#stage`): `--bg #140C22`, `--surface #241738`,
  `--gold #D9B24A`, `--gold-hi #F2D784`, `--violet #7C5BC4`, `--text #F3EAD9`, `--ok #67C796`, etc.
- **Color por Arcano** (`--ac`): cada carta usa su jewel-tone propio (de la BD). El color del
  **avatar** (`theme.primary`) NO se usa para contenido; mantener esa dualidad.
- **Tipografía (roles):** Anton (títulos/nombres/botones), Big Shoulders Display (números/¥/precios),
  Bebas Neue (headers de sección), Barlow Condensed (labels/tags), Exo 2 (body).
- **Forma P3R:** casi todo con inclinación `skewX(-6…-9deg)`; el texto interior se contra-inclina
  (`skewX(9deg)`) para quedar recto. Biseles con `clip-path`.
- **Componentes existentes del codebase a aprovechar:** `PersonaShard` (tags/banners angulares),
  `PersonaModal` (el modal de confirmación), `PressableScale`, `getContrastText(hex)` (texto
  legible sobre el color variable del botón/chip).

---

## Lógica / estado (referencia)
Estado del prototipo (`tienda-app.jsx`), a recrear server-authoritative:
- `yenes` (saldo), `owned` (set de ids comprados en sesión), `filter`.
- `confirm` (item en confirmación: arcano | slot | item), `reveal` (arcano revelándose), `flipped`.
- **Compra de Arcano:** confirma → descuenta yenes → revelado → marca `owned`.
- **Compra de slot / item:** confirma → descuenta → toast (sin revelado).
- **Validaciones server-side reales a implementar:** saldo suficiente, nivel suficiente, no
  duplicar Arcano, tope de slots, y toda la economía. **No confiar en el cliente.**

### Estado derivado de un Arcano en la tienda (`shopStatus`)
- `buy` si no lo tienes y `player.level >= arcano.level`.
- `level` si no lo tienes y `player.level < arcano.level`.
- `owned` si ya lo posees (equipado / disponible / en cooldown en el selector).

---

## Tokens de medida
- Lienzo **460×940** (portrait), escalado a viewport con `transform: scale()`.
- Carta destacada 212px ancho; carta de catálogo aspect 118/176; carta de revelado 230×330.
- Animaciones: flip 700ms `cubic-bezier(.4,.05,.2,1)`; pop modal 320ms; burst 500ms; rayos giran 14s.
- `prefers-reduced-motion`: desactiva flip/rayos/hint.

---

## Cómo correr el prototipo
Abre `Tienda Arcanos.html` en un navegador (necesita internet: Google Fonts + React vía CDN).
Botón **Tweaks** del editor para alternar dirección de carta / metal / atmósfera.

---

### Resumen para el dev
1. Lee §⚠️ DECISIONES PENDIENTES y **valídalas con el dueño** antes de codear.
2. Recrea la UI con el sistema P3R existente (no inyectes el HTML/CSS).
3. Trata TODOS los datos como placeholder; conéctalos a la BD/economía real.
4. La economía y validaciones van server-authoritative.
