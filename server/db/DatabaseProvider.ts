export interface DatabaseCapabilities {
  supportsTransactions: boolean;
  supportsJsonb: boolean;
  supportsRowLevelSecurity: boolean;
  supportsPooling: boolean;
  supportsAutoIncrement: boolean;
  providerType: 'postgresql' | 'sqlite' | 'mysql' | 'oracle';
}

export interface DatabaseMetadata {
  provider: 'postgresql' | 'sqlite' | 'mysql' | 'oracle' | string;
  vendor: 'neon' | 'supabase' | 'self-hosted' | 'generic' | 'local_sqlite' | 'mysql' | 'oracle' | string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  sslMode?: string;
  schemaVersion: string;
  isEncrypted: boolean;
  poolSize?: number;
}

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
  fields?: string[];
}

export interface DatabaseProviderAdapter {
  id: string;
  name: string;
  providerType: 'postgresql' | 'sqlite' | 'mysql' | 'oracle';
  
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<{ status: 'CONNECTED' | 'FAILED'; latencyMs: number; error?: string }>;
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  transaction<T = any>(callback: (trx: DatabaseProviderAdapter) => Promise<T>): Promise<T>;
  migrate(): Promise<{ status: 'SUCCESS' | 'FAILED'; version: string; tablesCreated: string[] }>;
  getCapabilities(): DatabaseCapabilities;
  getMetadata(): DatabaseMetadata;
}
