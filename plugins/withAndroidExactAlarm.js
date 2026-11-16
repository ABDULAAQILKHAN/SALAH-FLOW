const { withAndroidManifest } = require('expo/config-plugins');

const withAndroidExactAlarm = (config) => {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults.manifest;

    // Ensure permissions array exists
    if (!androidManifest['uses-permission']) {
      androidManifest['uses-permission'] = [];
    }

    const permissionsToAdd = [
      'android.permission.SCHEDULE_EXACT_ALARM',
      'android.permission.USE_EXACT_ALARM',
      'android.permission.RECEIVE_BOOT_COMPLETED',
      'android.permission.WAKE_LOCK',
      'android.permission.VIBRATE',
      'android.permission.POST_NOTIFICATIONS',
    ];

    permissionsToAdd.forEach((permission) => {
      const exists = androidManifest['uses-permission'].some(
        (p) => p.$?.['android:name'] === permission
      );
      if (!exists) {
        androidManifest['uses-permission'].push({
          $: { 'android:name': permission },
        });
      }
    });

    // Ensure application block exists
    if (androidManifest.application && androidManifest.application[0]) {
      const app = androidManifest.application[0];
      if (!app.receiver) {
        app.receiver = [];
      }

      // Check if BootReceiver already added
      const bootReceiverExists = app.receiver.some(
        (r) => r.$?.['android:name'] === '.BootReceiver'
      );

      if (!bootReceiverExists) {
        app.receiver.push({
          $: {
            'android:name': '.BootReceiver',
            'android:enabled': 'true',
            'android:exported': 'true',
          },
          'intent-filter': [
            {
              action: [
                { $: { 'android:name': 'android.intent.action.BOOT_COMPLETED' } },
                { $: { 'android:name': 'android.intent.action.QUICKBOOT_POWERON' } },
                { $: { 'android:name': 'android.intent.action.TIME_SET' } },
                { $: { 'android:name': 'android.intent.action.TIMEZONE_CHANGED' } },
              ],
            },
          ],
        });
      }
    }

    return config;
  });
};

module.exports = withAndroidExactAlarm;
