import * as adhan from 'adhan';
import {
  LocationConfig,
  PrayerCalculationConfig,
  PrayerName,
  PrayerTimings,
} from '../../types';
import { getCalculationParameters } from './prayerSettings';
import {
  formatDateKey,
  subMinutesFromDate,
  formatRemainingCountdown,
  formatTime12h,
  getMinutesDifference,
} from '../../utils/dateTime';
import { generateUUID } from '../../utils/uuid';
import { addDays, subDays } from 'date-fns';

export interface CalculatedTimes {
  date: Date;
  dateKey: string;
  fajr: Date;
  sunrise: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
  tahajjud: Date;
}

export function calculatePrayerTimes(
  date: Date,
  location: LocationConfig,
  config: PrayerCalculationConfig
): CalculatedTimes {
  const coordinates = new adhan.Coordinates(location.latitude, location.longitude);
  const params = getCalculationParameters(config);

  const prayerTimes = new adhan.PrayerTimes(coordinates, date, params);

  // Calculate Tahajjud
  let tahajjudTime: Date;
  if (config.tahajjudMode === 'last_third_night') {
    // For Tahajjud on date D before Fajr, the night is between yesterday's Maghrib and today's Fajr
    const yesterday = subDays(date, 1);
    const yesterdayPrayers = new adhan.PrayerTimes(coordinates, yesterday, params);
    const sunnah = new adhan.SunnahTimes(yesterdayPrayers);
    tahajjudTime = sunnah.lastThirdOfTheNight;
  } else {
    // Relative to Fajr (default: e.g. 45 or 60 mins before Fajr)
    const offset = config.tahajjudOffsetMinutes || 45;
    tahajjudTime = subMinutesFromDate(prayerTimes.fajr, offset);
  }

  return {
    date,
    dateKey: formatDateKey(date),
    fajr: prayerTimes.fajr,
    sunrise: prayerTimes.sunrise,
    dhuhr: prayerTimes.dhuhr,
    asr: prayerTimes.asr,
    maghrib: prayerTimes.maghrib,
    isha: prayerTimes.isha,
    tahajjud: tahajjudTime,
  };
}

export function toPrayerTimingsModel(
  calculated: CalculatedTimes,
  location: LocationConfig,
  config: PrayerCalculationConfig
): PrayerTimings {
  return {
    id: generateUUID(),
    date: calculated.dateKey,
    fajr: calculated.fajr.toISOString(),
    sunrise: calculated.sunrise.toISOString(),
    dhuhr: calculated.dhuhr.toISOString(),
    asr: calculated.asr.toISOString(),
    maghrib: calculated.maghrib.toISOString(),
    isha: calculated.isha.toISOString(),
    tahajjud: calculated.tahajjud.toISOString(),
    latitude: location.latitude,
    longitude: location.longitude,
    calculationMethod: config.method,
    asrMethod: config.asrMethod,
    createdAt: new Date().toISOString(),
  };
}

export interface NextPrayerInfo {
  name: PrayerName;
  displayName: string;
  time: Date;
  formattedTime: string;
  remainingMinutes: number;
  formattedCountdown: string;
}

export function getNextPrayer(
  times: CalculatedTimes,
  now: Date = new Date(),
  tomorrowTimes?: CalculatedTimes
): NextPrayerInfo {
  const prayers: { name: PrayerName; displayName: string; time: Date }[] = [
    { name: 'tahajjud', displayName: 'Tahajjud', time: times.tahajjud },
    { name: 'fajr', displayName: 'Fajr', time: times.fajr },
    { name: 'zuhr', displayName: 'Zuhr', time: times.dhuhr },
    { name: 'asr', displayName: 'Asr', time: times.asr },
    { name: 'maghrib', displayName: 'Maghrib', time: times.maghrib },
    { name: 'isha', displayName: 'Isha', time: times.isha },
  ];

  for (const prayer of prayers) {
    if (prayer.time.getTime() > now.getTime()) {
      const remainingMinutes = Math.max(0, getMinutesDifference(prayer.time, now));
      return {
        name: prayer.name,
        displayName: prayer.displayName,
        time: prayer.time,
        formattedTime: formatTime12h(prayer.time),
        remainingMinutes,
        formattedCountdown: formatRemainingCountdown(prayer.time, now),
      };
    }
  }

  // If all today's prayers have passed, next prayer is tomorrow's Tahajjud or Fajr
  const tomorrowFajr = tomorrowTimes ? tomorrowTimes.fajr : addDays(times.fajr, 1);
  const tomorrowTahajjud = tomorrowTimes ? tomorrowTimes.tahajjud : addDays(times.tahajjud, 1);

  if (tomorrowTahajjud.getTime() > now.getTime()) {
    return {
      name: 'tahajjud',
      displayName: 'Tahajjud (Tomorrow)',
      time: tomorrowTahajjud,
      formattedTime: formatTime12h(tomorrowTahajjud),
      remainingMinutes: Math.max(0, getMinutesDifference(tomorrowTahajjud, now)),
      formattedCountdown: formatRemainingCountdown(tomorrowTahajjud, now),
    };
  }

  return {
    name: 'fajr',
    displayName: 'Fajr (Tomorrow)',
    time: tomorrowFajr,
    formattedTime: formatTime12h(tomorrowFajr),
    remainingMinutes: Math.max(0, getMinutesDifference(tomorrowFajr, now)),
    formattedCountdown: formatRemainingCountdown(tomorrowFajr, now),
  };
}

export function getCurrentPrayerPhase(
  times: CalculatedTimes,
  now: Date = new Date()
): {
  currentPrayer: PrayerName;
  currentDisplayName: string;
  phaseType: string;
} {
  const t = now.getTime();

  if (t < times.fajr.getTime()) {
    return {
      currentPrayer: 'tahajjud',
      currentDisplayName: 'Pre-Dawn / Tahajjud',
      phaseType: 'fajr_early_morning',
    };
  } else if (t < times.dhuhr.getTime()) {
    return {
      currentPrayer: 'fajr',
      currentDisplayName: 'Post-Fajr / Morning',
      phaseType: 'fajr_early_morning',
    };
  } else if (t < times.asr.getTime()) {
    return {
      currentPrayer: 'zuhr',
      currentDisplayName: 'Zuhr / Midday',
      phaseType: 'zuhr_morning_midday',
    };
  } else if (t < times.maghrib.getTime()) {
    return {
      currentPrayer: 'asr',
      currentDisplayName: 'Asr / Afternoon',
      phaseType: 'asr_afternoon',
    };
  } else if (t < times.isha.getTime()) {
    return {
      currentPrayer: 'maghrib',
      currentDisplayName: 'Maghrib / Evening',
      phaseType: 'maghrib_evening',
    };
  } else {
    return {
      currentPrayer: 'isha',
      currentDisplayName: 'Isha / Night',
      phaseType: 'isha_night',
    };
  }
}
