import { getDatabase } from '../index';

interface SettingRow {
  key: string;
  value: string;
}

export const settingsRepository = {
  async get(key: string, defaultValue: string = ''): Promise<string> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<SettingRow>(
      'SELECT value FROM app_settings WHERE key = ?',
      [key]
    );
    return row ? row.value : defaultValue;
  },

  async getJSON<T>(key: string, defaultValue: T): Promise<T> {
    const val = await this.get(key, '');
    if (!val) return defaultValue;
    try {
      return JSON.parse(val) as T;
    } catch {
      return defaultValue;
    }
  },

  async set(key: string, value: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
      [key, value]
    );
  },

  async setJSON<T>(key: string, value: T): Promise<void> {
    await this.set(key, JSON.stringify(value));
  },

  async getAll(): Promise<Record<string, string>> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SettingRow>('SELECT * FROM app_settings');
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return settings;
  },

  async hasCompletedOnboarding(): Promise<boolean> {
    const value = await this.get('onboarding_completed', 'false');
    return value === 'true';
  },

  async setCompletedOnboarding(completed: boolean): Promise<void> {
    await this.set('onboarding_completed', completed ? 'true' : 'false');
  },
};
