import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Header } from '../../components/common/Header';
import { MissingPermissionsBanner } from '../../components/common/MissingPermissionsBanner';
import { alarmManager } from '../../services/alarms/alarmManager';
import { alarmPermissions } from '../../services/alarms/alarmPermissions';
import { taskRepository } from '../../database/repositories/taskRepository';
import { taskAlarmRepository } from '../../database/repositories/taskAlarmRepository';
import { soundPlayer } from '../../services/alarms/soundPlayer';
import { PEACEFUL_ALARM_TONES, AlarmTone } from '../../constants/sounds';
import { useScheduleStore } from '../../store/useScheduleStore';
import { usePrayerStore } from '../../store/usePrayerStore';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { Task, TaskAlarm } from '../../types';
import { generateUUID } from '../../utils/uuid';

interface PrayerAlarmItem {
  task: Task;
  alarm: TaskAlarm | null;
  displayTime: string;
}

export default function PrayerAlarmsSettingsScreen() {
  const { todayTimings, refreshTimings } = usePrayerStore();
  const { dailySchedule, loadSchedule, selectedDate } = useScheduleStore();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PrayerAlarmItem[]>([]);
  const [playingToneId, setPlayingToneId] = useState<string | null>(null);
  const [testingAlarm, setTestingAlarm] = useState(false);
  const [selectedTestTone, setSelectedTestTone] = useState<string>('peaceful_adhan');

  const syncSchedule = async () => {
    try {
      const timings = todayTimings || (await refreshTimings());
      if (timings) {
        await loadSchedule(selectedDate, timings);
      }
    } catch (e) {
      console.warn('Failed to refresh schedule in alarms:', e);
    }
  };

  const loadAlarmData = useCallback(async () => {
    try {
      const allTasks = await taskRepository.getAll();
      const allAlarms = await taskAlarmRepository.getAllEnabled();
      const alarmMap = new Map<string, TaskAlarm>();
      for (const a of allAlarms) {
        alarmMap.set(a.taskId, a);
      }

      // Filter core prayer tasks
      const coreTasks = allTasks
        .filter((t) => t.isCore && (t.taskType === 'prayer' || t.title.toLowerCase().includes('tahajjud')))
        .sort((a, b) => a.sortOrder - b.sortOrder);

      const scheduledItems: PrayerAlarmItem[] = coreTasks.map((t) => {
        // Find matching scheduled time from daily schedule if available
        let displayTime = t.fixedTime || 'Scheduled';
        const found = dailySchedule?.phases.flatMap((p) => p.tasks).find((st) => st.id === t.id);
        if (found) {
          displayTime = found.displayStartTime;
        }

        return {
          task: t,
          alarm: alarmMap.get(t.id) || null,
          displayTime,
        };
      });

      setItems(scheduledItems);
    } catch (e) {
      console.warn('Failed to load prayer alarms:', e);
    } finally {
      setLoading(false);
    }
  }, [dailySchedule]);

  useEffect(() => {
    loadAlarmData();
    return () => {
      soundPlayer.stop();
    };
  }, [loadAlarmData]);

  const handleToggleAlarm = async (item: PrayerAlarmItem, isEnabled: boolean) => {
    const updatedAlarm: TaskAlarm = {
      id: item.alarm?.id || generateUUID(),
      taskId: item.task.id,
      isEnabled,
      reminderMinutes: item.alarm?.reminderMinutes ?? 10,
      soundEnabled: item.alarm?.soundEnabled ?? true,
      soundTone: item.alarm?.soundTone || 'peaceful_adhan',
      vibrationEnabled: item.alarm?.vibrationEnabled ?? true,
      snoozeMinutes: item.alarm?.snoozeMinutes ?? 5,
      repeatRule: item.alarm?.repeatRule || 'daily',
      createdAt: item.alarm?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await taskAlarmRepository.upsert(updatedAlarm);
    await loadAlarmData();
    await syncSchedule();
  };

  const handleUpdateReminder = async (item: PrayerAlarmItem, reminderMinutes: number) => {
    if (!item.alarm) return;
    const updated: TaskAlarm = {
      ...item.alarm,
      reminderMinutes,
      updatedAt: new Date().toISOString(),
    };
    await taskAlarmRepository.upsert(updated);
    await loadAlarmData();
    await syncSchedule();
  };

  const handleSelectTone = async (item: PrayerAlarmItem, toneId: string) => {
    if (!item.alarm) return;
    const updated: TaskAlarm = {
      ...item.alarm,
      soundTone: toneId,
      updatedAt: new Date().toISOString(),
    };
    await taskAlarmRepository.upsert(updated);
    await loadAlarmData();
    await syncSchedule();
  };

  const handlePlayPreview = async (toneId: string) => {
    if (playingToneId === toneId) {
      soundPlayer.stop();
      setPlayingToneId(null);
    } else {
      setPlayingToneId(toneId);
      await soundPlayer.playTone(toneId);
    }
  };

  const handleTestAlarm = async () => {
    setTestingAlarm(true);
    try {
      await alarmPermissions.requestNotificationPermissions();
      await alarmManager.testTriggerAlarm('Salah Alarm Live Test', 5, selectedTestTone);
      Alert.alert(
        'Alarm Scheduled (5s)',
        'An audible alarm with vibration and your selected peaceful tone will ring in 5 seconds. You can lock your phone to test lockscreen ringing!'
      );
    } catch (e: any) {
      Alert.alert('Alarm Error', e?.message || 'Could not schedule test alarm.');
    } finally {
      setTestingAlarm(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="Prayer Alarms" subtitle="Peaceful Tones & Reminders" showBack={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Prayer Alarms"
        subtitle="Audible Tones & Reminders"
        showBack={true}
        rightAction={{
          icon: 'bug-outline',
          onPress: () => router.push('/alarms/test' as any),
        }}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Missing Permissions Warning Banner at top */}
        <MissingPermissionsBanner />

        {/* Quick Test Alarm Card */}
        <View style={styles.card}>
          <View style={styles.testHeaderRow}>
            <View style={styles.testIconCircle}>
              <MaterialCommunityIcons name="bell-ring" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionHeader}>Test Real Alarm (5s)</Text>
              <Text style={styles.itemSub}>Verify exact ringing with sound and vibration</Text>
            </View>
          </View>

          <View style={styles.toneChipRow}>
            {PEACEFUL_ALARM_TONES.slice(0, 4).map((tone) => (
              <TouchableOpacity
                key={tone.id}
                style={[
                  styles.testToneChip,
                  selectedTestTone === tone.id && styles.testToneChipSelected,
                ]}
                onPress={() => setSelectedTestTone(tone.id)}
              >
                <Text
                  style={[
                    styles.testToneChipText,
                    selectedTestTone === tone.id && styles.testToneChipTextSelected,
                  ]}
                >
                  {tone.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.testBtn}
            onPress={handleTestAlarm}
            disabled={testingAlarm}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name={testingAlarm ? 'timer-sand' : 'volume-high'}
              size={18}
              color="#000000"
            />
            <Text style={styles.testBtnText}>
              {testingAlarm ? 'Scheduling Alarm...' : 'Trigger 5-Second Alarm Test'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Peaceful Tones Library */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Peaceful Alarm Tones</Text>
          <Text style={styles.itemSub}>Tap play to preview peaceful tone melodies</Text>

          <View style={styles.toneList}>
            {PEACEFUL_ALARM_TONES.map((tone) => {
              const isPlaying = playingToneId === tone.id;
              return (
                <View key={tone.id} style={styles.toneItem}>
                  <View style={styles.toneInfo}>
                    <Text style={styles.toneName}>{tone.name}</Text>
                    <Text style={styles.toneSubtitle}>{tone.subtitle}</Text>
                  </View>

                  {tone.requireAsset && (
                    <TouchableOpacity
                      style={[styles.playBtn, isPlaying && styles.playBtnActive]}
                      onPress={() => handlePlayPreview(tone.id)}
                    >
                      <MaterialCommunityIcons
                        name={isPlaying ? 'stop' : 'play'}
                        size={18}
                        color={isPlaying ? '#000000' : colors.primary}
                      />
                      <Text style={[styles.playBtnText, isPlaying && styles.playBtnTextActive]}>
                        {isPlaying ? 'Stop' : 'Preview'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Core Salah Alarms List */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Daily Prayer Alarms</Text>
          <Text style={styles.itemSub}>
            Audible alarm rings when each Salah time arrives. You can also set a 10-minute advance reminder.
          </Text>

          <View style={styles.prayerList}>
            {items.map((item) => {
              const isEnabled = item.alarm?.isEnabled ?? false;
              const currentToneId = item.alarm?.soundTone || 'peaceful_adhan';
              const reminderMins = item.alarm?.reminderMinutes ?? 10;

              return (
                <View key={item.task.id} style={styles.prayerCard}>
                  {/* Top: Name, time, and switch */}
                  <View style={styles.prayerCardHeader}>
                    <View style={styles.prayerIconCircle}>
                      <MaterialCommunityIcons
                        name={item.task.icon as any || 'mosque'}
                        size={20}
                        color={isEnabled ? colors.primary : colors.textMuted}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.prayerTitle}>{item.task.title}</Text>
                      <Text style={styles.prayerTime}>Time: {item.displayTime}</Text>
                    </View>
                    <Switch
                      value={isEnabled}
                      onValueChange={(val) => handleToggleAlarm(item, val)}
                      trackColor={{ false: colors.surfaceHighlight, true: colors.primary }}
                      thumbColor={isEnabled ? '#FFFFFF' : colors.textMuted}
                    />
                  </View>

                  {isEnabled && (
                    <View style={styles.alarmSubSettings}>
                      {/* Reminder timing chips */}
                      <Text style={styles.subLabel}>Alarm Trigger</Text>
                      <View style={styles.chipRow}>
                        {[0, 5, 10, 15, 30].map((mins) => (
                          <TouchableOpacity
                            key={mins}
                            style={[
                              styles.reminderChip,
                              reminderMins === mins && styles.reminderChipSelected,
                            ]}
                            onPress={() => handleUpdateReminder(item, mins)}
                          >
                            <Text
                              style={[
                                styles.reminderChipText,
                                reminderMins === mins && styles.reminderChipTextSelected,
                              ]}
                            >
                              {mins === 0 ? 'At Salah Time' : `${mins}m before`}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      {/* Tone selector */}
                      <Text style={[styles.subLabel, { marginTop: spacing.sm }]}>Ringtone Sound</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.toneScroll}>
                        {PEACEFUL_ALARM_TONES.map((tone) => (
                          <TouchableOpacity
                            key={tone.id}
                            style={[
                              styles.salahToneChip,
                              currentToneId === tone.id && styles.salahToneChipSelected,
                            ]}
                            onPress={() => handleSelectTone(item, tone.id)}
                          >
                            <Text
                              style={[
                                styles.salahToneChipText,
                                currentToneId === tone.id && styles.salahToneChipTextSelected,
                              ]}
                            >
                              {tone.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  sectionHeader: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  itemSub: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  testHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  testIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toneChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  testToneChip: {
    backgroundColor: colors.surfaceHighlight,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  testToneChipSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: colors.primary,
  },
  testToneChipText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  testToneChipTextSelected: {
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  testBtnText: {
    color: '#000000',
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.sm,
  },
  toneList: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  toneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceHighlight,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  toneInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  toneName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  toneSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    gap: 4,
  },
  playBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  playBtnText: {
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  playBtnTextActive: {
    color: '#000000',
  },
  prayerList: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  prayerCard: {
    backgroundColor: colors.surfaceHighlight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  prayerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  prayerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prayerTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  prayerTime: {
    fontSize: 11,
    color: colors.gold,
    marginTop: 1,
  },
  alarmSubSettings: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  subLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 6,
    fontWeight: typography.fontWeight.semibold,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  reminderChip: {
    backgroundColor: colors.surface,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  reminderChipSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: colors.primary,
  },
  reminderChipText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  reminderChipTextSelected: {
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
  },
  toneScroll: {
    flexDirection: 'row',
  },
  salahToneChip: {
    backgroundColor: colors.surface,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: borderRadius.sm,
    marginRight: spacing.xs,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  salahToneChipSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: colors.primary,
  },
  salahToneChipText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  salahToneChipTextSelected: {
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
  },
});
