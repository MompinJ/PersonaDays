# 🎭 PersonaDays: The Real Life RPG

## 📖 Descripción General
**PersonaDays** es una aplicación de productividad y gamificación de vida ("Life RPG") construida con **React Native**. Su filosofía principal es transformar la rutina diaria, los hábitos y las finanzas personales en una experiencia de videojuego inspirada en la estética y mecánicas de la saga *Persona* (Atlus).

El objetivo es que el usuario sea el "Protagonista" de su propia historia, subiendo de nivel sus atributos sociales, gestionando su economía y avanzando a través de "Arcos" narrativos que representan etapas de su vida real.

---

## 🏗️ Arquitectura Técnica

* **Framework:** React Native (Expo SDK 52).
* **Lenguaje:** TypeScript.
* **Base de Datos Local:** SQLite (`expo-sqlite`) para persistencia total de datos offline.
* **Gestión de Estado:** Context API (`GameContext`, `AlertContext`).
* **Navegación:** React Navigation (Native Stack).
* **Estilos:** Sistema de temas dinámicos basado en personajes (ej: Tema "Makoto" azul, Tema "Ren" rojo/negro).

---

## 🌟 Módulos Principales (Core Features)

### 1. 🧠 Sistema de Stats (Atributos Sociales)
El núcleo del crecimiento del personaje. Se basa en el pentágono clásico de atributos:
* **Conocimiento (Knowledge)**
* **Coraje (Guts)**
* **Destreza (Proficiency)**
* **Gentileza (Kindness)**
* **Carisma (Charm)**

**Funcionalidad:**
* Visualización mediante **Gráfico de Radar** (Spider Chart).
* Los stats suben de nivel mediante la acumulación de **Experiencia (XP)** ganada en misiones.
* Soporte para **Stats Personalizados** (Hijos) que heredan de los 5 principales (ej: "Piano" contribuye a "Destreza").

### 2. ⚔️ Misiones (Daily Life Gameplay)
El motor de acción diaria. Las misiones representan tareas, hábitos o pendientes.
* **Tipos:** Diaria, Semanal, Arco (Narrativa) y Extra (One-off).
* **Dificultad Dinámica:** Fácil, Media, Difícil (ajusta recompensas de XP y Yenes automáticamante).
* **Impacto:** Cada misión está vinculada a un Stat específico. Al completarla, el usuario gana XP para ese atributo y dinero (Yenes).
* **Repetición:** Lógica compleja de recurrencia por días de la semana (ej: "Solo Lunes y Miércoles").

### 3. 🏹 Arcos (Sistema Narrativo)
Gestión de objetivos a largo plazo.
* **Concepto:** Agrupa misiones bajo un "Capítulo" de vida (ej: "Arco de la Tesis", "Arco del Gimnasio").
* **Regla de Oro:** Solo puede existir **1 Arco Activo** a la vez, enfocando al jugador en una meta principal.
* **Progreso:** Barra de porcentaje basada en las misiones completadas dentro del arco.
* **Historial:** Los arcos finalizados se guardan como trofeos en el historial.

### 4. 💴 Economía (Real Life Wallet)
Gestión financiera inmersiva.
* **Registro:** Ingresos y Gastos de la vida real.
* **Gamificación:** Registrar movimientos financieros otorga XP de **Conocimiento** (fomentando la responsabilidad).
* **Interfaz:** Lista invertida cronológica (estilo chat/log) con balance en tiempo real.
* **Categorías:** Sistema totalmente personalizable con colores e iconos para clasificar gastos.

### 5. 📅 Calendario y Tiempo
* Sistema de seguimiento de días y rachas (Streaks).
* Permite visualizar la consistencia del jugador a lo largo del tiempo.

---

## 🎨 Personalización (Temas)
La app cuenta con un motor de temas (`useTheme`) que cambia la paleta de colores, tipografías y recursos visuales según el "Protagonista" seleccionado en la configuración.
* Esto afecta fondos, bordes, colores de énfasis en gráficas y botones.

---

## 🔄 Flujo de Datos (Game Loop)

1.  **Input:** El usuario crea una **Misión** (ej: "Leer 30 min") y la vincula al Stat "Conocimiento".
2.  **Acción:** El usuario marca la misión como completada.
3.  **Recompensa:**
    * Se suman **Yenes** a la billetera.
    * Se suma **XP** al Stat "Conocimiento".
4.  **Consecuencia:**
    * Si la XP supera el umbral, el Stat **sube de nivel** (Level Up).
    * El gráfico de radar se expande.
    * El nivel general del jugador aumenta.

---

## 🗄️ Modelo de Base de Datos (Resumen)

El esquema relacional en SQLite conecta todos los módulos:

* `jugadores`: Perfil principal.
* `stats` / `jugador_stat`: Definición y progreso de atributos.
* `arcos`: Contenedores narrativos.
* `misiones`: Tareas ejecutable.
* `impacto_mision`: Tabla puente que define (Misión -> da XP a -> Stat).
* `finanzas` / `financial_categories`: Módulo económico independiente pero gamificado.
* `logs`: Historial inmutable de acciones.

---

## 🎭 Sistema de Diseño (estilo Persona 3 Reload)

El lenguaje visual de la app —colores por personaje, tipografía por roles, componentes
angulados (shards, chips en cascada), animaciones y la "regla de oro" de variación—
está documentado en **[`Sistema_de_Diseno_P3R.md`](./Sistema_de_Diseno_P3R.md)**.

La **pantalla modelo / master class** es `src/screens/Missions/CreateMissionScreen.tsx`.
**Léelo antes de crear o modificar cualquier UI.**
