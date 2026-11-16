import { create } from 'zustand';
import { getDatabase } from '../database';
import { phaseEngine } from '../services/scheduling/phaseEngine';
import { settingsRepository } from '../database/repositories/settingsRepository';
import { taskRepository } from '../database/repositories/taskRepository';
import { taskAlarmRepository } from '../database/repositories/taskAlarmRepository';
import { generateUUID } from '../utils/uuid';
import { notificationService } from '../services/notifications/notificationService';
import { formatDateKey } from '../utils/dateTime';

interface AppState {
  isInitialized: boolean;
  hasCompletedOnboarding: boolean;
  selectedDate: string; // YYYY-MM-DD
  activePhaseId: string | null;
  errorMessage: string | null;

  initApp: () => Promise<void>;
  setSelectedDate: (date: string) => void;
  setActivePhaseId: (phaseId: string | null) => void;
  setOnboardingCompleted: (completed: boolean) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  isInitialized: false,
  hasCompletedOnboarding: false,
  selectedDate: formatDateKey(new Date()),
  activePhaseId: null,
  errorMessage: null,

  initApp: async () => {
    try {
      // 1. Initialize SQLite Database
      await getDatabase();

      // 2. Setup Notification Channels on Android (non-blocking)
      try {
        await notificationService.setupChannels();
      } catch (err) {
        console.warn('Non-fatal notification channel setup notice:', err);
      }

      // 3. Check onboarding flag
      const completedOnboarding = await settingsRepository.hasCompletedOnboarding();

      // 4. Initialize default phases and core Salah if first launch
      await phaseEngine.initializeDefaultPhasesIfNeeded();

      // 5. Ensure core prayer tasks have active alarms
      try {
        const allTasks = await taskRepository.getAll();
        const existingAlarms = await taskAlarmRepository.getAllEnabled();
        const existingAlarmTaskIds = new Set(existingAlarms.map((a) => a.taskId));

        const corePrayerTasks = allTasks.filter((t) => t.isCore && t.taskType === 'prayer');
        for (const coreTask of corePrayerTasks) {
          if (!existingAlarmTaskIds.has(coreTask.id)) {
            await taskAlarmRepository.upsert({
              id: generateUUID(),
              taskId: coreTask.id,
              isEnabled: true,
              reminderMinutes: 10,
              soundEnabled: true,
              vibrationEnabled: true,
              snoozeMinutes: 5,
              repeatRule: 'daily',
            });
          }
        }
      } catch (alarmErr) {
        console.warn('Could not auto-seed prayer alarms:', alarmErr);
      }

      set({
        isInitialized: true,
        hasCompletedOnboarding: completedOnboarding,
        errorMessage: null,
      });
    } catch (error: any) {
      console.error('App initialization error:', error);
      set({
        isInitialized: true,
        errorMessage: error?.message || 'Failed to initialize SalahFlow.',
      });
    }
  },

  setSelectedDate: (date: string) => set({ selectedDate: date }),
  setActivePhaseId: (phaseId: string | null) => set({ activePhaseId: phaseId }),
  setOnboardingCompleted: async (completed: boolean) => {
    await settingsRepository.setCompletedOnboarding(completed);
    set({ hasCompletedOnboarding: completed });
  },
}));
