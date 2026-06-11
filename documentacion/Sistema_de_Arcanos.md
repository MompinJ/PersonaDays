# Sistema de Arcanos

> Cómo funcionan los arcanos: efectos, economía (tienda), slots y los dos
> temporizadores. Decisiones de lógica, no de diseño visual.
>
> **Archivos clave:**
> - `src/data/arcanaEffects.ts` — efectos (reglas), economía y pipeline de XP.
> - `src/services/arcanaService.ts` — comprar, equipar, slots, timers.
> - `src/data/arcanaMeta.ts` — metadata visual (color, nombre EN, flavor) + estados.
> - UI: `src/screens/Arcana/ArcanaScreen.tsx` (colección/loadout),
>   `src/screens/Arcana/ArcanaShopScreen.tsx` (tienda), y los modales en
>   `src/components/Arcana/`.

---

## 1. Filosofía: los efectos son DATOS, no código

El error de partida fue intentar programar 21 efectos como 21 casos especiales.
La solución: **todos los efectos caen en 5 tipos de condición**, así cada arcano
es una lista de reglas y un único pipeline las evalúa.

```ts
type ArcanaCondition =
  | { kind: 'always' }
  | { kind: 'stat'; stat: StatKey }
  | { kind: 'difficulty'; level: 'EASY'|'MEDIUM'|'HARD' }
  | { kind: 'missionType'; type: MissionType }
  | { kind: 'streak'; min: number };

type EffectRule = { when: ArcanaCondition; pct: number }; // pct puede ser negativo
```

La frase en la tabla `arcanos` (`efecto_descripcion`) es **solo para mostrar** al
jugador; los números reales viven en `ARCANA_EFFECTS`.

### Stacking ADITIVO
Si equipas Hierofante (+15% Conocimiento) + El Mundo (+8% siempre) y completas una
misión de Conocimiento → **+23%**. Predecible. `computeXPGain(baseXP, ctx, equipped)`
suma los `pct` de las reglas que matchean y aplica `baseXP * (1 + pct/100)`.

### Tabla de efectos (id = rango)
| # | Arcano | Regla(s) |
|---|--------|----------|
| 0 | El Loco | siempre +2% |
| 1 | El Mago | dificultad Media +10% |
| 2 | La Sacerdotisa | Conocimiento +10%, Gentileza +5% |
| 3 | La Emperatriz | Gentileza +15% |
| 4 | El Emperador | misión de Arco +15% |
| 5 | El Hierofante | Conocimiento +15% |
| 6 | Los Amantes | Carisma +15% |
| 7 | El Carro | racha ≥ 3 → +5% |
| 8 | La Justicia | misión Diaria +5% |
| 9 | El Ermitaño | misión Semanal +10% |
| 10 | Fortuna | misión Extra +30% |
| 11 | La Fuerza | dificultad Difícil +15% |
| 12 | El Ahorcado | Destreza +7%, Gentileza +7% |
| 13 | La Muerte | Coraje +15% |
| 14 | La Templanza | Gentileza +10%, Carisma +5% |
| 15 | El Diablo | Semanal +30%, Diaria **−15%** |
| 16 | La Torre | dificultad Fácil +5% |
| 17 | La Estrella | siempre +2.5% |
| 18 | La Luna | Gentileza/Destreza/Coraje +5% c/u |
| 19 | El Sol | Carisma/Conocimiento/Coraje +5% c/u |
| 20 | El Juicio | Gentileza/Conocimiento/Carisma +5% c/u |
| 21 | El Mundo | siempre **+8%** (capstone: el mejor todoterreno, no el más roto) |

El bonus solo aplica mientras el arcano está **equipado**. Comprado-pero-guardado
no hace nada.

---

## 2. Economía (constantes en `arcanaEffects.ts`)

### Dos puertas para conseguir un arcano
1. **Nivel de jugador** desbloquea la *posibilidad de comprar*.
2. **Yenes** lo compran (una vez).

### Fórmulas
- **Desbloqueo (aplanado):** `arcanaUnlockLevel(rank) = 1 + round(rank · 0.9)`.
  - El Loco(0)=1, El Mago(1)=2, Fortuna(X)=10, El Mundo(XXI)=20.
  - Se aplanó desde `1 + rank·2` (El Mundo estaba en 43) para que sea alcanzable.
- **Precio:** `arcanaPrice(rank) = 5000 + rank · 2500` (El Loco 5.000 … El Mundo
  57.500). Provisionales, a tunear con datos.
- **Slots:** empiezas con 1. `SLOT_PRICES = {2: 25.000, 3: 75.000}`. `MAX_SLOTS = 3`.

---

## 3. Los dos temporizadores (decisión central)

Cada arcano **poseído** está en uno de estos estados (`deriveArcanaState`):

```
NO POSEÍDO ─comprar→ DISPONIBLE ─equipar→ EQUIPADO ─(3 días)→ EQUIPADO-libre
                          ▲                                          │
                          └────────(lunes, fin cooldown)── COOLDOWN ←quitar┘
```

- **Bloqueo de commitment (3 días):** al equipar (`ARCANA_LOCK_DAYS = 3`, desde
  `fecha_equipado`) no se puede quitar. Fuerza elegir bien. **Manda siempre**,
  incluso si cruza el lunes.
- **Cooldown semanal (rotación):** al quitarlo (tras los 3 días), entra en espera
  hasta el **próximo lunes estricto** (`disponible_desde`), no se puede re-equipar
  esa semana.

Ejemplo: lunes equipas 3 (bloqueadas lun-mié) → jueves las sacas y pones otras 3
(las primeras quedan en cooldown) → el lunes siguiente todo vuelve a disponible.
Todo **lazy** con fechas locales de SQLite; no hay job de reset.

**Nota:** "una vez elegidos los slots, no se cambian hasta pasar los 3 días" es
exactamente este comportamiento. La UI solo equipa en slots libres; para cambiar
tras los 3 días, se desequipa y se vuelve a equipar.

### Revert exacto de la XP con bonus
`revertMission` **recalcula** el bonus con el loadout y la racha actuales (no lo
guarda). Es exacto porque revertir solo aplica a misiones completadas **hoy**, el
loadout está bloqueado 3 días y la racha es estable dentro del día → mismo contexto
que al completar. El bloqueo de 3 días no es solo gameplay: garantiza esta simetría.

---

## 4. Tablas de base de datos

- **`jugador_arcanos`** (propiedad): `id_jugador, id_arcano, fecha_compra,
  disponible_desde`. `disponible_desde` = fecha (lunes) hasta la que está en
  cooldown; NULL = disponible.
- **`jugador_arcanos_slots`** (equipados): `numero_slot (1..3), fecha_equipado`.
- **`slots_desbloqueados`** en `jugadores`: cuántos slots puede usar (1→3).

## 5. API de `arcanaService`

Las acciones devuelven `{ ok: true }` o `{ ok: false, reason }` (mensaje listo
para mostrar):
- `buyArcano(playerId, id)` — gate nivel + gate yenes. Transaccional.
- `buyNextSlot(playerId)` — compra el siguiente slot (2 o 3).
- `equipArcano(playerId, id, slot)` — si el slot está ocupado por una carta **no
  bloqueada**, la cambia (la vieja a cooldown).
- `unequipArcano(playerId, slot)` — falla si sigue bloqueada; la manda a cooldown.
- `getEquippedArcanaIds(playerId)` — ids equipados (lo usa `missionService`).
- `getPlayerArcanaOverview(playerId)` — para la UI: por arcano poseído
  `{ equipped, slot, locked, bloqueadoHasta, enCooldown, disponibleDesde }` +
  `slotsDesbloqueados`.

---

## 6. UI / pantallas (decisiones de esta sesión)

Dos pantallas separadas (detalle visual en `Sistema_de_Diseno_P3R.md` §11):
- **Colección / loadout** (`screens/Arcana/ArcanaScreen.tsx`): solo lo poseído
  (`getPlayerArcanaOverview`); equipar/quitar. Acceso desde **Home** (banner) y **Perfil**.
- **Tienda** (`screens/Arcana/ArcanaShopScreen.tsx`): catálogo de los 22 + slots +
  teasers. Acceso desde el **Teléfono** (tile EMPORIO) y desde el header de la colección.

Decisiones tomadas:
- **Slots máx = 3** (precios `SLOT_PRICES` ¥25k/¥75k).
- **Boosts & consumibles = placeholders** ("PRONTO"), sin backend aún.
- **Revelado de compra = "sello/OBTENIDO"** (no gacha aleatorio: sabes qué compras).
- **Destacados rotativos OMITIDOS** (rotación/oferta sin decidir; no inventar).
- **Arte de las cartas = placeholder** (StatEmblem) hasta tener ilustración real.

---

## Pendiente

- **Boosts & consumibles** (la tienda muestra teasers "PRONTO": doble yenes,
  impulso XP, romper espera, etc.): mecánica futura, sin backend. Otra sesión.
- La idea de **"comprar arcano sin tener el nivel"** quedó **descartada** (no es
  adecuada); pensar más ideas de consumibles después.
- Mostrar el bonus de loadout activo en la pantalla de misiones (opcional).
