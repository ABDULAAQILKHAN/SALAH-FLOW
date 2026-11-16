import {
  calculatePrayerTimes,
  getNextPrayer,
} from '../src/services/prayer/prayerCalculator';
import { LocationConfig, PrayerCalculationConfig } from '../src/types';
import { isBefore, isAfter } from 'date-fns';

describe('Prayer Calculation Engine (Adhan JS)', () => {
  const mumbaiLocation: LocationConfig = {
    cityName: 'Mumbai',
    countryName: 'India',
    latitude: 19.076,
    longitude: 72.8777,
    timezone: 'Asia/Kolkata',
    isManual: true,
  };

  const londonLocation: LocationConfig = {
    cityName: 'London',
    countryName: 'UK',
    latitude: 51.5074,
    longitude: -0.1278,
    timezone: 'Europe/London',
    isManual: true,
  };

  test('Calculates chronological prayer times for a given day', () => {
    const config: PrayerCalculationConfig = {
      method: 'Karachi',
      asrMethod: 'hanafi',
      tahajjudOffsetMinutes: 45,
      tahajjudMode: 'relative_to_fajr',
    };

    const date = new Date(2026, 10, 16); // 16 Nov 2026
    const times = calculatePrayerTimes(date, mumbaiLocation, config);

    expect(times.fajr).toBeDefined();
    expect(times.sunrise).toBeDefined();
    expect(times.dhuhr).toBeDefined();
    expect(times.asr).toBeDefined();
    expect(times.maghrib).toBeDefined();
    expect(times.isha).toBeDefined();
    expect(times.tahajjud).toBeDefined();

    // Chronological order: Tahajjud -> Fajr -> Sunrise -> Dhuhr -> Asr -> Maghrib -> Isha
    expect(isBefore(times.tahajjud, times.fajr)).toBe(true);
    expect(isBefore(times.fajr, times.sunrise)).toBe(true);
    expect(isBefore(times.sunrise, times.dhuhr)).toBe(true);
    expect(isBefore(times.dhuhr, times.asr)).toBe(true);
    expect(isBefore(times.asr, times.maghrib)).toBe(true);
    expect(isBefore(times.maghrib, times.isha)).toBe(true);
  });

  test('Hanafi Asr is strictly later than Standard (Shafi) Asr', () => {
    const date = new Date(2026, 10, 16);

    const hanafiConfig: PrayerCalculationConfig = {
      method: 'Karachi',
      asrMethod: 'hanafi',
      tahajjudOffsetMinutes: 45,
      tahajjudMode: 'relative_to_fajr',
    };

    const standardConfig: PrayerCalculationConfig = {
      method: 'Karachi',
      asrMethod: 'standard',
      tahajjudOffsetMinutes: 45,
      tahajjudMode: 'relative_to_fajr',
    };

    const hanafiTimes = calculatePrayerTimes(date, mumbaiLocation, hanafiConfig);
    const standardTimes = calculatePrayerTimes(date, mumbaiLocation, standardConfig);

    // Hanafi Asr uses shadow factor 2 (double shadow), Shafi uses shadow factor 1
    // Therefore, Hanafi Asr occurs later in the afternoon than standard Asr
    expect(isAfter(hanafiTimes.asr, standardTimes.asr)).toBe(true);
    const diffMinutes = (hanafiTimes.asr.getTime() - standardTimes.asr.getTime()) / (1000 * 60);
    expect(diffMinutes).toBeGreaterThan(30); // Typically 45-60 minutes difference
  });

  test('Calculates prayer times accurately across different geographic locations', () => {
    const config: PrayerCalculationConfig = {
      method: 'MuslimWorldLeague',
      asrMethod: 'standard',
      tahajjudOffsetMinutes: 45,
      tahajjudMode: 'relative_to_fajr',
    };

    const date = new Date(2026, 5, 21); // Summer solstice
    const mumbaiTimes = calculatePrayerTimes(date, mumbaiLocation, config);
    const londonTimes = calculatePrayerTimes(date, londonLocation, config);

    // In June, London (high latitude) has much longer daylight than Mumbai (near equator)
    const mumbaiDaylightMinutes = (mumbaiTimes.maghrib.getTime() - mumbaiTimes.sunrise.getTime()) / (1000 * 60);
    const londonDaylightMinutes = (londonTimes.maghrib.getTime() - londonTimes.sunrise.getTime()) / (1000 * 60);

    expect(londonDaylightMinutes).toBeGreaterThan(mumbaiDaylightMinutes);
  });

  test('Supports both Tahajjud offset and last third of the night modes', () => {
    const date = new Date(2026, 10, 16);

    const offsetConfig: PrayerCalculationConfig = {
      method: 'Karachi',
      asrMethod: 'hanafi',
      tahajjudOffsetMinutes: 60,
      tahajjudMode: 'relative_to_fajr',
    };

    const lastThirdConfig: PrayerCalculationConfig = {
      method: 'Karachi',
      asrMethod: 'hanafi',
      tahajjudOffsetMinutes: 45,
      tahajjudMode: 'last_third_night',
    };

    const offsetTimes = calculatePrayerTimes(date, mumbaiLocation, offsetConfig);
    const lastThirdTimes = calculatePrayerTimes(date, mumbaiLocation, lastThirdConfig);

    // Exactly 60 minutes before Fajr
    const diff = (offsetTimes.fajr.getTime() - offsetTimes.tahajjud.getTime()) / (1000 * 60);
    expect(Math.round(diff)).toBe(60);

    // Last third of night must precede Fajr
    expect(isBefore(lastThirdTimes.tahajjud, lastThirdTimes.fajr)).toBe(true);
  });

  test('Calculates next prayer countdown correctly', () => {
    const config: PrayerCalculationConfig = {
      method: 'Karachi',
      asrMethod: 'hanafi',
      tahajjudOffsetMinutes: 45,
      tahajjudMode: 'relative_to_fajr',
    };

    const date = new Date(2026, 10, 16);
    const times = calculatePrayerTimes(date, mumbaiLocation, config);

    // Pretend the current time is 10 minutes before Zuhr
    const fakeNow = new Date(times.dhuhr.getTime() - 10 * 60 * 1000);
    const nextPrayer = getNextPrayer(times, fakeNow);

    expect(nextPrayer.name).toBe('zuhr');
    expect(nextPrayer.remainingMinutes).toBe(10);
    expect(nextPrayer.formattedCountdown).toBe('10m 0s');
  });
});
