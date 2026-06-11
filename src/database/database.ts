import * as SQLite from 'expo-sqlite';

// Abrimos la base de datos (sync wrapper usado en el proyecto)
export const db = SQLite.openDatabaseSync('personadays.db');

// Función para poblar datos iniciales si la app está vacía
export const checkAndSeedData = async () => {
  try {
    const result: any = await db.getAllAsync('SELECT count(*) as count FROM jugadores');
    if (!result || result.length === 0 || result[0].count === 0) {
      console.log('🌱 Sembrando datos iniciales del protagonista...');

      await db.execAsync(`
      -- 1. Crear al Protagonista (Makoto por defecto)
      INSERT OR IGNORE INTO jugadores (id_jugador, nombre_jugador, nivel_jugador, vida, yenes, slots_desbloqueados, character_theme, created_at)
      VALUES (1, 'Invitado', 1, 10, 5000, 1, 'MAKOTO', datetime('now'));

      -- 2. Crear las 5 Stats Sociales (Estilo Persona)
      -- IDs fijos para facilitar referencias
      INSERT OR IGNORE INTO stats (id_stat, nombre, descripcion, tipo, dificultad) VALUES
      (1, 'Conocimiento', 'Tu capacidad académica y resolución de problemas.', 'PREDEFINED', 1.0),
      (2, 'Coraje', 'Tu valentía para enfrentar situaciones difíciles.', 'PREDEFINED', 1.0),
      (3, 'Destreza', 'Habilidad manual y precisión técnica.', 'PREDEFINED', 1.0),
      (4, 'Gentileza', 'Tu empatía y capacidad de cuidar a otros.', 'PREDEFINED', 1.0),
      (5, 'Carisma', 'Tu habilidad para atraer e influir en los demás.', 'PREDEFINED', 1.0);

      -- 3. Vincular Stats al Jugador (Inicializar en Nivel 1)
      INSERT OR IGNORE INTO jugador_stat (id_jugador, id_stat, nivel_actual, experiencia_actual, nivel_maximo) VALUES
      (1, 1, 20, 0, 99), -- Conocimiento
      (1, 2, 10, 0, 99), -- Coraje
      (1, 3, 55, 0, 99), -- Destreza
      (1, 4, 40, 0, 99), -- Gentileza
      (1, 5, 70, 0, 99); -- Carisma
      `);

      console.log('✨ ¡Protagonista creado! Datos iniciales listos.');
    }
  } catch (err) {
    console.error('Error en checkAndSeedData:', err);
  }
};

export const initDatabase = async () => {
  try {
    await db.execAsync('PRAGMA foreign_keys = ON;');

    // --- Migración segura para Notas ---
    // IMPORTANTE: NO usar DROP incondicional aquí. initDatabase() corre en cada
    // arranque, así que un DROP borraría todas las notas del usuario cada vez.
    try {
      // list_items es una tabla legacy que ya no se usa: eliminarla es seguro.
      await db.execAsync(`DROP TABLE IF EXISTS list_items;`);

      // Crear custom_lists solo si no existe (preserva las notas existentes).
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS custom_lists (
          id_list INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          content TEXT DEFAULT '',
          updated_at TEXT NOT NULL
        );
      `);

      // Si existiera una versión antigua de custom_lists sin la columna 'content'
      // (esquema viejo incompatible), recrearla una sola vez.
      const cols: any[] = await db.getAllAsync(`PRAGMA table_info(custom_lists);`);
      const hasContent = Array.isArray(cols) && cols.some((c: any) => c.name === 'content');
      if (!hasContent) {
        await db.execAsync(`
          DROP TABLE IF EXISTS custom_lists;
          CREATE TABLE custom_lists (
            id_list INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT DEFAULT '',
            updated_at TEXT NOT NULL
          );
        `);
        console.log('✅ custom_lists migrada desde esquema antiguo');
      }
    } catch (e) { console.error('Error custom_lists:', e); }
    // ----------------------------------------

    // Creamos tablas necesarias (asegurarse de que coincidan con el esquema usado en el proyecto)
    await db.execAsync(`
      -- TABLA ARCANOS
      CREATE TABLE IF NOT EXISTS arcanos (
        id_arcano INTEGER PRIMARY KEY,
        nombre_arcano TEXT NOT NULL,
        simbolo TEXT NOT NULL,
        stat_asociado TEXT NOT NULL,
        descripcion_lore TEXT,
        efecto_descripcion TEXT NOT NULL
      );

      -- TABLA JUGADORES
      CREATE TABLE IF NOT EXISTS jugadores (
        id_jugador INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre_jugador TEXT NOT NULL,
        nivel_jugador INTEGER DEFAULT 1,
        vida INTEGER DEFAULT 10,
        yenes INTEGER DEFAULT 0,
        slots_desbloqueados INTEGER DEFAULT 1,
        racha INTEGER DEFAULT 0,
        last_activity_date TEXT,
        character_theme TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      -- TABLA STATS
      CREATE TABLE IF NOT EXISTS stats (
        id_stat INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        tipo TEXT NOT NULL,
        id_arcano INTEGER,
        dificultad REAL DEFAULT 1.0,
        id_stat_padre INTEGER,
        FOREIGN KEY (id_arcano) REFERENCES arcanos(id_arcano),
        FOREIGN KEY (id_stat_padre) REFERENCES stats(id_stat)
      );

      -- TABLA JUGADOR_STAT (Progreso)
      CREATE TABLE IF NOT EXISTS jugador_stat (
        id_jugador_stat INTEGER PRIMARY KEY AUTOINCREMENT,
        id_jugador INTEGER NOT NULL,
        id_stat INTEGER NOT NULL,
        nivel_actual INTEGER DEFAULT 1,
        experiencia_actual INTEGER DEFAULT 0,
        nivel_maximo INTEGER DEFAULT 99,
        cuenta_prestigio INTEGER DEFAULT 0,
        FOREIGN KEY (id_jugador) REFERENCES jugadores(id_jugador),
        FOREIGN KEY (id_stat) REFERENCES stats(id_stat)
      );

      -- TABLA ARCOS
      CREATE TABLE IF NOT EXISTS arcos (
        id_arco INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        fecha_inicio TEXT NOT NULL,
        fecha_fin TEXT,
        id_arco_padre INTEGER, -- inerte: la feature de sub-arcos se retiro; columna conservada para no migrar
        id_stat_relacionado INTEGER,
        color_hex TEXT DEFAULT '#00D4FF',
        estado TEXT DEFAULT 'ACTIVO',
        resumen_final TEXT,
        FOREIGN KEY (id_arco_padre) REFERENCES arcos(id_arco),
        FOREIGN KEY (id_stat_relacionado) REFERENCES stats(id_stat)
      );

      -- TABLA MISIONES
      CREATE TABLE IF NOT EXISTS misiones (
        id_mision INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        activa INTEGER DEFAULT 1,
        tipo TEXT NOT NULL,
        frecuencia_repeticion TEXT,
        id_arco INTEGER,
        recompensa_exp INTEGER DEFAULT 10,
        recompensa_yenes INTEGER DEFAULT 0,
        completada INTEGER DEFAULT 0,
        fecha_creacion TEXT NOT NULL,
        fecha_expiracion TEXT,
        fecha_completada TEXT,
        dias_repeticion TEXT,
        FOREIGN KEY (id_arco) REFERENCES arcos(id_arco)
      );

      -- TABLA IMPACTO_MISION
      CREATE TABLE IF NOT EXISTS impacto_mision (
        id_impacto INTEGER PRIMARY KEY AUTOINCREMENT,
        id_mision INTEGER NOT NULL,
        id_stat INTEGER NOT NULL,
        valor_impacto INTEGER DEFAULT 1,
        FOREIGN KEY (id_mision) REFERENCES misiones(id_mision),
        FOREIGN KEY (id_stat) REFERENCES stats(id_stat)
      );

      -- TABLA JUGADORES_ARCANOS_SLOTS (Arcanos equipados)
      CREATE TABLE IF NOT EXISTS jugador_arcanos_slots (
        id_slot INTEGER PRIMARY KEY AUTOINCREMENT,
        id_jugador INTEGER NOT NULL,
        id_arcano INTEGER NOT NULL,
        numero_slot INTEGER NOT NULL,
        fecha_equipado TEXT NOT NULL,
        FOREIGN KEY (id_jugador) REFERENCES jugadores(id_jugador),
        FOREIGN KEY (id_arcano) REFERENCES arcanos(id_arcano)
      );

      -- TABLA JUGADOR_ARCANOS (Arcanos comprados / poseidos)
      -- disponible_desde: fecha (lunes) hasta la que un arcano queda en cooldown
      -- tras desequiparlo; NULL = disponible.
      CREATE TABLE IF NOT EXISTS jugador_arcanos (
        id_jugador INTEGER NOT NULL,
        id_arcano INTEGER NOT NULL,
        fecha_compra TEXT NOT NULL,
        disponible_desde TEXT,
        PRIMARY KEY (id_jugador, id_arcano),
        FOREIGN KEY (id_jugador) REFERENCES jugadores(id_jugador),
        FOREIGN KEY (id_arcano) REFERENCES arcanos(id_arcano)
      );

      -- TABLA LOGS (Historial)
      CREATE TABLE IF NOT EXISTS logs (
        id_log INTEGER PRIMARY KEY AUTOINCREMENT,
        id_mision INTEGER NOT NULL,
        fecha_completada TEXT NOT NULL,
        exp_ganada INTEGER NOT NULL,
        yenes_ganados INTEGER NOT NULL,
        FOREIGN KEY (id_mision) REFERENCES misiones(id_mision)
      );


      -- TABLA FINANCIAL_CATEGORIES (Categorías personalizables para finanzas)
      CREATE TABLE IF NOT EXISTS financial_categories (
        id_categoria INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        icono TEXT,
        color TEXT,
        tipo TEXT
      );

      -- TABLA FINANZAS
      CREATE TABLE IF NOT EXISTS finanzas (
        id_finanza INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo TEXT CHECK(tipo IN ('INGRESO', 'GASTO')),
        monto REAL NOT NULL,
        categoria TEXT,
        descripcion TEXT,
        fecha TEXT
      );
    `);

    // Asegurar que la tabla logs tenga columna id_arco (migración ligera)
    try {
      const cols: any[] = await db.getAllAsync("PRAGMA table_info('logs');");
      const hasIdArco = cols && Array.isArray(cols) && cols.some((c: any) => c.name === 'id_arco');
      if (!hasIdArco) {
        console.log('Migración: agregando columna id_arco a logs');
        await db.execAsync('ALTER TABLE logs ADD COLUMN id_arco INTEGER;');
      }
    } catch (e) {
      console.error('Error comprobando/creando columna id_arco en logs:', e);
    }



    // Insertar arcanos base (usamos INSERT OR REPLACE para garantizar id fijo)
    await db.execAsync(`
      INSERT OR REPLACE INTO arcanos (id_arcano, simbolo, nombre_arcano, stat_asociado, efecto_descripcion) VALUES
      (0, '0', 'El Loco', 'Comodín', 'Ganas un 2% más de XP en todas las misiones de cualquier stat'),
      (1, 'I', 'El Mago', 'Conocimiento', 'Ganas un 10% más de XP por realizar misiones con dificultad Media'),
      (2, 'II', 'La Suma Sacerdotisa', 'Conocimiento', 'Ganas un 10% más de XP en misiones relacionadas al Conocimiento y un 5% con misiones de la Gentileza'),
      (3, 'III', 'La Emperatriz', 'Gentileza', 'Ganas un 15% más de XP en misiones relacionadas a la Gentileza'),
      (4, 'IV', 'El Emperador', 'Destreza', 'Ganas un 15% más de XP en las misiones de arco'),
      (5, 'V', 'El Hierofante', 'Conocimiento', 'Ganas un 15% más de XP en misiones relacionadas al Conocimiento'),
      (6, 'VI', 'Los Amantes', 'Carisma', 'Ganas un 15% más de XP en misiones relacionadas a la Carisma'),
      (7, 'VII', 'El Carro', 'Coraje', 'Ganas un 5% más de XP si tienes una racha de +3 días'),
      (8, 'VIII', 'La Justicia', 'Destreza', 'Ganas un 5% más de XP en misiones diarias'),
      (9, 'IX', 'El Ermitaño', 'Conocimiento', 'Ganas un 10% más de XP por realizar misiones semanales'),
      (10, 'X', 'Fortuna', 'Destreza', 'Ganas un 30% más de XP en misiones Extra'),
      (11, 'XI', 'La Fuerza', 'Coraje', 'Ganas un 15% más de XP por realizar misiones con dificultad Difícil'),
      (12, 'XII', 'El Ahorcado', 'Destreza', 'Ganas un 7% más de XP en misiones relacionadas a la Destreza y Gentileza'),
      (13, 'XIII', 'La Muerte', 'Coraje', 'Ganas un 15% más de XP en misiones relacionadas al Coraje'),
      (14, 'XIV', 'La Templanza', 'Gentileza', 'Ganas un 10% más de XP en misiones relacionadas al Gentileza y un 5% con misiones de la Carisma'),
      (15, 'XV', 'El Diablo', 'Carisma', 'Ganas un 30% más de XP en misiones semanales, pero ganas un 15% menos en misiones diarias'),
      (16, 'XVI', 'La Torre', 'Coraje', 'Ganas un 5% más de XP en misiones con dificultad Fácil'),
      (17, 'XVII', 'La Estrella', 'Carisma', 'Ganas un 2.5% más de XP en todas las misiones completadas hoy'),
      (18, 'XVIII', 'La Luna', 'Gentileza', 'Ganas un 5% más de XP en misiones relacionadas con Gentileza, Destreza y Coraje'),
      (19, 'XIX', 'El Sol', 'Carisma', 'Ganas un 5% más de XP en misiones relacionadas con Carisma, Conocimiento y Coraje'),
      (20, 'XX', 'El Juicio', 'Gentileza', 'Ganas un 5% más de XP en misiones relacionadas con Gentileza, Conocimiento y Carisma'),
      (21, 'XXI', 'El Mundo', 'Todos', 'Tu decides tu futuro...');
    `);

    // Inicializar categorías financieras por defecto si no existen
    try {
      const catCount: any[] = await db.getAllAsync('SELECT count(*) as c FROM financial_categories');
      const count = catCount && catCount[0] ? catCount[0].c : 0;
      if (!count || count === 0) {
        await db.execAsync(`
          INSERT INTO financial_categories (nombre, icono, color, tipo) VALUES
          ('Comida', 'food', '#FF5252', 'GASTO'),
          ('Transporte', 'bus', '#448AFF', 'GASTO'),
          ('Ocio', 'gamepad-variant', '#FFC107', 'GASTO'),
          ('Salud', 'hospital-box', '#E91E63', 'GASTO'),
          ('Otros', 'dots-horizontal', '#9E9E9E', 'GASTO'),
          ('Salario', 'cash', '#4CAF50', 'INGRESO'),
          ('Regalo', 'gift', '#9C27B0', 'INGRESO');
        `);
      }
    } catch (e) {
      console.error('Error inicializando categorías financieras:', e);
    }

    // Llamada al seed para poblar jugador y stats si está vacío
    await checkAndSeedData();

    console.log('✅ Base de datos inicializada correctamente');
  } catch (error) {
    console.error('❌ Error al inicializar la base de datos:', error);
  }
};
