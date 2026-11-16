import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScheduledTask, TaskStatus } from '../../types';
import { TaskCard } from '../cards/TaskCard';
import { colors, typography, spacing } from '../../theme';

interface TaskReorderListProps {
  tasks: ScheduledTask[];
  onReorder: (newOrderedTasks: ScheduledTask[]) => void;
  onToggleStatus: (taskId: string, status: TaskStatus) => void;
  onEditTask: (taskId: string) => void;
  onMoveUp: (taskId: string) => void;
  onMoveDown: (taskId: string) => void;
}

export const TaskReorderList: React.FC<TaskReorderListProps> = ({
  tasks,
  onReorder,
  onToggleStatus,
  onEditTask,
  onMoveUp,
  onMoveDown,
}) => {
  const renderItem = ({ item, drag, isActive, getIndex }: RenderItemParams<ScheduledTask>) => {
    const index = getIndex() ?? 0;
    const canMoveUp = index > 0;
    const canMoveDown = index < tasks.length - 1;

    return (
      <ScaleDecorator>
        <View style={[styles.itemWrapper, isActive && styles.itemActive]}>
          <TaskCard
            task={item}
            onToggleStatus={(status) => onToggleStatus(item.id, status)}
            onPress={() => onEditTask(item.id)}
            canMoveUp={canMoveUp}
            canMoveDown={canMoveDown}
            onMoveUp={() => onMoveUp(item.id)}
            onMoveDown={() => onMoveDown(item.id)}
            showReorderControls={true}
            dragHandle={
              <TouchableOpacity
                onLongPress={drag}
                delayLongPress={100}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.dragHandle}
              >
                <MaterialCommunityIcons
                  name="drag-vertical"
                  size={22}
                  color={isActive ? colors.primary : colors.textMuted}
                />
              </TouchableOpacity>
            }
          />
        </View>
      </ScaleDecorator>
    );
  };

  return (
    <DraggableFlatList
      data={tasks}
      keyExtractor={(item) => item.id}
      onDragEnd={({ data }) => onReorder(data)}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="format-list-checks"
            size={36}
            color={colors.textDisabled}
          />
          <Text style={styles.emptyText}>No tasks yet in this phase.</Text>
          <Text style={styles.emptySubText}>
            Tap "Add Task" below to schedule tasks before or after the core Salah.
          </Text>
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 100,
    paddingHorizontal: spacing.lg,
  },
  itemWrapper: {
    marginVertical: 2,
  },
  itemActive: {
    opacity: 0.9,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  dragHandle: {
    padding: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  emptyText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  emptySubText: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: spacing.lg,
  },
});
