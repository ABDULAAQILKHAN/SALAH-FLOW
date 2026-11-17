import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Header } from '../../components/common/Header';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { taskRepository } from '../../database/repositories/taskRepository';
import { taskAlarmRepository } from '../../database/repositories/taskAlarmRepository';
import { useScheduleStore } from '../../store/useScheduleStore';
import { usePrayerStore } from '../../store/usePrayerStore';
import { PEACEFUL_ALARM_TONES } from '../../constants/sounds';
import { colors, typography, spacing, borderRadius } from '../../theme';
import {
  Task,
  TaskAlarm,
  SchedulingType,
  AnchorRelation,
  PrayerName,
  TaskPriority,
} from '../../types';
import { generateUUID } from '../../utils/uuid';

export default function EditTaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { phases, loadSchedule, selectedDate, deleteTask } = useScheduleStore();
  const { todayTimings } = usePrayerStore();

  const [task, setTask] = useState<Task | null>(null);
  const [alarm, setAlarm] = useState<TaskAlarm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('20');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [schedulingType, setSchedulingType] = useState<SchedulingType>('prayer_relative');
  const [anchorPrayer, setAnchorPrayer] = useState<PrayerName>('fajr');
  const [anchorRelation, setAnchorRelation] = useState<AnchorRelation>('after');
  const [offsetMinutes, setOffsetMinutes] = useState('0');
  const [fixedTime, setFixedTime] = useState('09:00');

  // Alarm states
  const [alarmEnabled, setAlarmEnabled] = useState(true);
  const [reminderMinutes, setReminderMinutes] = useState(10);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundTone, setSoundTone] = useState('peaceful_adhan');
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [salahTimingMode, setSalahTimingMode] = useState<'fixed' | 'relative'>('fixed');

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const [t, a] = await Promise.all([
          taskRepository.getById(id),
          taskAlarmRepository.getByTaskId(id),
        ]);

        if (t) {
          setTask(t);
          setTitle(t.title);
          setDescription(t.description || '');
          setDurationMinutes(t.durationMinutes.toString());
          setPriority(t.priority);
          setSchedulingType(t.schedulingType);
          if (t.anchorPrayer) setAnchorPrayer(t.anchorPrayer);
          if (t.anchorRelation) setAnchorRelation(t.anchorRelation);
          setOffsetMinutes(t.offsetMinutes.toString());
          if (t.fixedTime) {
            setFixedTime(t.fixedTime);
            setSalahTimingMode('fixed');
          } else {
            setSalahTimingMode(t.schedulingType === 'fixed_time' ? 'fixed' : 'relative');
          }
        }

        if (a) {
          setAlarm(a);
          setAlarmEnabled(a.isEnabled);
          setReminderMinutes(a.reminderMinutes);
          setSoundEnabled(a.soundEnabled);
          if (a.soundTone) setSoundTone(a.soundTone);
          setVibrationEnabled(a.vibrationEnabled);
        }
      } catch (e) {
        console.warn('Failed to load task for edit:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleSave = async () => {
    if (!task) return;
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a task title.');
      return;
    }

    const duration = parseInt(durationMinutes, 10);
    if (isNaN(duration) || duration <= 0) {
      Alert.alert('Invalid Duration', 'Duration must be at least 1 minute.');
      return;
    }

    setSaving(true);
    try {
      const isObligatorySalah = task.isCore && task.taskType === 'prayer';
      const resolvedSchedulingType: SchedulingType = isObligatorySalah
        ? (salahTimingMode === 'fixed' ? 'fixed_time' : 'prayer_relative')
        : schedulingType;

      const updatedTask: Task = {
        ...task,
        title: title.trim(),
        description: description.trim() || undefined,
        durationMinutes: duration,
        priority,
        schedulingType: resolvedSchedulingType,
        fixedTime: (isObligatorySalah && salahTimingMode === 'fixed') || (!isObligatorySalah && schedulingType === 'fixed_time')
          ? fixedTime.trim()
          : undefined,
        anchorPrayer: resolvedSchedulingType === 'prayer_relative'
          ? (isObligatorySalah ? task.anchorPrayer : anchorPrayer)
          : undefined,
        anchorRelation: resolvedSchedulingType === 'prayer_relative'
          ? (isObligatorySalah ? 'after' : anchorRelation)
          : undefined,
        offsetMinutes: resolvedSchedulingType === 'prayer_relative'
          ? (parseInt(offsetMinutes, 10) || 0)
          : 0,
      };

      await taskRepository.update(updatedTask);

      // Save alarm
      if (alarmEnabled) {
        await taskAlarmRepository.upsert({
          id: alarm?.id || generateUUID(),
          taskId: task.id,
          isEnabled: true,
          reminderMinutes,
          soundEnabled,
          soundTone,
          vibrationEnabled,
          snoozeMinutes: 5,
          repeatRule: alarm?.repeatRule || 'daily',
        });
      } else {
        await taskAlarmRepository.delete(task.id);
      }

      if (todayTimings) {
        await loadSchedule(selectedDate, todayTimings);
      }

      router.back();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update task.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!task) return;
    if (task.isCore) {
      Alert.alert('Protected Task', 'Obligatory Salah core tasks cannot be deleted.');
      return;
    }

    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${task.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (todayTimings) {
              await deleteTask(task.id, todayTimings);
              router.back();
            }
          },
        },
      ]
    );
  };

  if (loading || !task) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="Edit Task" showBack={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const isObligatorySalah = task.isCore && task.taskType === 'prayer';

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Edit Task"
        showBack={true}
        rightAction={
          !task.isCore
            ? {
                icon: 'trash-can-outline',
                onPress: handleDelete,
              }
            : undefined
        }
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Core Protection Badge */}
        {isObligatorySalah && (
          <View style={styles.coreBanner}>
            <MaterialCommunityIcons name="shield-check" size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.coreBannerTitle}>Obligatory Salah Core Task</Text>
              <Text style={styles.coreBannerSub}>
                This task represents an obligatory prayer. Its prayer anchor and identity are protected and dynamically calculated via Adhan JS.
              </Text>
            </View>
          </View>
        )}

        {/* Task Details */}
        <View style={styles.card}>
          <Text style={styles.label}>Task Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            editable={!isObligatorySalah}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={2}
          />

          <Text style={styles.label}>Duration (Minutes)</Text>
          <TextInput
            style={styles.input}
            value={durationMinutes}
            onChangeText={setDurationMinutes}
            keyboardType="number-pad"
          />

          {!task.isCore && (
            <>
              <Text style={styles.label}>Priority</Text>
              <View style={styles.priorityRow}>
                {(['low', 'medium', 'high'] as TaskPriority[]).map((pri) => (
                  <TouchableOpacity
                    key={pri}
                    onPress={() => setPriority(pri)}
                    style={[
                      styles.priorityButton,
                      priority === pri && styles.priorityButtonSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.priorityText,
                        priority === pri && styles.priorityTextSelected,
                      ]}
                    >
                      {pri.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>

        {/* Core Salah Mosque / Jama'at Timing Section */}
        {isObligatorySalah && (
          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <MaterialCommunityIcons name="clock-edit-outline" size={20} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={styles.sectionHeader}>Mosque / Jama'at Salah Time</Text>
                <Text style={styles.sectionDesc}>
                  Set the specific time you pray at the mosque. Update this manually when seasonal schedules change.
                </Text>
              </View>
            </View>

            <View style={styles.salahModeRow}>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  salahTimingMode === 'fixed' && styles.modeButtonSelected,
                ]}
                onPress={() => setSalahTimingMode('fixed')}
              >
                <MaterialCommunityIcons
                  name="clock-time-four-outline"
                  size={16}
                  color={salahTimingMode === 'fixed' ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.modeButtonText,
                    salahTimingMode === 'fixed' && styles.modeButtonTextSelected,
                  ]}
                >
                  Manual Mosque Time
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modeButton,
                  salahTimingMode === 'relative' && styles.modeButtonSelected,
                ]}
                onPress={() => setSalahTimingMode('relative')}
              >
                <MaterialCommunityIcons
                  name="ray-start-arrow"
                  size={16}
                  color={salahTimingMode === 'relative' ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.modeButtonText,
                    salahTimingMode === 'relative' && styles.modeButtonTextSelected,
                  ]}
                >
                  At Prayer Entrance
                </Text>
              </TouchableOpacity>
            </View>

            {salahTimingMode === 'fixed' ? (
              <View style={{ marginTop: spacing.md }}>
                <Text style={styles.label}>Jama'at Prayer Time (e.g. 01:30 PM or 13:30)</Text>
                <TextInput
                  style={styles.input}
                  value={fixedTime}
                  onChangeText={setFixedTime}
                  placeholder="e.g. 01:30 PM or 13:30"
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={styles.hintText}>
                  This core prayer will be scheduled exactly at this time every day until you change it.
                </Text>
              </View>
            ) : (
              <View style={{ marginTop: spacing.md }}>
                <Text style={styles.label}>Offset after Prayer Entrance (Minutes)</Text>
                <TextInput
                  style={styles.input}
                  value={offsetMinutes}
                  onChangeText={setOffsetMinutes}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            )}
          </View>
        )}

        {/* Standard Scheduling Settings for Non-Core Tasks */}
        {!task.isCore && (
          <View style={styles.card}>
            <Text style={styles.sectionHeader}>Scheduling Configuration</Text>
            <Text style={styles.sectionDesc}>
              Choose how this companion task aligns with daily prayer phases.
            </Text>

            <View style={styles.salahModeRow}>
              {(['prayer_relative', 'fixed_time', 'flexible'] as SchedulingType[]).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.modeButton,
                    schedulingType === type && styles.modeButtonSelected,
                  ]}
                  onPress={() => setSchedulingType(type)}
                >
                  <Text
                    style={[
                      styles.modeButtonText,
                      schedulingType === type && styles.modeButtonTextSelected,
                    ]}
                  >
                    {type === 'prayer_relative'
                      ? 'Relative'
                      : type === 'fixed_time'
                      ? 'Fixed'
                      : 'Flexible'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {schedulingType === 'fixed_time' && (
              <View style={{ marginTop: spacing.md }}>
                <Text style={styles.label}>Clock Time (e.g. 10:00 AM or 10:00)</Text>
                <TextInput
                  style={styles.input}
                  value={fixedTime}
                  onChangeText={setFixedTime}
                  placeholder="10:00 AM"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            )}

            {schedulingType === 'prayer_relative' && (
              <View style={{ marginTop: spacing.md }}>
                <Text style={styles.label}>Anchor Prayer</Text>
                <View style={styles.salahModeRow}>
                  {(['fajr', 'zuhr', 'asr', 'maghrib', 'isha'] as PrayerName[]).map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.modeButton,
                        anchorPrayer === p && styles.modeButtonSelected,
                      ]}
                      onPress={() => setAnchorPrayer(p)}
                    >
                      <Text
                        style={[
                          styles.modeButtonText,
                          anchorPrayer === p && styles.modeButtonTextSelected,
                        ]}
                      >
                        {p.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Relation</Text>
                    <View style={styles.salahModeRow}>
                      {(['before', 'after'] as AnchorRelation[]).map((rel) => (
                        <TouchableOpacity
                          key={rel}
                          style={[
                            styles.modeButton,
                            anchorRelation === rel && styles.modeButtonSelected,
                          ]}
                          onPress={() => setAnchorRelation(rel)}
                        >
                          <Text
                            style={[
                              styles.modeButtonText,
                              anchorRelation === rel && styles.modeButtonTextSelected,
                            ]}
                          >
                            {rel.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Offset (Min)</Text>
                    <TextInput
                      style={styles.input}
                      value={offsetMinutes}
                      onChangeText={setOffsetMinutes}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Alarm Settings */}
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1, marginRight: spacing.md }}>
              <Text style={styles.sectionHeader}>Alarm & Notifications</Text>
              <Text style={styles.sectionDesc}>
                Set exact notifications and advance reminders.
              </Text>
            </View>
            <Switch
              value={alarmEnabled}
              onValueChange={setAlarmEnabled}
              trackColor={{ false: colors.surfaceHighlight, true: colors.primary }}
              thumbColor={alarmEnabled ? '#FFFFFF' : colors.textMuted}
            />
          </View>

          {alarmEnabled && (
            <View style={styles.alarmOptions}>
              <Text style={styles.label}>Advance Reminder</Text>
              <View style={styles.chipRow}>
                {[0, 5, 10, 15, 30].map((mins) => (
                  <TouchableOpacity
                    key={mins}
                    onPress={() => setReminderMinutes(mins)}
                    style={[
                      styles.reminderChip,
                      reminderMinutes === mins && styles.reminderChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.reminderChipText,
                        reminderMinutes === mins && styles.reminderChipTextSelected,
                      ]}
                    >
                      {mins === 0 ? 'Exact only' : `${mins}m before`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Tone selector */}
              <Text style={[styles.label, { marginTop: spacing.md }]}>Peaceful Tone</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                {PEACEFUL_ALARM_TONES.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.reminderChip,
                      soundTone === t.id && styles.reminderChipSelected,
                      { marginRight: spacing.xs },
                    ]}
                    onPress={() => setSoundTone(t.id)}
                  >
                    <Text
                      style={[
                        styles.reminderChipText,
                        soundTone === t.id && styles.reminderChipTextSelected,
                      ]}
                    >
                      {t.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={[styles.toggleRow, { marginTop: spacing.md }]}>
                <Text style={styles.optionLabel}>Sound Notification</Text>
                <Switch
                  value={soundEnabled}
                  onValueChange={setSoundEnabled}
                  trackColor={{ false: colors.surfaceHighlight, true: colors.primary }}
                  thumbColor={soundEnabled ? '#FFFFFF' : colors.textMuted}
                />
              </View>

              <View style={[styles.toggleRow, { marginTop: spacing.md }]}>
                <Text style={styles.optionLabel}>Vibration Alert</Text>
                <Switch
                  value={vibrationEnabled}
                  onValueChange={setVibrationEnabled}
                  trackColor={{ false: colors.surfaceHighlight, true: colors.primary }}
                  thumbColor={vibrationEnabled ? '#FFFFFF' : colors.textMuted}
                />
              </View>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.footer}>
          <Button
            title="Save Changes"
            onPress={handleSave}
            loading={saving}
            variant="primary"
            size="lg"
            icon="content-save-outline"
          />

          {!task.isCore && (
            <Button
              title="Delete Task"
              onPress={handleDelete}
              variant="danger"
              size="md"
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coreBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  coreBannerTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.primaryLight,
  },
  coreBannerSub: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sectionDesc: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  salahModeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHighlight,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    gap: 6,
  },
  modeButtonSelected: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  modeButtonText: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  modeButtonTextSelected: {
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
  },
  hintText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  label: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.surfaceHighlight,
    color: colors.textPrimary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontSize: typography.fontSize.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  textArea: {
    height: 60,
    textAlignVertical: 'top',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceHighlight,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  priorityButtonSelected: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  priorityText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.textSecondary,
  },
  priorityTextSelected: {
    color: colors.primaryLight,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  alarmOptions: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
    paddingTop: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginVertical: spacing.xs,
  },
  reminderChip: {
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  reminderChipSelected: {
    backgroundColor: colors.goldMuted,
    borderColor: colors.gold,
  },
  reminderChipText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  reminderChipTextSelected: {
    color: colors.gold,
    fontWeight: typography.fontWeight.bold,
  },
  optionLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
  },
  footer: {
    marginTop: spacing.md,
  },
});
