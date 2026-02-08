# 🏹 Módulo de Arcos (Narrativa)

## Propósito General
Gestiona las etapas de vida del jugador ("Arcos"). Actúa como contenedor de misiones y define el enfoque actual del personaje.

**Regla Principal:** Solo puede haber **1 Arco Activo** simultáneamente.

---

## 📱 Pantallas y Componentes

### 1. ArcsScreen
**Ubicación:** `src/screens/Arcs/ArcsScreen.tsx`

**Funcionalidades:**
* **Pestañas (Tabs):** Alterna entre `ACTIVOS` y `HISTORIAL`.
* **Gestión de Arco Activo:**
    * Si hay un arco activo, muestra una tarjeta grande (`Hero Card`) usando `Swipeable`.
    * **Swipe to Finish:** Deslizar la tarjeta activa a la derecha permite finalizar el arco.
* **Validación de Creación:** Al intentar crear un nuevo arco, verifica si ya existe uno con `estado='ACTIVO'`. Si es así, bloquea la creación.

**Lógica de Finalización (Rewards):**
Al finalizar un arco:
1. Cambia estado a 'COMPLETADO' y fija `fecha_fin`.
2. **Cálculo de XP:** Suma toda la `recompensa_exp` de las misiones completadas que pertenecían a ese arco (`id_arco`).
3. **Asignación:** Otorga esa XP total al `id_stat_relacionado` del arco.
4. **Level Up:** Recalcula el nivel del stat basado en la nueva XP.

Implementación: Actualmente la lógica de sumar y otorgar XP está implementada en `src/screens/Arcs/ArcsScreen.tsx` (se ejecuta al finalizar desde la tarjeta tipo "Hero" o mediante la acción de swipe/confirmación). El archivo `src/screens/Arcs/ArcDetailScreen.tsx`, al finalizar, actualmente sólo marca el arco como 'COMPLETADO' y fija `fecha_fin` sin ejecutar la asignación de XP. Si se desea que finalizar desde `ArcDetailScreen` también otorgue XP, se debe replicar la lógica de `ArcsScreen` en esa pantalla.

### 2. ArcDetailScreen
**Ubicación:** `src/screens/Arcs/ArcDetailScreen.tsx`

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
