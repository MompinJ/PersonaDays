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

/** Normaliza '#abc' | 'abc' | '#aabbcc' a [r, g, b]. Devuelve null si no es hex. */
const hexToRgb = (hex?: string): [number, number, number] | null => {
  if (!hex) return null;
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) return null;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

const rgbToHex = (r: number, g: number, b: number): string => {
  const c = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
};

/**
 * Aclara (t > 0) u oscurece (t < 0) un color mezclandolo con blanco o negro.
 * `t` va de -1 a 1. Conserva el tono, solo mueve la luminosidad.
 */
export const shadeColor = (hex: string, t: number): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const target = t >= 0 ? 255 : 0;
  const k = Math.min(1, Math.abs(t));
  return rgbToHex(
    rgb[0] + (target - rgb[0]) * k,
    rgb[1] + (target - rgb[1]) * k,
    rgb[2] + (target - rgb[2]) * k
  );
};

/**
 * true si dos colores son practicamente el mismo a ojo (distancia RGB ponderada
 * por sensibilidad del ojo). El umbral por defecto es deliberadamente estrecho:
 * solo debe atrapar colisiones reales (dos rojos identicos o casi), nunca
 * tonos que el usuario eligio distintos a proposito (un rojo y un rosa son
 * ~33 de distancia y deben respetarse tal cual).
 */
export const colorsAreClose = (a?: string, b?: string, tolerance = 26): boolean => {
  const ra = hexToRgb(a); const rb = hexToRgb(b);
  if (!ra || !rb) return false;
  const d = Math.sqrt(
    (ra[0] - rb[0]) ** 2 * 0.3 + (ra[1] - rb[1]) ** 2 * 0.59 + (ra[2] - rb[2]) ** 2 * 0.11
  );
  return d <= tolerance;
};

/**
 * Separa visualmente colores repetidos de una serie (donut, barras, leyenda).
 *
 * Si el usuario creo tres categorias en rojo, en el grafico se funden en una
 * sola mancha. Aqui la primera ocurrencia se respeta y las siguientes se
 * derivan alternando oscuro/claro con amplitud creciente: siguen leyendose como
 * "de la misma familia" pero ya se distinguen entre si.
 *
 * Debe aplicarse a la serie COMPLETA de una vez, y el resultado usarse tanto en
 * el grafico como en su leyenda: si cada uno deriva por su cuenta, no coinciden.
 */
export const distinguishColors = (colors: (string | null | undefined)[], fallback = '#9E9E9E'): string[] => {
  const usados: string[] = [];
  const pasos = [0, -0.34, 0.36, -0.58, 0.6, -0.74, 0.76];
  return colors.map((raw) => {
    const base = raw || fallback;
    // Cuenta contra los colores YA emitidos, no contra los de origen: asi dos
    // rojos distintos pero casi iguales tambien se separan.
    let n = 0;
    let candidato = base;
    while (usados.some((u) => colorsAreClose(u, candidato)) && n < pasos.length - 1) {
      n += 1;
      candidato = shadeColor(base, pasos[n]);
    }
    usados.push(candidato);
    return candidato;
  });
};
