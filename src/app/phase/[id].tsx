import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Header } from '../../components/common/Header';
import { TaskReorderList } from '../../components/timeline/TaskReorderList';
import { useScheduleStore } from '../../store/useScheduleStore';
import { usePrayerStore } from '../../store/usePrayerStore';
import { phaseRepository } from '../../database/repositories/phaseRepository';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { Phase, ScheduledTask, TaskStatus } from '../../types';

export default function PhaseDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { dailySchedule, reorderTasks, toggleTaskStatus, moveTaskOrder, deletePhase } = useScheduleStore();
  const { todayTimings } = usePrayerStore();

  const [phase, setPhase] = useState<Phase | null>(null);

  useEffect(() => {
    const fetchPhase = async () => {
      if (id) {
        const p = await phaseRepository.getById(id);
        setPhase(p);
      }
    };
    fetchPhase();
  }, [id]);

  const scheduledPhase = dailySchedule?.phases.find((p) => p.id === id);
  const tasks: ScheduledTask[] = scheduledPhase?.tasks || [];

  const handleReorder = async (newOrderedTasks: ScheduledTask[]) => {
    if (!id || !todayTimings || !Array.isArray(newOrderedTasks)) return;
    const taskIds = newOrderedTasks
      .filter((t): t is ScheduledTask => Boolean(t && t.id))
      .map((t) => t.id);
    if (taskIds.length === 0) return;
    try {
      await reorderTasks(id, taskIds, todayTimings);
    } catch (e) {
      console.warn('Failed to persist task reorder:', e);
    }
  };

  const handleToggleStatus = async (taskId: string, status: TaskStatus) => {
    if (todayTimings) {
      await toggleTaskStatus(taskId, status, todayTimings);
    }
  };

  const handleMoveUp = async (taskId: string) => {
    if (!id || !todayTimings) return;
    await moveTaskOrder(taskId, id, 'up', todayTimings);
  };

  const handleMoveDown = async (taskId: string) => {
    if (!id || !todayTimings) return;
    await moveTaskOrder(taskId, id, 'down', todayTimings);
  };

  const handleDeletePhase = async () => {
    if (!phase) return;
    if (phase.isDefault) {
      Alert.alert('Protected Phase', 'Default Salah phases cannot be deleted.');
      return;
    }

    Alert.alert(
      'Delete Phase',
      `Are you sure you want to delete "${phase.name}" and all its tasks?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (todayTimings) {
              await deletePhase(phase.id, todayTimings);
              router.back();
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={phase?.name || 'Phase Details'}
        subtitle={
          scheduledPhase
            ? `${scheduledPhase.displayStartTime} - ${scheduledPhase.displayEndTime} • ${tasks.length} tasks`
            : undefined
        }
        showBack={true}
        rightAction={
          !phase?.isDefault
            ? {
                icon: 'trash-can-outline',
                onPress: handleDeletePhase,
              }
            : undefined
        }
      />

      <View style={styles.container}>
        {/* Phase Info Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerRow}>
            <View style={styles.infoCol}>
              <Text style={styles.bannerTitle}>
                {phase?.isDefault ? 'Obligatory Salah Phase' : 'Custom Phase'}
              </Text>
              <Text style={styles.bannerSub}>
                Long press & drag the handle to reorder, or use the arrow buttons. Ordering is persisted immediately to database.
              </Text>
            </View>
          </View>
        </View>

        {/* Drag & Drop Reorderable Task List */}
        <View style={styles.listWrapper}>
          <TaskReorderList
            tasks={tasks}
            onReorder={handleReorder}
            onToggleStatus={handleToggleStatus}
            onEditTask={(taskId) => router.push(`/task/${taskId}` as any)}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
          />
        </View>

        {/* Add Task Action Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push(`/task/new?phaseId=${id}` as any)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="plus" size={20} color={colors.textOnPrimary} />
            <Text style={styles.addButtonText}>Add Task to this Phase</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    backgroundColor: colors.background,
  },
  banner: {
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoCol: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.heavy,
    color: colors.primaryLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bannerSub: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  listWrapper: {
    flex: 1,
    paddingTop: spacing.sm,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  addButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  addButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.textOnPrimary,
  },
});
