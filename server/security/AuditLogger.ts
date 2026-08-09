import { db } from "../db/Database";

export interface AuditRecord {
  eventId: string;
  timestamp: string;
  actorUserId: string;
  actorRole: string;
  tenantId: string;
  groupId?: string;
  hospitalId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  result: 'ALLOW' | 'DENY' | 'SUCCESS' | 'FAILURE';
  reason?: string;
  requestId?: string;
  ipAddress?: string;
}

export class AuditLogger {
  constructor() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS audit_trail_events (
        eventId TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        actorUserId TEXT NOT NULL,
        actorRole TEXT NOT NULL,
        tenantId TEXT NOT NULL,
        groupId TEXT,
        hospitalId TEXT,
        action TEXT NOT NULL,
        resourceType TEXT NOT NULL,
        resourceId TEXT,
        result TEXT NOT NULL,
        reason TEXT,
        requestId TEXT,
        ipAddress TEXT,
        data_json TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_audit_trail_scope ON audit_trail_events(tenantId, hospitalId, action);
    `);
  }

  log(event: Omit<AuditRecord, 'eventId' | 'timestamp'> & { eventId?: string; timestamp?: string }) {
    const eventId = event.eventId || `AUD-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    const timestamp = event.timestamp || new Date().toISOString();

    const record: AuditRecord = {
      ...event,
      eventId,
      timestamp
    };

    try {
      const stmt = db.prepare(`
        INSERT INTO audit_trail_events (
          eventId, timestamp, actorUserId, actorRole, tenantId, groupId, hospitalId,
          action, resourceType, resourceId, result, reason, requestId, ipAddress, data_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        record.eventId, record.timestamp, record.actorUserId, record.actorRole, record.tenantId,
        record.groupId || 'group-nusantara', record.hospitalId || 'hospital-jkt',
        record.action, record.resourceType, record.resourceId || null,
        record.result, record.reason || null, record.requestId || null, record.ipAddress || '127.0.0.1',
        JSON.stringify(record)
      );
    } catch (err) {
      console.warn("[AuditLogger] Failed to write audit event:", err);
    }
  }

  getLogs(scope?: { tenantId?: string; hospitalId?: string }): AuditRecord[] {
    try {
      let query = "SELECT data_json FROM audit_trail_events";
      const params: any[] = [];

      if (scope?.tenantId) {
        query += " WHERE tenantId = ?";
        params.push(scope.tenantId);
        if (scope?.hospitalId) {
          query += " AND (hospitalId = ? OR hospitalId = 'hospital-jkt')";
          params.push(scope.hospitalId);
        }
      }

      query += " ORDER BY rowid DESC LIMIT 100";

      const stmt = db.prepare(query);
      const rows = stmt.all(...params) as { data_json: string }[];
      return rows.map(r => JSON.parse(r.data_json));
    } catch {
      return [];
    }
  }
}

export const auditLogger = new AuditLogger();
