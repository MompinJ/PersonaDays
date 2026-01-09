import * as SQLite from 'expo-sqlite';
export const db = SQLite.openDatabaseSync('personadays.db');
export const initDatabase = async () => {
  try {
     await db.execAsync('DROP TABLE IF EXISTS misiones');
     await db.execAsync('DROP TABLE IF EXISTS jugadores');
     await db.execAsync('DROP TABLE IF EXISTS stats');
     await db.execAsync('DROP TABLE IF EXISTS arcanos');


    await db.execAsync('PRAGMA foreign_keys = ON;'); //Activa las FK

    // 2. Ejecutamos las queries para crear las tablas una por una
    await db.execAsync(`
      -- TABLA ARCANOS
      CREATE TABLE IF NOT EXISTS arcanos (
        id_arcano INTEGER PRIMARY KEY,
        nombre_arcano TEXT NOT NULL,
        simbolo TEXT NOT NULL,
        descripcion TEXT,
        xp_bonus REAL DEFAULT 0.15
      );

      -- TABLA JUGADORES
      CREATE TABLE IF NOT EXISTS jugadores (
        id_jugador INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre_jugador TEXT NOT NULL,
        nivel_jugador INTEGER DEFAULT 1,
        vida INTEGER DEFAULT 10,
        yenes INTEGER DEFAULT 0,
        racha INTEGER DEFAULT 0,
        last_activity_date TEXT,
        id_arcano INTEGER,
        character_theme TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (id_arcano) REFERENCES arcanos(id_arcano)
      );

      -- TABLA STATS
      CREATE TABLE IF NOT EXISTS stats (
        id_stat INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        tipo TEXT NOT NULL, -- 'PREDEFINED' o 'CUSTOM'
        id_arcano INTEGER,
        dificultad REAL DEFAULT 1.0,
        FOREIGN KEY (id_arcano) REFERENCES arcanos(id_arcano)
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

      -- TABLA LOGS (Historial)
      CREATE TABLE IF NOT EXISTS logs (
        id_log INTEGER PRIMARY KEY AUTOINCREMENT,
        id_mision INTEGER NOT NULL,
        fecha_completada TEXT NOT NULL,
        exp_ganada INTEGER NOT NULL,
        yenes_ganados INTEGER NOT NULL,
        FOREIGN KEY (id_mision) REFERENCES misiones(id_mision)
      );
    `);

    console.log('Base de datos inicializada correctamente');
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
  }
};
