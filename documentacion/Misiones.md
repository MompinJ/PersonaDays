# ⚔️ Módulo de Misiones (Core Gameplay)

## Propósito General
Las misiones son el motor principal del juego. Representan las tareas, hábitos y objetivos del usuario. Al completarlas, el jugador recibe recompensas inmediatas (Yenes y Experiencia) que impactan directamente en el crecimiento de sus Stats (Atributos) y su economía.

---

## 📱 Pantallas Principales

### 1. MissionsScreen (Tablero de Misiones)
**Ubicación:** `src/screens/Missions/MissionsScreen.tsx`

**Funcionalidades:**
* **Organización por Pestañas:** Filtra las misiones activas según su tipo para enfocar al usuario:
    * **DIARIAS:** Rutinas recurrentes.
    * **SEMANALES:** Objetivos de mediano plazo.
    * **ARCO:** Misiones vinculadas a la narrativa actual.
    * **EXTRAS:** Tareas eventuales ("One-off").
* **Acción Principal (Completar):**
    * Al tocar el "Check" de una misión, se dispara la lógica de recompensa.
    * La misión desaparece de la lista activa (o se marca como hecha si es recurrente, dependiendo de la lógica de reinicio).
* **Navegación:**
    * Botón `+`: Va a `CreateMissionScreen`.
    * Icono `Lista/Reloj`: Va a `CompletedMissionsScreen` (Historial).

**Lógica de Completado (Transaction):**
Al completar una misión, el sistema ejecuta una transacción SQL compleja:
1. **Update Misión:** Marca `completada = 1` y fija `fecha_completada`.
2. **Logs:** Inserta un registro en la tabla `logs` (Historial de auditoría).
3. **Economía:** Suma los `recompensa_yenes` al saldo del jugador en la tabla `jugadores`.
4. **Progreso de Stat (Level Up):**
    * Busca en `impacto_mision` qué Stat se beneficia.
    * Suma la `recompensa_exp` a la experiencia actual de ese Stat en `jugador_stat`.
    * **Cálculo de Nivel:** Verifica si la nueva XP supera el umbral del nivel actual y sube de nivel si corresponde.

### 2. CreateMissionScreen (Creación y Edición)
**Ubicación:** `src/screens/Missions/CreateMissionScreen.tsx`

**Funcionalidades:**
* **Configuración de Tarea:** Nombre, Tipo y Descripción.
* **Dificultad y Recompensas:**
    * Sistema predefinido que ajusta XP y Yenes automáticamente (aunque los Yenes son editables):
        * **EASY:** 10 XP / 500 ¥
        * **MEDIUM:** 30 XP / 1500 ¥
        * **HARD:** 50 XP / 5000 ¥
* **Impacto en Atributo:**
    * *Scroll Horizontal:* Permite seleccionar qué Stat (ej: Coraje, Conocimiento) subirá de nivel al hacer esta tarea.
* **Vinculación con Arcos:**
    * Si se selecciona el tipo **ARCO**, detecta automáticamente el arco activo y vincula la misión a él.
* **Repetición:**
    * Usa el componente `DaySelector` para definir días específicos (Lun, Mar, Mie...).
* **Fecha de Expiración:** Opcional (Deadlines).

### 3. CompletedMissionsScreen (Historial)
**Ubicación:** `src/screens/Missions/CompletedMissionsScreen.tsx`

**Funcionalidades:**
* **Consulta:** Muestra una lista de solo lectura de todas las misiones donde `completada = 1`.
* **Propósito:** Permite al usuario revisar qué ha logrado recientemente.

---

## 🧩 Componentes Clave

### MissionItem
**Ubicación:** `src/components/Missions/MissionItem.tsx`

**UI:**
* Muestra el título, la recompensa en Yenes y XP.
* Muestra el icono del Stat asociado (Impacto).
* **Interacción:**
    * *Tap en Checkbox:* Completa la misión.
    * *Long Press / Tap en cuerpo:* Abre detalles o modo edición.

### DaySelector
**Ubicación:** `src/components/Missions/DaySelector.tsx`

**UI:**
* Fila de 7 botones circulares (L, M, M, J, V, S, D).
* Permite selección múltiple para definir `dias_repeticion`.

---

## 🗄️ Estructura de Datos (Base de Datos)

### Tabla: `misiones`
| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `id_mision` | PK | |
| `nombre` | TEXT | |
| `tipo` | TEXT | 'DIARIA', 'SEMANAL', 'ARCO', 'EXTRA' |
| `recompensa_exp` | INTEGER | Valor base de XP (10, 30, 50) |
| `recompensa_yenes` | INTEGER | Dinero ganado |
| `completada` | INTEGER | 0 (Pendiente) / 1 (Hecha) |
| `frecuencia_repeticion` | TEXT | 'ONE_OFF' o 'REPEATING' |
| `dias_repeticion` | TEXT | String csv (ej: "1,3,5") |
| `id_arco` | INTEGER | FK (Opcional) vinculando a un Arco |
| `fecha_expiracion` | TEXT | ISO8601 |

### Tabla: `impacto_mision`
Relación Uno-a-Uno que define qué atributo mejora la misión.
| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `id_impacto` | PK | |
| `id_mision` | INTEGER | FK a misiones |
| `id_stat` | INTEGER | FK a stats (El atributo beneficiado) |
| `valor_impacto` | INTEGER | Generalmente igual a `recompensa_exp` |

### Tabla: `logs`
Historial inmutable de acciones para auditoría o estadísticas.
| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `id_log` | PK | |
| `id_mision` | INTEGER | Misión completada |
| `fecha_completada` | TEXT | Cuándo ocurrió |
| `exp_ganada` | INTEGER | Snapshot de XP ganada |
| `yenes_ganados` | INTEGER | Snapshot de dinero ganado |
