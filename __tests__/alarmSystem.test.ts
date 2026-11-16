import { alarmManager } from '../src/services/alarms/alarmManager';
import { notificationService } from '../src/services/notifications/notificationService';
import { ScheduledTask, TaskAlarm } from '../src/types';

describe('Local Alarm and Notification System', () => {
  beforeEach(async () => {
    await notificationService.cancelAllNotifications();
  });

  test('Generates deterministic alarm and reminder IDs linked to taskId', () => {
    const taskId = 'task-xyz-123';
    expect(alarmManager.getAlarmId(taskId)).toBe('alarm_task-xyz-123');
    expect(alarmManager.getReminderId(taskId)).toBe('reminder_task-xyz-123');
  });

  test('Schedules both advance reminder and main exact alarm', async () => {
    // Future task start: 1 hour from now
    const futureStart = new Date(Date.now() + 60 * 60 * 1000);
    const futureEnd = new Date(futureStart.getTime() + 30 * 60 * 1000);

    const task: ScheduledTask = {
      id: 'task-quran',
      phaseId: 'phase-fajr',
      title: 'Morning Quran',
      taskType: 'activity',
      isCore: false,
      sortOrder: 10,
      durationMinutes: 30,
      schedulingType: 'prayer_relative',
      offsetMinutes: 0,
      priority: 'high',
      isEnabled: true,
      startTime: futureStart,
      endTime: futureEnd,
      displayStartTime: '6:30 AM',
      displayEndTime: '7:00 AM',
      status: 'pending',
      createdAt: '',
      updatedAt: '',
    };

    const alarmConfig: TaskAlarm = {
      id: 'alarm-1',
      taskId: 'task-quran',
      isEnabled: true,
      reminderMinutes: 10, // 10 mins before
      soundEnabled: true,
      vibrationEnabled: true,
      snoozeMinutes: 5,
      repeatRule: 'daily',
      createdAt: '',
      updatedAt: '',
    };

    const result = await alarmManager.scheduleTaskAlarm(task, alarmConfig);
    expect(result.alarmScheduled).toBe(true);
    expect(result.reminderScheduled).toBe(true);

    const scheduled = await notificationService.getAllScheduled();
    expect(scheduled.length).toBe(2);

    const mainAlarm = scheduled.find((s) => s.identifier === 'alarm_task-quran');
    const reminder = scheduled.find((s) => s.identifier === 'reminder_task-quran');

    expect(mainAlarm).toBeDefined();
    expect(reminder).toBeDefined();
    expect(reminder?.content.title).toContain('Upcoming: Morning Quran');
  });

  test('Cancels alarm when task is completed or deleted', async () => {
    const futureStart = new Date(Date.now() + 60 * 60 * 1000);
    const task: ScheduledTask = {
      id: 'task-gym',
      phaseId: 'phase-2',
      title: 'Gym',
      taskType: 'activity',
      isCore: false,
      sortOrder: 10,
      durationMinutes: 45,
      schedulingType: 'flexible',
      offsetMinutes: 0,
      priority: 'medium',
      isEnabled: true,
      startTime: futureStart,
      endTime: new Date(futureStart.getTime() + 45 * 60 * 1000),
      displayStartTime: '7:00 AM',
      displayEndTime: '7:45 AM',
      status: 'completed', // completed!
      createdAt: '',
      updatedAt: '',
    };

    const alarmConfig: TaskAlarm = {
      id: 'alarm-2',
      taskId: 'task-gym',
      isEnabled: true,
      reminderMinutes: 15,
      soundEnabled: true,
      vibrationEnabled: true,
      snoozeMinutes: 5,
      repeatRule: 'daily',
      createdAt: '',
      updatedAt: '',
    };

    // When status is completed, scheduleTaskAlarm should cancel any pending alarms
    const result = await alarmManager.scheduleTaskAlarm(task, alarmConfig);
    expect(result.alarmScheduled).toBe(false);
    expect(result.reminderScheduled).toBe(false);

    const scheduled = await notificationService.getAllScheduled();
    expect(scheduled.length).toBe(0);
  });

  test('Prevents duplicate alarms when syncing repeatedly', async () => {
    const futureStart = new Date(Date.now() + 60 * 60 * 1000);
    const task: ScheduledTask = {
      id: 'task-fajr',
      phaseId: 'phase-1',
      title: 'Fajr Prayer',
      taskType: 'prayer',
      isCore: true,
      prayerType: 'fajr',
      sortOrder: 20,
      durationMinutes: 20,
      schedulingType: 'prayer_relative',
      offsetMinutes: 0,
      priority: 'core',
      isEnabled: true,
      startTime: futureStart,
      endTime: new Date(futureStart.getTime() + 20 * 60 * 1000),
      displayStartTime: '5:15 AM',
      displayEndTime: '5:35 AM',
      status: 'pending',
      alarm: {
        id: 'alarm-fajr',
        taskId: 'task-fajr',
        isEnabled: true,
        reminderMinutes: 10,
        soundEnabled: true,
        vibrationEnabled: true,
        snoozeMinutes: 5,
        repeatRule: 'daily',
        createdAt: '',
        updatedAt: '',
      },
      createdAt: '',
      updatedAt: '',
    };

    // Sync multiple times in a row
    await alarmManager.syncAllAlarms([task]);
    await alarmManager.syncAllAlarms([task]);
    await alarmManager.syncAllAlarms([task]);

    const scheduled = await notificationService.getAllScheduled();
    // Exactly 2 notifications: 1 main alarm and 1 advance reminder, no duplicates
    expect(scheduled.length).toBe(2);
  });
});
