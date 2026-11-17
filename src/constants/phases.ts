import { PhaseType, PrayerName } from '../types';

export interface DefaultPhaseDefinition {
  type: PhaseType;
  name: string;
  sortOrder: number;
  color: string;
  icon: string;
  coreTasks: {
    title: string;
    prayerType: PrayerName;
    isCore: boolean;
    durationMinutes: number;
    sortOrder: number;
    description: string;
    anchorPrayer: PrayerName;
    anchorRelation: 'before' | 'after';
    offsetMinutes: number;
    schedulingType?: 'fixed_time' | 'prayer_relative';
    fixedTime?: string;
  }[];
  defaultTasks?: {
    title: string;
    durationMinutes: number;
    schedulingType: 'prayer_relative' | 'fixed_time' | 'flexible';
    anchorPrayer?: PrayerName;
    anchorRelation?: 'before' | 'after';
    offsetMinutes?: number;
    fixedTime?: string;
    sortOrder: number;
    description: string;
  }[];
}

export const DEFAULT_PHASE_DEFINITIONS: DefaultPhaseDefinition[] = [
  {
    type: 'fajr_early_morning',
    name: 'Before Fajr / Early Morning',
    sortOrder: 1,
    color: '#6366F1', // Indigo / Dawn
    icon: 'weather-night',
    coreTasks: [
      {
        title: 'Tahajjud Prayer',
        prayerType: 'tahajjud',
        isCore: true,
        durationMinutes: 30,
        sortOrder: 10,
        description: 'Night vigil prayer before Fajr dawn',
        anchorPrayer: 'fajr',
        anchorRelation: 'before',
        offsetMinutes: 45, // 45 minutes before Fajr
      },
      {
        title: 'Fajr Prayer',
        prayerType: 'fajr',
        isCore: true,
        durationMinutes: 20,
        sortOrder: 20,
        description: 'Obligatory dawn prayer',
        anchorPrayer: 'fajr',
        anchorRelation: 'after',
        offsetMinutes: 0,
        schedulingType: 'fixed_time',
        fixedTime: '05:45',
      },
    ],
    defaultTasks: [
      {
        title: 'Wudu & Night Vigil Prep',
        durationMinutes: 15,
        schedulingType: 'prayer_relative',
        anchorPrayer: 'fajr',
        anchorRelation: 'before',
        offsetMinutes: 60,
        sortOrder: 5,
        description: 'Wake up, hydrate, perform wudu',
      },
      {
        title: 'Quran Recitation & Adhkar',
        durationMinutes: 25,
        schedulingType: 'prayer_relative',
        anchorPrayer: 'fajr',
        anchorRelation: 'after',
        offsetMinutes: 20,
        sortOrder: 25,
        description: 'Morning remembrance and Quran study',
      },
    ],
  },
  {
    type: 'zuhr_morning_midday',
    name: 'Morning / Midday',
    sortOrder: 2,
    color: '#F59E0B', // Amber / Sun
    icon: 'weather-sunny',
    coreTasks: [
      {
        title: 'Zuhr Prayer',
        prayerType: 'zuhr',
        isCore: true,
        durationMinutes: 25,
        sortOrder: 20,
        description: 'Obligatory midday prayer',
        anchorPrayer: 'zuhr',
        anchorRelation: 'after',
        offsetMinutes: 0,
        schedulingType: 'fixed_time',
        fixedTime: '13:30',
      },
    ],
    defaultTasks: [
      {
        title: 'Focused Work / Study',
        durationMinutes: 120,
        schedulingType: 'fixed_time',
        fixedTime: '10:00',
        sortOrder: 10,
        description: 'Deep morning productivity block',
      },
      {
        title: 'Lunch & Quick Rest',
        durationMinutes: 40,
        schedulingType: 'prayer_relative',
        anchorPrayer: 'zuhr',
        anchorRelation: 'after',
        offsetMinutes: 30,
        sortOrder: 30,
        description: 'Post-Zuhr meal and midday break',
      },
    ],
  },
  {
    type: 'asr_afternoon',
    name: 'Afternoon',
    sortOrder: 3,
    color: '#10B981', // Emerald
    icon: 'weather-partly-cloudy',
    coreTasks: [
      {
        title: 'Asr Prayer',
        prayerType: 'asr',
        isCore: true,
        durationMinutes: 20,
        sortOrder: 20,
        description: 'Obligatory afternoon prayer (Hanafi calculated)',
        anchorPrayer: 'asr',
        anchorRelation: 'after',
        offsetMinutes: 0,
        schedulingType: 'fixed_time',
        fixedTime: '16:45',
      },
    ],
    defaultTasks: [
      {
        title: 'Evening Adhkar & Wrap Up',
        durationMinutes: 20,
        schedulingType: 'prayer_relative',
        anchorPrayer: 'asr',
        anchorRelation: 'after',
        offsetMinutes: 20,
        sortOrder: 25,
        description: 'Daily wrap up and evening remembrance',
      },
    ],
  },
  {
    type: 'maghrib_evening',
    name: 'Evening',
    sortOrder: 4,
    color: '#F97316', // Sunset orange
    icon: 'weather-sunset-down',
    coreTasks: [
      {
        title: 'Maghrib Prayer',
        prayerType: 'maghrib',
        isCore: true,
        durationMinutes: 20,
        sortOrder: 10,
        description: 'Obligatory sunset prayer',
        anchorPrayer: 'maghrib',
        anchorRelation: 'after',
        offsetMinutes: 0,
        schedulingType: 'fixed_time',
        fixedTime: '17:55',
      },
    ],
    defaultTasks: [
      {
        title: 'Family Dinner & Review',
        durationMinutes: 45,
        schedulingType: 'prayer_relative',
        anchorPrayer: 'maghrib',
        anchorRelation: 'after',
        offsetMinutes: 25,
        sortOrder: 20,
        description: 'Evening dinner and reflection',
      },
    ],
  },
  {
    type: 'isha_night',
    name: 'Night',
    sortOrder: 5,
    color: '#8B5CF6', // Purple night
    icon: 'weather-night',
    coreTasks: [
      {
        title: 'Isha Prayer',
        prayerType: 'isha',
        isCore: true,
        durationMinutes: 25,
        sortOrder: 10,
        description: 'Obligatory night prayer',
        anchorPrayer: 'isha',
        anchorRelation: 'after',
        offsetMinutes: 0,
        schedulingType: 'fixed_time',
        fixedTime: '20:30',
      },
    ],
    defaultTasks: [
      {
        title: 'Night Reading & Wind Down',
        durationMinutes: 30,
        schedulingType: 'prayer_relative',
        anchorPrayer: 'isha',
        anchorRelation: 'after',
        offsetMinutes: 30,
        sortOrder: 20,
        description: 'Reflect on day and prepare for sleep',
      },
    ],
  },
];
