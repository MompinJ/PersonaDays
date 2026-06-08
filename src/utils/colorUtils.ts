// Utilidades de color compartidas.

/**
 * Devuelve '#000000' o '#FFFFFF' según cuál contraste mejor sobre el color dado.
 * Útil para texto/iconos sobre fondos de categoría arbitrarios (ej: amarillo claro
 * necesita texto negro, azul oscuro necesita texto blanco).
 */
export const getContrastText = (hex?: string): string => {
  if (!hex) return '#FFFFFF';
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6) return '#FFFFFF';
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  // Luminancia percibida (0..1)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? '#000000' : '#FFFFFF';
};
