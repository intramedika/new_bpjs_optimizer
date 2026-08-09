import { db } from "../db/Database";
import { syncQueueRepository } from "./SyncQueueRepository";
import { IDocumentRepository } from "./Interfaces";

export interface DocumentRecord {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  status: string;
  extraction: any; // Result from OCR
}

export class DocumentRepository implements IDocumentRepository {
  constructor() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        name TEXT,
        mimeType TEXT,
        size INTEGER,
        uploadedAt TEXT,
        status TEXT,
        data_json TEXT
      );
    `);
  }

  async findAll(): Promise<DocumentRecord[]> {
    const stmt = db.prepare("SELECT data_json FROM documents");
    const rows = stmt.all() as { data_json: string }[];

    if (rows.length === 0) {
      const goldenDoc: DocumentRecord = {
        id: "DOC-GOLDEN-001",
        name: "0801R0011125V007026-lengkap.pdf",
        mimeType: "application/pdf",
        size: 240891,
        uploadedAt: new Date().toISOString(),
        status: "CONFIRMED",
        extraction: {
          patientName: "JOKO TRIYONO",
          mrNumber: "30051701",
          sepNumber: "0801R0011125V007026",
          hospitalName: "RSUD Abdul Moeloek",
          documentType: "Resume Medis & SEP Rawat Jalan",
          diagnoses: [
            { text: "Chirrosis hepatis", code: "K74.6", confidence: 95, page: 4, sourceText: "DIAGNOSIS : Chirrosis hepatis + ascites + melena" },
            { text: "Ascites", code: "R18.8", confidence: 94, page: 4, sourceText: "DIAGNOSIS : Chirrosis hepatis + ascites + melena | Object: ascites+" },
            { text: "Melena", code: "K92.1", confidence: 94, page: 4, sourceText: "DIAGNOSIS : Chirrosis hepatis + ascites + melena | Subject: BAB darah hitam" }
          ],
          procedures: [
            { text: "Pemeriksaan Dokter Spesialis IPD", code: "89.07", confidence: 92, page: 4, sourceText: "Konsultasi IPD" },
            { text: "Asuhan Keperawatan & Pemasangan IVFD", code: "99.18", confidence: 90, page: 4, sourceText: "Pemasangan IVFD & Asuhan Keperawatan" }
          ]
        }
      };
      try {
        await this.create(goldenDoc);
      } catch (e) {}
      return [goldenDoc];
    }

    return rows.map(row => JSON.parse(row.data_json) as DocumentRecord);
  }

  async findById(id: string): Promise<DocumentRecord | null> {
    const stmt = db.prepare("SELECT data_json FROM documents WHERE id = ?");
    const row = stmt.get(id) as { data_json: string } | undefined;
    if (!row) return null;
    return JSON.parse(row.data_json) as DocumentRecord;
  }

  async create(doc: DocumentRecord): Promise<DocumentRecord> {
    const stmt = db.prepare(`
      INSERT INTO documents (
        id, name, mimeType, size, uploadedAt, status, data_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        mimeType = excluded.mimeType,
        size = excluded.size,
        status = excluded.status,
        data_json = excluded.data_json
    `);
    
    stmt.run(
      doc.id,
      doc.name,
      doc.mimeType,
      doc.size,
      doc.uploadedAt,
      doc.status,
      JSON.stringify(doc)
    );

    await syncQueueRepository.create({
      entityType: "Document",
      localId: doc.id,
      action: "CREATE",
      payload: doc
    });

    return doc;
  }

  async update(id: string, docData: Partial<DocumentRecord>): Promise<DocumentRecord | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updated = { ...existing, ...docData };

    const stmt = db.prepare(`
      UPDATE documents SET
        name = ?, mimeType = ?, size = ?, status = ?, data_json = ?
      WHERE id = ?
    `);

    stmt.run(
      updated.name,
      updated.mimeType,
      updated.size,
      updated.status,
      JSON.stringify(updated),
      id
    );

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const stmt = db.prepare("DELETE FROM documents WHERE id = ?");
    const result = stmt.run(id);
    return result.changes > 0;
  }
}

export const documentRepository = new DocumentRepository();
