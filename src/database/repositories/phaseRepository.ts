import { getDatabase } from '../index';
import { Phase, PhaseType } from '../../types';

interface PhaseRow {
  id: string;
  name: string;
  type: string;
  sort_order: number;
  is_default: number;
  is_enabled: number;
  color: string | null;
  icon: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToPhase(row: PhaseRow): Phase {
  return {
    id: row.id,
    name: row.name,
    type: row.type as PhaseType,
    sortOrder: row.sort_order,
    isDefault: row.is_default === 1,
    isEnabled: row.is_enabled === 1,
    color: row.color ?? undefined,
    icon: row.icon ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const phaseRepository = {
  async getAll(): Promise<Phase[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<PhaseRow>(
      'SELECT * FROM phases ORDER BY sort_order ASC'
    );
    return rows.map(mapRowToPhase);
  },

  async getEnabled(): Promise<Phase[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<PhaseRow>(
      'SELECT * FROM phases WHERE is_enabled = 1 ORDER BY sort_order ASC'
    );
    return rows.map(mapRowToPhase);
  },

  async getById(id: string): Promise<Phase | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<PhaseRow>(
      'SELECT * FROM phases WHERE id = ?',
      [id]
    );
    return row ? mapRowToPhase(row) : null;
  },

  async create(phase: Omit<Phase, 'createdAt' | 'updatedAt'>): Promise<Phase> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const newPhase: Phase = {
      ...phase,
      createdAt: now,
      updatedAt: now,
    };

    await db.runAsync(
      `INSERT INTO phases (id, name, type, sort_order, is_default, is_enabled, color, icon, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newPhase.id,
        newPhase.name,
        newPhase.type,
        newPhase.sortOrder,
        newPhase.isDefault ? 1 : 0,
        newPhase.isEnabled ? 1 : 0,
        newPhase.color ?? null,
        newPhase.icon ?? null,
        newPhase.createdAt,
        newPhase.updatedAt,
      ]
    );

    return newPhase;
  },

  async update(phase: Phase): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    await db.runAsync(
      `UPDATE phases
       SET name = ?, type = ?, sort_order = ?, is_default = ?, is_enabled = ?, color = ?, icon = ?, updated_at = ?
       WHERE id = ?`,
      [
        phase.name,
        phase.type,
        phase.sortOrder,
        phase.isDefault ? 1 : 0,
        phase.isEnabled ? 1 : 0,
        phase.color ?? null,
        phase.icon ?? null,
        now,
        phase.id,
      ]
    );
  },

  async delete(id: string): Promise<boolean> {
    const db = await getDatabase();
    const phase = await this.getById(id);
    if (!phase) return false;

    // Prevent deletion of default core phases
    if (phase.isDefault) {
      throw new Error('Default Salah phases cannot be deleted.');
    }

    await db.runAsync('DELETE FROM phases WHERE id = ?', [id]);
    return true;
  },

  async reorderPhases(phaseIds: string[]): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      for (let i = 0; i < phaseIds.length; i++) {
        await db.runAsync(
          'UPDATE phases SET sort_order = ?, updated_at = ? WHERE id = ?',
          [i + 1, now, phaseIds[i]]
        );
      }
    });
  },

  async count(): Promise<number> {
    const db = await getDatabase();
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM phases'
    );
    return result?.count ?? 0;
  },
};
