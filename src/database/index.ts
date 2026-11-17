import * as SQLite from 'expo-sqlite';
import { SCHEMA_SQL } from './schema';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await SQLite.openDatabaseAsync('salahflow.db');

  // Enable foreign keys
  await dbInstance.execAsync('PRAGMA foreign_keys = ON;');

  // Run schema initialization
  await initDatabase(dbInstance);

  return dbInstance;
}

export async function initDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    await db.execAsync(SCHEMA_SQL);
    try {
      await db.execAsync("ALTER TABLE task_alarms ADD COLUMN sound_tone TEXT DEFAULT 'peaceful_adhan';");
    } catch {}
  } catch (error) {
    console.error('Failed to initialize database schema:', error);
    throw error;
  }
}

export async function resetDatabase(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync(`
    PRAGMA foreign_keys = OFF;
    DROP TABLE IF EXISTS daily_task_status;
    DROP TABLE IF EXISTS task_alarms;
    DROP TABLE IF EXISTS tasks;
    DROP TABLE IF EXISTS phases;
    DROP TABLE IF EXISTS prayer_timings;
    DROP TABLE IF EXISTS app_settings;
    DROP TABLE IF EXISTS schema_migrations;
    PRAGMA foreign_keys = ON;
  `);
  await initDatabase(db);
}
