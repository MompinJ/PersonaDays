import { CharacterTheme } from "../types";

export interface ThemeColors {
  primary: string;    // Color principal (Botones, Iconos activos)
  background: string; // Fondo de pantalla
  surface: string;    // Fondo de tarjetas/items
  text: string;       // Texto principal
  textDim: string;    // Texto secundario
  accent: string;     // Detalles (Bordes, lineas)
}
// Todo AGREGAR MAS O CAMBIAR SI ES NECESARIO

export const PALETTES: Record<CharacterTheme, ThemeColors> = {
    [CharacterTheme.MAKOTO]: {
        primary: '#00D4FF', // Cyan Eléctrico
        background: '#0A1628', // Azul Oscuro Profundo
        surface: '#1A2639', // Azul Grisáceo
        text: '#FFFFFF',
        textDim: '#8892B0',
        accent: '#00D4FF',
    },
    [CharacterTheme.KOTONE]: {
        primary: '#FF5E7D', // Rosa Intenso
        background: '#2B0A12', // Rojo Oscuro Profundo
        surface: '#3E1A24', // Rosa Grisáceo
        text: '#FFFFFF',
        textDim: '#D4A5A5',
        accent: '#FF9EB5',
    },
    [CharacterTheme.YUKARI]: {
        primary: '#FEA1E6',
        background: '#2D1A25',
        surface: '#3D2A35',
        text: '#FFF',
        textDim: '#AAA',
        accent: '#FEA1E6'
    },
    [CharacterTheme.JUNPEI]: {
        primary: '#FEA1E6',
        background: '#2D1A25',
        surface: '#3D2A35',
        text: '#FFF',
        textDim: '#AAA',
        accent: '#FEA1E6'
    },
    [CharacterTheme.AKIHIKO]: {
        primary: '#FEA1E6',
        background: '#2D1A25',
        surface: '#3D2A35',
        text: '#FFF',
        textDim: '#AAA',
        accent: '#FEA1E6'
    },
    [CharacterTheme.MITSURU]:  {
        primary: '#FEA1E6',
        background: '#2D1A25',
        surface: '#3D2A35',
        text: '#FFF',
        textDim: '#AAA',
        accent: '#FEA1E6'
    },
    [CharacterTheme.KEN]:  {
        primary: '#FEA1E6',
        background: '#2D1A25',
        surface: '#3D2A35',
        text: '#FFF',
        textDim: '#AAA',
        accent: '#FEA1E6'
    },
    [CharacterTheme.KOROMARU]:  {
        primary: '#FEA1E6',
        background: '#2D1A25',
        surface: '#3D2A35',
        text: '#FFF',
        textDim: '#AAA',
        accent: '#FEA1E6'
    },
    [CharacterTheme.AIGIS]:  {
        primary: '#FEA1E6',
        background: '#2D1A25',
        surface: '#3D2A35',
        text: '#FFF',
        textDim: '#AAA',
        accent: '#FEA1E6'
    },
    [CharacterTheme.FUUKA]:  {
        primary: '#FEA1E6',
        background: '#2D1A25',
        surface: '#3D2A35',
        text: '#FFF',
        textDim: '#AAA',
        accent: '#FEA1E6'
    },
    [CharacterTheme.SHINJIRO]:  {
        primary: '#FEA1E6',
        background: '#2D1A25',
        surface: '#3D2A35',
        text: '#FFF',
        textDim: '#AAA',
        accent: '#FEA1E6'
    }
}
