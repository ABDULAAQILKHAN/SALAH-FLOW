import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Header } from '../../components/common/Header';
import { Button } from '../../components/common/Button';
import { phaseRepository } from '../../database/repositories/phaseRepository';
import { taskRepository } from '../../database/repositories/taskRepository';
import { phaseEngine } from '../../services/scheduling/phaseEngine';
import { useScheduleStore } from '../../store/useScheduleStore';
import { usePrayerStore } from '../../store/usePrayerStore';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { generateUUID } from '../../utils/uuid';
import { Phase, Task } from '../../types';

const PHASE_COLORS = [
  '#10B981', // Emerald
  '#0EA5E9', // Sky
  '#6366F1', // Indigo
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#14B8A6', // Teal
];

const PHASE_ICONS = [
  'book-open-page-variant',
  'laptop',
  'dumbbell',
  'briefcase',
  'school',
  'coffee',
  'home-heart',
];

export default function PhaseBuilderScreen() {
  const { loadSchedule, selectedDate } = useScheduleStore();
  const { todayTimings } = usePrayerStore();

  const [phaseName, setPhaseName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PHASE_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState(PHASE_ICONS[0]);

  // Core task requirements (strictly required!)
  const [coreTaskTitle, setCoreTaskTitle] = useState('');
  const [coreTaskDuration, setCoreTaskDuration] = useState('45');
  const [coreTaskDescription, setCoreTaskDescription] = useState('');

  // Initial supporting task
  const [supportingTaskTitle, setSupportingTaskTitle] = useState('');

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const validation = phaseEngine.validateCustomPhase(
      phaseName,
      coreTaskTitle,
      parseInt(coreTaskDuration, 10) || 0
    );

    if (!validation.valid) {
      Alert.alert('Validation Error', validation.error);
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const phaseId = generateUUID();
      const totalPhases = await phaseRepository.count();

      const newPhase: Phase = {
        id: phaseId,
        name: phaseName.trim(),
        type: 'custom',
        sortOrder: totalPhases + 1,
        isDefault: false,
        isEnabled: true,
        color: selectedColor,
        icon: selectedIcon,
        createdAt: now,
        updatedAt: now,
      };

      await phaseRepository.create(newPhase);

      // Create the single designated core task
      const coreTask: Task = {
        id: generateUUID(),
        phaseId,
        title: coreTaskTitle.trim(),
        description: coreTaskDescription.trim() || undefined,
        taskType: 'custom_core',
        isCore: true,
        sortOrder: 10,
        durationMinutes: parseInt(coreTaskDuration, 10) || 45,
        schedulingType: 'flexible',
        offsetMinutes: 0,
        priority: 'core',
        isEnabled: true,
        createdAt: now,
        updatedAt: now,
      };
      await taskRepository.create(coreTask);

      // Create optional companion task if filled
      if (supportingTaskTitle.trim()) {
        const supportTask: Task = {
          id: generateUUID(),
          phaseId,
          title: supportingTaskTitle.trim(),
          taskType: 'activity',
          isCore: false,
          sortOrder: 20,
          durationMinutes: 30,
          schedulingType: 'flexible',
          offsetMinutes: 0,
          priority: 'medium',
          isEnabled: true,
          createdAt: now,
          updatedAt: now,
        };
        await taskRepository.create(supportTask);
      }

      if (todayTimings) {
        await loadSchedule(selectedDate, todayTimings);
      }

      router.back();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create phase.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Phase Builder" subtitle="Create Custom Timetable Phase" showBack={true} />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Phase Details Card */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Phase Details</Text>

          <Text style={styles.label}>Phase Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Evening Coding / Deep Study"
            placeholderTextColor={colors.textDisabled}
            value={phaseName}
            onChangeText={setPhaseName}
          />

          <Text style={styles.label}>Theme Color</Text>
          <View style={styles.colorRow}>
            {PHASE_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setSelectedColor(c)}
                style={[
                  styles.colorCircle,
                  { backgroundColor: c },
                  selectedColor === c && styles.colorCircleSelected,
                ]}
              />
            ))}
          </View>

          <Text style={styles.label}>Icon</Text>
          <View style={styles.iconRow}>
            {PHASE_ICONS.map((ic) => (
              <TouchableOpacity
                key={ic}
                onPress={() => setSelectedIcon(ic)}
                style={[
                  styles.iconBox,
                  selectedIcon === ic && styles.iconBoxSelected,
                ]}
              >
                <MaterialCommunityIcons
                  name={ic as any}
                  size={22}
                  color={selectedIcon === ic ? colors.primaryLight : colors.textSecondary}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Designated Core Task Card (Mandatory Requirement) */}
        <View style={styles.cardHighlight}>
          <View style={styles.badgeRow}>
            <MaterialCommunityIcons name="star-circle" size={18} color={colors.primary} />
            <Text style={styles.highlightHeader}>Designated Core Task</Text>
          </View>
          <Text style={styles.highlightSub}>
            Every custom phase must have exactly one anchor core task that defines the purpose of the phase.
          </Text>

          <Text style={styles.label}>Core Task Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Study System Architecture"
            placeholderTextColor={colors.textDisabled}
            value={coreTaskTitle}
            onChangeText={setCoreTaskTitle}
          />

          <Text style={styles.label}>Duration (Minutes) *</Text>
          <TextInput
            style={styles.input}
            placeholder="45"
            placeholderTextColor={colors.textDisabled}
            keyboardType="number-pad"
            value={coreTaskDuration}
            onChangeText={setCoreTaskDuration}
          />

          <Text style={styles.label}>Description (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Notes or goals for this core session..."
            placeholderTextColor={colors.textDisabled}
            multiline
            numberOfLines={3}
            value={coreTaskDescription}
            onChangeText={setCoreTaskDescription}
          />
        </View>

        {/* Optional Companion Task */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Initial Supporting Task</Text>
          <Text style={styles.label}>Additional Task (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Read documentation / Review notes"
            placeholderTextColor={colors.textDisabled}
            value={supportingTaskTitle}
            onChangeText={setSupportingTaskTitle}
          />
        </View>

        {/* Submit */}
        <View style={styles.footer}>
          <Button
            title="Create Custom Phase"
            onPress={handleSave}
            loading={saving}
            variant="primary"
            size="lg"
            icon="plus-circle"
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
  cardHighlight: {
    backgroundColor: '#0F1E29',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  highlightHeader: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.primaryLight,
  },
  highlightSub: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  sectionHeader: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
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
    height: 80,
    textAlignVertical: 'top',
  },
  colorRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginVertical: spacing.xs,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  iconRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginVertical: spacing.xs,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  iconBoxSelected: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  footer: {
    marginTop: spacing.lg,
  },
});
