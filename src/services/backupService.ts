import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { db } from '../database';

// Respaldo/restauracion de TODA la app: copia/reemplaza el archivo SQLite
// completo (misiones, logs, stats, arcanos, finanzas, notas...). El .db crudo es
// el respaldo mas fiel; al restaurar, initDatabase migra el schema si hace falta.

const DB_NAME = 'personadays.db';
const dbPath = () => `${FileSystem.documentDirectory}SQLite/${DB_NAME}`;

const pad = (n: number) => (n < 10 ? '0' + n : '' + n);
const stamp = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
};

// Cabecera de todo archivo SQLite ("SQLite format 3\0"); en base64 empieza asi.
const SQLITE_B64_PREFIX = 'U1FMaXRlIGZvcm1hdCAz';

export type BackupResult = { ok: true } | { ok: false; reason: string; canceled?: boolean };

/** Exporta un respaldo: vuelca el WAL, copia el .db y abre la hoja de compartir. */
export const exportBackup = async (): Promise<BackupResult> => {
  try {
    // Volcar el WAL al archivo principal para que el respaldo este completo.
    try { await db.execAsync('PRAGMA wal_checkpoint(FULL);'); } catch (e) { /* sin WAL */ }

    const src = dbPath();
    const info = await FileSystem.getInfoAsync(src);
    if (!info.exists) return { ok: false, reason: 'No se encontró la base de datos.' };

    const dest = `${FileSystem.cacheDirectory}personadays-backup-${stamp()}.db`;
    await FileSystem.deleteAsync(dest, { idempotent: true });
    await FileSystem.copyAsync({ from: src, to: dest });

    if (!(await Sharing.isAvailableAsync())) {
      return { ok: false, reason: 'Compartir no está disponible en este dispositivo.' };
    }
    await Sharing.shareAsync(dest, {
      mimeType: 'application/octet-stream',
      dialogTitle: 'Respaldo de PersonaDays',
      UTI: 'public.database',
    });
    return { ok: true };
  } catch (e: any) {
    console.error('Error exportando respaldo:', e);
    return { ok: false, reason: e?.message || 'Error al exportar.' };
  }
};

/**
 * Restaura desde un archivo elegido por el usuario. Valida que sea SQLite,
 * cierra la conexion, reemplaza el .db (y borra sidecars WAL/SHM). Tras un ok,
 * el caller DEBE recargar la app (la conexion quedo cerrada y el archivo cambio).
 */
export const importBackup = async (): Promise<BackupResult> => {
  try {
    const picked = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, type: '*/*' });
    if (picked.canceled) return { ok: false, reason: '', canceled: true };
    const asset = picked.assets && picked.assets[0];
    if (!asset?.uri) return { ok: false, reason: 'No se pudo leer el archivo.' };

    // Validacion ligera: cabecera SQLite.
    const head = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.Base64,
      position: 0,
      length: 16,
    });
    if (!head.startsWith(SQLITE_B64_PREFIX)) {
      return { ok: false, reason: 'El archivo no es un respaldo válido de PersonaDays.' };
    }

    const target = dbPath();
    try { await db.closeAsync(); } catch (e) { /* ya cerrada / ignore */ }
    for (const suffix of ['', '-wal', '-shm']) {
      try { await FileSystem.deleteAsync(target + suffix, { idempotent: true }); } catch (e) { /* ignore */ }
    }
    await FileSystem.copyAsync({ from: asset.uri, to: target });
    return { ok: true };
  } catch (e: any) {
    console.error('Error restaurando respaldo:', e);
    return { ok: false, reason: e?.message || 'Error al restaurar.' };
  }
};
