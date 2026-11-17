import React, { useEffect, useState, useMemo } from 'react';
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
import {
  formatTime12h,
  parseTimeToDate,
  addMinutesToDate,
  subMinutesFromDate,
} from '../../utils/dateTime';
import { getPrayerAnchorTime } from '../../services/scheduling/scheduleEngine';

export default function EditTaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { phases, dailySchedule, loadSchedule, selectedDate, deleteTask } = useScheduleStore();
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

  const computedPreview = useMemo(() => {
    if (!todayTimings) return null;
    const duration = parseInt(durationMinutes, 10) || 20;
    const offset = parseInt(offsetMinutes, 10) || 0;
    const now = new Date();

    // Find phase tasks from dailySchedule
    const phase = dailySchedule?.phases.find((p) => p.id === task?.phaseId);
    const phaseTasks = phase?.tasks || [];
    const currentIndex = phaseTasks.findIndex((t) => t.id === id);
    const prevTask = currentIndex > 0 ? phaseTasks[currentIndex - 1] : undefined;
    const nextTask =
      currentIndex >= 0 && currentIndex < phaseTasks.length - 1
        ? phaseTasks[currentIndex + 1]
        : undefined;

    let start: Date;
    let explanation = '';

    if (task?.isCore && task.taskType === 'prayer') {
      if (salahTimingMode === 'fixed' && fixedTime.trim()) {
        start = parseTimeToDate(fixedTime.trim(), now);
        explanation = `Mosque / Jama'at fixed time: ${formatTime12h(start)}`;
      } else {
        const pName = task.prayerType || 'fajr';
        const anchor = getPrayerAnchorTime(pName, todayTimings);
        start = addMinutesToDate(anchor, offset);
        explanation = `Astronomical entrance: ${formatTime12h(anchor)} + ${offset}m`;
      }
    } else if (schedulingType === 'fixed_time' && fixedTime.trim()) {
      start = parseTimeToDate(fixedTime.trim(), now);
      explanation = `Fixed clock time: ${formatTime12h(start)}`;
    } else if (schedulingType === 'prayer_relative' && anchorPrayer) {
      // Find if anchor prayer is a scheduled core task in today's schedule
      const coreTask = dailySchedule?.phases
        .flatMap((p) => p.tasks)
        .find(
          (t) =>
            t.isCore &&
            (t.prayerType === anchorPrayer ||
              (t.taskType === 'prayer' && t.anchorPrayer === anchorPrayer))
        );

      const anchorStart = coreTask
        ? coreTask.startTime
        : getPrayerAnchorTime(anchorPrayer, todayTimings);
      const anchorEnd = coreTask ? coreTask.endTime : addMinutesToDate(anchorStart, 20);

      if (anchorRelation === 'before') {
        const end = subMinutesFromDate(anchorStart, offset);
        start = subMinutesFromDate(end, duration);
        explanation = `Finishes ${
          offset > 0 ? `${offset}m before` : 'right when'
        } ${anchorPrayer.toUpperCase()} begins (${formatTime12h(anchorStart)})`;
      } else {
        start = addMinutesToDate(anchorEnd, offset);
        explanation = `Starts ${
          offset > 0 ? `${offset}m after` : 'right after'
        } ${anchorPrayer.toUpperCase()} finishes (${formatTime12h(anchorEnd)})`;
      }
    } else {
      // Flexible: after previous task in phase
      if (prevTask) {
        start = prevTask.endTime;
        explanation = `Starts right after "${prevTask.title}" finishes (${formatTime12h(
          prevTask.endTime
        )})`;
      } else if (phase) {
        start = phase.startTime;
        explanation = `Starts at beginning of phase (${formatTime12h(phase.startTime)})`;
      } else {
        start = todayTimings.dhuhr;
        explanation = 'Flexible slot in daily phase';
      }
    }

    const end = addMinutesToDate(start, duration);
    const minutesToNext = nextTask
      ? Math.round((nextTask.startTime.getTime() - start.getTime()) / 60000)
      : null;

    return {
      startTime: start,
      endTime: end,
      displayStart: formatTime12h(start),
      displayEnd: formatTime12h(end),
      explanation,
      prevTask,
      nextTask,
      minutesToNext,
    };
  }, [
    todayTimings,
    dailySchedule,
    task,
    id,
    durationMinutes,
    offsetMinutes,
    schedulingType,
    anchorPrayer,
    anchorRelation,
    fixedTime,
    salahTimingMode,
  ]);

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
              Choose how this task aligns with prayer times or your daily flow.
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
                      ? 'Anchor to Prayer'
                      : type === 'fixed_time'
                      ? 'Fixed Clock'
                      : 'Follow Previous'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {schedulingType === 'flexible' && (
              <View style={{ marginTop: spacing.md }}>
                <Text style={styles.hintText}>
                  ● Sequential Flow: This task automatically begins right after the preceding task in this phase finishes. Reordering tasks in the phase adjusts this time automatically.
                </Text>
              </View>
            )}

            {schedulingType === 'fixed_time' && (
              <View style={{ marginTop: spacing.md }}>
                <Text style={styles.label}>Clock Time (e.g. 06:03 AM or 06:03)</Text>
                <TextInput
                  style={styles.input}
                  value={fixedTime}
                  onChangeText={setFixedTime}
                  placeholder="06:03 AM"
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={styles.hintText}>
                  This task will be scheduled exactly at this clock time every day.
                </Text>
              </View>
            )}

            {schedulingType === 'prayer_relative' && (
              <View style={{ marginTop: spacing.md }}>
                <Text style={styles.label}>Anchor Prayer</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.prayerScrollRow}
                >
                  {(
                    ['tahajjud', 'fajr', 'sunrise', 'zuhr', 'asr', 'maghrib', 'isha'] as PrayerName[]
                  ).map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.prayerChip,
                        anchorPrayer === p && styles.prayerChipSelected,
                      ]}
                      onPress={() => setAnchorPrayer(p)}
                    >
                      <Text
                        style={[
                          styles.prayerChipText,
                          anchorPrayer === p && styles.prayerChipTextSelected,
                        ]}
                      >
                        {p.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={{ marginTop: spacing.sm }}>
                  <Text style={styles.label}>Position Relation</Text>
                  <View style={styles.salahModeRow}>
                    {(['after', 'before'] as AnchorRelation[]).map((rel) => (
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
                          {rel === 'after' ? 'After Prayer Finishes' : 'Before Prayer Begins'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={{ marginTop: spacing.sm }}>
                  <Text style={styles.label}>Offset (Minutes)</Text>
                  <TextInput
                    style={styles.input}
                    value={offsetMinutes}
                    onChangeText={setOffsetMinutes}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                  />

                  <View style={styles.quickOffsetRow}>
                    {[0, 5, 10, 15, 30].map((m) => (
                      <TouchableOpacity
                        key={m}
                        style={[
                          styles.quickOffsetChip,
                          offsetMinutes === m.toString() && styles.quickOffsetChipSelected,
                        ]}
                        onPress={() => setOffsetMinutes(m.toString())}
                      >
                        <Text
                          style={[
                            styles.quickOffsetChipText,
                            offsetMinutes === m.toString() && styles.quickOffsetChipTextSelected,
                          ]}
                        >
                          {m === 0 ? '0m (Immediate)' : `${m}m`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Live Calculated Schedule Preview Card */}
        {computedPreview && (
          <View style={styles.previewCard}>
            <View style={styles.previewHeaderRow}>
              <MaterialCommunityIcons name="clock-check-outline" size={18} color={colors.primary} />
              <Text style={styles.previewHeader}>Calculated Schedule Preview</Text>
            </View>

            <View style={styles.previewTimeRow}>
              <Text style={styles.previewTime}>
                {computedPreview.displayStart} – {computedPreview.displayEnd}
              </Text>
              <View style={styles.previewDurationBadge}>
                <Text style={styles.previewDurationText}>{durationMinutes} min</Text>
              </View>
            </View>

            <Text style={styles.previewExplanation}>{computedPreview.explanation}</Text>

            {/* Quick action: Fit duration till next task */}
            {computedPreview.nextTask &&
              computedPreview.minutesToNext !== null &&
              computedPreview.minutesToNext > 0 &&
              computedPreview.minutesToNext !== parseInt(durationMinutes, 10) && (
                <TouchableOpacity
                  style={styles.fitNextButton}
                  onPress={() => setDurationMinutes(computedPreview.minutesToNext!.toString())}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="clock-fast" size={15} color={colors.primary} />
                  <Text style={styles.fitNextButtonText}>
                    Fit duration till next task: {computedPreview.nextTask.title} (
                    {computedPreview.minutesToNext}m till {computedPreview.nextTask.displayStartTime}
                    )
                  </Text>
                </TouchableOpacity>
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
  prayerScrollRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  prayerChip: {
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  prayerChipSelected: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  prayerChipText: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.semibold,
  },
  prayerChipTextSelected: {
    color: colors.primaryLight,
    fontWeight: typography.fontWeight.bold,
  },
  quickOffsetRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
    flexWrap: 'wrap',
  },
  quickOffsetChip: {
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  quickOffsetChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  quickOffsetChipText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  quickOffsetChipTextSelected: {
    color: colors.textOnPrimary,
    fontWeight: typography.fontWeight.bold,
  },
  previewCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginBottom: spacing.md,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  previewHeader: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary,
    marginLeft: spacing.xs,
  },
  previewTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: spacing.xs,
  },
  previewTime: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  previewDurationBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  previewDurationText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary,
  },
  previewExplanation: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  fitNextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  fitNextButtonText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginLeft: spacing.xs,
    flex: 1,
  },
});
