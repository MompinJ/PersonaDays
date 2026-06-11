# Sistema de Progresión — XP, Niveles, Yenes y Racha

> Decisiones de lógica de juego tomadas para la progresión. Esto NO es diseño
> visual; son las reglas que rigen cómo se gana XP, cómo suben los niveles, cómo
> funciona la economía de yenes y la racha.
>
> **Fuente única de verdad:** `src/services/missionService.ts` (completar/revertir
> misión) y `src/services/arcService.ts` (finalizar arco). Las pantallas solo
> llaman a estos servicios; no contienen lógica de XP propia.

---

## 1. Por qué un servicio centralizado

Antes "completar misión" vivía en `MissionsScreen` y "revertir" en
`CompletedMissionsScreen`, como dos copias a mano del mismo cálculo (XP, nivel,
herencia) que tenían que ser espejo perfecto... y habían dejado de serlo (los
yenes se restaban al revertir pero no se sumaban al completar).

**Decisión:** toda la lógica vive en `missionService` con `completeMission` y
`revertMission`, ambas **dentro de una transacción** (`BEGIN/COMMIT/ROLLBACK`).
Espejo por construcción. Las migraciones/recálculos cuelgan de ahí.

---

## 2. XP por misión

`MISSION_XP = { EASY: 50, MEDIUM: 100, HARD: 150 }` (en `missionService.ts`).

- **Ratio 1:2:3.** Una misión difícil vale lo que tres fáciles, así la elección
  de dificultad importa de verdad.
- La dificultad **no se guarda** como tal: se deriva de `recompensa_exp`
  (`difficultyFromXP`): `<=50 → EASY`, `<=100 → MEDIUM`, resto `HARD`.
- Al editar una misión, los umbrales de detección de dificultad usan estas mismas
  constantes (`CreateMissionScreen`).

## 3. Curva de nivel de un stat

`calculateLevelFromXP` (`src/utils/levelingUtils.ts`): base **1000 XP** para el
nivel 1→2, **+100** por nivel. Función pura, determinista. `experiencia_actual`
en `jugador_stat` es la XP **total acumulada** (no el resto del nivel).

## 4. Herencia padre/hijo

Si un stat tiene `id_stat_padre`, al ganar XP el padre recibe la **mitad**
(`Math.floor(xp / 2)`). La mitad se calcula sobre la XP **ya con bonus de arcano**,
para que el bonus fluya también al padre. Simétrico en revertir.

## 5. Nivel del jugador (decisión de fórmula)

```
nivel_jugador = floor( suma de niveles de TODAS las stats / K )   con K = 5
```
(`recalcPlayerLevel` en `src/services/playerService.ts`, `PLAYER_LEVEL_DIVISOR`).

Se eligió esta fórmula porque cumple lo que queríamos:
- **Esfuerzo total**: cada nivel de cualquier stat empuja el nivel del jugador.
- **Las stats custom cuentan** (la suma las incluye).
- **Monótono**: nunca baja; crear una stat nueva nunca penaliza.
- **Pacing con una sola perilla** (`K`), y como cada stat ya tiene su curva que
  frena, el nivel del jugador no se puede disparar solo.

**`nivel_jugador` es un valor DERIVADO.** Se recalcula en: completar misión,
revertir misión, finalizar arco, crear stat custom, y **una vez al arrancar la app**
(`GameContext.loadPlayerData`) para corregir desajustes de datos semilla.

## 6. Yenes (economía)

- Se **otorgan al completar** una misión (`recompensa_yenes`) y se **restan al
  revertir** (clamp a 0). Simétrico.
- Son la **moneda de la tienda de arcanos** (ver `Sistema_de_Arcanos.md`).
- El módulo de Finanzas es independiente: NO tiene relación con estos yenes.

## 7. Racha (streak)

Lazy, evaluada al completar misión (`updateStreakOnActivity` en `playerService`):
- Completar cualquier misión = actividad del día.
- Si ya hubo actividad hoy → la racha no cambia (no cuenta doble).
- Si la última actividad fue **ayer** → racha +1.
- Si fue antes de ayer o nunca → la racha se rompió → vuelve a **1**.
- **No se decrementa al revertir** (no se puede saber si esa misión marcó el día).
- `getCurrentStreak` devuelve la racha **efectiva** (0 si está rota) para mostrar/
  usar en lógica (p.ej. el arcano El Carro pide racha ≥ 3).
- Fechas locales de SQLite (`date('now','localtime')`), nunca `toISOString()` (UTC).

## 8. Bonus al finalizar un arco

Bonus **FIJO** `ARC_COMPLETION_BONUS_XP = 1000` al stat relacionado del arco
(`arcService.ts`).

**Por qué fijo y no la suma de misiones:** antes sumaba `recompensa_exp` de todas
las misiones completadas del arco, pero esa XP **ya se otorgó** al completar cada
misión una a una → era doble conteo (bug). Ahora el arco da una recompensa propia
y distinta. Las misiones de tipo ARCO NO dan XP extra por el stat; dan la XP normal
de su dificultad, y su único trato especial es que su impacto se asigna al stat del
arco automáticamente.

---

## Pendiente (balance, con datos reales)

El ritmo **absoluto** de progresión depende de la XP por misión (50/100/150)
frente a la curva base de stats (~1000 XP por nivel). Si al jugar se siente lento,
lo que hay que mover es la XP de misión o la curva, no las fórmulas de nivel.
Decisión aplazada a tener datos de juego real.
