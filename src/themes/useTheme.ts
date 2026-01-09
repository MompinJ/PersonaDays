// src/theme/useTheme.ts
import { PALETTES } from './palettes';
import { CharacterTheme } from '../types';

// Hook personalizado
export const useTheme = () => {
  // TODO: Aquí en el futuro leeremos el tema real del usuario desde un Contexto o Base de Datos.
  // Por ahora, forzamos MAKOTO para probar (o cámbialo a KOTONE para ver la magia).
  const currentTheme = CharacterTheme.YUKARI;

  return PALETTES[currentTheme];
};
