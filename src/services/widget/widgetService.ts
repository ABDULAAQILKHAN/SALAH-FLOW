import { Platform, NativeModules } from 'react-native';
import { DailySchedule } from '../../types';
import { settingsRepository } from '../../database/repositories/settingsRepository';
import { formatRemainingCountdown, getMinutesDifference } from '../../utils/dateTime';

export interface WidgetPhaseData {
  phaseId: string;
  phaseName: string;
  phaseType: string;
  startTime: string; // ISO
  endTime: string;   // ISO
  displayStartTime: string;
  displayEndTime: string;
  coreTaskTitle: string;
  completedTasksCount: number;
  totalTasksCount: number;
  progressPercent: number;
  nextPhaseName: string;
  remainingMinutesToPhaseEnd: number;
  formattedCountdownToPhaseEnd: string;
}

export interface AndroidNativePhaseItem {
  phaseId: string;
  phaseName: string;
  phaseType: string;
  startTimeMs: number;
  endTimeMs: number;
  displayStartTime: string;
  displayEndTime: string;
  coreTaskTitle: string;
  totalTasks: number;
  completedTasks: number;
  progressPercent: number;
  nextPhaseName: string;
}

const getWidgetModule = () => {
  return NativeModules && NativeModules.SalahFlowWidgetModule;
};

export const widgetService = {
  computeCurrentPhaseData(
    schedule: DailySchedule,
    now: Date = new Date()
  ): WidgetPhaseData | null {
    if (!schedule || !schedule.phases || schedule.phases.length === 0) {
      return null;
    }

    const nowTime = now.getTime();

    // Find the currently active phase
    let currentPhaseIndex = schedule.phases.findIndex(
      (p) => nowTime >= p.startTime.getTime() && nowTime < p.endTime.getTime()
    );

    // If outside boundaries, fallback to closest or first phase
    if (currentPhaseIndex === -1) {
      // Check if before first
      if (nowTime < schedule.phases[0].startTime.getTime()) {
        currentPhaseIndex = 0;
      } else {
        // After last or between
        currentPhaseIndex = schedule.phases.length - 1;
      }
    }

    const currentPhase = schedule.phases[currentPhaseIndex];
    const nextPhaseIndex = (currentPhaseIndex + 1) % schedule.phases.length;
    const nextPhase = schedule.phases[nextPhaseIndex];

    const remainingMinutes = Math.max(
      0,
      getMinutesDifference(currentPhase.endTime, now)
    );
    const countdown = formatRemainingCountdown(currentPhase.endTime, now);

    const coreTitle = currentPhase.coreTasks.length > 0
      ? currentPhase.coreTasks.map((t) => t.title).join(' & ')
      : 'Core Salah';

    return {
      phaseId: currentPhase.id,
      phaseName: currentPhase.name,
      phaseType: currentPhase.type,
      startTime: currentPhase.startTime.toISOString(),
      endTime: currentPhase.endTime.toISOString(),
      displayStartTime: currentPhase.displayStartTime,
      displayEndTime: currentPhase.displayEndTime,
      coreTaskTitle: coreTitle,
      completedTasksCount: currentPhase.completedCount,
      totalTasksCount: currentPhase.totalCount,
      progressPercent: currentPhase.progressPercent,
      nextPhaseName: nextPhase ? nextPhase.name : '',
      remainingMinutesToPhaseEnd: remainingMinutes,
      formattedCountdownToPhaseEnd: countdown,
    };
  },

  async updateWidgetData(schedule: DailySchedule, now: Date = new Date()): Promise<void> {
    const data = this.computeCurrentPhaseData(schedule, now);
    if (!data) return;

    try {
      await settingsRepository.setJSON('android_widget_phase_data', data);
    } catch (e) {
      console.warn('Failed to cache widget phase data:', e);
    }

    // Sync full schedule to native Android AppWidget
    await this.syncNativeAndroidWidget(schedule);
  },

  async syncNativeAndroidWidget(schedule: DailySchedule): Promise<void> {
    if (!schedule || !schedule.phases || schedule.phases.length === 0) return;

    try {
      const nativeItems: AndroidNativePhaseItem[] = schedule.phases.map((phase, idx) => {
        const nextIdx = (idx + 1) % schedule.phases.length;
        const next = schedule.phases[nextIdx];
        const coreTitle = phase.coreTasks.length > 0
          ? phase.coreTasks.map((t) => t.title).join(' & ')
          : 'Core Salah';

        return {
          phaseId: phase.id,
          phaseName: phase.name,
          phaseType: phase.type,
          startTimeMs: phase.startTime.getTime(),
          endTimeMs: phase.endTime.getTime(),
          displayStartTime: phase.displayStartTime,
          displayEndTime: phase.displayEndTime,
          coreTaskTitle: coreTitle,
          totalTasks: phase.totalCount,
          completedTasks: phase.completedCount,
          progressPercent: phase.progressPercent,
          nextPhaseName: next ? next.name : '',
        };
      });

      const jsonStr = JSON.stringify(nativeItems);

      // Save locally
      await settingsRepository.setJSON('android_native_phase_items', nativeItems);

      // Push to Android native module if available
      const widgetModule = getWidgetModule();
      if (Platform.OS === 'android' && widgetModule?.updateWidgetData) {
        await widgetModule.updateWidgetData(jsonStr);
      }
    } catch (err) {
      console.warn('Failed to sync native Android widget:', err);
    }
  },

  async getCachedWidgetData(): Promise<WidgetPhaseData | null> {
    try {
      return await settingsRepository.getJSON<WidgetPhaseData | null>(
        'android_widget_phase_data',
        null
      );
    } catch {
      return null;
    }
  },
};
