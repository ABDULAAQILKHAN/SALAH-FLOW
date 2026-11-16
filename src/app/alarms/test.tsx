import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Header } from '../../components/common/Header';
import { Button } from '../../components/common/Button';
import { alarmPermissions, AlarmPermissionStatus } from '../../services/alarms/alarmPermissions';
import { alarmManager } from '../../services/alarms/alarmManager';
import { alarmRescheduler } from '../../services/alarms/alarmRescheduler';
import { notificationService } from '../../services/notifications/notificationService';
import { colors, typography, spacing, borderRadius } from '../../theme';
import * as Notifications from 'expo-notifications';

export default function AlarmTestScreen() {
  const [permissionStatus, setPermissionStatus] = useState<AlarmPermissionStatus | null>(null);
  const [scheduledList, setScheduledList] = useState<Notifications.NotificationRequest[]>([]);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const checkStatus = async () => {
    const status = await alarmPermissions.checkPermissions();
    setPermissionStatus(status);
    const scheduled = await notificationService.getAllScheduled();
    setScheduledList(scheduled);
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleRequestPermission = async () => {
    await alarmPermissions.requestNotificationPermissions();
    await checkStatus();
  };

  const handleOpenSettings = async () => {
    await alarmPermissions.openSystemSettings();
  };

  const handleTriggerTestAlarm = async (delaySeconds: number) => {
    setTesting(true);
    setTestResult(null);
    try {
      const id = await alarmManager.testTriggerAlarm('SalahFlow Exact Alarm Diagnostic', delaySeconds);
      setTestResult(`Test alarm scheduled! It will fire in ${delaySeconds} seconds. Identifier: ${id}`);
      await checkStatus();
    } catch (e: any) {
      setTestResult(`Failed to schedule test alarm: ${e?.message}`);
    } finally {
      setTesting(false);
    }
  };

  const handleForceResync = async () => {
    const res = await alarmRescheduler.rescheduleAll();
    Alert.alert('Resynchronization Complete', `Scheduled: ${res.scheduledCount}, Cancelled/Updated: ${res.cancelledCount}`);
    await checkStatus();
  };

  const handleClearAll = async () => {
    await notificationService.cancelAllNotifications();
    Alert.alert('Cleared', 'All pending notifications and alarms cleared.');
    await checkStatus();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Alarm Diagnostics & Test" subtitle="Exact Alarm System Inspector" showBack={true} />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Permission Status Card */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Android System Permissions</Text>

          <View style={styles.statusRow}>
            <MaterialCommunityIcons
              name={permissionStatus?.notificationsGranted ? 'check-circle' : 'alert-circle'}
              size={20}
              color={permissionStatus?.notificationsGranted ? colors.primary : colors.warning}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.statusLabel}>Notification Permission (POST_NOTIFICATIONS)</Text>
              <Text style={styles.statusSub}>
                {permissionStatus?.notificationsGranted ? 'Granted' : 'Not Granted / Denied'}
              </Text>
            </View>
          </View>

          <View style={styles.statusRow}>
            <MaterialCommunityIcons
              name={permissionStatus?.canScheduleExactAlarms ? 'check-circle' : 'alert-circle'}
              size={20}
              color={permissionStatus?.canScheduleExactAlarms ? colors.primary : colors.warning}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.statusLabel}>Exact Alarm APIs (SCHEDULE_EXACT_ALARM)</Text>
              <Text style={styles.statusSub}>
                {permissionStatus?.canScheduleExactAlarms ? 'Available / Configured' : 'Restricted'}
              </Text>
            </View>
          </View>

          {/* Recommendations */}
          {permissionStatus?.recommendations.map((rec, index) => (
            <View key={index} style={styles.recBox}>
              <MaterialCommunityIcons name="information-outline" size={16} color={colors.gold} />
              <Text style={styles.recText}>{rec}</Text>
            </View>
          ))}

          <View style={styles.btnRow}>
            {!permissionStatus?.notificationsGranted && (
              <Button
                title="Request Permissions"
                onPress={handleRequestPermission}
                size="sm"
                variant="primary"
                style={{ flex: 1 }}
              />
            )}
            <Button
              title="Open System Settings"
              onPress={handleOpenSettings}
              size="sm"
              variant="outline"
              style={{ flex: 1 }}
            />
          </View>
        </View>

        {/* Live Alarm Trigger Test Card */}
        <View style={styles.cardHighlight}>
          <Text style={styles.highlightHeader}>Live Exact Alarm Test</Text>
          <Text style={styles.highlightSub}>
            Trigger a real Android notification/alarm with high priority sound and vibration to verify delivery.
          </Text>

          <View style={styles.btnRow}>
            <Button
              title="Test in 5 Seconds"
              onPress={() => handleTriggerTestAlarm(5)}
              loading={testing}
              variant="primary"
              size="md"
              icon="timer-sand"
              style={{ flex: 1 }}
            />

            <Button
              title="Test in 15 Seconds"
              onPress={() => handleTriggerTestAlarm(15)}
              loading={testing}
              variant="secondary"
              size="md"
              icon="timer-sand-full"
              style={{ flex: 1 }}
            />
          </View>

          {testResult && (
            <View style={styles.testResultBox}>
              <Text style={styles.testResultText}>{testResult}</Text>
            </View>
          )}
        </View>

        {/* Active Alarms & Reminders in System */}
        <View style={styles.card}>
          <View style={styles.tableHeader}>
            <View>
              <Text style={styles.sectionHeader}>Active System Alarms</Text>
              <Text style={styles.statusSub}>
                {scheduledList.length} scheduled notification(s) registered
              </Text>
            </View>

            <TouchableOpacity onPress={handleForceResync} style={styles.resyncBtn}>
              <MaterialCommunityIcons name="sync" size={16} color={colors.primary} />
              <Text style={styles.resyncBtnText}>Re-Sync</Text>
            </TouchableOpacity>
          </View>

          {scheduledList.length === 0 ? (
            <Text style={styles.emptyText}>
              No pending alarms registered. Enable alarms in tasks or click "Re-Sync".
            </Text>
          ) : (
            scheduledList.map((item) => (
              <View key={item.identifier} style={styles.alarmItem}>
                <View style={styles.alarmItemLeft}>
                  <MaterialCommunityIcons
                    name={item.identifier.startsWith('alarm_') ? 'alarm' : 'bell-ring'}
                    size={18}
                    color={item.identifier.startsWith('alarm_') ? colors.primary : colors.gold}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.alarmItemTitle}>{item.content.title}</Text>
                    <Text style={styles.alarmItemSub} numberOfLines={1}>
                      ID: {item.identifier}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}

          {scheduledList.length > 0 && (
            <Button
              title="Cancel All Pending Alarms"
              onPress={handleClearAll}
              variant="danger"
              size="sm"
              icon="trash-can-outline"
              style={{ marginTop: spacing.md }}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  cardHighlight: {
    backgroundColor: '#0F201C',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  highlightHeader: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.primaryLight,
  },
  highlightSub: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  sectionHeader: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  statusLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  statusSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  recBox: {
    flexDirection: 'row',
    backgroundColor: colors.goldMuted,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    marginTop: spacing.xs,
    alignItems: 'center',
  },
  recText: {
    fontSize: 10,
    color: colors.gold,
    flex: 1,
    lineHeight: 14,
  },
  btnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  testResultBox: {
    backgroundColor: colors.surfaceHighlight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  testResultText: {
    fontSize: typography.fontSize.xs,
    color: colors.primaryLight,
    lineHeight: 18,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  resyncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryMuted,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  resyncBtnText: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    color: colors.primaryLight,
  },
  emptyText: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    fontStyle: 'italic',
    paddingVertical: spacing.md,
  },
  alarmItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  alarmItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  alarmItemTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  alarmItemSub: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
});
