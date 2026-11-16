import { create } from 'zustand';
import {
  Phase,
  Task,
  DailySchedule,
  TaskStatus,
  TaskAlarm,
  ScheduledTask,
} from '../types';
import { phaseRepository } from '../database/repositories/phaseRepository';
import { taskRepository } from '../database/repositories/taskRepository';
import { taskAlarmRepository } from '../database/repositories/taskAlarmRepository';
import { dailyTaskStatusRepository } from '../database/repositories/dailyTaskStatusRepository';
import { scheduleEngine } from '../services/scheduling/scheduleEngine';
import { alarmManager } from '../services/alarms/alarmManager';
import { widgetService } from '../services/widget/widgetService';
import { CalculatedTimes } from '../services/prayer/prayerCalculator';
import { formatDateKey } from '../utils/dateTime';
import { parseISO } from 'date-fns';

interface ScheduleState {
  dailySchedule: DailySchedule | null;
  phases: Phase[];
  tasks: Task[];
  alarms: TaskAlarm[];
  isLoading: boolean;
  selectedDate: string;

  loadSchedule: (dateKey: string, times: CalculatedTimes) => Promise<void>;
  toggleTaskStatus: (taskId: string, newStatus: TaskStatus, times: CalculatedTimes) => Promise<void>;
  reorderTasks: (phaseId: string, orderedTaskIds: string[], times: CalculatedTimes) => Promise<void>;
  moveTaskOrder: (taskId: string, phaseId: string, direction: 'up' | 'down', times: CalculatedTimes) => Promise<void>;
  deleteTask: (taskId: string, times: CalculatedTimes) => Promise<void>;
  deletePhase: (phaseId: string, times: CalculatedTimes) => Promise<void>;
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  dailySchedule: null,
  phases: [],
  tasks: [],
  alarms: [],
  isLoading: false,
  selectedDate: formatDateKey(new Date()),

  loadSchedule: async (dateKey: string, times: CalculatedTimes) => {
    set({ isLoading: true, selectedDate: dateKey });
    try {
      const [phases, tasks, alarms, statuses] = await Promise.all([
        phaseRepository.getEnabled(),
        taskRepository.getAll(),
        taskAlarmRepository.getAllEnabled(),
        dailyTaskStatusRepository.getByDate(dateKey),
      ]);

      const targetDate = parseISO(dateKey);
      const schedule = scheduleEngine.buildDailySchedule(
        targetDate,
        phases,
        tasks,
        times,
        statuses,
        alarms,
        new Date()
      );

      set({
        phases,
        tasks,
        alarms,
        dailySchedule: schedule,
        isLoading: false,
      });

      // Synchronize alarms for today if current date
      if (dateKey === formatDateKey(new Date())) {
        const allTasks = schedule.phases.flatMap((p) => p.tasks);
        await alarmManager.syncAllAlarms(allTasks);
        widgetService.updateWidgetData(schedule);
      }
    } catch (e) {
      console.error('Failed to load daily schedule:', e);
      set({ isLoading: false });
    }
  },

  toggleTaskStatus: async (
    taskId: string,
    newStatus: TaskStatus,
    times: CalculatedTimes
  ) => {
    const { selectedDate } = get();
    await dailyTaskStatusRepository.setStatus(taskId, selectedDate, newStatus);

    // If completed, cancel pending alarm for today
    if (newStatus === 'completed') {
      await alarmManager.cancelTaskAlarm(taskId);
    }

    await get().loadSchedule(selectedDate, times);
  },

  reorderTasks: async (
    phaseId: string,
    orderedTaskIds: string[],
    times: CalculatedTimes
  ) => {
    await taskRepository.reorderTasks(phaseId, orderedTaskIds);
    await get().loadSchedule(get().selectedDate, times);
  },

  moveTaskOrder: async (
    taskId: string,
    phaseId: string,
    direction: 'up' | 'down',
    times: CalculatedTimes
  ) => {
    const phaseTasks = (await taskRepository.getByPhaseId(phaseId)).sort(
      (a, b) => a.sortOrder - b.sortOrder
    );
    const index = phaseTasks.findIndex((t) => t.id === taskId);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
      const temp = phaseTasks[index];
      phaseTasks[index] = phaseTasks[index - 1];
      phaseTasks[index - 1] = temp;
      const ids = phaseTasks.map((t) => t.id);
      await get().reorderTasks(phaseId, ids, times);
    } else if (direction === 'down' && index < phaseTasks.length - 1) {
      const temp = phaseTasks[index];
      phaseTasks[index] = phaseTasks[index + 1];
      phaseTasks[index + 1] = temp;
      const ids = phaseTasks.map((t) => t.id);
      await get().reorderTasks(phaseId, ids, times);
    }
  },

  deleteTask: async (taskId: string, times: CalculatedTimes) => {
    await alarmManager.cancelTaskAlarm(taskId);
    await taskAlarmRepository.delete(taskId);
    await taskRepository.delete(taskId);
    await get().loadSchedule(get().selectedDate, times);
  },

  deletePhase: async (phaseId: string, times: CalculatedTimes) => {
    await phaseRepository.delete(phaseId);
    await get().loadSchedule(get().selectedDate, times);
  },
}));
