// src/theme/useTheme.ts
import { useGame } from '../context/GameContext';

// useTheme ahora es un puente hacia el GameContext para obtener el tema dinámico
export const useTheme = () => {
  const { theme } = useGame();
  return theme;
};
