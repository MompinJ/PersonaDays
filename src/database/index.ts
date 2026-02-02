import * as SQLite from 'expo-sqlite';
import { checkAndSeedData } from './database';
export const db = SQLite.openDatabaseSync('personadays.db');
export const initDatabase = async () => {
  try {



    // WARNING: The DROP TABLE block below was commented out to preserve user data on app restart.
    // If you need to reset the DB for development, uncomment these lines temporarily.
    /*
    await db.execAsync(`
      DROP TABLE IF EXISTS logs;
      DROP TABLE IF EXISTS impacto_mision;
      DROP TABLE IF EXISTS misiones;
      DROP TABLE IF EXISTS arcos;
      DROP TABLE IF EXISTS jugador_stat;
      DROP TABLE IF EXISTS stats;
      DROP TABLE IF EXISTS jugador_arcanos_slots;
      DROP TABLE IF EXISTS jugadores;
      DROP TABLE IF EXISTS arcanos;
    `);
    */

    await db.execAsync('PRAGMA foreign_keys = ON;'); //Activa las FK

    // 2. Ejecutamos las queries para crear las tablas una por una
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
        tipo TEXT NOT NULL, -- 'PREDEFINED' o 'CUSTOM'
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
        id_arco_padre INTEGER,
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
        activa INTEGER DEFAULT 1, -- 0=False, 1=True
        tipo TEXT NOT NULL,
        frecuencia_repeticion TEXT,
        id_arco INTEGER,
        recompensa_exp INTEGER DEFAULT 10,
        recompensa_yenes INTEGER DEFAULT 0,
        completada INTEGER DEFAULT 0, -- 0=False, 1=True
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
        numero_slot INTEGER NOT NULL, -- 1, 2 o 3
        fecha_equipado TEXT NOT NULL, -- Para validar la regla de los 2 días
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

      -- TABLA FINANCIAL_CATEGORIES
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



    // TODO INSERTAR FRASE DE LORE
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

    // --- Asegurar que el jugador y stats base estén sembrados ---
    await checkAndSeedData();

    // DEV: eliminar jugador al iniciar para forzar setup (borrar jugador y sus referencias)
    // Commented out to avoid wiping user data on app start. Uncomment only for development resets.
    /*
    try {
      await db.execAsync('DELETE FROM jugador_stat;');
      await db.execAsync('DELETE FROM jugador_arcanos_slots;');
      await db.execAsync('DELETE FROM jugadores;');
      console.log('🧹 Jugador borrado para forzar flujo de setup (DEBUG)');
    } catch (e) {
      console.error('Error borrando jugador al iniciar:', e);
    }
    */

    // Inicializar categorías financieras por defecto si no existen (compatibilidad con database.ts)
    try {
      const catCount: any[] = await db.getAllAsync('SELECT count(*) as c FROM financial_categories');
      const count = catCount && catCount[0] ? catCount[0].c : 0;
      if (!count || count === 0) {
        await db.execAsync(`
          INSERT INTO financial_categories (nombre, icono, color, tipo) VALUES
          ('Comida', 'food', '#FF5252', 'GASTO'),
          ('Transporte', 'bus', '#448AFF', 'GASTO'),
          ('Ocio', 'gamepad-variant', '#FFC107', 'GASTO'),
          ('Salud', 'heart-pulse', '#E91E63', 'GASTO'),
          ('Otros', 'circle-outline', '#9E9E9E', 'GASTO'),
          ('Salario', 'cash', '#4CAF50', 'INGRESO'),
          ('Regalo', 'gift', '#9C27B0', 'INGRESO');
        `);
      }
    } catch (e) {
      console.error('Error inicializando categorías financieras:', e);
    }

    console.log('Base de datos inicializada correctamente');
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
  }
};
