import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { ScheduledTask, TaskStatus } from '../../types';
import { Badge } from '../common/Badge';

interface TaskCardProps {
  task: ScheduledTask;
  onToggleStatus: (newStatus: TaskStatus) => void;
  onPress?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  showReorderControls?: boolean;
  dragHandle?: React.ReactNode;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onToggleStatus,
  onPress,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
  showReorderControls = false,
  dragHandle,
}) => {
  const isCompleted = task.status === 'completed';

  const handleToggle = () => {
    const nextStatus: TaskStatus = isCompleted ? 'pending' : 'completed';
    onToggleStatus(nextStatus);
  };

  return (
    <View
      style={[
        styles.card,
        task.isCore && styles.cardCore,
        isCompleted && styles.cardCompleted,
      ]}
    >
      <View style={styles.mainRow}>
        {/* Drag handle or reorder controls */}
        {dragHandle ? (
          <View style={styles.dragContainer}>{dragHandle}</View>
        ) : showReorderControls ? (
          <View style={styles.reorderButtons}>
            <TouchableOpacity
              onPress={onMoveUp}
              disabled={!canMoveUp}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              style={[styles.arrowButton, !canMoveUp && styles.arrowDisabled]}
            >
              <MaterialCommunityIcons
                name="chevron-up"
                size={18}
                color={canMoveUp ? colors.textPrimary : colors.textDisabled}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onMoveDown}
              disabled={!canMoveDown}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              style={[styles.arrowButton, !canMoveDown && styles.arrowDisabled]}
            >
              <MaterialCommunityIcons
                name="chevron-down"
                size={18}
                color={canMoveDown ? colors.textPrimary : colors.textDisabled}
              />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Completion Checkbox */}
        <TouchableOpacity
          onPress={handleToggle}
          activeOpacity={0.7}
          style={[
            styles.checkbox,
            isCompleted && styles.checkboxCompleted,
            task.isCore && !isCompleted && styles.checkboxCore,
          ]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {isCompleted && (
            <MaterialCommunityIcons
              name="check-bold"
              size={14}
              color={colors.textOnPrimary}
            />
          )}
        </TouchableOpacity>

        {/* Task Details */}
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.8}
          style={styles.details}
        >
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.title,
                isCompleted && styles.titleCompleted,
                task.isCore && styles.titleCore,
              ]}
              numberOfLines={1}
            >
              {task.title}
            </Text>

            {task.isCore && (
              <Badge
                label={task.prayerType ? task.prayerType.toUpperCase() : 'CORE'}
                variant="core"
                size="sm"
              />
            )}
          </View>

          {task.description ? (
            <Text
              style={[styles.description, isCompleted && styles.descCompleted]}
              numberOfLines={1}
            >
              {task.description}
            </Text>
          ) : null}

          <View style={styles.metaRow}>
            <View style={styles.timeTag}>
              <MaterialCommunityIcons
                name="clock-time-four-outline"
                size={13}
                color={colors.textSecondary}
              />
              <Text style={styles.timeText}>
                {task.displayStartTime} - {task.displayEndTime}
              </Text>
            </View>

            <View style={styles.durationTag}>
              <Text style={styles.durationText}>{task.durationMinutes}m</Text>
            </View>

            {task.alarm && task.alarm.isEnabled && (
              <View style={styles.alarmTag}>
                <MaterialCommunityIcons
                  name="bell-ring-outline"
                  size={12}
                  color={colors.gold}
                />
                {task.alarm.reminderMinutes > 0 && (
                  <Text style={styles.alarmReminderText}>
                    -{task.alarm.reminderMinutes}m
                  </Text>
                )}
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  cardCore: {
    backgroundColor: '#0F1B24',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  cardCompleted: {
    opacity: 0.6,
    backgroundColor: colors.surfaceHighlight,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dragContainer: {
    marginRight: spacing.sm,
    padding: spacing.xs,
  },
  reorderButtons: {
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowButton: {
    padding: 2,
  },
  arrowDisabled: {
    opacity: 0.3,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.8,
    borderColor: colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  checkboxCore: {
    borderColor: colors.primary,
  },
  checkboxCompleted: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  details: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    flex: 1,
  },
  titleCore: {
    color: colors.primaryLight,
    fontWeight: typography.fontWeight.bold,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  description: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  descCompleted: {
    textDecorationLine: 'line-through',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: spacing.sm,
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  durationTag: {
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  durationText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  alarmTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.goldMuted,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    gap: 2,
  },
  alarmReminderText: {
    fontSize: 10,
    color: colors.gold,
    fontWeight: typography.fontWeight.bold,
  },
});
