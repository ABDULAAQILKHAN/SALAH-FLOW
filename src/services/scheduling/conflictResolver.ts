import { ScheduledTask, SchedulingConflict, Phase } from '../../types';
import { isBefore, isAfter, addMinutes } from 'date-fns';
import { generateUUID } from '../../utils/uuid';
import { formatTime12h } from '../../utils/dateTime';

export const conflictResolver = {
  detectConflicts(
    tasks: ScheduledTask[],
    phaseBoundaries?: Map<string, { startTime: Date; endTime: Date }>
  ): SchedulingConflict[] {
    const conflicts: SchedulingConflict[] = [];

    // Sort tasks by start time for overlap detection
    const sortedTasks = [...tasks].sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime()
    );

    for (let i = 0; i < sortedTasks.length; i++) {
      const current = sortedTasks[i];

      // 1. Check phase boundaries if provided
      if (phaseBoundaries && phaseBoundaries.has(current.phaseId)) {
        const boundary = phaseBoundaries.get(current.phaseId)!;
        if (isBefore(current.startTime, boundary.startTime)) {
          conflicts.push({
            id: generateUUID(),
            taskId: current.id,
            conflictType: 'phase_boundary_exceeded',
            message: `"${current.title}" starts at ${formatTime12h(current.startTime)}, before its phase window (${formatTime12h(boundary.startTime)}).`,
            suggestedStartTime: boundary.startTime,
            severity: 'warning',
          });
        } else if (isAfter(current.endTime, boundary.endTime)) {
          conflicts.push({
            id: generateUUID(),
            taskId: current.id,
            conflictType: 'phase_boundary_exceeded',
            message: `"${current.title}" ends at ${formatTime12h(current.endTime)}, after its phase window (${formatTime12h(boundary.endTime)}).`,
            suggestedStartTime: boundary.startTime,
            severity: 'warning',
          });
        }
      }

      // 2. Check overlaps with subsequent tasks
      for (let j = i + 1; j < sortedTasks.length; j++) {
        const next = sortedTasks[j];

        // If next task starts before current task ends -> Overlap!
        if (isBefore(next.startTime, current.endTime)) {
          // If one is core prayer, the other task is the one in conflict
          const isCurrentCore = current.isCore && current.taskType === 'prayer';
          const isNextCore = next.isCore && next.taskType === 'prayer';

          const affectedTask = isCurrentCore ? next : current;
          const opposingTask = isCurrentCore ? current : next;

          conflicts.push({
            id: generateUUID(),
            taskId: affectedTask.id,
            conflictingTaskId: opposingTask.id,
            conflictType: isCurrentCore || isNextCore ? 'outside_prayer_window' : 'overlap',
            message: `"${affectedTask.title}" (${formatTime12h(affectedTask.startTime)} - ${formatTime12h(affectedTask.endTime)}) overlaps with "${opposingTask.title}" (${formatTime12h(opposingTask.startTime)} - ${formatTime12h(opposingTask.endTime)}).`,
            suggestedStartTime: opposingTask.endTime,
            severity: isCurrentCore || isNextCore ? 'error' : 'warning',
          });
        } else {
          // Since sorted, once next.startTime >= current.endTime, no further overlap with current
          break;
        }
      }
    }

    return conflicts;
  },

  suggestResolution(
    conflict: SchedulingConflict,
    allTasks: ScheduledTask[]
  ): Date | null {
    if (conflict.suggestedStartTime) {
      return conflict.suggestedStartTime;
    }

    const task = allTasks.find((t) => t.id === conflict.taskId);
    if (!task) return null;

    if (conflict.conflictingTaskId) {
      const opposing = allTasks.find((t) => t.id === conflict.conflictingTaskId);
      if (opposing) {
        // Place right after the opposing task
        return opposing.endTime;
      }
    }

    return null;
  },
};
