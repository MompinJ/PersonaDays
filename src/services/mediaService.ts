// Biblioteca de animes y mangas: el registro de lo que se ha visto o leido,
// con su rango, su reflexion y sus temas musicales.
//
// Los temas viven en su propia tabla porque una obra de varias temporadas
// acumula varios openings, endings y OSTs; como tres campos de la obra solo
// cabria uno de cada.

import { db } from '../database';

export type TipoObra = 'ANIME' | 'MANGA';
export type EstadoObra = 'PENDIENTE' | 'VIENDO' | 'COMPLETADO' | 'PAUSADO' | 'ABANDONADO';
export type Rango = 'S' | 'A' | 'B' | 'C' | 'D' | 'E';
export type ClaseTema = 'OP' | 'ED' | 'OST';

export const RANGOS: Rango[] = ['S', 'A', 'B', 'C', 'D', 'E'];
export const ESTADOS: EstadoObra[] = ['PENDIENTE', 'VIENDO', 'COMPLETADO', 'PAUSADO', 'ABANDONADO'];
export const CLASES: ClaseTema[] = ['OP', 'ED', 'OST'];

// Etiqueta legible de cada estado, distinta segun el tipo: no se "ve" un manga.
export const labelEstado = (e: EstadoObra, tipo: TipoObra): string => {
  switch (e) {
    case 'PENDIENTE': return tipo === 'MANGA' ? 'POR LEER' : 'POR VER';
    case 'VIENDO': return tipo === 'MANGA' ? 'LEYENDO' : 'VIENDO';
    case 'COMPLETADO': return 'COMPLETADO';
    case 'PAUSADO': return 'EN PAUSA';
    case 'ABANDONADO': return 'ABANDONADO';
  }
};

export const labelUnidad = (tipo: TipoObra) => (tipo === 'MANGA' ? 'capítulos' : 'episodios');

export interface Tema {
  id_tema: number;
  id_obra: number;
  clase: ClaseTema;
  numero: number | null;
  titulo: string | null;
  artista: string | null;
  rango: Rango | null;
}

export interface Obra {
  id_obra: number;
  titulo: string;
  tipo: TipoObra;
  estado: EstadoObra;
  rango: Rango | null;
  reflexion: string | null;
  progreso: number;
  total: number | null;
  favorito: number;
  etiquetas: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  created_at: string;
  updated_at: string;
  // Derivados
  temas: number;
  mejor_tema: Rango | null;
}

export type ObraInput = Omit<Obra, 'id_obra' | 'created_at' | 'updated_at' | 'temas' | 'mejor_tema'>;

const ahora = () => new Date().toISOString();

// Para "el mejor tema de la obra": S es el tope, asi que ordenamos por peso y
// nos quedamos con el minimo.
const PESO_RANGO: Record<string, number> = { S: 0, A: 1, B: 2, C: 3, D: 4, E: 5 };

const SELECT_OBRA = `
  SELECT o.*,
         (SELECT COUNT(*) FROM media_temas t WHERE t.id_obra = o.id_obra) AS temas,
         (SELECT t.rango FROM media_temas t
           WHERE t.id_obra = o.id_obra AND t.rango IS NOT NULL
           ORDER BY CASE t.rango WHEN 'S' THEN 0 WHEN 'A' THEN 1 WHEN 'B' THEN 2
                                 WHEN 'C' THEN 3 WHEN 'D' THEN 4 ELSE 5 END
           LIMIT 1) AS mejor_tema
    FROM media_obras o
`;

export const getObras = async (tipo?: TipoObra): Promise<Obra[]> => {
  const rows: any[] = await db.getAllAsync(
    `${SELECT_OBRA}${tipo ? ' WHERE o.tipo = ?' : ''} ORDER BY o.favorito DESC, o.updated_at DESC`,
    tipo ? [tipo] : []
  );
  return (rows || []) as Obra[];
};

export const getObra = async (id: number): Promise<Obra | null> => {
  const row: any = await db.getFirstAsync(`${SELECT_OBRA} WHERE o.id_obra = ?`, [id]);
  return (row || null) as Obra | null;
};

export const createObra = async (titulo: string, tipo: TipoObra): Promise<number> => {
  const t = ahora();
  const res: any = await db.runAsync(
    `INSERT INTO media_obras (titulo, tipo, estado, progreso, favorito, created_at, updated_at)
     VALUES (?, ?, 'PENDIENTE', 0, 0, ?, ?)`,
    [titulo.trim(), tipo, t, t]
  );
  return res?.lastInsertRowId;
};

export const updateObra = async (id: number, o: ObraInput): Promise<void> => {
  await db.runAsync(
    `UPDATE media_obras SET titulo = ?, tipo = ?, estado = ?, rango = ?, reflexion = ?,
            progreso = ?, total = ?, favorito = ?, etiquetas = ?, fecha_inicio = ?,
            fecha_fin = ?, updated_at = ?
      WHERE id_obra = ?`,
    [o.titulo.trim(), o.tipo, o.estado, o.rango, o.reflexion, o.progreso, o.total,
     o.favorito, o.etiquetas, o.fecha_inicio, o.fecha_fin, ahora(), id]
  );
};

// Atajo para la lista: alternar favorito sin abrir el detalle.
export const toggleFavorito = async (id: number): Promise<void> => {
  await db.runAsync(
    'UPDATE media_obras SET favorito = CASE favorito WHEN 1 THEN 0 ELSE 1 END, updated_at = ? WHERE id_obra = ?',
    [ahora(), id]
  );
};

// El ON DELETE CASCADE solo actua con las foreign keys activas, asi que los
// temas se borran a mano para no dejar huerfanos.
export const deleteObra = async (id: number): Promise<void> => {
  await db.runAsync('DELETE FROM media_temas WHERE id_obra = ?', [id]);
  await db.runAsync('DELETE FROM media_obras WHERE id_obra = ?', [id]);
};

// ------------------------------------------------------------------- TEMAS

export const getTemas = async (idObra: number): Promise<Tema[]> => {
  const rows: any[] = await db.getAllAsync(
    `SELECT * FROM media_temas WHERE id_obra = ?
      ORDER BY CASE clase WHEN 'OP' THEN 0 WHEN 'ED' THEN 1 ELSE 2 END,
               COALESCE(numero, 999), id_tema`,
    [idObra]
  );
  return (rows || []) as Tema[];
};

/**
 * Reemplaza en bloque los temas de una obra (la pantalla los edita como lista).
 * Se descartan las filas totalmente vacias para que "agregar" y arrepentirse no
 * deje basura.
 */
export const setTemas = async (idObra: number, temas: Partial<Tema>[]): Promise<void> => {
  const utiles = temas.filter((t) => (t.titulo || '').trim() || (t.artista || '').trim() || t.rango);
  await db.runAsync('DELETE FROM media_temas WHERE id_obra = ?', [idObra]);
  for (const t of utiles) {
    await db.runAsync(
      'INSERT INTO media_temas (id_obra, clase, numero, titulo, artista, rango) VALUES (?, ?, ?, ?, ?, ?)',
      [idObra, t.clase || 'OP', t.numero ?? null, (t.titulo || '').trim() || null, (t.artista || '').trim() || null, t.rango || null]
    );
  }
  await db.runAsync('UPDATE media_obras SET updated_at = ? WHERE id_obra = ?', [ahora(), idObra]);
};

/** Siguiente numero libre de una clase (OP 1, OP 2...) al agregar un tema. */
export const siguienteNumero = (temas: Partial<Tema>[], clase: ClaseTema): number =>
  temas.filter((t) => t.clase === clase).length + 1;

// ----------------------------------------------------------------- RESUMEN

export interface BibliotecaResumen {
  total: number;
  porEstado: Record<string, number>;
  completados: number;
  viendo: number;
  favoritos: number;
  rangoMasComun: Rango | null;
}

export const getResumen = async (tipo?: TipoObra): Promise<BibliotecaResumen> => {
  const rows: any[] = await db.getAllAsync(
    `SELECT estado, rango, favorito FROM media_obras${tipo ? ' WHERE tipo = ?' : ''}`,
    tipo ? [tipo] : []
  );
  const porEstado: Record<string, number> = {};
  const porRango: Record<string, number> = {};
  let favoritos = 0;
  (rows || []).forEach((r) => {
    porEstado[r.estado] = (porEstado[r.estado] || 0) + 1;
    if (r.rango) porRango[r.rango] = (porRango[r.rango] || 0) + 1;
    if (r.favorito) favoritos += 1;
  });
  const rangoMasComun = (Object.keys(porRango)
    .sort((a, b) => porRango[b] - porRango[a] || PESO_RANGO[a] - PESO_RANGO[b])[0] as Rango) || null;
  return {
    total: (rows || []).length,
    porEstado,
    completados: porEstado['COMPLETADO'] || 0,
    viendo: porEstado['VIENDO'] || 0,
    favoritos,
    rangoMasComun,
  };
};
