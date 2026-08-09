import { db } from "../db/Database";
import { ISyncQueueRepository } from "./Interfaces";

export interface SyncQueueItem {
  id: string;
  entityType: string;
  localId: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "UPLOAD";
  status: "PENDING" | "SYNCING" | "SYNCED" | "FAILED" | "CONFLICT";
  createdAt: string;
  retryCount: number;
  error?: string;
  payload: any;
}

export class SyncQueueRepository implements ISyncQueueRepository {
  async findAll(): Promise<SyncQueueItem[]> {
    const stmt = db.prepare("SELECT * FROM sync_queue ORDER BY createdAt ASC");
    const rows = stmt.all() as any[];
    return rows.map(r => ({ ...r, payload: JSON.parse(r.payload) }));
  }

  async getPendingItems(): Promise<SyncQueueItem[]> {
    const stmt = db.prepare("SELECT * FROM sync_queue WHERE status IN ('PENDING', 'FAILED') ORDER BY createdAt ASC");
    const rows = stmt.all() as any[];
    return rows.map(r => ({ ...r, payload: JSON.parse(r.payload) }));
  }

  async create(item: Omit<SyncQueueItem, "id" | "createdAt" | "status" | "retryCount">): Promise<SyncQueueItem> {
    const fullItem: SyncQueueItem = {
      ...item,
      id: `SQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
      status: "PENDING",
      retryCount: 0
    };

    const stmt = db.prepare(`
      INSERT INTO sync_queue (id, entityType, localId, action, status, createdAt, retryCount, error, payload)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      fullItem.id, fullItem.entityType, fullItem.localId, fullItem.action,
      fullItem.status, fullItem.createdAt, fullItem.retryCount, fullItem.error || null, JSON.stringify(fullItem.payload)
    );

    return fullItem;
  }

  async updateStatus(id: string, status: SyncQueueItem["status"], error?: string): Promise<void> {
    let stmt;
    if (status === "FAILED") {
      stmt = db.prepare("UPDATE sync_queue SET status = ?, error = ?, retryCount = retryCount + 1 WHERE id = ?");
      stmt.run(status, error || "Unknown error", id);
    } else {
      stmt = db.prepare("UPDATE sync_queue SET status = ?, error = NULL WHERE id = ?");
      stmt.run(status, id);
    }
  }

  async delete(id: string): Promise<void> {
    db.prepare("DELETE FROM sync_queue WHERE id = ?").run(id);
  }
}

export const syncQueueRepository = new SyncQueueRepository();
