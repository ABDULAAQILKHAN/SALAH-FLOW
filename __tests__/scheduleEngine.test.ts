import { scheduleEngine, getPrayerAnchorTime } from '../src/services/scheduling/scheduleEngine';
import { conflictResolver } from '../src/services/scheduling/conflictResolver';
import { calculatePrayerTimes } from '../src/services/prayer/prayerCalculator';
import {
  Phase,
  Task,
  LocationConfig,
  PrayerCalculationConfig,
  ScheduledTask,
} from '../src/types';
import { addDays, subDays } from 'date-fns';

describe('Dynamic Scheduling Engine & Conflict Resolver', () => {
  const mumbaiLocation: LocationConfig = {
    cityName: 'Mumbai',
    countryName: 'India',
    latitude: 19.076,
    longitude: 72.8777,
    timezone: 'Asia/Kolkata',
    isManual: true,
  };

  const config: PrayerCalculationConfig = {
    method: 'Karachi',
    asrMethod: 'hanafi',
    tahajjudOffsetMinutes: 45,
    tahajjudMode: 'relative_to_fajr',
  };

  const day1 = new Date(2026, 0, 15); // Winter
  const day2 = new Date(2026, 5, 15); // Summer (Fajr and Zuhr differ significantly)

  const times1 = calculatePrayerTimes(day1, mumbaiLocation, config);
  const times2 = calculatePrayerTimes(day2, mumbaiLocation, config);

  test('Prayer-relative tasks automatically shift when prayer times change', () => {
    const gymTask: Task = {
      id: 'task-gym',
      phaseId: 'phase-fajr',
      title: 'Morning Gym',
      taskType: 'activity',
      isCore: false,
      sortOrder: 30,
      durationMinutes: 60,
      schedulingType: 'prayer_relative',
      anchorPrayer: 'fajr',
      anchorRelation: 'after',
      offsetMinutes: 30, // 30 mins after Fajr
      priority: 'high',
      isEnabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const scheduledDay1 = scheduleEngine.computeScheduledTask(
      gymTask,
      day1,
      times1,
      new Map(),
      new Map()
    );

    const scheduledDay2 = scheduleEngine.computeScheduledTask(
      gymTask,
      day2,
      times2,
      new Map(),
      new Map()
    );

    // On day 1: Gym starts exactly 30 minutes after day 1 Fajr
    const expectedStartDay1 = new Date(times1.fajr.getTime() + 30 * 60 * 1000);
    expect(scheduledDay1.startTime.getTime()).toBe(expectedStartDay1.getTime());

    // On day 2: Gym starts exactly 30 minutes after day 2 Fajr
    const expectedStartDay2 = new Date(times2.fajr.getTime() + 30 * 60 * 1000);
    expect(scheduledDay2.startTime.getTime()).toBe(expectedStartDay2.getTime());

    // Verify the start time dynamically adapted to the changing Fajr time
    expect(scheduledDay1.startTime.getTime()).not.toBe(scheduledDay2.startTime.getTime());
  });

  test('Fixed-time tasks remain at their configured time regardless of prayer time shift', () => {
    const officeTask: Task = {
      id: 'task-office',
      phaseId: 'phase-zuhr',
      title: 'Office Work Starts',
      taskType: 'activity',
      isCore: false,
      sortOrder: 10,
      durationMinutes: 120,
      schedulingType: 'fixed_time',
      fixedTime: '09:30',
      offsetMinutes: 0,
      priority: 'high',
      isEnabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const scheduledDay1 = scheduleEngine.computeScheduledTask(
      officeTask,
      day1,
      times1,
      new Map(),
      new Map()
    );

    const scheduledDay2 = scheduleEngine.computeScheduledTask(
      officeTask,
      day2,
      times2,
      new Map(),
      new Map()
    );

    expect(scheduledDay1.displayStartTime).toBe('9:30 AM');
    expect(scheduledDay2.displayStartTime).toBe('9:30 AM');
    expect(scheduledDay1.startTime.getHours()).toBe(9);
    expect(scheduledDay1.startTime.getMinutes()).toBe(30);
    expect(scheduledDay2.startTime.getHours()).toBe(9);
    expect(scheduledDay2.startTime.getMinutes()).toBe(30);
  });

  test('Conflict Resolver detects overlapping tasks and protects core prayers', () => {
    // Task 1: Zuhr Prayer (Core) from 12:30 to 12:55
    const zuhrStart = new Date(2026, 10, 16, 12, 30);
    const zuhrEnd = new Date(2026, 10, 16, 12, 55);

    const coreZuhr: ScheduledTask = {
      id: 'zuhr-core',
      phaseId: 'phase-2',
      title: 'Zuhr Prayer',
      taskType: 'prayer',
      isCore: true,
      prayerType: 'zuhr',
      sortOrder: 20,
      durationMinutes: 25,
      schedulingType: 'prayer_relative',
      offsetMinutes: 0,
      priority: 'core',
      isEnabled: true,
      startTime: zuhrStart,
      endTime: zuhrEnd,
      displayStartTime: '12:30 PM',
      displayEndTime: '12:55 PM',
      status: 'pending',
      createdAt: '',
      updatedAt: '',
    };

    // Task 2: Meeting overlapping with Zuhr from 12:40 to 13:30
    const meetingStart = new Date(2026, 10, 16, 12, 40);
    const meetingEnd = new Date(2026, 10, 16, 13, 30);

    const meetingTask: ScheduledTask = {
      id: 'meeting',
      phaseId: 'phase-2',
      title: 'Client Meeting',
      taskType: 'activity',
      isCore: false,
      sortOrder: 25,
      durationMinutes: 50,
      schedulingType: 'fixed_time',
      fixedTime: '12:40',
      offsetMinutes: 0,
      priority: 'high',
      isEnabled: true,
      startTime: meetingStart,
      endTime: meetingEnd,
      displayStartTime: '12:40 PM',
      displayEndTime: '1:30 PM',
      status: 'pending',
      createdAt: '',
      updatedAt: '',
    };

    const conflicts = conflictResolver.detectConflicts([coreZuhr, meetingTask]);
    expect(conflicts.length).toBeGreaterThan(0);
    const conflict = conflicts[0];
    expect(conflict.conflictType).toBe('outside_prayer_window');
    expect(conflict.severity).toBe('error');
    // Suggested start time should be right after Zuhr finishes (12:55 PM)
    expect(conflict.suggestedStartTime?.getTime()).toBe(zuhrEnd.getTime());
  });

  test('Quran reading anchored after Tahajjud starts exactly when Tahajjud ends', () => {
    const phase: Phase = {
      id: 'phase-1',
      name: 'Before Fajr',
      type: 'fajr_early_morning',
      sortOrder: 1,
      isDefault: true,
      isEnabled: true,
      createdAt: '',
      updatedAt: '',
    };

    // Core Tahajjud: 05:43 AM to 06:03 AM (20m duration)
    const tahajjudTask: Task = {
      id: 'task-tahajjud',
      phaseId: 'phase-1',
      title: 'Tahajjud Prayer',
      taskType: 'prayer',
      prayerType: 'tahajjud',
      isCore: true,
      sortOrder: 10,
      durationMinutes: 20,
      schedulingType: 'fixed_time',
      fixedTime: '05:43',
      offsetMinutes: 0,
      priority: 'core',
      isEnabled: true,
      createdAt: '',
      updatedAt: '',
    };

    // Quran reading: anchored after Tahajjud with 0m offset
    const quranTask: Task = {
      id: 'task-quran',
      phaseId: 'phase-1',
      title: 'Quran Recitation & Adhkar',
      taskType: 'activity',
      isCore: false,
      sortOrder: 20,
      durationMinutes: 30,
      schedulingType: 'prayer_relative',
      anchorPrayer: 'tahajjud',
      anchorRelation: 'after',
      offsetMinutes: 0,
      priority: 'medium',
      isEnabled: true,
      createdAt: '',
      updatedAt: '',
    };

    // Fajr: at 06:10 AM
    const fajrTask: Task = {
      id: 'task-fajr',
      phaseId: 'phase-1',
      title: 'Fajr Prayer',
      taskType: 'prayer',
      prayerType: 'fajr',
      isCore: true,
      sortOrder: 30,
      durationMinutes: 20,
      schedulingType: 'fixed_time',
      fixedTime: '06:10',
      offsetMinutes: 0,
      priority: 'core',
      isEnabled: true,
      createdAt: '',
      updatedAt: '',
    };

    const schedule = scheduleEngine.buildDailySchedule(
      day1,
      [phase],
      [tahajjudTask, quranTask, fajrTask],
      times1
    );

    const phase1Tasks = schedule.phases[0].tasks;
    expect(phase1Tasks).toHaveLength(3);

    const scheduledTahajjud = phase1Tasks[0];
    const scheduledQuran = phase1Tasks[1];
    const scheduledFajr = phase1Tasks[2];

    // Tahajjud: 5:43 AM - 6:03 AM
    expect(scheduledTahajjud.displayStartTime).toBe('5:43 AM');
    expect(scheduledTahajjud.displayEndTime).toBe('6:03 AM');

    // Quran reading: Starts exactly at 6:03 AM (right when Tahajjud ends!)
    expect(scheduledQuran.displayStartTime).toBe('6:03 AM');
    expect(scheduledQuran.displayEndTime).toBe('6:33 AM');

    // Fajr: 6:10 AM - 6:30 AM
    expect(scheduledFajr.displayStartTime).toBe('6:10 AM');
    expect(scheduledFajr.displayEndTime).toBe('6:30 AM');
  });
});
