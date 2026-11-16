import {
  Phase,
  Task,
  TaskAlarm,
  DailyTaskStatus,
  ScheduledTask,
  ScheduledPhase,
  DailySchedule,
  PrayerName,
} from '../../types';
import { CalculatedTimes, getNextPrayer, getCurrentPrayerPhase } from '../prayer/prayerCalculator';
import { phaseEngine } from './phaseEngine';
import { conflictResolver } from './conflictResolver';
import {
  formatDateKey,
  formatTime12h,
  addMinutesToDate,
  subMinutesFromDate,
  parseTimeToDate,
  isTimeInRange,
} from '../../utils/dateTime';
import { isBefore, isAfter, addMinutes } from 'date-fns';

export function getPrayerAnchorTime(
  prayer: PrayerName,
  times: CalculatedTimes
): Date {
  switch (prayer) {
    case 'tahajjud':
      return times.tahajjud;
    case 'fajr':
      return times.fajr;
    case 'sunrise':
      return times.sunrise;
    case 'zuhr':
      return times.dhuhr;
    case 'asr':
      return times.asr;
    case 'maghrib':
      return times.maghrib;
    case 'isha':
      return times.isha;
    default:
      return times.dhuhr;
  }
}

export const scheduleEngine = {
  computeScheduledTask(
    task: Task,
    date: Date,
    times: CalculatedTimes,
    statusMap: Map<string, DailyTaskStatus>,
    alarmMap: Map<string, TaskAlarm>,
    phaseStartTime?: Date
  ): ScheduledTask {
    let start: Date;
    let end: Date;

    if (task.schedulingType === 'fixed_time' && task.fixedTime) {
      start = parseTimeToDate(task.fixedTime, date);
      end = addMinutesToDate(start, task.durationMinutes);
    } else if (task.schedulingType === 'prayer_relative' && task.anchorPrayer) {
      const anchorTime = getPrayerAnchorTime(task.anchorPrayer, times);

      if (task.anchorRelation === 'before') {
        end = subMinutesFromDate(anchorTime, task.offsetMinutes);
        start = subMinutesFromDate(end, task.durationMinutes);
      } else {
        // after
        start = addMinutesToDate(anchorTime, task.offsetMinutes);
        end = addMinutesToDate(start, task.durationMinutes);
      }
    } else {
      // Flexible task or fallback: anchor relative to phase start or previous task
      const base = phaseStartTime || times.dhuhr;
      start = addMinutesToDate(base, (task.sortOrder % 100) * 5);
      end = addMinutesToDate(start, task.durationMinutes);
    }

    const dailyStatus = statusMap.get(task.id);
    const status = dailyStatus ? dailyStatus.status : 'pending';
    const alarm = alarmMap.get(task.id);

    return {
      ...task,
      startTime: start,
      endTime: end,
      displayStartTime: formatTime12h(start),
      displayEndTime: formatTime12h(end),
      status,
      completedAt: dailyStatus?.completedAt,
      alarm,
    };
  },

  buildDailySchedule(
    date: Date,
    phases: Phase[],
    tasks: Task[],
    times: CalculatedTimes,
    statuses: DailyTaskStatus[] = [],
    alarms: TaskAlarm[] = [],
    now: Date = new Date()
  ): DailySchedule {
    const statusMap = new Map<string, DailyTaskStatus>();
    for (const s of statuses) {
      statusMap.set(s.taskId, s);
    }

    const alarmMap = new Map<string, TaskAlarm>();
    for (const a of alarms) {
      alarmMap.set(a.taskId, a);
    }

    const boundaries = phaseEngine.calculateBoundariesForPhases(phases, times);

    // Group tasks by phaseId
    const tasksByPhase = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.isEnabled) continue;
      const list = tasksByPhase.get(t.phaseId) || [];
      list.push(t);
      tasksByPhase.set(t.phaseId, list);
    }

    const scheduledPhases: ScheduledPhase[] = [];
    const allScheduledTasks: ScheduledTask[] = [];

    // Sort phases by sortOrder
    const sortedPhases = [...phases]
      .filter((p) => p.isEnabled)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    for (const phase of sortedPhases) {
      const boundary = boundaries.get(phase.id) || {
        startTime: times.tahajjud,
        endTime: times.isha,
      };

      const phaseTasks = (tasksByPhase.get(phase.id) || []).sort(
        (a, b) => a.sortOrder - b.sortOrder
      );

      const scheduledTasksInPhase: ScheduledTask[] = [];

      for (const task of phaseTasks) {
        const scheduled = this.computeScheduledTask(
          task,
          date,
          times,
          statusMap,
          alarmMap,
          boundary.startTime
        );
        scheduledTasksInPhase.push(scheduled);
        allScheduledTasks.push(scheduled);
      }

      // Sort tasks by sortOrder first, or chronological start time
      scheduledTasksInPhase.sort((a, b) => a.sortOrder - b.sortOrder);

      const coreTasks = scheduledTasksInPhase.filter((t) => t.isCore);
      const totalCount = scheduledTasksInPhase.length;
      const completedCount = scheduledTasksInPhase.filter(
        (t) => t.status === 'completed'
      ).length;
      const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      scheduledPhases.push({
        ...phase,
        startTime: boundary.startTime,
        endTime: boundary.endTime,
        displayStartTime: formatTime12h(boundary.startTime),
        displayEndTime: formatTime12h(boundary.endTime),
        tasks: scheduledTasksInPhase,
        coreTasks,
        progressPercent,
        completedCount,
        totalCount,
      });
    }

    // Detect conflicts
    const conflicts = conflictResolver.detectConflicts(allScheduledTasks, boundaries);

    // Find current phase
    const currentPhase = scheduledPhases.find((p) =>
      isTimeInRange(now, p.startTime, p.endTime)
    ) || scheduledPhases[0];

    // Find upcoming task: first pending task where endTime > now
    const upcomingTask = allScheduledTasks
      .filter((t) => t.status === 'pending' && isAfter(t.endTime, now))
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())[0];

    // Progress metrics
    const totalTasks = allScheduledTasks.length;
    const completedTasks = allScheduledTasks.filter((t) => t.status === 'completed').length;
    const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const nextPrayer = getNextPrayer(times, now);

    return {
      date: formatDateKey(date),
      phases: scheduledPhases,
      conflicts,
      overallProgress,
      totalTasks,
      completedTasks,
      upcomingTask,
      currentPhase,
      nextPrayer,
    };
  },
};
