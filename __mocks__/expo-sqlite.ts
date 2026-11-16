const mockStorage = new Map<string, any[]>();

export class MockDatabase {
  async execAsync(sql: string): Promise<void> {
    return Promise.resolve();
  }

  async runAsync(sql: string, params: any[] = []): Promise<{ lastInsertRowId: number; changes: number }> {
    return Promise.resolve({ lastInsertRowId: 1, changes: 1 });
  }

  async getAllAsync<T>(sql: string, params: any[] = []): Promise<T[]> {
    return Promise.resolve([]);
  }

  async getFirstAsync<T>(sql: string, params: any[] = []): Promise<T | null> {
    return Promise.resolve(null);
  }

  async withTransactionAsync<T>(callback: () => Promise<T>): Promise<T> {
    return await callback();
  }
}

export async function openDatabaseAsync(name: string): Promise<MockDatabase> {
  return new MockDatabase();
}

export function openDatabaseSync(name: string): MockDatabase {
  return new MockDatabase();
}
