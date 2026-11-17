import { getDatabase } from '../index';
import { TaskAlarm, RepeatRule } from '../../types';

interface AlarmRow {
  id: string;
  task_id: string;
  is_enabled: number;
  alarm_time: string | null;
  reminder_minutes: number;
  sound_enabled: number;
  sound_tone: string | null;
  vibration_enabled: number;
  snooze_minutes: number;
  repeat_rule: string;
  created_at: string;
  updated_at: string;
}

function mapRowToAlarm(row: AlarmRow): TaskAlarm {
  return {
    id: row.id,
    taskId: row.task_id,
    isEnabled: row.is_enabled === 1,
    alarmTime: row.alarm_time ?? undefined,
    reminderMinutes: row.reminder_minutes,
    soundEnabled: row.sound_enabled === 1,
    soundTone: row.sound_tone || 'peaceful_adhan',
    vibrationEnabled: row.vibration_enabled === 1,
    snoozeMinutes: row.snooze_minutes,
    repeatRule: row.repeat_rule as RepeatRule,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const taskAlarmRepository = {
  async getByTaskId(taskId: string): Promise<TaskAlarm | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<AlarmRow>(
      'SELECT * FROM task_alarms WHERE task_id = ?',
      [taskId]
    );
    return row ? mapRowToAlarm(row) : null;
  },

  async getAllEnabled(): Promise<TaskAlarm[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<AlarmRow>(
      'SELECT * FROM task_alarms WHERE is_enabled = 1'
    );
    return rows.map(mapRowToAlarm);
  },

  async upsert(alarm: Omit<TaskAlarm, 'createdAt' | 'updatedAt'>): Promise<TaskAlarm> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const existing = await this.getByTaskId(alarm.taskId);

    if (existing) {
      await db.runAsync(
        `UPDATE task_alarms SET
          is_enabled = ?, alarm_time = ?, reminder_minutes = ?,
          sound_enabled = ?, sound_tone = ?, vibration_enabled = ?, snooze_minutes = ?,
          repeat_rule = ?, updated_at = ?
        WHERE task_id = ?`,
        [
          alarm.isEnabled ? 1 : 0,
          alarm.alarmTime ?? null,
          alarm.reminderMinutes,
          alarm.soundEnabled ? 1 : 0,
          alarm.soundTone || 'peaceful_adhan',
          alarm.vibrationEnabled ? 1 : 0,
          alarm.snoozeMinutes,
          alarm.repeatRule,
          now,
          alarm.taskId,
        ]
      );
      return {
        ...existing,
        ...alarm,
        updatedAt: now,
      };
    } else {
      const newAlarm: TaskAlarm = {
        ...alarm,
        soundTone: alarm.soundTone || 'peaceful_adhan',
        createdAt: now,
        updatedAt: now,
      };
      await db.runAsync(
        `INSERT INTO task_alarms (
          id, task_id, is_enabled, alarm_time, reminder_minutes,
          sound_enabled, sound_tone, vibration_enabled, snooze_minutes, repeat_rule,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newAlarm.id,
          newAlarm.taskId,
          newAlarm.isEnabled ? 1 : 0,
          newAlarm.alarmTime ?? null,
          newAlarm.reminderMinutes,
          newAlarm.soundEnabled ? 1 : 0,
          newAlarm.soundTone || 'peaceful_adhan',
          newAlarm.vibrationEnabled ? 1 : 0,
          newAlarm.snoozeMinutes,
          newAlarm.repeatRule,
          newAlarm.createdAt,
          newAlarm.updatedAt,
        ]
      );
      return newAlarm;
    }
  },

  async delete(taskId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM task_alarms WHERE task_id = ?', [taskId]);
  },
};
