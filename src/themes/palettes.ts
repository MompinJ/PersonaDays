import { CharacterTheme } from "../types";

export interface ThemeColors {
    // Identidad
    primary: string;       // Color principal (ej. Cyan Makoto)
    secondary: string;     // Un color de apoyo para contrastes
    background: string;    // Fondo de pantalla
    surface: string;       // Fondo de tarjetas/menús
    card?: string;         // Color de tarjetas/elementos (alias opcional para compatibilidad)

    // Texto
    text: string;          // Texto principal
    textDim: string;       // Texto secundario / descripciones
    textInverse: string;   // Texto sobre el color primario (ej. Negro sobre Cyan)

    // UI Funcional
    border: string;        // Líneas divisorias (muy usadas en UI Persona)
    success: string;       // Misión completada / Level Up
    error: string;         // Game Over / Validación
    inactive: string;      // Elementos bloqueados

    // Opcional pero recomendado para P3R
    shadow: string;        // Para dar ese efecto "pop" 3D en los menús

    // Tipografía (nombre de las familias cargadas por expo-font)
    fonts?: {
        title: string;
        body: string;
        bold: string;
    };
}
// Tipografías por defecto (se referencian por nombre de familia una vez cargadas)
export const DEFAULT_FONTS = {
    title: 'Anton_400Regular',
    body: 'Exo2_400Regular',
    bold: 'Exo2_700Bold'
};
// Todo AGREGAR MAS O CAMBIAR SI ES NECESARIO

export const PALETTES: Record<CharacterTheme, ThemeColors> = {
[CharacterTheme.MAKOTO]: {
        // Base
        primary: '#00D4FF',      // Cyan Eléctrico
        secondary: '#007ACC',    // Azul intermedio
        background: '#0A1628',   // Azul Oscuro Profundo
        surface: '#12243D',      // Un poco más claro que el fondo
        // Texto
        text: '#FFFFFF',
        textDim: '#8892B0',
        textInverse: '#000000',  // El texto sobre Cyan debe ser negro para leerse bien
        // Funcional
        border: '#2A4466',       // Azul grisáceo para líneas
        success: '#44FF88',      // Verde neón, va bien con el Cyan
        error: '#FF4444',        // Rojo brillante
        inactive: '#1A2639',     // Azul muy apagado
        shadow: 'rgba(0, 212, 255, 0.25)' // Resplandor Cyan
    },
    [CharacterTheme.KOTONE]: {
        // Base
        primary: '#FF5E7D',      // Rosa Intenso
        secondary: '#FF9EB5',    // Rosa pastel
        background: '#2B0A12',   // Rojo muy oscuro
        surface: '#3E121E',
        // Texto
        text: '#FFFFFF',
        textDim: '#D4A5A5',
        textInverse: '#FFFFFF',  // Sobre rosa intenso, blanco suele ir bien
        // Funcional
        border: '#5E2A35',
        success: '#FFD700',      // Dorado (queda mejor con rosa que el verde)
        error: '#FF0000',
        inactive: '#4A2A30',
        shadow: 'rgba(255, 94, 125, 0.25)' // Resplandor Rosa
    },
    // --- SEES MEMBERS (Tus inputs) ---

    [CharacterTheme.YUKARI]: {
        primary: '#EF96D0',      // --color-5 (Rosa brillante)
        secondary: '#F451FF',    // --color-7 (Magenta)
        background: '#2F002A',   // --color-4 (Púrpura muy oscuro)
        surface: '#3D2A35',      // Derivado para contraste
        text: '#E6D2D4',         // --color-2 (Blanco rosado)
        textDim: '#ED9593',      // --color-3 (Rosa suave)
        textInverse: '#2F002A',  // Texto oscuro sobre rosa
        border: '#C4104F',       // --color-6
        success: '#F451FF',      // Magenta como éxito
        error: '#F41314',        // --color-1 (Rojo)
        inactive: '#522A40',
        shadow: 'rgba(239, 150, 208, 0.3)'
    },

    [CharacterTheme.AKIHIKO]: {
        primary: '#E11323',      // --color-3 (Rojo vibrante)
        secondary: '#741B22',    // --color-4 (Rojo oscuro)
        background: '#1A1C20',   // Derivado oscuro de --color-2
        surface: '#2B3238',      // --color-2 (Gris azulado oscuro)
        text: '#FFFFFF',         // --color-5
        textDim: '#D2DEDE',      // --color-6 (Gris claro)
        textInverse: '#FFFFFF',
        border: '#737C84',       // --color-9
        success: '#D2DEDE',      // Plata como éxito
        error: '#741B22',        // Rojo oscuro
        inactive: '#3A4045',
        shadow: 'rgba(225, 19, 35, 0.3)'
    },

    [CharacterTheme.MITSURU]: {
        primary: '#C50058',      // --color-7 (Rojo rosado elegante)
        secondary: '#9D0070',    // --color-5 (Púrpura)
        background: '#32013E',   // --color-8 (Púrpura profundo)
        surface: '#5A003D',      // --color-2
        text: '#FAFDF9',         // --color-6 (Blanco hielo)
        textDim: '#9FA4B7',      // --color-4 (Gris hielo)
        textInverse: '#FFFFFF',
        border: '#D195C9',       // --color-1 (Lila)
        success: '#D195C9',
        error: '#F30021',        // --color-10 (Rojo brillante)
        inactive: '#45104E',
        shadow: 'rgba(197, 0, 88, 0.3)'
    },

    [CharacterTheme.SHINJIRO]: {
        primary: '#F40200',      // --color-4 (Rojo brillante agresión)
        secondary: '#DDCEA7',    // --color-2 (Beige hueso)
        background: '#030116',   // --color-7 (Casi negro)
        surface: '#1A0505',      // Rojizo muy oscuro
        text: '#DDCEA7',         // --color-2 (Texto beige)
        textDim: '#A8041C',      // --color-8 (Rojo sangre seco)
        textInverse: '#000000',
        border: '#950101',       // --color-5
        success: '#DDCEA7',      // Beige
        error: '#560001',        // Rojo muy oscuro
        inactive: '#2A1015',
        shadow: 'rgba(244, 2, 0, 0.25)'
    },

    [CharacterTheme.KEN]: {
        primary: '#F07E25',      // --color-1 (Naranja Amada)
        secondary: '#F1B63E',    // --color-4 (Amarillo)
        background: '#221510',   // Derivado oscuro café
        surface: '#43372B',      // --color-7 (Café medio)
        text: '#DCD8E6',         // --color-9 (Blanco grisáceo)
        textDim: '#EBB078',      // --color-5 (Durazno)
        textInverse: '#000000',
        border: '#8D6B46',       // --color-6
        success: '#EDEC82',      // --color-8 (Amarillo pálido)
        error: '#F02C20',        // --color-3 (Rojo)
        inactive: '#33261F',
        shadow: 'rgba(240, 126, 37, 0.3)'
    },

    [CharacterTheme.KOROMARU]: {
        primary: '#F0331D',      // --color-3 (Rojo ojos/collar)
        secondary: '#FFF',       // Blanco
        background: '#080A17',   // --color-2 (Azul noche muy oscuro)
        surface: '#151825',      // Ligeramente más claro
        text: '#FFFFFF',         // --color-1
        textDim: '#727F85',      // --color-8 (Gris pelaje)
        textInverse: '#FFFFFF',
        border: '#C0BD76',       // --color-9 (Dorado pálido)
        success: '#C0BD76',
        error: '#680C00',        // --color-6 (Rojo sangre)
        inactive: '#202430',
        shadow: 'rgba(240, 51, 29, 0.3)'
    },

    [CharacterTheme.FUUKA]: {
        primary: '#12FEB9',      // --color-1 (Cyan Tech)
        secondary: '#41DEC3',    // --color-2
        background: '#06181C',   // --color-4 (Negro verdoso)
        surface: '#0C282E',
        text: '#AAFFE7',         // --color-9 (Mentolado claro)
        textDim: '#4B878F',      // --color-10 (Verde apagado)
        textInverse: '#000000',  // Texto negro sobre cyan
        border: '#10B686',       // --color-3
        success: '#12FEB9',
        error: '#F6DDE0',        // --color-6 (Rosa pálido - contraste interesante)
        inactive: '#102A30',
        shadow: 'rgba(18, 254, 185, 0.3)'
    },

    [CharacterTheme.JUNPEI]: { // Extra para completar
        primary: '#F5A623',      // Naranja
        secondary: '#4A90E2',    // Azul Beisbol
        background: '#121921',
        surface: '#1E2A38',
        text: '#FFFFFF',
        textDim: '#8CA0B3',
        textInverse: '#000000',
        border: '#F5A623',
        success: '#F8E71C',
        error: '#D0021B',
        inactive: '#25303E',
        shadow: 'rgba(245, 166, 35, 0.3)'
    },

    [CharacterTheme.AIGIS]: { // Extra para completar (Tema "The Answer" / Orgia)
        primary: '#FFE600',      // Amarillo Aigis
        secondary: '#00D4FF',    // Detalles azules
        background: '#1A1A2E',   // Azul mecánico oscuro
        surface: '#252540',
        text: '#FFFFFF',
        textDim: '#B0B0C0',
        textInverse: '#000000',
        border: '#FFE600',
        success: '#00FF99',
        error: '#FF0055',
        inactive: '#2A2A3E',
        shadow: 'rgba(255, 230, 0, 0.3)'
    }
};
