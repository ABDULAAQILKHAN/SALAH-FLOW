import React, { useState, useMemo } from 'react';
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
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Header } from '../../components/common/Header';
import { Button } from '../../components/common/Button';
import { taskRepository } from '../../database/repositories/taskRepository';
import { taskAlarmRepository } from '../../database/repositories/taskAlarmRepository';
import { useScheduleStore } from '../../store/useScheduleStore';
import { usePrayerStore } from '../../store/usePrayerStore';
import { PEACEFUL_ALARM_TONES } from '../../constants/sounds';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { generateUUID } from '../../utils/uuid';
import {
  SchedulingType,
  AnchorRelation,
  PrayerName,
  TaskPriority,
  RepeatRule,
} from '../../types';
import {
  formatTime12h,
  parseTimeToDate,
  addMinutesToDate,
  subMinutesFromDate,
} from '../../utils/dateTime';
import { getPrayerAnchorTime } from '../../services/scheduling/scheduleEngine';

export default function NewTaskScreen() {
  const { phaseId } = useLocalSearchParams<{ phaseId?: string }>();
  const { phases, dailySchedule, loadSchedule, selectedDate } = useScheduleStore();
  const { todayTimings } = usePrayerStore();

  const [selectedPhaseId, setSelectedPhaseId] = useState<string>(
    phaseId || phases[0]?.id || ''
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('20');
  const [priority, setPriority] = useState<TaskPriority>('medium');

  // Scheduling type
  const [schedulingType, setSchedulingType] = useState<SchedulingType>('prayer_relative');
  const [anchorPrayer, setAnchorPrayer] = useState<PrayerName>('fajr');
  const [anchorRelation, setAnchorRelation] = useState<AnchorRelation>('after');
  const [offsetMinutes, setOffsetMinutes] = useState('0');
  const [fixedTime, setFixedTime] = useState('06:03');

  // Alarm settings
  const [alarmEnabled, setAlarmEnabled] = useState(true);
  const [reminderMinutes, setReminderMinutes] = useState(10);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundTone, setSoundTone] = useState<string>('peaceful_adhan');
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [repeatRule, setRepeatRule] = useState<RepeatRule>('daily');

  const [saving, setSaving] = useState(false);

  const computedPreview = useMemo(() => {
    if (!todayTimings) return null;
    const duration = parseInt(durationMinutes, 10) || 20;
    const offset = parseInt(offsetMinutes, 10) || 0;
    const now = new Date();

    const phase = dailySchedule?.phases.find((p) => p.id === selectedPhaseId);
    const phaseTasks = phase?.tasks || [];
    const prevTask = phaseTasks.length > 0 ? phaseTasks[phaseTasks.length - 1] : undefined;

    let start: Date;
    let explanation = '';

    if (schedulingType === 'fixed_time' && fixedTime.trim()) {
      start = parseTimeToDate(fixedTime.trim(), now);
      explanation = `Fixed clock time: ${formatTime12h(start)}`;
    } else if (schedulingType === 'prayer_relative' && anchorPrayer) {
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
        explanation = 'Flexible slot in phase';
      }
    }

    const end = addMinutesToDate(start, duration);
    return {
      startTime: start,
      endTime: end,
      displayStart: formatTime12h(start),
      displayEnd: formatTime12h(end),
      explanation,
      prevTask,
    };
  }, [
    todayTimings,
    dailySchedule,
    selectedPhaseId,
    durationMinutes,
    offsetMinutes,
    schedulingType,
    anchorPrayer,
    anchorRelation,
    fixedTime,
  ]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a task title.');
      return;
    }

    if (!selectedPhaseId) {
      Alert.alert('Required', 'Please select a phase for this task.');
      return;
    }

    const duration = parseInt(durationMinutes, 10);
    if (isNaN(duration) || duration <= 0) {
      Alert.alert('Invalid Duration', 'Duration must be at least 1 minute.');
      return;
    }

    setSaving(true);
    try {
      const taskId = generateUUID();
      const now = new Date().toISOString();
      const existingTasks = await taskRepository.getByPhaseId(selectedPhaseId);
      const nextSortOrder = (existingTasks.length + 1) * 10;

      await taskRepository.create({
        id: taskId,
        phaseId: selectedPhaseId,
        title: title.trim(),
        description: description.trim() || undefined,
        taskType: 'activity',
        isCore: false,
        sortOrder: nextSortOrder,
        durationMinutes: duration,
        schedulingType,
        fixedTime: schedulingType === 'fixed_time' ? fixedTime.trim() : undefined,
        anchorPrayer: schedulingType === 'prayer_relative' ? anchorPrayer : undefined,
        anchorRelation: schedulingType === 'prayer_relative' ? anchorRelation : undefined,
        offsetMinutes: schedulingType === 'prayer_relative' ? parseInt(offsetMinutes, 10) || 0 : 0,
        priority,
        isEnabled: true,
      });

      // Save alarm configuration
      if (alarmEnabled) {
        await taskAlarmRepository.upsert({
          id: generateUUID(),
          taskId,
          isEnabled: true,
          reminderMinutes,
          soundEnabled,
          soundTone,
          vibrationEnabled,
          snoozeMinutes: 5,
          repeatRule,
        });
      }

      if (todayTimings) {
        await loadSchedule(selectedDate, todayTimings);
      }

      router.back();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save task.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Add New Task" showBack={true} />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Phase Selector */}
        <View style={styles.card}>
          <Text style={styles.label}>Select Phase *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {phases.map((p) => {
              const isSelected = selectedPhaseId === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setSelectedPhaseId(p.id)}
                  style={[styles.phaseChip, isSelected && styles.phaseChipSelected]}
                >
                  <Text style={[styles.phaseChipText, isSelected && styles.phaseChipTextSelected]}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Task Details */}
        <View style={styles.card}>
          <Text style={styles.label}>Task Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Read Surah Al-Kahf / Gym Workout"
            placeholderTextColor={colors.textDisabled}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>Description (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Details, checklist items, or notes..."
            placeholderTextColor={colors.textDisabled}
            multiline
            numberOfLines={2}
            value={description}
            onChangeText={setDescription}
          />

          <Text style={styles.label}>Duration (Minutes) *</Text>
          <TextInput
            style={styles.input}
            placeholder="20"
            placeholderTextColor={colors.textDisabled}
            keyboardType="number-pad"
            value={durationMinutes}
            onChangeText={setDurationMinutes}
          />

          {/* Priority */}
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
        </View>

        {/* Dynamic Scheduling Engine Configuration */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Scheduling Engine</Text>

          <View style={styles.tabRow}>
            <TouchableOpacity
              onPress={() => setSchedulingType('prayer_relative')}
              style={[
                styles.tabButton,
                schedulingType === 'prayer_relative' && styles.tabButtonSelected,
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  schedulingType === 'prayer_relative' && styles.tabTextSelected,
                ]}
              >
                Prayer-Relative
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSchedulingType('fixed_time')}
              style={[
                styles.tabButton,
                schedulingType === 'fixed_time' && styles.tabButtonSelected,
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  schedulingType === 'fixed_time' && styles.tabTextSelected,
                ]}
              >
                Fixed Time
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSchedulingType('flexible')}
              style={[
                styles.tabButton,
                schedulingType === 'flexible' && styles.tabButtonSelected,
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  schedulingType === 'flexible' && styles.tabTextSelected,
                ]}
              >
                Flexible Slot
              </Text>
            </TouchableOpacity>
          </View>

          {schedulingType === 'prayer_relative' && (
            <View style={styles.relativeConfig}>
              <Text style={styles.helperText}>
                This task moves dynamically whenever its anchor prayer shifts throughout the year!
              </Text>

              <Text style={styles.label}>Anchor Prayer</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {(['tahajjud', 'fajr', 'sunrise', 'zuhr', 'asr', 'maghrib', 'isha'] as PrayerName[]).map(
                  (prayer) => (
                    <TouchableOpacity
                      key={prayer}
                      onPress={() => setAnchorPrayer(prayer)}
                      style={[
                        styles.prayerChip,
                        anchorPrayer === prayer && styles.prayerChipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.prayerChipText,
                          anchorPrayer === prayer && styles.prayerChipTextSelected,
                        ]}
                      >
                        {prayer.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </ScrollView>

              <Text style={styles.label}>Position Relation</Text>
              <View style={styles.relationRow}>
                <TouchableOpacity
                  onPress={() => setAnchorRelation('after')}
                  style={[
                    styles.relationButton,
                    anchorRelation === 'after' && styles.relationButtonSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.relationText,
                      anchorRelation === 'after' && styles.relationTextSelected,
                    ]}
                  >
                    After {anchorPrayer.toUpperCase()} Finishes
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setAnchorRelation('before')}
                  style={[
                    styles.relationButton,
                    anchorRelation === 'before' && styles.relationButtonSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.relationText,
                      anchorRelation === 'before' && styles.relationTextSelected,
                    ]}
                  >
                    Before {anchorPrayer.toUpperCase()} Begins
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Offset (Minutes)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={colors.textDisabled}
                keyboardType="number-pad"
                value={offsetMinutes}
                onChangeText={setOffsetMinutes}
              />

              <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
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
          )}

          {schedulingType === 'fixed_time' && (
            <View style={styles.relativeConfig}>
              <Text style={styles.helperText}>
                Fixed tasks (e.g. office, school, meetings) remain strictly at their clock time.
              </Text>
              <Text style={styles.label}>Start Time (e.g. 06:03 AM or 06:03)</Text>
              <TextInput
                style={styles.input}
                placeholder="06:03 AM"
                placeholderTextColor={colors.textDisabled}
                value={fixedTime}
                onChangeText={setFixedTime}
              />
            </View>
          )}

          {schedulingType === 'flexible' && (
            <View style={styles.relativeConfig}>
              <Text style={styles.helperText}>
                ● Sequential Flow: This task automatically begins right after the preceding task in this phase finishes.
              </Text>
            </View>
          )}
        </View>

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
          </View>
        )}

        {/* Alarm & Reminder Settings */}
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1, marginRight: spacing.md }}>
              <Text style={styles.sectionHeader}>Task Alarm & Reminders</Text>
              <Text style={styles.sectionDesc}>
                Set exact alarms and advance wake-up reminders for this task.
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

        {/* Save Button */}
        <View style={styles.footer}>
          <Button
            title="Create Task"
            onPress={handleSave}
            loading={saving}
            variant="primary"
            size="lg"
            icon="plus-box"
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
  chipRow: {
    flexDirection: 'row',
    marginVertical: spacing.xs,
  },
  phaseChip: {
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  phaseChipSelected: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  phaseChipText: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  phaseChipTextSelected: {
    color: colors.primaryLight,
    fontWeight: typography.fontWeight.bold,
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
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceHighlight,
    borderRadius: borderRadius.md,
    padding: 3,
    marginTop: spacing.sm,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  tabButtonSelected: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
  },
  tabTextSelected: {
    color: colors.textOnPrimary,
  },
  relativeConfig: {
    marginTop: spacing.md,
  },
  helperText: {
    fontSize: typography.fontSize.xs,
    color: colors.primaryLight,
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  prayerChip: {
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  prayerChipSelected: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  prayerChipText: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    color: colors.textSecondary,
  },
  prayerChipTextSelected: {
    color: colors.primaryLight,
  },
  relationRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  relationButton: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.surfaceHighlight,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  relationButtonSelected: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  relationText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
  },
  relationTextSelected: {
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
  reminderChip: {
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.sm,
    marginRight: spacing.xs,
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
});
