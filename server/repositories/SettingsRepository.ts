import { db } from "../db/Database";

export interface SettingItem {
  key: string;
  value: string;
  category?: string;
  updatedAt: string;
}

export class SettingsRepository {
  async get(key: string): Promise<string | null> {
    const stmt = db.prepare("SELECT value FROM system_settings WHERE key = ?");
    const row = stmt.get(key) as { value: string } | undefined;
    return row ? row.value : null;
  }

  async set(key: string, value: string, category: string = "SYSTEM"): Promise<boolean> {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO system_settings (key, value, category, updatedAt)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        category = excluded.category,
        updatedAt = excluded.updatedAt
    `);
    const result = stmt.run(key, value, category, now);
    return result.changes > 0;
  }

  async getByCategory(category: string): Promise<Record<string, string>> {
    const stmt = db.prepare("SELECT key, value FROM system_settings WHERE category = ?");
    const rows = stmt.all(category) as { key: string; value: string }[];
    const result: Record<string, string> = {};
    for (const r of rows) {
      result[r.key] = r.value;
    }
    return result;
  }

  async getAll(): Promise<Record<string, string>> {
    const stmt = db.prepare("SELECT key, value FROM system_settings");
    const rows = stmt.all() as { key: string; value: string }[];
    const result: Record<string, string> = {};
    for (const r of rows) {
      result[r.key] = r.value;
    }
    return result;
  }
}

export const settingsRepository = new SettingsRepository();
