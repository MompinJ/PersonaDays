import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../database';

// Servicio de recordatorios locales POR MISION.
// Cada mision con hora (hora_mision 'HH:MM') y notificar = 1 agenda una
// notificacion local a esa hora. Sin push remoto (corre en Expo Go).
//
// La fuente de verdad es la DB: syncMissionReminders() cancela todo lo agendado
// y reagenda desde el query de misiones pendientes, asi que no hace falta
// trackear ids de notificacion. Se llama al arrancar y tras crear / editar /
// borrar / completar / revertir misiones y al tocar el master switch.
//
// La config (master switch) vive en AsyncStorage con la MISMA clave que el
// sistema anterior de "bloques de rutina": el enabled del usuario se conserva
// y los bloques viejos se ignoran (el primer sync cancela sus notificaciones).

const STORAGE_KEY = 'NOTIF_CONFIG';
const ANDROID_CHANNEL = 'reminders';

export interface NotifConfig {
  enabled: boolean; // master switch
}

export const DEFAULT_CONFIG: NotifConfig = {
  enabled: false,
};

const REMINDER_BODY = 'Toca para completar tu encargo.';

// Limite defensivo: iOS permite ~64 notificaciones locales agendadas.
const MAX_SCHEDULED = 60;

let handlerSet = false;

/**
 * Setup global (una vez al arranque): handler de foreground + canal Android.
 * Idempotente.
 */
export const initNotifications = async (): Promise<void> => {
  if (!handlerSet) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    handlerSet = true;
  }
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
        name: 'Recordatorios',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
      });
    } catch (e) {
      console.warn('No se pudo crear el canal de notificaciones:', e);
    }
  }
};

/** Lee la config (con defaults si no existe o esta corrupta). */
export const loadConfig = async (): Promise<NotifConfig> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);
    // La config vieja traia tambien 'blocks'; solo nos importa el master.
    return { enabled: !!parsed.enabled };
  } catch (e) {
    console.warn('Error leyendo config de notificaciones, usando defaults:', e);
    return DEFAULT_CONFIG;
  }
};

/** Persiste la config. */
export const saveConfig = async (cfg: NotifConfig): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch (e) {
    console.warn('Error guardando config de notificaciones:', e);
  }
};

/** True si ya hay permiso de notificaciones concedido. */
export const hasPermission = async (): Promise<boolean> => {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
};

/** Pide permiso si hace falta. Devuelve si quedo concedido. */
export const requestPermission = async (): Promise<boolean> => {
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.status === 'granted';
};

// 'HH:MM' -> {hour, minute}; null si el formato no es valido
const parseHora = (v?: string | null): { hour: number; minute: number } | null => {
  if (!v) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(v).trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
};

/**
 * Cancela todo lo agendado y reagenda desde la DB: misiones activas, no
 * completadas, con hora y notificar = 1. Devuelve cuantas notificaciones
 * quedaron agendadas.
 *
 * Triggers por tipo:
 *  - DIARIA con todos los dias (o sin dias) -> un trigger DAILY.
 *  - DIARIA con dias parciales -> un trigger WEEKLY por dia marcado
 *    (dias_repeticion guarda indices getDay() 0=Dom; expo usa weekday 1=Dom).
 *  - SEMANAL/ARCO/EXTRA/BOSS -> trigger DAILY a esa hora mientras sigan
 *    pendientes: actua como recordatorio insistente y el propio resync lo
 *    cancela al completarse/borrarse la mision.
 */
export const syncMissionReminders = async (): Promise<number> => {
  // Siempre limpiamos primero: la DB es la fuente de verdad. Esto tambien
  // cancela las notificaciones del sistema viejo de bloques de rutina.
  await Notifications.cancelAllScheduledNotificationsAsync();

  const config = await loadConfig();
  if (!config.enabled) return 0;
  if (!(await hasPermission())) return 0;

  let missions: any[] = [];
  try {
    // DIARIA primero: si chocamos con el tope, se priorizan las recurrentes.
    missions = await db.getAllAsync(
      `SELECT id_mision, nombre, tipo, dias_repeticion, hora_mision
       FROM misiones
       WHERE activa = 1 AND completada = 0 AND notificar = 1 AND hora_mision IS NOT NULL
       ORDER BY CASE WHEN tipo = 'DIARIA' THEN 0 ELSE 1 END, hora_mision ASC`
    );
  } catch (e) {
    console.error('Error leyendo misiones para notificaciones:', e);
    return 0;
  }

  let scheduled = 0;
  for (const m of missions) {
    if (scheduled >= MAX_SCHEDULED) {
      console.warn(`Tope de ${MAX_SCHEDULED} notificaciones alcanzado; el resto no se agenda.`);
      break;
    }
    const hm = parseHora(m.hora_mision);
    if (!hm) continue;

    const content = {
      title: m.nombre,
      body: REMINDER_BODY,
    };

    const dias = String(m.dias_repeticion || '')
      .split(',')
      .map((d: string) => parseInt(d.trim(), 10))
      .filter((d: number) => !isNaN(d) && d >= 0 && d <= 6);

    try {
      if (m.tipo === 'DIARIA' && dias.length > 0 && dias.length < 7) {
        // Un trigger semanal por dia marcado
        for (const d of dias) {
          if (scheduled >= MAX_SCHEDULED) break;
          await Notifications.scheduleNotificationAsync({
            content,
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
              weekday: d + 1, // getDay() 0=Dom -> expo 1=Dom
              hour: hm.hour,
              minute: hm.minute,
              channelId: ANDROID_CHANNEL,
            },
          });
          scheduled += 1;
        }
      } else {
        await Notifications.scheduleNotificationAsync({
          content,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: hm.hour,
            minute: hm.minute,
            channelId: ANDROID_CHANNEL,
          },
        });
        scheduled += 1;
      }
    } catch (e) {
      console.error(`Error agendando notificacion de la mision ${m.id_mision}:`, e);
    }
  }
  return scheduled;
};
