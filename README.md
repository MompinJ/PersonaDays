# PersonaDays — The Real Life RPG

PersonaDays es una app de productividad y gamificación de vida ("Life RPG") construida con **React Native + Expo**. Convierte tu rutina, hábitos y finanzas en una experiencia de videojuego inspirada en la estética y las mecánicas de la saga *Persona* (Atlus), con un lenguaje visual basado en **Persona 3 Reload**.

Tú eres el "Protagonista": subes de nivel tus atributos sociales, gestionas tu economía y avanzas a través de **Arcos** narrativos que representan etapas reales de tu vida.

- **Plataforma:** Android (build APK/AAB vía EAS). Compatible con iOS y web a nivel de código.
- **Datos:** 100% locales y offline (SQLite). No hay servidor ni cuentas.
- **Estado:** en desarrollo activo.

---

## Tabla de contenidos

- [Características](#características)
- [Stack técnico](#stack-técnico)
- [Arquitectura](#arquitectura)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Modelo de datos](#modelo-de-datos)
- [Reglas de juego (progresión)](#reglas-de-juego-progresión)
- [Temas y personajes](#temas-y-personajes)
- [Puesta en marcha](#puesta-en-marcha)
- [Builds (EAS)](#builds-eas)
- [Notificaciones](#notificaciones)
- [Documentación](#documentación)

---

## Características

### Stats — atributos sociales
El núcleo del crecimiento del personaje, sobre el pentágono clásico de *Persona*:

- **Conocimiento**, **Coraje**, **Destreza**, **Gentileza** y **Carisma**.
- Visualización mediante **gráfico de radar** (spider chart).
- Suben de nivel acumulando **XP** ganada al completar misiones.
- **Stats personalizados (hijos)** que heredan de uno de los 5 principales (p. ej. "Piano" aporta a "Destreza"): el padre recibe la mitad de la XP del hijo.

### Misiones — el game loop diario
Tareas, hábitos y pendientes que dan XP y dinero.

- **Tipos:** Diaria, Semanal, de Arco (narrativa) y Extra (puntual).
- **Dificultad:** Fácil / Media / Difícil, que fija la XP en **50 / 100 / 150** (ratio 1:2:3). Los Yenes son editables.
- **Impacto:** cada misión está vinculada a un Stat; al completarla, ese atributo gana XP (con el bonus de los arcanos equipados) y recibes Yenes.
- **Recurrencia** por días de la semana (p. ej. "solo lunes y miércoles") y **hora opcional** con recordatorio local.
- Completar y revertir viven en una **transacción** centralizada, espejo por construcción.

### Arcos — sistema narrativo / cápsula del tiempo
Objetivos de largo plazo como capítulos de tu vida.

- Agrupan misiones bajo un capítulo (p. ej. "Arco de la Tesis", "Arco del Gimnasio").
- Guardan **anthem** (banda sonora con carátula de Spotify), **galería de fotos**, una **frase protagónica** y un **journal** de reflexiones.
- **Regla de oro:** solo puede haber **1 arco activo** a la vez. Nace activo y se cierra cuando lo marcas.
- **Progreso = tiempo:** se muestran los días que ha durado el arco, no un porcentaje.
- **Cierre:** XP escalada por duración × completitud, y pantalla de **resultados** con radar comparativo de stats inicio-vs-fin, grind del periodo y balance.
- Los arcos finalizados quedan como **trofeos** en el historial.

### Arcanos — la tienda de bonificadores
Catálogo de los **22 Arcanos Mayores**, cada uno con un efecto sobre la ganancia de XP.

- Se **compran con Yenes**, se **equipan en slots** (que se desbloquean al progresar) y dan bonus pasivos (p. ej. *El Mago*: +10% XP en misiones de dificultad Media).
- Los efectos están modelados **como datos** y son **acumulables** (stacking).
- Doble temporizador: bloqueo inicial de 3 días y **cooldown semanal** al desequipar.

### Economía — billetera de la vida real
Gestión financiera inmersiva, **independiente** de los Yenes del juego.

- Registro de **ingresos y gastos** reales con balance en tiempo real.
- Registrar movimientos otorga XP de **Conocimiento** (fomenta la responsabilidad).
- Interfaz tipo log cronológico invertido (estilo chat).
- **Categorías** totalmente personalizables con color e icono.

### Teléfono — hub de utilidades
Pantalla "móvil" que agrupa:

- **Calendario** real con seguimiento de días y rachas (streaks).
- **Arcos** y su historial.
- **Listas / notas** personalizadas.

### Otros
- **Onboarding** de creación de Protagonista y selección de personaje.
- **Perfil** y **Ajustes** (incluye recordatorios y reset de datos).
- **Backup**: exportar/importar datos.
- **Tendencias**: evolución del grind a lo largo del tiempo.

---

## Stack técnico

| Área | Tecnología |
|------|------------|
| Framework | React Native `0.81` + Expo SDK `54` (New Architecture) |
| Lenguaje | TypeScript |
| Navegación | React Navigation (Native Stack + Bottom Tabs custom) |
| Base de datos | SQLite (`expo-sqlite`), offline-first |
| Estado | React Context API (`GameContext`, `AlertContext`, `EventFlashContext`) |
| Gráficos | `react-native-svg` (radar, glifos, UI angulada) |
| Calendario | `react-native-calendars` |
| Notificaciones | `expo-notifications` (solo locales) |
| Fotos / archivos | `expo-image-picker`, `expo-file-system`, `expo-sharing`, `expo-document-picker` |
| Tipografías | Anton, Exo 2, Barlow Condensed, Big Shoulders Display, Bebas Neue |
| Build | EAS Build |

---

## Arquitectura

El patrón central es **lógica de juego centralizada en servicios**; las pantallas solo llaman a esos servicios y nunca contienen cálculos de XP/nivel propios.

```
Pantallas (UI)  ->  Servicios (lógica)  ->  SQLite (persistencia)
                         ^
                   GameContext (estado en memoria + recarga)
```

- **`src/services/`** es la fuente única de verdad de la lógica: progresión, arcanos, arcos, economía, stats, notificaciones y backup. Completar/revertir misión y finalizar arco corren dentro de transacciones `BEGIN/COMMIT/ROLLBACK`.
- **`GameContext`** mantiene al jugador, el tema y el estado de carga en memoria, y recarga desde la DB tras cada acción.
- **`ensureDatabase()`** memoiza la inicialización: `App.tsx` y `GameContext` esperan la misma promesa sin correrla dos veces.
- **Arranque:** `App.tsx` carga fuentes, inicializa la DB y los recordatorios, y muestra una `LoadingScreen` con tiempo mínimo. Si no hay jugador, entra al flujo de onboarding (Setup → CharacterSelection); si lo hay, al `AppNavigator`.

---

## Estructura del proyecto

```
PersonaDays/
├── App.tsx                  # Root: fuentes, DB, providers, gate de onboarding
├── index.ts                 # registerRootComponent
├── app.json                 # Config de Expo
├── eas.json                 # Perfiles de build (development/preview/production)
├── metro.config.js          # Soporte .wasm para expo-sqlite en web
├── android/                 # Proyecto nativo Android (prebuild)
├── assets/                  # Icono, splash, art de personajes
├── documentacion/           # Specs de lógica y sistema de diseño (ver abajo)
├── Recursos raw/            # SVGs e iconos fuente (nav, tienda, stats, etc.)
└── src/
    ├── navigation/          # AppNavigator + tipos de rutas
    ├── screens/             # Home, Stats, Missions, Economy, Arcana, Phone, Profile, Setup
    ├── components/          # UI por dominio (Home, Stats, Missions, Arcs, Navigation, UI...)
    ├── services/            # Lógica de juego (fuente de verdad)
    ├── database/            # Esquema, migraciones, índices, helpers de stats
    ├── context/             # GameContext, AlertContext, EventFlashContext
    ├── data/                # Catálogos (characters, arcanaEffects, arcanaMeta)
    ├── themes/              # Paletas por personaje + useTheme
    ├── hooks/               # useHomeSummary, usePlayerStats, useFocusEntrance
    ├── utils/               # levelingUtils, colorUtils
    └── types/               # Tipos compartidos
```

### Servicios clave (`src/services/`)

| Servicio | Responsabilidad |
|----------|-----------------|
| `missionService` | XP, niveles, herencia, yenes y racha al completar/revertir misiones |
| `arcService` | Ciclo de vida de arcos y bonus escalado al cerrarlos |
| `arcanaService` | Compra, equipado, slots, cooldowns y cálculo de bonus de XP |
| `statService` | Stats custom y reconciliación nivel↔XP |
| `playerService` | Nivel de jugador derivado y lógica de racha |
| `notificationService` | Recordatorios locales de misiones |
| `arcPhotoService` / `anthemService` | Galería de fotos y anthem (Spotify oEmbed) de arcos |
| `backupService` | Exportar / importar datos |
| `missionFilters` | Filtrado y agrupación de misiones |

---

## Modelo de datos

Esquema relacional en SQLite (`src/database/database.ts`). Migraciones versionadas vía `PRAGMA user_version` (esquema actual: **v4**); índices creados de forma idempotente para los queries calientes.

| Tabla | Rol |
|-------|-----|
| `jugadores` | Perfil del protagonista (nivel, yenes, racha, tema, slots) |
| `stats` / `jugador_stat` | Definición de atributos y progreso (nivel + XP acumulada) |
| `arcos` / `arco_fotos` | Capítulos narrativos + galería de fotos |
| `misiones` | Tareas (tipo, recurrencia, hora, recompensas) |
| `impacto_mision` | Puente Misión → da XP a → Stat |
| `arcanos` | Catálogo de los 22 Arcanos Mayores (efecto como texto/dato) |
| `jugador_arcanos` / `jugador_arcanos_slots` | Arcanos poseídos (con cooldown) y equipados |
| `finanzas` / `financial_categories` | Economía real, gamificada e independiente |
| `custom_lists` | Notas / listas del teléfono |
| `logs` | Historial inmutable de acciones (XP/yenes por misión) |

> **Footgun de zonas horarias:** `misiones.fecha_completada` se guarda en **UTC** (consultar con `,'localtime'`), mientras que `logs.fecha_completada` se guarda en hora **local**. Tenlo en cuenta al agrupar por día.

---

## Reglas de juego (progresión)

Fuente única: `src/services/missionService.ts` y `src/services/arcService.ts`. Resumen (detalle en [`documentacion/Sistema_de_Progresion.md`](documentacion/Sistema_de_Progresion.md)):

- **XP por misión:** `EASY 50 / MEDIUM 100 / HARD 150`. La dificultad se deriva de `recompensa_exp`, no se guarda aparte.
- **Curva de stat:** 1000 XP para subir de nivel 1→2, **+100 XP** por nivel. `experiencia_actual` es XP **total acumulada**.
- **Herencia padre/hijo:** el padre recibe `floor(xp / 2)` de la XP (ya con bonus de arcano) que gana el hijo. Simétrico al revertir.
- **Nivel del jugador (derivado):** `floor( suma de niveles de todas las stats / 5 )`. Monótono; las stats custom cuentan.
- **Yenes:** se otorgan al completar y se restan al revertir (clamp a 0). Son la moneda de la tienda de arcanos. Independientes del módulo de Finanzas.
- **Racha:** lazy, evaluada al completar. Cualquier misión cuenta como actividad del día; +1 si la última fue ayer; se rompe (vuelve a 1) si fue antes. No se decrementa al revertir.
- **Bonus de arco al cerrar:** `round( clamp(dias * 25, 250, 3000) * factor_completitud )`, donde `factor_completitud` = misiones de arco completadas/total `clamp(0.25, 1)` (o 1 si el arco no tiene misiones de arco).

---

## Temas y personajes

El motor de temas (`src/themes/useTheme.ts` + `palettes.ts`) cambia paleta, tipografía y recursos visuales según el Protagonista elegido. Afecta fondos, bordes, colores de énfasis en gráficas y botones.

Personajes disponibles (orden de paleta): **Makoto, Kotone, Yukari, Akihiko, Mitsuru, Shinjiro, Ken, Koromaru, Fuuka, Junpei, Aigis**.

El lenguaje visual completo (estilo P3R: colores por personaje, tipografía por roles, componentes angulados/shards, animaciones y la "regla de oro" de variación) está en [`documentacion/Sistema_de_Diseno_P3R.md`](documentacion/Sistema_de_Diseno_P3R.md). La pantalla modelo / master class es `src/screens/Missions/CreateMissionScreen.tsx`: **léela antes de crear o modificar cualquier UI**.

---

## Puesta en marcha

### Requisitos
- Node.js LTS y npm
- Expo CLI (vía `npx`)
- Para correr en dispositivo: Android Studio / emulador, o un device físico con un *development build*

### Instalación

```bash
npm install
```

### Desarrollo

```bash
npm start          # Metro / Expo dev server
npm run android    # Compilar y abrir en Android
npm run ios        # Compilar y abrir en iOS
npm run web        # Abrir en navegador
```

> En **Expo Go (SDK 53+)** las notificaciones *push remotas* no están disponibles; PersonaDays usa solo notificaciones **locales**, que sí funcionan. Ese warning es ruido y está silenciado en `App.tsx`.

---

## Builds (EAS)

Perfiles definidos en `eas.json`:

| Perfil | Salida | Uso |
|--------|--------|-----|
| `development` | APK con dev client | Desarrollo en device |
| `preview` | **APK** descargable | Pruebas internas |
| `production` | App Bundle (AAB) | Publicación |

```bash
eas build --profile preview --platform android      # APK de pruebas
eas build --profile production --platform android   # AAB de producción
```

---

## Notificaciones

- Solo **locales** (recordatorios de misiones con hora). No hay push remoto.
- El handler se configura al arrancar (`initNotifications`) y los recordatorios se reagendan desde la config guardada (`syncMissionReminders`).
- Los permisos **no** se piden al arrancar, sino al activar los recordatorios en **Ajustes**. Si el master está apagado o no hay permiso, todo queda cancelado.
- Permiso declarado: `POST_NOTIFICATIONS` (Android).

---

## Documentación

Specs detalladas en [`documentacion/`](documentacion/):

| Documento | Contenido |
|-----------|-----------|
| `Sistema_de_Diseno_P3R.md` | Lenguaje visual completo (estilo Persona 3 Reload) |
| `Sistema_de_Progresion.md` | XP, niveles, yenes, racha y bonus de arco |
| `Sistema_de_Arcanos.md` | Efectos, stacking, economía de la tienda y cooldowns |
| `Arcos.md` | Sistema narrativo de arcos / cápsula del tiempo |
| `Misiones.md` | Tipos, recurrencia y recompensas de misiones |
| `Stats.md` | Atributos, stats custom y herencia |
| `Economia.md` | Módulo financiero |
| `Calendario.md` | Seguimiento de días y rachas |
| `Iconos_a_migrar_P3R.md` | Inventario de iconos y migración visual |

---

*PersonaDays no está afiliado a Atlus ni a la franquicia Persona; es un proyecto personal inspirado en su estética.*
