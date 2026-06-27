# PersonaDays — The Real Life RPG

PersonaDays convierte tu día a día en un videojuego de rol. Tus hábitos, tareas y metas se vuelven **misiones**; al cumplirlas subes de nivel tus atributos, ganas dinero del juego y avanzas por **capítulos** de tu vida real. Todo con la estética de la saga *Persona* (inspirado en *Persona 3 Reload*).

Tú eres el **Protagonista** de tu propia historia.

- App de móvil (Android) hecha con React Native + Expo.
- Funciona **sin conexión** y sin cuentas: todos tus datos viven en tu teléfono.

---

## Cómo funciona

En el fondo es un **tracker de hábitos y tareas** con una capa de RPG encima. El bucle es simple:

1. **Anotas** lo que quieres hacer como una **misión** (leer 30 min, ir al gimnasio, estudiar...).
2. Cada misión la **clasificas** por:
   - **Tipo:** Diaria, Semanal, Extra (algo puntual) o de Arco (parte de una meta grande).
   - **Dificultad:** Fácil, Media o Difícil — cuanto más difícil, más recompensa.
   - **Atributo** al que ayuda: Conocimiento, Coraje, Destreza, Gentileza o Carisma.
3. Al **completarla** ganas **experiencia (XP)** para ese atributo y **Yenes** (la moneda del juego).
4. La XP hace **subir de nivel** tus atributos, y la suma de todos ellos sube tu **nivel de Protagonista**.
5. Con los Yenes compras **Arcanos**, que te dan más XP, y agrupas tus grandes metas en **Arcos**.

Cuanto más constante seas en la vida real, más crece tu personaje.

---

## Qué puedes hacer

### Subir de nivel tus atributos
Tu personaje crece en cinco atributos sociales: **Conocimiento, Coraje, Destreza, Gentileza y Carisma**.
- Los ves en un **gráfico de radar** que se va expandiendo conforme avanzas.
- Puedes crear **atributos propios** (por ejemplo "Piano" o "Cocina") que cuentan dentro de uno de los cinco grandes.

### Gestionar tus misiones (hábitos y tareas)
- Crea **hábitos diarios o semanales**, tareas sueltas, o misiones ligadas a una meta.
- Elige en qué **días de la semana** se repiten (p. ej. solo lunes y miércoles).
- Ponles una **hora** y recibe un **recordatorio** en el móvil.
- Marca como completadas, revierte si te equivocas, y consulta tu **historial** de misiones cumplidas.

### Vivir tus metas como "Arcos"
Un **Arco** es un capítulo de tu vida (el "Arco de la Tesis", el "Arco del Gimnasio"...). Dentro de cada arco puedes:
- Agrupar las misiones de esa etapa.
- Ponerle una **canción** que lo represente (con su carátula), una **frase** que lo defina y una **galería de fotos**.
- Escribir un **diario** de reflexiones.
- Al cerrarlo, ver una **pantalla de resultados**: cuántos días duró, cuánto crecieron tus atributos (radar de antes y después) y tu balance. Los arcos terminados quedan guardados como **trofeos**.

### Comprar y equipar Arcanos
- Una **tienda** con los 22 Arcanos Mayores, cada uno con un efecto que te da **más XP** (por ejemplo, más experiencia en misiones difíciles o en las de fin de semana).
- Se compran con Yenes y se **equipan** en ranuras que vas desbloqueando.

### Controlar tu economía real
- Apunta tus **ingresos y gastos** de la vida real y mira tu **balance** al momento.
- Organiza los movimientos en **categorías** personalizables (con su color e icono).
- Llevar las cuentas también te da XP de Conocimiento.

### Más herramientas
- **Calendario** para ver tu constancia y tu **racha** de días seguidos.
- **Notas y listas** personales.
- **Tendencias**: gráficas de tu progreso a lo largo del tiempo.
- **Copia de seguridad**: exporta e importa todos tus datos.
- **Personalización**: elige tu Protagonista entre los personajes de *Persona 3 Reload* y toda la app cambia de colores y estilo.

---

## Personajes y temas

Eliges quién eres al empezar, y la app entera se adapta a su estilo visual.
Disponibles: **Makoto, Kotone, Yukari, Akihiko, Mitsuru, Shinjiro, Ken, Koromaru, Fuuka, Junpei y Aigis**.

---

## Para desarrolladores

Detalle técnico breve (las specs completas están en [`documentacion/`](documentacion/)).

**Stack:** React Native 0.81 + Expo SDK 54 (TypeScript), navegación con React Navigation, base de datos local **SQLite** (`expo-sqlite`), estado con React Context, gráficos con `react-native-svg`, notificaciones locales con `expo-notifications`. Build con EAS.

**Arranque rápido:**

```bash
npm install
npm start        # servidor de desarrollo (Expo)
npm run android  # compilar y abrir en Android
```

**Builds (perfiles en `eas.json`):**

```bash
eas build --profile preview --platform android      # APK de pruebas
eas build --profile production --platform android   # App Bundle de publicación
```

**Cómo está organizado:** la lógica de juego vive centralizada en `src/services/` (es la fuente de verdad: progresión, arcanos, arcos, economía); las pantallas solo la consumen. Los datos persisten en SQLite con migraciones versionadas. El estado en memoria lo mantiene `GameContext`.

**Documentación de sistemas:**

| Documento | Contenido |
|-----------|-----------|
| [`Sistema_de_Diseno_P3R.md`](documentacion/Sistema_de_Diseno_P3R.md) | Lenguaje visual (estilo Persona 3 Reload) |
| [`Sistema_de_Progresion.md`](documentacion/Sistema_de_Progresion.md) | XP, niveles, yenes, racha y bonus de arco |
| [`Sistema_de_Arcanos.md`](documentacion/Sistema_de_Arcanos.md) | Efectos, tienda y cooldowns de arcanos |
| [`Arcos.md`](documentacion/Arcos.md) | Sistema de arcos / cápsula del tiempo |
| [`Misiones.md`](documentacion/Misiones.md) | Tipos, recurrencia y recompensas |
| [`Stats.md`](documentacion/Stats.md) | Atributos y atributos personalizados |
| [`Economia.md`](documentacion/Economia.md) | Módulo financiero |
| [`Calendario.md`](documentacion/Calendario.md) | Días y rachas |

---

*PersonaDays es un proyecto personal inspirado en la estética de Persona; no está afiliado a Atlus ni a la franquicia.*
