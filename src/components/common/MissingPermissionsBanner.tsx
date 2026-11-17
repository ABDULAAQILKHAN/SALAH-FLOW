import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { alarmPermissions, AlarmPermissionStatus } from '../../services/alarms/alarmPermissions';

interface MissingPermissionsBannerProps {
  onStatusChange?: (status: AlarmPermissionStatus) => void;
}

export const MissingPermissionsBanner: React.FC<MissingPermissionsBannerProps> = ({
  onStatusChange,
}) => {
  const [status, setStatus] = useState<AlarmPermissionStatus | null>(null);
  const [requesting, setRequesting] = useState(false);

  const check = async () => {
    const s = await alarmPermissions.checkPermissions();
    setStatus(s);
    onStatusChange?.(s);
  };

  useEffect(() => {
    check();
  }, []);

  if (!status || status.notificationsGranted) {
    return null; // All required permissions are granted!
  }

  const handleFixPermission = async () => {
    setRequesting(true);
    try {
      if (status.canAskAgain) {
        await alarmPermissions.requestNotificationPermissions();
      } else {
        await alarmPermissions.openSystemSettings();
      }
      await check();
    } catch {
      await alarmPermissions.openSystemSettings();
    } finally {
      setRequesting(false);
    }
  };

  return (
    <View style={styles.banner}>
      <View style={styles.iconCircle}>
        <MaterialCommunityIcons name="bell-alert-outline" size={20} color={colors.warning} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>Notification Permission Missing</Text>
        <Text style={styles.description}>
          Prayer calls, alarms, and advance reminders cannot ring or vibrate until notification
          access is granted.
        </Text>
      </View>
      <TouchableOpacity
        style={styles.actionBtn}
        onPress={handleFixPermission}
        disabled={requesting}
        activeOpacity={0.8}
      >
        <Text style={styles.actionBtnText}>{requesting ? 'Checking...' : 'Enable'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.gold,
  },
  description: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  actionBtn: {
    backgroundColor: colors.warning,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.sm,
    alignSelf: 'center',
  },
  actionBtnText: {
    color: '#000000',
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.xs,
  },
});
