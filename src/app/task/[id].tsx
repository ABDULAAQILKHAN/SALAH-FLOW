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
  const [vibrationEnabled, setVibrationEnabled] = useState(true);

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
          if (t.fixedTime) setFixedTime(t.fixedTime);
        }

        if (a) {
          setAlarm(a);
          setAlarmEnabled(a.isEnabled);
          setReminderMinutes(a.reminderMinutes);
          setSoundEnabled(a.soundEnabled);
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
      const updatedTask: Task = {
        ...task,
        title: title.trim(),
        description: description.trim() || undefined,
        durationMinutes: duration,
        priority,
        schedulingType: task.isCore ? task.schedulingType : schedulingType,
        fixedTime: schedulingType === 'fixed_time' ? fixedTime.trim() : undefined,
        anchorPrayer: schedulingType === 'prayer_relative' ? anchorPrayer : undefined,
        anchorRelation: schedulingType === 'prayer_relative' ? anchorRelation : undefined,
        offsetMinutes: schedulingType === 'prayer_relative' ? parseInt(offsetMinutes, 10) || 0 : 0,
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
  sectionDesc: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
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
