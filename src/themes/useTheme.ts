// src/theme/useTheme.ts
import { useState, useEffect } from 'react';
import { PALETTES } from './palettes';
import { CharacterTheme } from '../types';
import { db } from '../database';

// Hook personalizado que devuelve la paleta basada en el jugador actual
export const useTheme = () => {
  const [palette, setPalette] = useState(PALETTES[CharacterTheme.MAKOTO]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const rows: any = await db.getAllAsync('SELECT character_theme FROM jugadores LIMIT 1');
        if (!mounted) return;
        if (rows && rows.length > 0 && rows[0].character_theme) {
          const themeKey = rows[0].character_theme as CharacterTheme;
          if (PALETTES[themeKey]) setPalette(PALETTES[themeKey]);
        }
      } catch (e) {
        // En caso de error, mantenemos la paleta por defecto
        console.warn('useTheme: no se pudo leer tema de BD', e);
      }
    };

    load();
    return () => { mounted = false; };
  }, []);

  return palette;
};
