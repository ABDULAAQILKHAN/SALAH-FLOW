import { Phase, Task, PrayerTimings } from '../../types';
import { CalculatedTimes } from '../prayer/prayerCalculator';
import { DEFAULT_PHASE_DEFINITIONS } from '../../constants/phases';
import { phaseRepository } from '../../database/repositories/phaseRepository';
import { taskRepository } from '../../database/repositories/taskRepository';
import { taskAlarmRepository } from '../../database/repositories/taskAlarmRepository';
import { generateUUID } from '../../utils/uuid';
import { addDays, subDays } from 'date-fns';

export interface PhaseBoundaries {
  phaseId: string;
  startTime: Date;
  endTime: Date;
}

export const phaseEngine = {
  async initializeDefaultPhasesIfNeeded(): Promise<boolean> {
    const existingCount = await phaseRepository.count();
    if (existingCount > 0) {
      return false; // Already initialized
    }

    const now = new Date().toISOString();

    for (const def of DEFAULT_PHASE_DEFINITIONS) {
      const phaseId = generateUUID();
      const phase: Phase = {
        id: phaseId,
        name: def.name,
        type: def.type,
        sortOrder: def.sortOrder,
        isDefault: true,
        isEnabled: true,
        color: def.color,
        icon: def.icon,
        createdAt: now,
        updatedAt: now,
      };

      await phaseRepository.create(phase);

      // Create core tasks
      for (const coreDef of def.coreTasks) {
        const taskId = generateUUID();
        const coreTask: Task = {
          id: taskId,
          phaseId,
          title: coreDef.title,
          description: coreDef.description,
          taskType: 'prayer',
          isCore: true,
          prayerType: coreDef.prayerType,
          sortOrder: coreDef.sortOrder,
          durationMinutes: coreDef.durationMinutes,
          schedulingType: 'prayer_relative',
          anchorPrayer: coreDef.anchorPrayer,
          anchorRelation: coreDef.anchorRelation,
          offsetMinutes: coreDef.offsetMinutes,
          priority: 'core',
          isEnabled: true,
          icon: coreDef.prayerType === 'tahajjud' ? 'weather-night' : 'mosque',
          createdAt: now,
          updatedAt: now,
        };
        await taskRepository.create(coreTask);

        // Seed default alarm for core prayers (enabled with 10-min reminder, sound & vibration)
        await taskAlarmRepository.upsert({
          id: generateUUID(),
          taskId,
          isEnabled: true,
          reminderMinutes: 10,
          soundEnabled: true,
          vibrationEnabled: true,
          snoozeMinutes: 5,
          repeatRule: 'daily',
        });
      }

      // Create default companion tasks
      if (def.defaultTasks) {
        for (const taskDef of def.defaultTasks) {
          const taskId = generateUUID();
          const task: Task = {
            id: taskId,
            phaseId,
            title: taskDef.title,
            description: taskDef.description,
            taskType: 'activity',
            isCore: false,
            sortOrder: taskDef.sortOrder,
            durationMinutes: taskDef.durationMinutes,
            schedulingType: taskDef.schedulingType,
            fixedTime: taskDef.fixedTime,
            anchorPrayer: taskDef.anchorPrayer,
            anchorRelation: taskDef.anchorRelation,
            offsetMinutes: taskDef.offsetMinutes ?? 0,
            priority: 'medium',
            isEnabled: true,
            createdAt: now,
            updatedAt: now,
          };
          await taskRepository.create(task);
        }
      }
    }

    return true;
  },

  calculateBoundariesForPhases(
    phases: Phase[],
    times: CalculatedTimes
  ): Map<string, { startTime: Date; endTime: Date }> {
    const boundaryMap = new Map<string, { startTime: Date; endTime: Date }>();

    for (const phase of phases) {
      let start: Date;
      let end: Date;

      switch (phase.type) {
        case 'fajr_early_morning':
          // Starts from Tahajjud window (or 2 hours before Fajr) to Zuhr
          start = subDays(times.fajr, 0);
          start = new Date(times.tahajjud.getTime() - 60 * 60 * 1000); // 1h before tahajjud
          end = times.dhuhr;
          break;

        case 'zuhr_morning_midday':
          // Zuhr start until Asr
          start = times.dhuhr;
          end = times.asr;
          break;

        case 'asr_afternoon':
          // Asr start until Maghrib
          start = times.asr;
          end = times.maghrib;
          break;

        case 'maghrib_evening':
          // Maghrib start until Isha
          start = times.maghrib;
          end = times.isha;
          break;

        case 'isha_night':
          // Isha start until midnight / next dawn
          start = times.isha;
          end = addDays(times.fajr, 1);
          break;

        case 'custom':
        default:
          // Custom phase defaults to whole day window or between adjacent phases
          start = times.tahajjud;
          end = times.isha;
          break;
      }

      boundaryMap.set(phase.id, { startTime: start, endTime: end });
    }

    return boundaryMap;
  },

  validateCustomPhase(
    name: string,
    coreTaskTitle: string,
    coreTaskDuration: number
  ): { valid: boolean; error?: string } {
    if (!name.trim()) {
      return { valid: false, error: 'Phase name is required.' };
    }
    if (!coreTaskTitle.trim()) {
      return {
        valid: false,
        error: 'Each custom phase must have exactly one designated core task.',
      };
    }
    if (coreTaskDuration <= 0) {
      return { valid: false, error: 'Core task duration must be at least 1 minute.' };
    }
    return { valid: true };
  },
};
