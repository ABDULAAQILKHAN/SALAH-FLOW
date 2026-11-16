import { LocationConfig, PrayerCalculationConfig } from '../types';

export interface MethodOption {
  id: string;
  name: string;
  description: string;
  fajrAngle: number;
  ishaAngle: number;
}

export const CALCULATION_METHODS: MethodOption[] = [
  {
    id: 'Karachi',
    name: 'University of Islamic Sciences, Karachi (India/Pakistan)',
    description: 'Fajr 18°, Isha 18° — Standard for South Asia and Hanafi scholars',
    fajrAngle: 18,
    ishaAngle: 18,
  },
  {
    id: 'MuslimWorldLeague',
    name: 'Muslim World League (MWL)',
    description: 'Fajr 18°, Isha 17° — Global standard across Europe and Asia',
    fajrAngle: 18,
    ishaAngle: 17,
  },
  {
    id: 'Egyptian',
    name: 'Egyptian General Authority of Survey',
    description: 'Fajr 19.5°, Isha 17.5° — Africa and Middle East',
    fajrAngle: 19.5,
    ishaAngle: 17.5,
  },
  {
    id: 'UmmAlQura',
    name: 'Umm al-Qura University, Makkah',
    description: 'Fajr 18.5°, Isha 90 min after Maghrib (120 min in Ramadan)',
    fajrAngle: 18.5,
    ishaAngle: 0,
  },
  {
    id: 'NorthAmerica',
    name: 'Islamic Society of North America (ISNA)',
    description: 'Fajr 15°, Isha 15° — Used in USA and Canada',
    fajrAngle: 15,
    ishaAngle: 15,
  },
  {
    id: 'MoonsightingCommittee',
    name: 'Moonsighting Committee Worldwide',
    description: 'Fajr 18°, Isha 18° with seasonal adjustments',
    fajrAngle: 18,
    ishaAngle: 18,
  },
  {
    id: 'Dubai',
    name: 'Dubai (UAE)',
    description: 'Fajr 18.2°, Isha 18.2°',
    fajrAngle: 18.2,
    ishaAngle: 18.2,
  },
  {
    id: 'Kuwait',
    name: 'Kuwait',
    description: 'Fajr 18°, Isha 17.5°',
    fajrAngle: 18,
    ishaAngle: 17.5,
  },
  {
    id: 'Qatar',
    name: 'Qatar',
    description: 'Fajr 18°, Isha 90 min after Maghrib',
    fajrAngle: 18,
    ishaAngle: 0,
  },
  {
    id: 'Singapore',
    name: 'MUIS (Singapore)',
    description: 'Fajr 20°, Isha 18°',
    fajrAngle: 20,
    ishaAngle: 18,
  },
];

export const DEFAULT_PRAYER_CONFIG: PrayerCalculationConfig = {
  method: 'Karachi',
  asrMethod: 'hanafi',
  tahajjudOffsetMinutes: 45,
  tahajjudMode: 'relative_to_fajr',
};

export const DEFAULT_LOCATION: LocationConfig = {
  cityName: 'Mumbai',
  countryName: 'India',
  latitude: 19.076,
  longitude: 72.8777,
  timezone: 'Asia/Kolkata',
  isManual: true,
};

export const POPULAR_LOCATIONS: LocationConfig[] = [
  {
    cityName: 'Mumbai',
    countryName: 'India',
    latitude: 19.076,
    longitude: 72.8777,
    timezone: 'Asia/Kolkata',
    isManual: true,
  },
  {
    cityName: 'New Delhi',
    countryName: 'India',
    latitude: 28.6139,
    longitude: 77.209,
    timezone: 'Asia/Kolkata',
    isManual: true,
  },
  {
    cityName: 'Hyderabad',
    countryName: 'India',
    latitude: 17.385,
    longitude: 78.4867,
    timezone: 'Asia/Kolkata',
    isManual: true,
  },
  {
    cityName: 'Bengaluru',
    countryName: 'India',
    latitude: 12.9716,
    longitude: 77.5946,
    timezone: 'Asia/Kolkata',
    isManual: true,
  },
  {
    cityName: 'Kolkata',
    countryName: 'India',
    latitude: 22.5726,
    longitude: 88.3639,
    timezone: 'Asia/Kolkata',
    isManual: true,
  },
  {
    cityName: 'Chennai',
    countryName: 'India',
    latitude: 13.0827,
    longitude: 80.2707,
    timezone: 'Asia/Kolkata',
    isManual: true,
  },
  {
    cityName: 'Karachi',
    countryName: 'Pakistan',
    latitude: 24.8607,
    longitude: 67.0011,
    timezone: 'Asia/Karachi',
    isManual: true,
  },
  {
    cityName: 'Dhaka',
    countryName: 'Bangladesh',
    latitude: 23.8103,
    longitude: 90.4125,
    timezone: 'Asia/Dhaka',
    isManual: true,
  },
  {
    cityName: 'Dubai',
    countryName: 'United Arab Emirates',
    latitude: 25.2048,
    longitude: 55.2708,
    timezone: 'Asia/Dubai',
    isManual: true,
  },
  {
    cityName: 'Makkah',
    countryName: 'Saudi Arabia',
    latitude: 21.4225,
    longitude: 39.8262,
    timezone: 'Asia/Riyadh',
    isManual: true,
  },
  {
    cityName: 'Madinah',
    countryName: 'Saudi Arabia',
    latitude: 24.5247,
    longitude: 39.5692,
    timezone: 'Asia/Riyadh',
    isManual: true,
  },
  {
    cityName: 'London',
    countryName: 'United Kingdom',
    latitude: 51.5074,
    longitude: -0.1278,
    timezone: 'Europe/London',
    isManual: true,
  },
  {
    cityName: 'New York',
    countryName: 'United States',
    latitude: 40.7128,
    longitude: -74.006,
    timezone: 'America/New_York',
    isManual: true,
  },
];
