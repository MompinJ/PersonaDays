import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Servicio de recordatorios locales por "bloques de rutina".
// El usuario configura unos pocos horarios (manana/tarde/noche); cada bloque
// activo agenda UNA notificacion local diaria que lo invita a abrir la app y
// revisar sus misiones. Sin push remoto (no requiere dev build; corre en Expo Go).
//
// La config vive en AsyncStorage (no SQLite). La fuente de verdad de lo agendado
// es esta config: syncRoutineReminders() cancela todo y reagenda desde aqui, asi
// que no hace falta trackear ids de notificacion.

const STORAGE_KEY = 'NOTIF_CONFIG';
const ANDROID_CHANNEL = 'reminders';

export interface RoutineBlock {
  id: string;
  label: string;   // titulo de la notificacion
  hour: number;    // 0-23
  minute: number;  // 0-59
  enabled: boolean;
}

export interface NotifConfig {
  enabled: boolean;       // master switch
  blocks: RoutineBlock[];
}

export const DEFAULT_CONFIG: NotifConfig = {
  enabled: false,
  blocks: [
    { id: 'manana', label: 'Rutina de la mañana', hour: 8, minute: 0, enabled: true },
    { id: 'tarde', label: 'Rutina de la tarde', hour: 14, minute: 0, enabled: true },
    { id: 'noche', label: 'Rutina de la noche', hour: 21, minute: 0, enabled: true },
  ],
};

const REMINDER_BODY = 'Toca para revisar tus misiones de hoy.';

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
    return {
      enabled: !!parsed.enabled,
      blocks: Array.isArray(parsed.blocks) && parsed.blocks.length > 0 ? parsed.blocks : DEFAULT_CONFIG.blocks,
    };
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

/**
 * Cancela todo lo agendado y reagenda desde la config: un trigger diario por
 * bloque activo, solo si el master esta encendido y hay permiso. Devuelve cuantas
 * notificaciones quedaron agendadas.
 */
export const syncRoutineReminders = async (cfg?: NotifConfig): Promise<number> => {
  const config = cfg || (await loadConfig());

  // Siempre limpiamos primero: la config es la fuente de verdad.
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (!config.enabled) return 0;
  if (!(await hasPermission())) return 0;

  let scheduled = 0;
  for (const block of config.blocks) {
    if (!block.enabled) continue;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: block.label,
        body: REMINDER_BODY,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: block.hour,
        minute: block.minute,
        channelId: ANDROID_CHANNEL,
      },
    });
    scheduled += 1;
  }
  return scheduled;
};
