import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { ScheduledPhase, ScheduledTask, TaskStatus } from '../../types';
import { ProgressBar } from '../common/ProgressBar';
import { TaskCard } from './TaskCard';
import { router } from 'expo-router';

interface PhaseCardProps {
  phase: ScheduledPhase;
  onToggleTaskStatus: (taskId: string, status: TaskStatus) => void;
  isInitiallyExpanded?: boolean;
}

export const PhaseCard: React.FC<PhaseCardProps> = ({
  phase,
  onToggleTaskStatus,
  isInitiallyExpanded = true,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(isInitiallyExpanded);

  const coreNames = phase.coreTasks.map((t) => t.title).join(' & ');

  return (
    <View style={styles.card}>
      {/* Header Row */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setIsExpanded(!isExpanded)}
        style={styles.header}
      >
        <View style={styles.left}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: phase.color ? `${phase.color}25` : colors.primaryMuted },
            ]}
          >
            <MaterialCommunityIcons
              name={(phase.icon as any) || 'clock-outline'}
              size={20}
              color={phase.color || colors.primary}
            />
          </View>

          <View style={styles.headerTitles}>
            <View style={styles.titleRow}>
              <Text style={styles.phaseName}>{phase.name}</Text>
            </View>

            <View style={styles.subRow}>
              <Text style={styles.timeRange}>
                {phase.displayStartTime} - {phase.displayEndTime}
              </Text>
              {coreNames ? (
                <>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.coreName} numberOfLines={1}>
                    {coreNames}
                  </Text>
                </>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.right}>
          <Text style={styles.progressText}>
            {phase.completedCount}/{phase.totalCount}
          </Text>
          <MaterialCommunityIcons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={22}
            color={colors.textSecondary}
          />
        </View>
      </TouchableOpacity>

      {/* Progress Bar */}
      <View style={styles.progressWrapper}>
        <ProgressBar
          progress={phase.progressPercent}
          color={phase.color || colors.primary}
          height={4}
        />
      </View>

      {/* Expanded Task List */}
      {isExpanded && (
        <View style={styles.taskList}>
          {phase.tasks.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No tasks in this phase yet.</Text>
            </View>
          ) : (
            phase.tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggleStatus={(status) => onToggleTaskStatus(task.id, status)}
                onPress={() => router.push(`/task/${task.id}` as any)}
              />
            ))
          )}

          {/* Manage / Reorder Action */}
          <TouchableOpacity
            style={styles.manageButton}
            onPress={() => router.push(`/phase/${phase.id}` as any)}
          >
            <MaterialCommunityIcons
              name="reorder-horizontal"
              size={16}
              color={colors.primary}
            />
            <Text style={styles.manageButtonText}>
              Manage & Reorder Phase Tasks
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  headerTitles: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  phaseName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  timeRange: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  bullet: {
    color: colors.textMuted,
    marginHorizontal: 4,
    fontSize: 10,
  },
  coreName: {
    fontSize: typography.fontSize.xs,
    color: colors.primaryLight,
    fontWeight: typography.fontWeight.medium,
    flex: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  progressText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
  },
  progressWrapper: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  taskList: {
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
    paddingTop: spacing.sm,
  },
  emptyContainer: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: typography.fontSize.xs,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceHighlight,
    gap: spacing.xs,
  },
  manageButtonText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary,
  },
});
