import { ScheduledTask, TaskAlarm } from '../../types';
import {
  notificationService,
  NOTIFICATION_CHANNELS,
  getChannelForTone,
  getSoundFilename,
} from '../notifications/notificationService';
import { taskAlarmRepository } from '../../database/repositories/taskAlarmRepository';
import { subMinutesFromDate, formatTime12h } from '../../utils/dateTime';

export const alarmManager = {
  getAlarmId(taskId: string): string {
    return `alarm_${taskId}`;
  },

  getReminderId(taskId: string): string {
    return `reminder_${taskId}`;
  },

  async scheduleTaskAlarm(
    task: ScheduledTask,
    alarmConfig?: TaskAlarm
  ): Promise<{ alarmScheduled: boolean; reminderScheduled: boolean }> {
    const alarm = alarmConfig || task.alarm;

    // If no alarm config or alarm is disabled, cancel any existing alarms
    if (!alarm || !alarm.isEnabled || !task.isEnabled || task.status === 'completed') {
      await this.cancelTaskAlarm(task.id);
      return { alarmScheduled: false, reminderScheduled: false };
    }

    let reminderScheduled = false;
    let alarmScheduled = false;

    // 1. Advance Reminder (e.g. 5, 10, 15, 30 minutes before task start)
    if (alarm.reminderMinutes > 0) {
      const reminderTime = subMinutesFromDate(task.startTime, alarm.reminderMinutes);
      if (reminderTime.getTime() > Date.now()) {
        await notificationService.scheduleNotification({
          identifier: this.getReminderId(task.id),
          title: `Upcoming: ${task.title}`,
          body: `Starts in ${alarm.reminderMinutes} minutes (at ${task.displayStartTime})`,
          triggerDate: reminderTime,
          channelId: NOTIFICATION_CHANNELS.REMINDERS,
          data: { taskId: task.id, type: 'reminder' },
        });
        reminderScheduled = true;
      }
    } else {
      await notificationService.cancelNotification(this.getReminderId(task.id));
    }

    // 2. Main Exact Alarm (at task start time)
    if (task.startTime.getTime() > Date.now()) {
      const isPrayer = task.isCore && task.taskType === 'prayer';
      const tone = alarm.soundTone || 'peaceful_adhan';
      const channel = isPrayer ? getChannelForTone(tone) : NOTIFICATION_CHANNELS.ALARMS;
      const soundName = isPrayer ? getSoundFilename(tone) : 'default';

      const title = isPrayer
        ? `Salah: ${task.title}`
        : `${task.title}`;

      const body = task.description || `Scheduled for ${task.displayStartTime}`;

      await notificationService.scheduleNotification({
        identifier: this.getAlarmId(task.id),
        title,
        body,
        triggerDate: task.startTime,
        channelId: channel,
        soundName,
        data: { taskId: task.id, type: 'main_alarm', tone },
      });
      alarmScheduled = true;
    }

    return { alarmScheduled, reminderScheduled };
  },

  async cancelTaskAlarm(taskId: string): Promise<void> {
    await notificationService.cancelNotification(this.getAlarmId(taskId));
    await notificationService.cancelNotification(this.getReminderId(taskId));
  },

  async syncAllAlarms(tasks: ScheduledTask[]): Promise<{
    scheduledCount: number;
    cancelledCount: number;
  }> {
    let scheduledCount = 0;
    let cancelledCount = 0;

    for (const task of tasks) {
      if (task.alarm && task.alarm.isEnabled && task.status !== 'completed') {
        const result = await this.scheduleTaskAlarm(task, task.alarm);
        if (result.alarmScheduled || result.reminderScheduled) {
          scheduledCount++;
        }
      } else {
        await this.cancelTaskAlarm(task.id);
        cancelledCount++;
      }
    }

    return { scheduledCount, cancelledCount };
  },

  async testTriggerAlarm(
    title: string,
    delaySeconds: number = 5,
    tone: string = 'peaceful_adhan'
  ): Promise<string> {
    const triggerDate = new Date(Date.now() + delaySeconds * 1000);
    const identifier = `test_alarm_${Date.now()}`;
    const channel = getChannelForTone(tone);
    const soundName = getSoundFilename(tone);

    await notificationService.scheduleNotification({
      identifier,
      title: `[PRAYER ALARM] ${title}`,
      body: `Diagnostic alarm fired accurately at ${formatTime12h(triggerDate)}!`,
      triggerDate,
      channelId: channel,
      soundName,
      data: { test: true, tone },
    });

    return identifier;
  },
};
