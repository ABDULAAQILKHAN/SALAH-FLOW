export const SCHEMA_SQL = `
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS phases (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    is_default INTEGER NOT NULL DEFAULT 0,
    is_enabled INTEGER NOT NULL DEFAULT 1,
    color TEXT,
    icon TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY NOT NULL,
    phase_id TEXT NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    task_type TEXT NOT NULL,
    is_core INTEGER NOT NULL DEFAULT 0,
    prayer_type TEXT,
    sort_order INTEGER NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 15,
    scheduling_type TEXT NOT NULL DEFAULT 'prayer_relative',
    fixed_time TEXT,
    anchor_prayer TEXT,
    anchor_relation TEXT,
    offset_minutes INTEGER NOT NULL DEFAULT 0,
    priority TEXT NOT NULL DEFAULT 'medium',
    is_enabled INTEGER NOT NULL DEFAULT 1,
    icon TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS task_alarms (
    id TEXT PRIMARY KEY NOT NULL,
    task_id TEXT NOT NULL UNIQUE REFERENCES tasks(id) ON DELETE CASCADE,
    is_enabled INTEGER NOT NULL DEFAULT 1,
    alarm_time TEXT,
    reminder_minutes INTEGER NOT NULL DEFAULT 0,
    sound_enabled INTEGER NOT NULL DEFAULT 1,
    vibration_enabled INTEGER NOT NULL DEFAULT 1,
    snooze_minutes INTEGER NOT NULL DEFAULT 5,
    repeat_rule TEXT NOT NULL DEFAULT 'daily',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS prayer_timings (
    id TEXT PRIMARY KEY NOT NULL,
    date TEXT NOT NULL,
    fajr TEXT NOT NULL,
    sunrise TEXT NOT NULL,
    dhuhr TEXT NOT NULL,
    asr TEXT NOT NULL,
    maghrib TEXT NOT NULL,
    isha TEXT NOT NULL,
    tahajjud TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    calculation_method TEXT NOT NULL,
    asr_method TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(date, calculation_method, asr_method, latitude, longitude)
  );

  CREATE TABLE IF NOT EXISTS daily_task_status (
    id TEXT PRIMARY KEY NOT NULL,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    completed_at TEXT,
    actual_scheduled_time TEXT,
    UNIQUE(task_id, date)
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_phases_sort ON phases(sort_order);
  CREATE INDEX IF NOT EXISTS idx_tasks_phase ON tasks(phase_id, sort_order);
  CREATE INDEX IF NOT EXISTS idx_daily_status ON daily_task_status(date, task_id);
  CREATE INDEX IF NOT EXISTS idx_prayer_date ON prayer_timings(date);
  CREATE INDEX IF NOT EXISTS idx_alarms_task ON task_alarms(task_id);
`;
