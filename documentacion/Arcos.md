# 🏹 Módulo de Arcos (Narrativa)

## Propósito General
Gestiona las etapas de vida del jugador ("Arcos"). Actúa como contenedor de misiones y define el enfoque actual del personaje.

**Regla Principal:** Solo puede haber **1 Arco Activo** simultáneamente.

---

## 📱 Pantallas y Componentes

### 1. ArcsScreen
**Ubicación:** `src/screens/Phone/Arcs/ArcsScreen.tsx`

**Funcionalidades:**
* **Pestañas (Tabs):** Alterna entre `ACTIVOS` y `HISTORIAL`.
* **Gestión de Arco Activo:**
    * Si hay un arco activo, muestra una tarjeta grande (`Hero Card`) usando `Swipeable`.
    * **Swipe to Finish:** Deslizar la tarjeta activa a la derecha permite finalizar el arco.
* **Validación de Creación:** Al intentar crear un nuevo arco, verifica si ya existe uno con `estado='ACTIVO'`. Si es así, bloquea la creación.

**Lógica de Finalización (Rewards):**
Centralizada en `src/services/arcService.ts` (`finalizeArcWithRewards`), dentro de
una transacción. Al finalizar un arco:
1. Cambia estado a 'COMPLETADO' y fija `fecha_fin`.
2. **Bonus FIJO de XP:** otorga `ARC_COMPLETION_BONUS_XP = 1000` al
   `id_stat_relacionado` del arco.
3. **Level Up:** recalcula el nivel del stat y el `nivel_jugador`.

> **Importante (decisión):** el bonus es **fijo**, NO la suma de la XP de las
> misiones del arco. Esa XP ya se otorgó al completar cada misión una a una;
> volver a sumarla era un doble conteo (bug corregido). Las misiones de tipo ARCO
> no dan XP extra por el stat: dan la XP normal de su dificultad y su único trato
> especial es que su impacto se asigna al stat del arco. Ver `Sistema_de_Progresion.md`.

Ambas pantallas (`ArcsScreen` por swipe y `ArcDetailScreen` por botón) usan el
mismo servicio, así que las dos otorgan el bonus de forma idéntica.

### 2. ArcDetailScreen
**Ubicación:** `src/screens/Phone/Arcs/ArcDetailScreen.tsx`

**Funcionalidades:**
* **Modo Zen:** Visualización limpia del arco. (Actualmente preparada para futuras expansiones como notas/fotos).
* **Acciones:**
    * **Editar:** Abre el modal de edición.
    * **Finalizar:** Botón explícito para cerrar el arco.
* **Validación de Sub-Arcos:** Antes de finalizar, verifica si el arco tiene "Hijos" (Sub-arcos) activos. Si los tiene, impide la finalización.

### 3. ArcCard (Componente)
**Ubicación:** `src/components/Arcs/ArcCard.tsx`

**Funcionalidades:**
* **Barra de Progreso:**
    * Calcula dinámicamente el porcentaje de completitud.
    * Query: `SELECT count(*) as total, sum(case when completada=1...)` sobre la tabla `misiones` filtrando por `id_arco`.
* **Estilos:**
    * Modo `HERO`: Tarjeta grande para la pantalla principal.
    * Modo `DEFAULT`: Tarjeta estándar para listas.
    * Visualiza estado (EN CURSO / PROGRAMADO / COMPLETADO) y fechas.

---

## 🗄️ Base de Datos (Tablas)

### Tabla: `arcos`
| Campo | Tipo | Notas |
| :--- | :--- | :--- |
| `id_arco` | PK | |
| `nombre` | TEXT | |
| `estado` | TEXT | 'ACTIVO', 'COMPLETADO', 'PENDIENTE' (calculado) |
| `fecha_inicio` | TEXT | |
| `fecha_fin` | TEXT | NULL si está activo |
| `id_stat_relacionado` | INTEGER | FK a Stats (Recibe la XP al finalizar) |
| `id_arco_padre` | INTEGER | Para sub-arcos (Jerarquía) |
