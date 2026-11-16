import {
  LocationConfig,
  PrayerCalculationConfig,
  PrayerTimings,
} from '../../types';
import { prayerTimingRepository } from '../../database/repositories/prayerTimingRepository';
import {
  CalculatedTimes,
  calculatePrayerTimes,
  toPrayerTimingsModel,
} from './prayerCalculator';
import { formatDateKey } from '../../utils/dateTime';
import { addDays, parseISO } from 'date-fns';

export function prayerTimingsToCalculatedTimes(timings: PrayerTimings): CalculatedTimes {
  return {
    date: parseISO(timings.date),
    dateKey: timings.date,
    fajr: parseISO(timings.fajr),
    sunrise: parseISO(timings.sunrise),
    dhuhr: parseISO(timings.dhuhr),
    asr: parseISO(timings.asr),
    maghrib: parseISO(timings.maghrib),
    isha: parseISO(timings.isha),
    tahajjud: parseISO(timings.tahajjud),
  };
}

export const prayerScheduler = {
  async getOrCalculateDay(
    date: Date,
    location: LocationConfig,
    config: PrayerCalculationConfig
  ): Promise<CalculatedTimes> {
    const dateKey = formatDateKey(date);

    // Try fetching from SQLite cache first
    try {
      const cached = await prayerTimingRepository.getByDate(
        dateKey,
        config.method,
        config.asrMethod
      );

      if (cached) {
        return prayerTimingsToCalculatedTimes(cached);
      }
    } catch (e) {
      // In tests or if db not yet ready, fallback to direct calculation
      console.warn('DB lookup failed or table empty, calculating on the fly:', e);
    }

    // Not cached or setting changed: calculate astronomically with Adhan JS
    const calculated = calculatePrayerTimes(date, location, config);
    const model = toPrayerTimingsModel(calculated, location, config);

    try {
      await prayerTimingRepository.save(model);
    } catch (e) {
      console.warn('Failed to cache prayer timings to SQLite:', e);
    }

    return calculated;
  },

  async cacheYearTimings(
    year: number,
    location: LocationConfig,
    config: PrayerCalculationConfig
  ): Promise<void> {
    const startDate = new Date(year, 0, 1);
    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    const totalDays = isLeapYear ? 366 : 365;

    const list: PrayerTimings[] = [];

    for (let i = 0; i < totalDays; i++) {
      const day = addDays(startDate, i);
      const calculated = calculatePrayerTimes(day, location, config);
      list.push(toPrayerTimingsModel(calculated, location, config));
    }

    await prayerTimingRepository.saveBulk(list);
  },

  async handleSettingsOrLocationChange(
    location: LocationConfig,
    config: PrayerCalculationConfig
  ): Promise<void> {
    // Clear old cached timings and precompute new timings
    try {
      await prayerTimingRepository.clearAll();
      const currentYear = new Date().getFullYear();
      await this.cacheYearTimings(currentYear, location, config);
    } catch (e) {
      console.warn('Failed to refresh year timings:', e);
    }
  },
};
