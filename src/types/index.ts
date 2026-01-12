// Temas principales de la app
export enum CharacterTheme {
	MAKOTO = 'MAKOTO',
	KOTONE = 'KOTONE',
	YUKARI = 'YUKARI',
	JUNPEI = 'JUNPEI',
	AKIHIKO = 'AKIHIKO',
	MITSURU = 'MITSURU',
	KEN = 'KEN',
	KOROMARU = 'KOROMARU',
	AIGIS = 'AIGIS',
	FUUKA = 'FUUKA',
	SHINJIRO = 'SHINJIRO'
}

// El tipo de misiones que se pueden hacer
export enum MissionType {
	DIARIA = 'DIARIA',
	SEMANAL = 'SEMANAL',
	ARCO = 'ARCO',
	EXTRA = 'EXTRA',
	BOSS = 'BOSS'
}

// Estados del Arco
export enum ArcState {
	ACTIVO = 'ACTIVO',
	COMPLETADO = 'COMPLETADO',
	ABANDONADO = 'ABANDONADO'
}

// Frecuencia de las misiones
export enum MissionFrequency {
	EVERY_DAY = 'EVERY_DAY',
	WEEKLY = 'WEEKLY',
	ONE_OFF = 'ONE_OFF'
}


// --------- INTERFACES DE LA BASE DE DATOS -----------
// Tabla Jugadores
export interface Jugador {
	id_jugador: number;
	nombre_jugador: string;
	nivel_jugador: number;
	vida: number;
	yenes: number;
	racha: number;
	last_activity_date?: string;
	slots_desbloqueados: number;
	character_theme: CharacterTheme;
	created_at: string;
}

// Tabla Arcanos
export interface Arcano {
    id_arcano: number;
    nombre_arcano: string;
    simbolo: string;
    stat_asociado: string;
    descripcion_lore?: string;
    efecto_descripcion: string;
}

export enum ArcanaID {
    LOCO = 0,
    MAGO = 1,
    SACERDOTISA = 2,
    EMPERATRIZ = 3,
    EMPERADOR = 4,
    HIEROFANTE = 5,
    AMANTES = 6,
    CARRO = 7,
    JUSTICIA = 8,
	HERMITANO = 9,
    FORTUNA = 10,
    FUERZA = 11,
    AHORCADO = 12,
    MUERTE = 13,
    TEMPLANZA = 14,
    DIABLO = 15,
    TORRE = 16,
    ESTRELLA = 17,
    LUNA = 18,
    SOL = 19,
    JUICIO = 20,
    MUNDO = 21
}

// Tabla Stats
export interface Stat {
	id_stat: number;
	nombre: string;
	descripcion?: string;
	tipo: "PREDEFINED" | "CUSTOM";
	id_arcano?: number;  // FK
	dificultad: number
	id_stat_padre?: number; // Nuevo: referencia al stat padre
}

// Tabla jugador_stat
export interface JugadorStat{
	id_jugador_stat: number;
	id_jugador: number; // FK
	id_stat: number; // FK
	nivel_actual: number;
	experiencia_actual: number;
	nivel_maximo: number;
	cuenta_prestigio: number;
}

// Tabla misiones
export interface Mision {
	id_mision: number;
	nombre: string;
	descripcion?: string;
	activa: boolean;
	tipo: MissionType;
	frecuencia_repeticion?: MissionFrequency;
	id_arco?: number;  // FK
	recompensa_exp: number;
	recompensa_yenes: number;
	completada: boolean;
	fecha_creacion: string;
	fecha_expiracion?: string;
	fecha_completada?: string;
}

// Tabla impacto_mision
export interface ImpactoMision {
	id_impacto: number;
	id_mision: number; // FK
	id_stat: number; // FK
	valor_impacto: number;
}

// Tabla arcos
export interface Arco {
	id_arco: number;
	nombre: string;
	descripcion?: string;
	fecha_inicio: string;
	fecha_fin?: string;
	id_arco_padre?: number; // FK
	id_stat_relacionado?: number; // FK
	color_hex: string;
	estado: ArcState;
	resumen_final?: string;
}

export interface JugadorArcanoSlot {
    id_slot: number;
    id_jugador: number;
    id_arcano: number;
    numero_slot: number; // 1, 2, 3
    fecha_equipado: string; // ISO String
}

export interface ArcanoActivo extends Arcano {
    fecha_equipado: string;
    dias_restantes_bloqueo: number;
}

// Tabla logs
export interface Log {
	id_log: number;
	id_mision: number; // FK
	fecha_completada: string;
	exp_ganada: number;
	yenes_ganados: number;
}
