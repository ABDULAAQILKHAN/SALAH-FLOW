import * as Notifications from 'expo-notifications';
import { Platform, Linking } from 'react-native';

export interface AlarmPermissionStatus {
  notificationsGranted: boolean;
  canScheduleExactAlarms: boolean;
  canAskAgain: boolean;
  statusText: string;
  isRestricted: boolean;
  recommendations: string[];
}

export const alarmPermissions = {
  async checkPermissions(): Promise<AlarmPermissionStatus> {
    const recommendations: string[] = [];
    let notificationsGranted = false;
    let canAskAgain = true;

    try {
      const permissions = await Notifications.getPermissionsAsync();
      notificationsGranted =
        permissions.granted ||
        permissions.status === 'granted' ||
        permissions.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED;
      canAskAgain = permissions.canAskAgain;

      if (!notificationsGranted) {
        recommendations.push(
          'Grant notification permissions so SalahFlow can alert you when prayer and task times arrive.'
        );
      }
    } catch (e) {
      console.warn('Failed to query notification permissions:', e);
    }

    let canScheduleExactAlarms = true;
    let isRestricted = false;

    if (Platform.OS === 'android') {
      const androidVersion = Platform.Version;
      // Android 12 is API 31, Android 13 is API 33
      if (typeof androidVersion === 'number' && androidVersion >= 31) {
        // In Android 12+, exact alarms might be restricted by OEM or battery settings
        recommendations.push(
          'Ensure "Allow setting alarms and reminders" is toggled ON in Android System Settings for accurate timings.'
        );
      }
      recommendations.push(
        'Disable battery optimization for SalahFlow to prevent background Doze mode from delaying alarms.'
      );
    }

    const statusText = notificationsGranted
      ? 'Permissions configured. Alarms active.'
      : 'Notifications permission needed for prayer alarms.';

    return {
      notificationsGranted,
      canScheduleExactAlarms,
      canAskAgain,
      statusText,
      isRestricted,
      recommendations,
    };
  },

  async requestNotificationPermissions(): Promise<boolean> {
    try {
      const result = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });

      return (
        result.granted ||
        result.status === 'granted' ||
        result.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED
      );
    } catch (e) {
      console.warn('Error requesting permissions:', e);
      return false;
    }
  },

  async openSystemSettings(): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        // Opens the application details settings
        await Linking.openSettings();
      } else {
        await Linking.openURL('app-settings:');
      }
    } catch (e) {
      console.warn('Failed to open app settings:', e);
    }
  },
};
