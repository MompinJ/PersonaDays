import * as FileSystem from 'expo-file-system/legacy';
import { db } from '../database';
import { ArcoFoto } from '../types';

// Galeria de fotos por arco. Las imagenes se COPIAN al documentDirectory (las URIs
// del picker son efimeras) y en la DB se guarda SOLO el nombre relativo: el prefijo
// absoluto de documentDirectory puede cambiar entre reinstalaciones/updates del OS,
// asi que la ruta se reconstruye al leer.

const PHOTO_DIR = FileSystem.documentDirectory + 'arc_photos/';

const ensureDir = async () => {
  const info = await FileSystem.getInfoAsync(PHOTO_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PHOTO_DIR, { intermediates: true });
  }
};

// Reconstruye la ruta absoluta a partir del nombre relativo guardado.
export const arcPhotoUri = (archivo: string) => PHOTO_DIR + archivo;

export interface ArcPhotoView extends ArcoFoto {
  uri: string;     // ruta absoluta reconstruida
  exists: boolean; // el archivo sigue en disco (un backup restaurado puede no traerlo)
}

/** Fotos de un arco con su ruta absoluta y si el archivo existe en disco. */
export const getArcPhotos = async (idArco: number): Promise<ArcPhotoView[]> => {
  const rows: ArcoFoto[] = await db.getAllAsync(
    'SELECT id_foto, id_arco, archivo, fecha, caption FROM arco_fotos WHERE id_arco = ? ORDER BY id_foto DESC',
    [idArco]
  );
  const out: ArcPhotoView[] = [];
  for (const r of rows || []) {
    const uri = arcPhotoUri(r.archivo);
    let exists = false;
    try { exists = (await FileSystem.getInfoAsync(uri)).exists; } catch (e) { exists = false; }
    out.push({ ...r, uri, exists });
  }
  return out;
};

/**
 * Copia la imagen elegida (sourceUri del picker) al directorio de fotos y registra
 * la fila. Devuelve la vista de la foto creada.
 */
export const addArcPhoto = async (idArco: number, sourceUri: string): Promise<ArcPhotoView> => {
  await ensureDir();
  const extMatch = /\.(\w+)(?:\?.*)?$/.exec(sourceUri);
  const ext = extMatch ? extMatch[1] : 'jpg';
  const archivo = `arco_${idArco}_${Date.now()}.${ext}`;
  const dest = arcPhotoUri(archivo);
  await FileSystem.copyAsync({ from: sourceUri, to: dest });

  const fecha = new Date().toISOString().slice(0, 10);
  const res: any = await db.runAsync(
    'INSERT INTO arco_fotos (id_arco, archivo, fecha) VALUES (?, ?, ?)',
    [idArco, archivo, fecha]
  );
  return { id_foto: res.lastInsertRowId, id_arco: idArco, archivo, fecha, uri: dest, exists: true };
};

/** Borra la foto: archivo en disco (idempotente) + fila en la DB. */
export const deleteArcPhoto = async (foto: ArcPhotoView): Promise<void> => {
  try { await FileSystem.deleteAsync(foto.uri, { idempotent: true }); } catch (e) { /* noop */ }
  await db.runAsync('DELETE FROM arco_fotos WHERE id_foto = ?', [foto.id_foto]);
};
