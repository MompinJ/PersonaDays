# 🧠 Módulo de Stats (Atributos y Progreso)

## Propósito General
Este módulo gestiona los atributos del personaje (RPG Stats). Su objetivo es visualizar el crecimiento personal del usuario mediante un sistema de niveles y experiencia (XP).

El sistema distingue dos tipos de Stats:
1.  **Stats Base (Core):** Los 5 atributos fijos de Persona (Conocimiento, Coraje, Destreza, Gentileza, Carisma).
2.  **Stats Personalizados (Hábitos):** Habilidades creadas por el usuario (ej: "Piano", "Gym") que actúan como "hijos" de un Stat Base.

---

## 📱 Pantallas Principales

### 1. StatsScreen
**Ubicación:** `src/screens/Stats/StatsScreen.tsx`

**Funcionalidades:**
* **Visualización de Radar:** Muestra un gráfico de araña (`StatRadarChart`) en la cabecera para ver el balance del personaje de un vistazo.
* **Lista de Atributos:** Renderiza todos los stats activos usando `StatRow`.
* **Persistencia de Configuración:** Guarda en `AsyncStorage` qué stats se muestran en el gráfico para mantener la preferencia del usuario entre sesiones.
* **Navegación:**
    * Botón `+`: Abre `CreateStatModalNew`.
    * Link `⚙ CONFIGURAR GRÁFICO`: Abre `SelectGraphStatsModal`.
    * *Tap en Fila:* Abre `StatDetailModal`.

### 2. StatRadarChart (Componente Visual)
**Ubicación:** `src/components/Stats/StatRadarChart.tsx`

**Lógica de Renderizado:**
* **Dinámico:** No está limitado a 5 ejes. Calcula matemáticamente los ángulos dividiendo `2 * PI / N` (donde N es la cantidad de stats seleccionados).
* **Escalado:** Normaliza los valores según el `nivel_maximo` de cada stat individual.
* **Seguridad:** Requiere un mínimo de 3 stats para poder dibujar un polígono (área).

### 3. StatRow (Componente de Lista)
**Ubicación:** `src/components/Stats/StatRow.tsx`

**Estilo "Persona":**
* **Barra Inclinada:** Usa una transformación `skewX: '-20deg'` en la barra de progreso para imitar la UI de los juegos Persona.
* **Info Mostrada:**
    * Círculo de Rango (Nivel Actual).
    * Nombre del Stat.
    * Estrellas de Prestigio (si aplica).
    * Progreso numérico de XP (Actual / Siguiente Nivel).

### 4. Modales de Gestión

#### CreateStatModalNew
**Ubicación:** `src/components/Stats/CreateStatModalNew.tsx`
* Permite crear "Hábitos" o stats hijos.
* **Regla:** Todo stat personalizado debe tener un "Stat Padre" (uno de los 5 base). Ej: "Programación" -> Padre: "Conocimiento".

#### SelectGraphStatsModal
**Ubicación:** `src/components/Stats/SelectGraphStatsModal.tsx`
* Permite al usuario elegir qué atributos aparecen en el radar.
* **Validación:** Impide guardar si hay menos de 3 atributos seleccionados.

#### StatDetailModal
**Ubicación:** `src/components/Stats/StatDetailModal.tsx`
* Muestra la descripción y meta del stat.
* **Eliminación Segura:** Antes de borrar un stat, verifica en la tabla `impacto_mision` si existen misiones activas vinculadas a él. Si existen, bloquea la eliminación para mantener la integridad de la base de datos.

---

## 🗄️ Estructura de Datos (Base de Datos)

### Tabla: `stats`
Definición de los atributos.
| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `id_stat` | PK | Identificador |
| `nombre` | TEXT | Ej: "Conocimiento" |
| `tipo` | TEXT | 'PREDEFINED' (Base) o 'CUSTOM' (Usuario) |
| `id_stat_padre` | INTEGER | FK recursiva (Null para stats base) |
| `dificultad` | REAL | Usado para almacenar la "Meta de Nivel" |

### Tabla: `jugador_stat`
Progreso del jugador en cada stat.
| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `id_jugador_stat` | PK | |
| `id_jugador` | INTEGER | FK a tabla jugadores |
| `id_stat` | INTEGER | FK a tabla stats |
| `nivel_actual` | INTEGER | Nivel calculado |
| `experiencia_actual` | INTEGER | XP total acumulada |
| `nivel_maximo` | INTEGER | Cap de nivel (ej: 99) |

---

## 📐 Lógica de Nivelación (Leveling)

**Ubicación:** `src/utils/levelingUtils.ts`

El nivel no se guarda como valor arbitrario: se **deriva** de la XP total
(`experiencia_actual` es la XP acumulada, no el resto del nivel).
* **Curva:** base **1000 XP** para el nivel 1→2, **+100** por nivel (incremental
  lineal). Cada nivel cuesta un poco más que el anterior.
* **Cálculo:** `calculateLevelFromXP(totalXP)` retorna `{ level, currentLevelXP, xpToNextLevel, progress }`.

### Herencia (stats hijos → padre)
Cuando un stat **custom** (hijo) gana XP, su **padre** recibe la **mitad**
(`floor(xp / 2)`). Aplica tanto al completar como al revertir misiones, y la mitad
se calcula sobre la XP ya con bonus de arcanos.

### Nivel del jugador (derivado de las stats)
`nivel_jugador` no es independiente: es la suma de niveles de TODAS las stats
dividida por una constante.
```
nivel_jugador = floor( suma de niveles de stats / 5 )
```
(`recalcPlayerLevel` en `src/services/playerService.ts`). Cuenta base y custom, es
monótono, y se recalcula al completar/revertir misión, finalizar arco, crear stat
custom y una vez al arrancar. Reglas completas en `Sistema_de_Progresion.md`.
