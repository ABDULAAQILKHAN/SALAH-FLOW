import { phaseRepository } from '../../database/repositories/phaseRepository';
import { taskRepository } from '../../database/repositories/taskRepository';
import { taskAlarmRepository } from '../../database/repositories/taskAlarmRepository';
import { settingsRepository } from '../../database/repositories/settingsRepository';
import { dailyTaskStatusRepository } from '../../database/repositories/dailyTaskStatusRepository';
import { resetDatabase } from '../../database';
import { Phase, Task, TaskAlarm } from '../../types';

export interface BackupData {
  version: number;
  exportedAt: string;
  phases: Phase[];
  tasks: Task[];
  alarms: TaskAlarm[];
  settings: Record<string, string>;
}

export const backupService = {
  async exportData(): Promise<string> {
    const [phases, tasks, alarms, settings] = await Promise.all([
      phaseRepository.getAll(),
      taskRepository.getAll(),
      taskAlarmRepository.getAllEnabled(),
      settingsRepository.getAll(),
    ]);

    const backup: BackupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      phases,
      tasks,
      alarms,
      settings,
    };

    return JSON.stringify(backup, null, 2);
  },

  async importData(jsonString: string): Promise<boolean> {
    try {
      const backup = JSON.parse(jsonString) as BackupData;
      if (!backup.version || !backup.phases || !backup.tasks) {
        throw new Error('Invalid backup file structure.');
      }

      // Reset existing data
      await resetDatabase();

      // Restore phases
      for (const p of backup.phases) {
        await phaseRepository.create(p);
      }

      // Restore tasks
      for (const t of backup.tasks) {
        await taskRepository.create(t);
      }

      // Restore alarms
      if (backup.alarms) {
        for (const a of backup.alarms) {
          await taskAlarmRepository.upsert(a);
        }
      }

      // Restore settings
      if (backup.settings) {
        for (const [k, v] of Object.entries(backup.settings)) {
          await settingsRepository.set(k, v);
        }
      }

      return true;
    } catch (e) {
      console.error('Failed to import backup:', e);
      throw e;
    }
  },
};
