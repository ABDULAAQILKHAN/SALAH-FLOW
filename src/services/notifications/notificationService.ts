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
  PRAYERS: 'salahflow_prayers',
};

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
      });
    } catch (e) {
      console.warn('Failed to set reminders notification channel:', e);
    }

    try {
      // Channel 3: Salah Reminders
      await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.PRAYERS, {
        name: 'Prayer Calls',
        description: 'Notifications for the 5 daily prayers and Tahajjud',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 400, 200, 400],
        enableVibrate: true,
        enableLights: true,
        lightColor: '#10B981',
      });
    } catch (e) {
      console.warn('Failed to set prayers notification channel:', e);
    }
  },

  async scheduleNotification(params: {
    identifier: string;
    title: string;
    body: string;
    triggerDate: Date;
    channelId: string;
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

    return await Notifications.scheduleNotificationAsync({
      identifier: params.identifier,
      content: {
        title: params.title,
        body: params.body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        data: params.data || {},
        ...(Platform.OS === 'android' ? { channelId: params.channelId } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: params.triggerDate,
      },
    });
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
