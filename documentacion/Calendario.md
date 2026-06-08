📅 Módulo de Calendario (Cronología y Seguimiento)

Propósito General

El calendario actúa como el "Reloj Biológico" del juego. Su función es doble:
visualizar el contexto narrativo actual (El "Arco" activo) mediante rangos de
tiempo coloreados y permitir la gestión diaria de tareas ("Micro-management") a
través de un sistema de inspección por días.

📱 Pantallas Principales

1. CalendarScreen

Ubicación: src/screens/Calendar/CalendarScreen.tsx
Funcionalidades:

  - Visualización de Contexto (Arco):
      - Identifica el Arco Activo consultando la base de datos.
      - Pinta el rango de fechas (desde fecha_inicio hasta fecha_fin o Hoy)
        usando el color temático del arco con transparencia (marcador de
        periodo).
      - Muestra el nombre del arco en el encabezado.
  - Interacción Diaria:
      - Al tocar un día específico, despliega un Modal con las misiones
        disponibles o completadas en esa fecha.
      - Feedback visual: El día seleccionado se resalta con el color del
        Avatar (Tema Principal).
  - Navegación Temporal:
      - Permite desplazarse entre meses para revisar el historial o planificar
        futuros eventos.

🧩 Componentes Clave

MissionsModal (Pop-up de Inspección)

Componente interno de CalendarScreen.
UI:
  - Estructura Flotante: Modal transparente con fondo oscuro (`rgba(0,0,0,0.8)`).
  - Layout Seguro: Contenedor con altura fija/min-height para evitar colapsos
    del ScrollView en listas vacías.
  - Tira Decorativa: Elemento visual lateral que usa el color del Avatar.
Lógica de Renderizado:
  - Estado Independiente: Usa un estado local `dayMissions` que se calcula
    *antes* de mostrar el modal para evitar parpadeos o listas vacías por
    retraso en el render.

🎨 Sistema de Theming (Dualidad de Colores)

El calendario implementa una separación estricta de responsabilidades visuales
para mantener la inmersión narrativa sin perder la identidad del usuario:

| Elemento UI | Fuente del Color | Variable | Significado |
| :--- | :--- | :--- | :--- |
| **Interfaz General** | Contexto del Avatar | `theme.primary` | Identidad del Jugador (UI del Sistema). |
| **Botones / Títulos** | Contexto del Avatar | `theme.primary` | Controles de la App. |
| **Selección de Día** | Contexto del Avatar | `theme.primary` | Feedback de interacción inmediata. |
| **Rango del Calendario** | Contexto del Arco | `arc.color_hex` | Inmersión en la historia actual (Narrativa). |
| **Línea de Hoy** | Contexto del Arco | `arc.color_hex` | Progreso actual en la trama. |

⚙️ Lógica de Negocio (Algoritmos)

1. Filtrado de Misiones por Día (`handleDayPress`)

El sistema no realiza una consulta SQL por cada día tocado. En su lugar, carga
todas las misiones activas en memoria y aplica un filtro en el cliente para
garantizar fluidez.

Criterios de Filtrado (Prioridad en Cascada):

1.  Misiones por Días Específicos:
      - Analiza el campo `dias_repeticion` (String CSV, ej: "1,3,5").
      - Convierte la fecha seleccionada a día de la semana (0=Domingo...
        6=Sábado).
      - Si el índice coincide, la misión se muestra.
2.  Misiones Diarias:
      - Si el tipo es `DIARIA` o la frecuencia es `EVERY_DAY`, se muestra
        independientemente de la fecha.
3.  Misiones One-Off / Eventos:
      - Compara la cadena de `fecha_expiracion` (Formato ISO `YYYY-MM-DD`) con
        la fecha seleccionada.
      - Se utiliza una comparación de strings estricta para evitar desfases de
        Zona Horaria.

2. Generación de Marcas (`generateArcMarkings`)

Utiliza la librería `date-fns` para iterar días.
  - Loop: `while (current <= end)`
  - Periodo: Asigna `color` (Fondo) y `textColor` a cada día dentro del rango.
  - Hoy: Sobrescribe el estilo del día actual para mostrarlo sólido y con
    punto indicador.

🗄️ Estructura de Datos (Base de Datos)

El calendario es una vista de agregación que consume principalmente dos tablas:

Tabla: arcos (Lectura para Rango)

| Campo | Uso en Calendario |
| :--- | :--- |
| `fecha_inicio` | Inicio del marcado de color. |
| `fecha_fin` | Fin del marcado (si es NULL, usa `new Date()`). |
| `color_hex` | Color de fondo del periodo (con opacidad agregada en runtime). |
| `estado` | Filtra por `'ACTIVO'` para mostrar solo el arco presente. |

Tabla: misiones (Lectura para Modal)

| Campo | Uso en Calendario |
| :--- | :--- |
| `dias_repeticion` | Determina si la misión aparece en lunes, martes, etc. |
| `frecuencia_repeticion` | Determina si es diaria (`EVERY_DAY`). |
| `fecha_expiracion` | Ubica misiones de evento en días específicos del calendario. |
| `tipo` | Clasificación visual en el modal. |
