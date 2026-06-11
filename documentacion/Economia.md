# 💴 Módulo de Economía (Finanzas Personales)

## Propósito General
Sistema de gestión de finanzas personales ("Real Life Wallet") gamificado. Permite registrar ingresos y gastos reales, visualizarlos en un formato de chat cronológico y recompensar al jugador con experiencia (XP) por su responsabilidad financiera.

> **Ojo — dos "dineros" distintos:** este módulo (tabla `finanzas`) es el dinero
> REAL del usuario y es **independiente**. No tiene relación con los **yenes** del
> jugador (`jugadores.yenes`), que son la recompensa de misiones y la **moneda de
> la tienda de arcanos** (ver `Sistema_de_Arcanos.md`).

---

## 📱 Pantallas y Componentes

### 1. EconomyScreen
**Ubicación:** `src/screens/Economy/EconomyScreen.tsx`

**Funcionalidades:**
* **Balance en Cabecera:** Muestra el cálculo en tiempo real de `Total Ingresos - Total Gastos`.
    * *Estilo:* Verde si el balance es positivo, Rojo si es negativo.
* **Lista Invertida:** Utiliza una `FlatList` con la propiedad `inverted={true}`.
    * *Comportamiento:* Los registros más recientes aparecen abajo (pegados al botón de agregar), simulando un chat o terminal.
* **Navegación:**
    * Botón `+` (FAB): Abre el `AddTransactionModal`.
    * Icono `tune-vertical` (Header): Navega a `ManageCategoriesScreen`.

**Datos:**
* Carga datos de la tabla `finanzas`.
* Calcula totales usando `SUM(CASE WHEN tipo='INGRESO'...)`.

### 2. AddTransactionModal
**Ubicación:** `src/components/Economy/AddTransactionModal.tsx`

**Funcionalidades:**
* **Registro de Movimientos:** Formulario para ingresar Monto, Concepto, Tipo (Ingreso/Gasto) y Categoría.
* **Selección de Categoría:** Carga dinámicamente las categorías desde la tabla `financial_categories` filtrando por el tipo seleccionado.
* **Gamificación (Lógica XP):**
    * Al guardar exitosamente, busca el stat llamado **"Conocimiento"**.
    * Otorga **+2 XP** a dicho stat.
    * Si el vínculo `jugador_stat` no existe, lo crea automáticamente.
    * *Nota:* este es un camino de XP **directo** (no pasa por `missionService`),
      así que no recalcula el nivel del stat ni el `nivel_jugador` en el momento;
      se sincronizan al arrancar o al completar la siguiente misión.
* **Validaciones:**
    * Monto > 0.
    * Concepto no vacío.
    * Categoría seleccionada obligatoria.

### 3. ManageCategoriesScreen
**Ubicación:** `src/screens/Economy/ManageCategoriesScreen.tsx`

**Funcionalidades:**
* **CRUD de Categorías:** Permite crear y eliminar categorías personalizadas.
* **UI Optimizada:**
    * **Selectores Horizontales:** Usa `ScrollView horizontal` para seleccionar el **Color** (Palette predefinida) y el **Icono** (Lista de MaterialCommunityIcons), ahorrando espacio vertical.
    * **Tags de Tipo:** Selector visual para definir si la categoría es de 'GASTO' o 'INGRESO'.
* **Visualización:** Lista vertical mostrando icono (en círculo de color), nombre y botón de eliminar.

---

## 🗄️ Base de Datos (Tablas)

### Tabla: `finanzas`
Registro histórico de movimientos.
| Campo | Tipo | Notas |
| :--- | :--- | :--- |
| `id_finanza` | PK | Auto-increment |
| `tipo` | TEXT | CHECK(tipo IN ('INGRESO', 'GASTO')) |
| `monto` | REAL | Valor numérico |
| `categoria` | TEXT | Nombre de la categoría (Snapshotted) |
| `descripcion` | TEXT | Concepto del gasto |
| `fecha` | TEXT | ISO8601 Strings |

### Tabla: `financial_categories`
Catálogo de categorías configurables.
| Campo | Tipo | Notas |
| :--- | :--- | :--- |
| `id_categoria` | PK | Auto-increment |
| `nombre` | TEXT | Ej: "Comida" |
| `icono` | TEXT | String de MaterialIcons (ej: "food") |
| `color` | TEXT | Hex Code (ej: "#FF5252") |
| `tipo` | TEXT | 'GASTO' o 'INGRESO' |
