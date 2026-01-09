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
	id_arcano: number;  // FK
	character_theme: CharacterTheme;
	created_at: string;
}

// Tabla Arcanos
export interface Arcano {
	id_arcano: number;
	nombre_arcano: string;
	simbolo: string;
	descripcion: string;
	xp_bonus: number;
}

// Tabla Stats
export interface Stat {
	id_stat: number;
	nombre: string;
	descripcion?: string;
	tipo: "PREDEFINED" | "CUSTOM";
	id_arcano?: number;  // FK
	dificultad: number
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

// Tabla logs
export interface Log {
	id_log: number;
	id_mision: number; // FK
	fecha_completada: string;
	exp_ganada: number;
	yenes_ganados: number;
}
