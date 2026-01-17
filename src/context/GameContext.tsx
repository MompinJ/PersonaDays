import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Jugador, CharacterTheme } from '../types';
import { db } from '../database/database';
import { PALETTES, ThemeColors, DEFAULT_FONTS } from '../themes/palettes';

type GameContextType = {
  player: Jugador | null;
  theme: ThemeColors;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
};

const defaultTheme = { ...PALETTES[CharacterTheme.MAKOTO], fonts: DEFAULT_FONTS } as ThemeColors;

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [player, setPlayer] = useState<Jugador | null>(null);
  const [theme, setTheme] = useState<ThemeColors>(defaultTheme);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadPlayerData = async () => {
    setIsLoading(true);
    try {
      const result: any = await db.getAllAsync('SELECT * FROM jugadores LIMIT 1');
      if (result && Array.isArray(result) && result.length > 0) {
        const p = result[0] as Jugador;
        setPlayer(p);
        const base = PALETTES[(p.character_theme as CharacterTheme)] || PALETTES[CharacterTheme.MAKOTO];
        setTheme({ ...base, fonts: DEFAULT_FONTS });
      } else {
        setPlayer(null);
        setTheme(defaultTheme);
      }
    } catch (err) {
      console.error('Error loading player data:', err);
      setPlayer(null);
      setTheme(defaultTheme);
    } finally {
      setIsLoading(false);
    }
  };

  // Exposed to consumers
  // refreshUser debe actualizar los datos silenciosamente SIN alterar isLoading
  const refreshUser = async () => {
    try {
      const result: any = await db.getAllAsync('SELECT * FROM jugadores LIMIT 1');
      if (result && Array.isArray(result) && result.length > 0) {
        const p = result[0] as Jugador;
        setPlayer(p);
        const base = PALETTES[(p.character_theme as CharacterTheme)] || PALETTES[CharacterTheme.MAKOTO];
        setTheme({ ...base, fonts: DEFAULT_FONTS });
      }
    } catch (err) {
      console.error('Error refreshing player data:', err);
    }
  };

  useEffect(() => {
    loadPlayerData();
  }, []);

  return (
    <GameContext.Provider value={{ player, theme, isLoading, refreshUser }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = (): GameContextType => {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
};

export default GameContext;
