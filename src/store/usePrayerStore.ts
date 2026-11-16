import { create } from 'zustand';
import { LocationConfig, PrayerCalculationConfig } from '../types';
import { DEFAULT_LOCATION, DEFAULT_PRAYER_CONFIG } from '../constants/prayers';
import { locationService } from '../services/location/locationService';
import { settingsRepository } from '../database/repositories/settingsRepository';
import { prayerScheduler } from '../services/prayer/prayerScheduler';
import {
  CalculatedTimes,
  getNextPrayer,
  NextPrayerInfo,
} from '../services/prayer/prayerCalculator';
import { parseISO } from 'date-fns';

interface PrayerState {
  location: LocationConfig;
  prayerConfig: PrayerCalculationConfig;
  todayTimings: CalculatedTimes | null;
  nextPrayer: NextPrayerInfo | null;
  isLoading: boolean;

  loadSettings: () => Promise<void>;
  updateLocation: (location: LocationConfig) => Promise<void>;
  updatePrayerConfig: (config: PrayerCalculationConfig) => Promise<void>;
  refreshTimings: (date?: Date) => Promise<CalculatedTimes>;
}

export const usePrayerStore = create<PrayerState>((set, get) => ({
  location: DEFAULT_LOCATION,
  prayerConfig: DEFAULT_PRAYER_CONFIG,
  todayTimings: null,
  nextPrayer: null,
  isLoading: false,

  loadSettings: async () => {
    try {
      const [savedLocation, savedConfig] = await Promise.all([
        locationService.getSavedLocation(),
        settingsRepository.getJSON<PrayerCalculationConfig>(
          'prayer_config',
          DEFAULT_PRAYER_CONFIG
        ),
      ]);

      set({
        location: savedLocation,
        prayerConfig: savedConfig,
      });

      await get().refreshTimings(new Date());
    } catch (e) {
      console.warn('Failed to load prayer store settings:', e);
    }
  },

  updateLocation: async (location: LocationConfig) => {
    set({ location, isLoading: true });
    await locationService.saveLocation(location);
    const config = get().prayerConfig;
    await prayerScheduler.handleSettingsOrLocationChange(location, config);
    await get().refreshTimings(new Date());
    set({ isLoading: false });
  },

  updatePrayerConfig: async (config: PrayerCalculationConfig) => {
    set({ prayerConfig: config, isLoading: true });
    await settingsRepository.setJSON('prayer_config', config);
    const location = get().location;
    await prayerScheduler.handleSettingsOrLocationChange(location, config);
    await get().refreshTimings(new Date());
    set({ isLoading: false });
  },

  refreshTimings: async (date: Date = new Date()): Promise<CalculatedTimes> => {
    const { location, prayerConfig } = get();
    const timings = await prayerScheduler.getOrCalculateDay(date, location, prayerConfig);
    const nextPrayer = getNextPrayer(timings, new Date());

    set({
      todayTimings: timings,
      nextPrayer,
    });

    return timings;
  },
}));
