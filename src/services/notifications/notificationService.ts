import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure default notification handler for foreground presentation
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

export const NOTIFICATION_CHANNELS = {
  ALARMS: 'salahflow_alarms',
  REMINDERS: 'salahflow_reminders',
  PRAYERS_ADHAN: 'salahflow_prayers_adhan',
  PRAYERS_CHIME: 'salahflow_prayers_chime',
  PRAYERS_BIRDS: 'salahflow_prayers_birds',
  PRAYERS_BELL: 'salahflow_prayers_bell',
  PRAYERS_DEFAULT: 'salahflow_prayers_default',
};

export function getChannelForTone(toneId?: string): string {
  switch (toneId) {
    case 'peaceful_adhan':
      return NOTIFICATION_CHANNELS.PRAYERS_ADHAN;
    case 'soft_chime':
      return NOTIFICATION_CHANNELS.PRAYERS_CHIME;
    case 'dawn_birds':
      return NOTIFICATION_CHANNELS.PRAYERS_BIRDS;
    case 'calm_bell':
      return NOTIFICATION_CHANNELS.PRAYERS_BELL;
    default:
      return NOTIFICATION_CHANNELS.PRAYERS_DEFAULT;
  }
}

export function getSoundFilename(toneId?: string): string {
  switch (toneId) {
    case 'peaceful_adhan':
      return 'peaceful_adhan.wav';
    case 'soft_chime':
      return 'soft_chime.wav';
    case 'dawn_birds':
      return 'dawn_birds.wav';
    case 'calm_bell':
      return 'calm_bell.wav';
    default:
      return 'default';
  }
}

export const notificationService = {
  async setupChannels(): Promise<void> {
    if (Platform.OS !== 'android') return;

    try {
      // Channel 1: High Priority Alarms (Exact / Critical)
      await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.ALARMS, {
        name: 'Task Alarms',
        description: 'Critical exact alarms for scheduled activities and prayers',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500, 250, 1000],
        enableVibrate: true,
        enableLights: true,
        lightColor: '#10B981',
        bypassDnd: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    } catch (e) {
      console.warn('Failed to set alarms notification channel:', e);
    }

    try {
      // Channel 2: Advance Reminders (e.g. 10 mins before)
      await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.REMINDERS, {
        name: 'Advance Reminders',
        description: 'Notifications sent ahead of scheduled tasks',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        enableVibrate: true,
        enableLights: true,
        lightColor: '#0EA5E9',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    } catch (e) {
      console.warn('Failed to set reminders notification channel:', e);
    }

    // Peaceful Prayer Alarm Channels
    const prayerChannels = [
      {
        id: NOTIFICATION_CHANNELS.PRAYERS_ADHAN,
        name: 'Prayer Alarm (Peaceful Adhan)',
        sound: 'peaceful_adhan.wav',
      },
      {
        id: NOTIFICATION_CHANNELS.PRAYERS_CHIME,
        name: 'Prayer Alarm (Soft Chime)',
        sound: 'soft_chime.wav',
      },
      {
        id: NOTIFICATION_CHANNELS.PRAYERS_BIRDS,
        name: 'Prayer Alarm (Morning Birds)',
        sound: 'dawn_birds.wav',
      },
      {
        id: NOTIFICATION_CHANNELS.PRAYERS_BELL,
        name: 'Prayer Alarm (Calm Bell)',
        sound: 'calm_bell.wav',
      },
      {
        id: NOTIFICATION_CHANNELS.PRAYERS_DEFAULT,
        name: 'Prayer Alarm (Default Tone)',
        sound: undefined,
      },
    ];

    for (const ch of prayerChannels) {
      try {
        await Notifications.setNotificationChannelAsync(ch.id, {
          name: ch.name,
          description: 'Audible prayer call for obligatory Salah and Tahajjud',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 200, 500, 200, 1000],
          enableVibrate: true,
          enableLights: true,
          lightColor: '#10B981',
          bypassDnd: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          ...(ch.sound ? { sound: ch.sound } : {}),
        });
      } catch (e) {
        console.warn(`Failed to set channel ${ch.id}:`, e);
      }
    }
  },

  async scheduleNotification(params: {
    identifier: string;
    title: string;
    body: string;
    triggerDate: Date;
    channelId: string;
    soundName?: string;
    data?: Record<string, any>;
  }): Promise<string> {
    // If the trigger date is in the past, do not schedule
    if (params.triggerDate.getTime() <= Date.now()) {
      return '';
    }

    // Cancel any previous notification with the same identifier to prevent duplicates
    try {
      await Notifications.cancelScheduledNotificationAsync(params.identifier);
    } catch {
      // Ignore if not present
    }

    const sound = params.soundName && params.soundName !== 'default'
      ? params.soundName
      : 'default';

    return await Notifications.scheduleNotificationAsync({
      identifier: params.identifier,
      content: {
        title: params.title,
        body: params.body,
        sound,
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 500, 250, 500],
        data: params.data || {},
        ...(Platform.OS === 'android' ? { channelId: params.channelId } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: params.triggerDate,
      },
    });
  },

  async sendImmediateNotification(params: {
    title: string;
    body: string;
    channelId?: string;
    data?: Record<string, any>;
  }): Promise<string> {
    try {
      return await Notifications.scheduleNotificationAsync({
        content: {
          title: params.title,
          body: params.body,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: params.data || {},
          ...(Platform.OS === 'android' ? { channelId: params.channelId || NOTIFICATION_CHANNELS.REMINDERS } : {}),
        },
        trigger: null,
      });
    } catch (e) {
      console.warn('Failed to send immediate notification:', e);
      return '';
    }
  },

  async cancelNotification(identifier: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch (e) {
      console.warn(`Failed to cancel notification ${identifier}:`, e);
    }
  },

  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },

  async getAllScheduled(): Promise<Notifications.NotificationRequest[]> {
    return await Notifications.getAllScheduledNotificationsAsync();
  },
};
