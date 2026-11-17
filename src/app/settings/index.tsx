import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Header } from '../../components/common/Header';
import { Button } from '../../components/common/Button';
import { usePrayerStore } from '../../store/usePrayerStore';
import { useScheduleStore } from '../../store/useScheduleStore';
import { locationService } from '../../services/location/locationService';
import { alarmPermissions } from '../../services/alarms/alarmPermissions';
import { alarmManager } from '../../services/alarms/alarmManager';
import { notificationService } from '../../services/notifications/notificationService';
import { backupService } from '../../services/backup/backupService';
import { resetDatabase } from '../../database';
import { phaseEngine } from '../../services/scheduling/phaseEngine';
import { MissingPermissionsBanner } from '../../components/common/MissingPermissionsBanner';
import { colors, typography, spacing, borderRadius } from '../../theme';
import {
  CALCULATION_METHODS,
  POPULAR_LOCATIONS,
} from '../../constants/prayers';

export default function SettingsScreen() {
  const { location, prayerConfig, updateLocation, updatePrayerConfig, refreshTimings, loadSettings } = usePrayerStore();
  const { loadSchedule, selectedDate } = useScheduleStore();

  const [detectingGps, setDetectingGps] = useState(false);
  const [cityPickerVisible, setCityPickerVisible] = useState(false);
  const [methodPickerVisible, setMethodPickerVisible] = useState(false);
  const [testingAlarm, setTestingAlarm] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const handleQuickTestAlarm = async () => {
    setTestingAlarm(true);
    try {
      await alarmPermissions.requestNotificationPermissions();
      await alarmManager.testTriggerAlarm('SalahFlow Prayer Alarm Test', 5);
      Alert.alert(
        'Test Alarm Scheduled',
        'An audible alarm with vibration will ring in 5 seconds! Keep your device on or lock it to test lockscreen delivery.'
      );
    } catch (e: any) {
      Alert.alert('Alarm Error', e?.message || 'Could not schedule test alarm.');
    } finally {
      setTestingAlarm(false);
    }
  };

  const handleDetectGps = async () => {
    setDetectingGps(true);
    try {
      const loc = await locationService.getCurrentLocation();
      await updateLocation(loc);
      const timings = await refreshTimings();
      await loadSchedule(selectedDate, timings);
      Alert.alert('Location Updated', `Coordinates set to ${loc.cityName}, ${loc.countryName}`);
    } catch {
      Alert.alert('GPS Error', 'Could not obtain GPS location.');
    } finally {
      setDetectingGps(false);
    }
  };

  const handleToggleHanafi = async (val: boolean) => {
    const updated = {
      ...prayerConfig,
      asrMethod: val ? ('hanafi' as const) : ('standard' as const),
    };
    await updatePrayerConfig(updated);
    const timings = await refreshTimings();
    await loadSchedule(selectedDate, timings);
  };

  const handleSelectMethod = async (methodId: string) => {
    const updated = { ...prayerConfig, method: methodId };
    await updatePrayerConfig(updated);
    setMethodPickerVisible(false);
    const timings = await refreshTimings();
    await loadSchedule(selectedDate, timings);
  };

  const handleExportBackup = async () => {
    setExporting(true);
    try {
      // 1. Notify that data export / download has started
      await notificationService.sendImmediateNotification({
        title: '📥 Downloading SalahFlow Data...',
        body: `Exporting routines, manual prayer timings, and alarms for ${location.cityName}...`,
      });

      // 2. Perform export to Downloads / SalahFlow Data folder
      const result = await backupService.exportToDownloadsFolder();

      // 3. Notify that download is complete
      await notificationService.sendImmediateNotification({
        title: '✅ SalahFlow Data Downloaded',
        body: `Saved ${result.fileName} in ${result.folderName}.`,
      });

      // 4. Show success alert with detailed location
      Alert.alert(
        'Backup Exported Successfully',
        `📁 Folder: ${result.folderName}\n📄 File: ${result.fileName}\n📍 City: ${result.city}\n📋 Tasks: ${result.taskCount} tasks across ${result.phaseCount} phases\n\nYour file is located in the "SalahFlow Data" folder inside your device's Downloads. You can share or restore it anytime.`
      );
    } catch (e: any) {
      Alert.alert('Export Failed', e?.message || 'Could not export data.');
    } finally {
      setExporting(false);
    }
  };

  const handleRestoreBackup = async () => {
    try {
      const picked = await backupService.pickBackupFile();
      if (!picked) {
        return;
      }

      let parsed: any;
      try {
        parsed = JSON.parse(picked.jsonString);
      } catch {
        Alert.alert('Invalid File', 'The selected file does not contain valid JSON data.');
        return;
      }

      if (!parsed.phases || !parsed.tasks) {
        Alert.alert(
          'Incompatible Backup',
          'This JSON file does not appear to be a valid SalahFlow backup (missing phases or tasks).'
        );
        return;
      }

      const cityName = parsed.city || parsed.location?.cityName || 'Unknown';
      const phaseCount = parsed.phases.length;
      const taskCount = parsed.tasks.length;
      const exportedDateStr = parsed.exportedAt
        ? new Date(parsed.exportedAt).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'Unknown Date';

      Alert.alert(
        'Restore Backup?',
        `File: ${picked.fileName}\nCity: ${cityName}\nExported: ${exportedDateStr}\nPhases: ${phaseCount} | Tasks: ${taskCount}\n\n⚠️ Restoring will replace your current schedule with this backup and switch the active city to ${cityName}. Do you want to proceed?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restore Now',
            style: 'destructive',
            onPress: async () => {
              setRestoring(true);
              try {
                const res = await backupService.importData(picked.jsonString);
                await loadSettings();
                const timings = await refreshTimings();
                await loadSchedule(selectedDate, timings);

                await notificationService.sendImmediateNotification({
                  title: '🔄 SalahFlow Data Restored',
                  body: `Routine restored for ${res.city} with ${res.taskCount} tasks.`,
                });

                Alert.alert(
                  'Restore Complete',
                  `Successfully restored ${res.taskCount} tasks across ${res.phaseCount} phases for ${res.city}. Your prayer timings and alarms have been updated.`
                );
              } catch (importErr: any) {
                Alert.alert('Restore Failed', importErr?.message || 'Could not import backup.');
              } finally {
                setRestoring(false);
              }
            },
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('Restore Error', e?.message || 'Failed to select backup file.');
    }
  };

  const handleResetData = () => {
    Alert.alert(
      'Reset All Data',
      'This will clear all custom tasks, phases, and schedule history. Default Salah phases will be regenerated. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Database',
          style: 'destructive',
          onPress: async () => {
            await resetDatabase();
            await phaseEngine.initializeDefaultPhasesIfNeeded();
            const timings = await refreshTimings();
            await loadSchedule(selectedDate, timings);
            Alert.alert('Reset Completed', 'Database refreshed with default 5 Salah phases.');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Settings" subtitle="Prayer Timings & Routine Config" showBack={true} />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Missing Permissions Banner */}
        <MissingPermissionsBanner />

        {/* Section: Location */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Location Configuration</Text>
          <View style={styles.itemRow}>
            <View>
              <Text style={styles.itemTitle}>{location.cityName}, {location.countryName}</Text>
              <Text style={styles.itemSub}>
                {location.latitude.toFixed(4)}° N, {location.longitude.toFixed(4)}° E • {location.timezone}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleDetectGps}
              disabled={detectingGps}
            >
              <MaterialCommunityIcons name="crosshairs-gps" size={18} color={colors.primary} />
              <Text style={styles.actionBtnText}>{detectingGps ? 'Locating...' : 'GPS'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.selectCityBtn}
            onPress={() => setCityPickerVisible(!cityPickerVisible)}
          >
            <Text style={styles.selectCityBtnText}>
              {cityPickerVisible ? 'Hide City Selector' : 'Change City Manually'}
            </Text>
            <MaterialCommunityIcons
              name={cityPickerVisible ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.primary}
            />
          </TouchableOpacity>

          {cityPickerVisible && (
            <View style={styles.cityGrid}>
              {POPULAR_LOCATIONS.map((c) => (
                <TouchableOpacity
                  key={c.cityName}
                  style={[
                    styles.cityItem,
                    location.cityName === c.cityName && styles.cityItemActive,
                  ]}
                  onPress={async () => {
                    await updateLocation(c);
                    setCityPickerVisible(false);
                    const timings = await refreshTimings();
                    await loadSchedule(selectedDate, timings);
                  }}
                >
                  <Text
                    style={[
                      styles.cityName,
                      location.cityName === c.cityName && styles.cityNameActive,
                    ]}
                  >
                    {c.cityName}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Section: Calculation Method */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Astronomical Calculation</Text>

          <TouchableOpacity
            style={styles.methodSelector}
            onPress={() => setMethodPickerVisible(!methodPickerVisible)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>Calculation Method</Text>
              <Text style={styles.itemSub}>{prayerConfig.method}</Text>
            </View>
            <MaterialCommunityIcons
              name={methodPickerVisible ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          {methodPickerVisible && (
            <View style={styles.methodList}>
              {CALCULATION_METHODS.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[
                    styles.methodOption,
                    prayerConfig.method === m.id && styles.methodOptionActive,
                  ]}
                  onPress={() => handleSelectMethod(m.id)}
                >
                  <Text
                    style={[
                      styles.methodOptName,
                      prayerConfig.method === m.id && styles.methodOptNameActive,
                    ]}
                  >
                    {m.name}
                  </Text>
                  <Text style={styles.methodOptDesc}>{m.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Hanafi Asr Toggle */}
          <View style={[styles.itemRow, { marginTop: spacing.md }]}>
            <View style={{ flex: 1, marginRight: spacing.md }}>
              <Text style={styles.itemTitle}>Hanafi Asr Calculation</Text>
              <Text style={styles.itemSub}>
                Calculates Asr when shadow factor is 2x object length (Standard Hanafi).
              </Text>
            </View>
            <Switch
              value={prayerConfig.asrMethod === 'hanafi'}
              onValueChange={handleToggleHanafi}
              trackColor={{ false: colors.surfaceHighlight, true: colors.primary }}
              thumbColor={prayerConfig.asrMethod === 'hanafi' ? '#FFFFFF' : colors.textMuted}
            />
          </View>
        </View>

        {/* Section: Alarms & Diagnostics */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Alarms & Notification System</Text>
          <Text style={styles.itemSub}>
            Audible alarms, peaceful tones, and advance reminders for all 5 daily prayers and tasks.
          </Text>

          <TouchableOpacity
            style={styles.diagnosticBtn}
            onPress={() => router.push('/alarms/settings' as any)}
          >
            <MaterialCommunityIcons name="bell-ring" size={22} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.diagnosticTitle}>Prayer Alarms & Peaceful Tones</Text>
              <Text style={styles.diagnosticSub}>
                Customize alarms, choose peaceful tones & preview sounds
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.testAlarmBtn}
            onPress={handleQuickTestAlarm}
            disabled={testingAlarm}
          >
            <MaterialCommunityIcons
              name={testingAlarm ? 'timer-sand' : 'volume-high'}
              size={18}
              color={colors.primary}
            />
            <Text style={styles.testAlarmBtnText}>
              {testingAlarm ? 'Scheduling Test...' : 'Test Audible Alarm (5s)'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.diagnosticBtn}
            onPress={() => router.push('/alarms/test' as any)}
          >
            <MaterialCommunityIcons name="alarm-check" size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.diagnosticTitle}>Technical Diagnostics & Permissions</Text>
              <Text style={styles.diagnosticSub}>
                Inspect exact alarms, battery optimization & wake-lock
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Section: Offline Backup & Restore */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Offline Backup & Restore</Text>
          <Text style={styles.itemSub}>
            SalahFlow stores all routines, manual Salah timings, tasks, and alarms locally. Back up your routine to your Downloads folder or restore it anytime.
          </Text>

          {/* Current City Snapshot Chip */}
          <View style={styles.backupCityBadge}>
            <MaterialCommunityIcons name="map-marker-radius" size={16} color={colors.primary} />
            <Text style={styles.backupCityText}>
              Active City: <Text style={{ fontWeight: typography.fontWeight.bold, color: colors.primaryLight }}>{location.cityName}</Text> ({location.latitude.toFixed(2)}°, {location.longitude.toFixed(2)}°)
            </Text>
          </View>

          {/* Download Path Info */}
          <View style={styles.backupPathBox}>
            <MaterialCommunityIcons name="folder-download-outline" size={16} color={colors.textMuted} />
            <Text style={styles.backupPathText}>
              Target Folder: <Text style={styles.backupPathHighlight}>Downloads / SalahFlow Data /</Text>
            </Text>
          </View>

          <View style={styles.backupActions}>
            <TouchableOpacity
              style={[styles.backupBtn, exporting && styles.btnDisabled]}
              onPress={handleExportBackup}
              disabled={exporting}
            >
              <MaterialCommunityIcons
                name={exporting ? 'progress-download' : 'download-circle-outline'}
                size={20}
                color={colors.primary}
              />
              <Text style={styles.backupBtnText}>
                {exporting ? 'Exporting & Downloading...' : 'Export to Downloads Folder'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.restoreBtn, restoring && styles.btnDisabled]}
              onPress={handleRestoreBackup}
              disabled={restoring}
            >
              <MaterialCommunityIcons
                name={restoring ? 'progress-clock' : 'file-restore-outline'}
                size={20}
                color={colors.secondary}
              />
              <Text style={styles.restoreBtnText}>
                {restoring ? 'Restoring Data...' : 'Restore from Backup (Import JSON)'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section: Data Reset */}
        <View style={styles.cardDanger}>
          <Text style={styles.dangerHeader}>Danger Zone</Text>
          <Text style={styles.itemSub}>
            Reset SQLite database to freshly regenerated 5 default Salah phases.
          </Text>
          <Button
            title="Reset All Routine Data"
            onPress={handleResetData}
            variant="danger"
            size="md"
            icon="trash-can-outline"
            style={{ marginTop: spacing.md }}
          />
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
  cardDanger: {
    backgroundColor: '#1E1114',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  dangerHeader: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.danger,
    marginBottom: 4,
  },
  sectionHeader: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  itemSub: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceHighlight,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    gap: 4,
  },
  actionBtnText: {
    fontSize: typography.fontSize.xs,
    color: colors.primaryLight,
    fontWeight: typography.fontWeight.semibold,
  },
  selectCityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  selectCityBtnText: {
    fontSize: typography.fontSize.xs,
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  cityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  cityItem: {
    backgroundColor: colors.surfaceHighlight,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  cityItemActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  cityName: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  cityNameActive: {
    color: colors.primaryLight,
    fontWeight: typography.fontWeight.bold,
  },
  methodSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  methodList: {
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
    paddingTop: spacing.sm,
  },
  methodOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: 4,
  },
  methodOptionActive: {
    backgroundColor: colors.primaryMuted,
  },
  methodOptName: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  methodOptNameActive: {
    color: colors.primaryLight,
  },
  methodOptDesc: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  alarmStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  alarmStatusTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  alarmStatusDesc: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  testAlarmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  testAlarmBtnText: {
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.sm,
  },
  diagnosticBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceHighlight,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
    gap: spacing.md,
  },
  diagnosticTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  diagnosticSub: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  backupCityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryMuted,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
    marginTop: spacing.sm,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  backupCityText: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  backupPathBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceHighlight,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
    marginTop: spacing.xs,
    gap: 6,
  },
  backupPathText: {
    fontSize: typography.fontSize.xs - 1,
    color: colors.textMuted,
  },
  backupPathHighlight: {
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.semibold,
  },
  backupActions: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  backupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHighlight,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    gap: spacing.sm,
  },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHighlight,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.secondary,
    gap: spacing.sm,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  backupBtnText: {
    color: colors.primaryLight,
    fontWeight: typography.fontWeight.semibold,
    fontSize: typography.fontSize.sm,
  },
  restoreBtnText: {
    color: colors.secondary,
    fontWeight: typography.fontWeight.semibold,
    fontSize: typography.fontSize.sm,
  },
});
