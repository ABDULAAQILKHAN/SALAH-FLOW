import { getDatabase } from '../index';
import {
  Task,
  TaskType,
  PrayerName,
  SchedulingType,
  AnchorRelation,
  TaskPriority,
} from '../../types';

interface TaskRow {
  id: string;
  phase_id: string;
  title: string;
  description: string | null;
  task_type: string;
  is_core: number;
  prayer_type: string | null;
  sort_order: number;
  duration_minutes: number;
  scheduling_type: string;
  fixed_time: string | null;
  anchor_prayer: string | null;
  anchor_relation: string | null;
  offset_minutes: number;
  priority: string;
  is_enabled: number;
  icon: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    phaseId: row.phase_id,
    title: row.title,
    description: row.description ?? undefined,
    taskType: row.task_type as TaskType,
    isCore: row.is_core === 1,
    prayerType: (row.prayer_type as PrayerName) ?? undefined,
    sortOrder: row.sort_order,
    durationMinutes: row.duration_minutes,
    schedulingType: row.scheduling_type as SchedulingType,
    fixedTime: row.fixed_time ?? undefined,
    anchorPrayer: (row.anchor_prayer as PrayerName) ?? undefined,
    anchorRelation: (row.anchor_relation as AnchorRelation) ?? undefined,
    offsetMinutes: row.offset_minutes,
    priority: row.priority as TaskPriority,
    isEnabled: row.is_enabled === 1,
    icon: row.icon ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const taskRepository = {
  async getAll(): Promise<Task[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<TaskRow>(
      'SELECT * FROM tasks ORDER BY phase_id, sort_order ASC'
    );
    return rows.map(mapRowToTask);
  },

  async getByPhaseId(phaseId: string): Promise<Task[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<TaskRow>(
      'SELECT * FROM tasks WHERE phase_id = ? ORDER BY sort_order ASC',
      [phaseId]
    );
    return rows.map(mapRowToTask);
  },

  async getById(id: string): Promise<Task | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<TaskRow>(
      'SELECT * FROM tasks WHERE id = ?',
      [id]
    );
    return row ? mapRowToTask(row) : null;
  },

  async create(task: Omit<Task, 'createdAt' | 'updatedAt'>): Promise<Task> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const newTask: Task = {
      ...task,
      createdAt: now,
      updatedAt: now,
    };

    await db.runAsync(
      `INSERT INTO tasks (
        id, phase_id, title, description, task_type, is_core, prayer_type,
        sort_order, duration_minutes, scheduling_type, fixed_time,
        anchor_prayer, anchor_relation, offset_minutes, priority,
        is_enabled, icon, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newTask.id,
        newTask.phaseId,
        newTask.title,
        newTask.description ?? null,
        newTask.taskType,
        newTask.isCore ? 1 : 0,
        newTask.prayerType ?? null,
        newTask.sortOrder,
        newTask.durationMinutes,
        newTask.schedulingType,
        newTask.fixedTime ?? null,
        newTask.anchorPrayer ?? null,
        newTask.anchorRelation ?? null,
        newTask.offsetMinutes,
        newTask.priority,
        newTask.isEnabled ? 1 : 0,
        newTask.icon ?? null,
        newTask.createdAt,
        newTask.updatedAt,
      ]
    );

    return newTask;
  },

  async update(task: Task): Promise<void> {
    const db = await getDatabase();
    const existing = await this.getById(task.id);
    if (!existing) {
      throw new Error(`Task with id ${task.id} not found.`);
    }

    // Preserve core prayer task identity
    if (existing.isCore && existing.taskType === 'prayer') {
      if (task.taskType !== 'prayer' || task.prayerType !== existing.prayerType) {
        throw new Error('Obligatory Salah core tasks cannot have their prayer identity altered.');
      }
    }

    const now = new Date().toISOString();

    await db.runAsync(
      `UPDATE tasks SET
        phase_id = ?, title = ?, description = ?, task_type = ?, is_core = ?,
        prayer_type = ?, sort_order = ?, duration_minutes = ?, scheduling_type = ?,
        fixed_time = ?, anchor_prayer = ?, anchor_relation = ?, offset_minutes = ?,
        priority = ?, is_enabled = ?, icon = ?, updated_at = ?
      WHERE id = ?`,
      [
        task.phaseId,
        task.title,
        task.description ?? null,
        task.taskType,
        task.isCore ? 1 : 0,
        task.prayerType ?? null,
        task.sortOrder,
        task.durationMinutes,
        task.schedulingType,
        task.fixedTime ?? null,
        task.anchorPrayer ?? null,
        task.anchorRelation ?? null,
        task.offsetMinutes,
        task.priority,
        task.isEnabled ? 1 : 0,
        task.icon ?? null,
        now,
        task.id,
      ]
    );
  },

  async delete(id: string): Promise<boolean> {
    const db = await getDatabase();
    const task = await this.getById(id);
    if (!task) return false;

    // Obligatory Salah core tasks must NEVER be deleted
    if (task.isCore && task.taskType === 'prayer') {
      throw new Error('Obligatory Salah core tasks cannot be deleted.');
    }

    await db.runAsync('DELETE FROM tasks WHERE id = ?', [id]);
    return true;
  },

  async reorderTasks(phaseId: string, orderedTaskIds: string[]): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      for (let i = 0; i < orderedTaskIds.length; i++) {
        // Multiply by 10 to leave space for insertions between tasks
        const sortOrder = (i + 1) * 10;
        await db.runAsync(
          'UPDATE tasks SET sort_order = ?, updated_at = ? WHERE id = ? AND phase_id = ?',
          [sortOrder, now, orderedTaskIds[i], phaseId]
        );
      }
    });
  },

  async moveTaskToPhase(
    taskId: string,
    targetPhaseId: string,
    newSortOrder: number
  ): Promise<void> {
    const db = await getDatabase();
    const task = await this.getById(taskId);
    if (!task) throw new Error('Task not found');

    if (task.isCore && task.taskType === 'prayer') {
      throw new Error('Obligatory Salah core tasks cannot be moved outside their designated phase.');
    }

    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE tasks SET phase_id = ?, sort_order = ?, updated_at = ? WHERE id = ?',
      [targetPhaseId, newSortOrder, now, taskId]
    );
  },

  async count(): Promise<number> {
    const db = await getDatabase();
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM tasks'
    );
    return result?.count ?? 0;
  },
};
