import { getDatabase } from '../index';
import { DailyTaskStatus, TaskStatus } from '../../types';
import { generateUUID } from '../../utils/uuid';

interface DailyStatusRow {
  id: string;
  task_id: string;
  date: string;
  status: string;
  completed_at: string | null;
  actual_scheduled_time: string | null;
}

function mapRowToDailyStatus(row: DailyStatusRow): DailyTaskStatus {
  return {
    id: row.id,
    taskId: row.task_id,
    date: row.date,
    status: row.status as TaskStatus,
    completedAt: row.completed_at ?? undefined,
    actualScheduledTime: row.actual_scheduled_time ?? undefined,
  };
}

export const dailyTaskStatusRepository = {
  async getByDate(date: string): Promise<DailyTaskStatus[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<DailyStatusRow>(
      'SELECT * FROM daily_task_status WHERE date = ?',
      [date]
    );
    return rows.map(mapRowToDailyStatus);
  },

  async getByTaskAndDate(taskId: string, date: string): Promise<DailyTaskStatus | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<DailyStatusRow>(
      'SELECT * FROM daily_task_status WHERE task_id = ? AND date = ?',
      [taskId, date]
    );
    return row ? mapRowToDailyStatus(row) : null;
  },

  async setStatus(
    taskId: string,
    date: string,
    status: TaskStatus,
    actualScheduledTime?: string
  ): Promise<DailyTaskStatus> {
    const db = await getDatabase();
    const existing = await this.getByTaskAndDate(taskId, date);
    const now = status === 'completed' ? new Date().toISOString() : null;

    if (existing) {
      await db.runAsync(
        `UPDATE daily_task_status
         SET status = ?, completed_at = ?, actual_scheduled_time = COALESCE(?, actual_scheduled_time)
         WHERE id = ?`,
        [status, now, actualScheduledTime ?? null, existing.id]
      );
      return {
        ...existing,
        status,
        completedAt: now ?? undefined,
        actualScheduledTime: actualScheduledTime ?? existing.actualScheduledTime,
      };
    } else {
      const newStatus: DailyTaskStatus = {
        id: generateUUID(),
        taskId,
        date,
        status,
        completedAt: now ?? undefined,
        actualScheduledTime,
      };
      await db.runAsync(
        `INSERT INTO daily_task_status (id, task_id, date, status, completed_at, actual_scheduled_time)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          newStatus.id,
          newStatus.taskId,
          newStatus.date,
          newStatus.status,
          newStatus.completedAt ?? null,
          newStatus.actualScheduledTime ?? null,
        ]
      );
      return newStatus;
    }
  },

  async getCompletionStats(startDate: string, endDate: string): Promise<{
    date: string;
    total: number;
    completed: number;
    skipped: number;
  }[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      date: string;
      total: number;
      completed: number;
      skipped: number;
    }>(
      `SELECT
        date,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped
       FROM daily_task_status
       WHERE date >= ? AND date <= ?
       GROUP BY date
       ORDER BY date ASC`,
      [startDate, endDate]
    );
    return rows;
  },
};
