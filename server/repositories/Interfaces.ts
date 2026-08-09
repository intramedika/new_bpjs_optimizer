import { Claim } from "../../src/types";
import { DocumentRecord } from "./DocumentRepository";
import { SyncQueueItem } from "./SyncQueueRepository";

export interface IClaimRepository {
  findAll(): Promise<Claim[]>;
  findById(id: string): Promise<Claim | null>;
  create(claim: Claim): Promise<Claim>;
  update(id: string, claimData: Partial<Claim>): Promise<Claim | null>;
  delete(id: string): Promise<boolean>;
}

export interface IDocumentRepository {
  findAll(): Promise<DocumentRecord[]>;
  findById(id: string): Promise<DocumentRecord | null>;
  create(doc: DocumentRecord): Promise<DocumentRecord>;
  update(id: string, docData: Partial<DocumentRecord>): Promise<DocumentRecord | null>;
  delete(id: string): Promise<boolean>;
}

export interface ISyncQueueRepository {
  findAll(): Promise<SyncQueueItem[]>;
  getPendingItems(): Promise<SyncQueueItem[]>;
  create(item: Omit<SyncQueueItem, "id" | "createdAt" | "status" | "retryCount">): Promise<SyncQueueItem>;
  updateStatus(id: string, status: SyncQueueItem["status"], error?: string): Promise<void>;
  delete(id: string): Promise<void>;
}
