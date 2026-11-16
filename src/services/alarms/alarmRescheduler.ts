import { alarmManager } from './alarmManager';
import { scheduleEngine } from '../scheduling/scheduleEngine';
import { phaseRepository } from '../../database/repositories/phaseRepository';
import { taskRepository } from '../../database/repositories/taskRepository';
import { taskAlarmRepository } from '../../database/repositories/taskAlarmRepository';
import { dailyTaskStatusRepository } from '../../database/repositories/dailyTaskStatusRepository';
import { prayerScheduler } from '../prayer/prayerScheduler';
import { locationService } from '../location/locationService';
import { settingsRepository } from '../../database/repositories/settingsRepository';
import { DEFAULT_PRAYER_CONFIG } from '../../constants/prayers';
import { PrayerCalculationConfig } from '../../types';
import { formatDateKey } from '../../utils/dateTime';

export const alarmRescheduler = {
  async rescheduleAll(): Promise<{ scheduledCount: number; cancelledCount: number }> {
    try {
      const today = new Date();
      const dateKey = formatDateKey(today);

      const [phases, tasks, alarms, statuses, location, config] = await Promise.all([
        phaseRepository.getEnabled(),
        taskRepository.getAll(),
        taskAlarmRepository.getAllEnabled(),
        dailyTaskStatusRepository.getByDate(dateKey),
        locationService.getSavedLocation(),
        settingsRepository.getJSON<PrayerCalculationConfig>('prayer_config', DEFAULT_PRAYER_CONFIG),
      ]);

      const calculatedTimes = await prayerScheduler.getOrCalculateDay(today, location, config);

      const dailySchedule = scheduleEngine.buildDailySchedule(
        today,
        phases,
        tasks,
        calculatedTimes,
        statuses,
        alarms,
        new Date()
      );

      // Collect all scheduled tasks
      const allTasks = dailySchedule.phases.flatMap((p) => p.tasks);

      return await alarmManager.syncAllAlarms(allTasks);
    } catch (error) {
      console.warn('Failed to reschedule alarms:', error);
      return { scheduledCount: 0, cancelledCount: 0 };
    }
  },

  async onPrayerTimesShift(): Promise<void> {
    await this.rescheduleAll();
  },

  async onReboot(): Promise<void> {
    await this.rescheduleAll();
  },

  async onTimezoneChange(): Promise<void> {
    await this.rescheduleAll();
  },
};
