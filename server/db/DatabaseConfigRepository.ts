import { SecretManager } from "./SecretManager";

export interface DatabaseConfigRecord {
  id: string;
  provider: 'postgresql' | 'sqlite' | 'mysql' | 'oracle' | string;
  vendor: 'neon' | 'supabase' | 'self-hosted' | 'generic' | 'local_sqlite' | 'mysql' | 'oracle' | string;
  environment: 'LOCAL' | 'DEVELOPMENT' | 'PREVIEW' | 'PRODUCTION';
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  encryptedPassword?: string;
  ivPassword?: string;
  tagPassword?: string;
  encryptedConnString?: string;
  ivConnString?: string;
  tagConnString?: string;
  sslMode?: string;
  maxPoolSize?: number;
  isStaged?: boolean;
  status: 'ACTIVE' | 'DRAFT' | 'TESTED_OK' | 'TEST_FAILED';
  updatedAt: string;
  updatedBy: string;
}

export class DatabaseConfigRepository {
  private activeConfig: DatabaseConfigRecord;
  private draftConfig: DatabaseConfigRecord | null = null;

  constructor() {
    // Default initial active configuration
    const envUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (envUrl) {
      const enc = SecretManager.encrypt(envUrl);
      this.activeConfig = {
        id: "cfg-active-postgres",
        provider: "postgresql",
        vendor: "neon",
        environment: (process.env.VERCEL_ENV?.toUpperCase() as any) || (process.env.NODE_ENV === "production" ? "PRODUCTION" : "DEVELOPMENT"),
        encryptedConnString: enc.encryptedData,
        ivConnString: enc.iv,
        tagConnString: enc.tag,
        sslMode: "require",
        maxPoolSize: 10,
        status: "ACTIVE",
        updatedAt: new Date().toISOString(),
        updatedBy: "SYSTEM_ENV"
      };
    } else {
      this.activeConfig = {
        id: "cfg-active-sqlite",
        provider: "sqlite",
        vendor: "local_sqlite",
        environment: "LOCAL",
        database: "local_edge.db",
        status: "ACTIVE",
        updatedAt: new Date().toISOString(),
        updatedBy: "SYSTEM_DEFAULT"
      };
    }
  }

  getActiveConfig(): DatabaseConfigRecord {
    return { ...this.activeConfig };
  }

  getMaskedActiveConfig(): Partial<DatabaseConfigRecord> {
    return {
      id: this.activeConfig.id,
      provider: this.activeConfig.provider,
      vendor: this.activeConfig.vendor,
      environment: this.activeConfig.environment,
      host: this.activeConfig.host || (this.activeConfig.provider === "postgresql" ? "ep-neon-prod.neon.tech" : "local"),
      port: this.activeConfig.port || (this.activeConfig.provider === "postgresql" ? 5432 : undefined),
      database: this.activeConfig.database || "bpjs_optimizer",
      username: this.activeConfig.username || (this.activeConfig.provider === "postgresql" ? "bpjs_admin" : undefined),
      sslMode: this.activeConfig.sslMode || "require",
      maxPoolSize: this.activeConfig.maxPoolSize || 10,
      status: this.activeConfig.status,
      updatedAt: this.activeConfig.updatedAt,
      updatedBy: this.activeConfig.updatedBy,
      encryptedPassword: undefined,
      ivPassword: undefined,
      tagPassword: undefined,
      encryptedConnString: undefined,
      ivConnString: undefined,
      tagConnString: undefined
    };
  }

  getDraftConfig(): DatabaseConfigRecord | null {
    return this.draftConfig ? { ...this.draftConfig } : null;
  }

  saveDraftConfig(config: Partial<DatabaseConfigRecord>, rawPassword?: string, rawConnString?: string): DatabaseConfigRecord {
    let encPass = {};
    if (rawPassword) {
      const res = SecretManager.encrypt(rawPassword);
      encPass = {
        encryptedPassword: res.encryptedData,
        ivPassword: res.iv,
        tagPassword: res.tag
      };
    }

    let encConn = {};
    if (rawConnString) {
      const res = SecretManager.encrypt(rawConnString);
      encConn = {
        encryptedConnString: res.encryptedData,
        ivConnString: res.iv,
        tagConnString: res.tag
      };
    }

    this.draftConfig = {
      id: `cfg-draft-${Date.now()}`,
      provider: config.provider || "postgresql",
      vendor: config.vendor || "neon",
      environment: config.environment || "PRODUCTION",
      host: config.host,
      port: config.port,
      database: config.database,
      username: config.username,
      sslMode: config.sslMode || "require",
      maxPoolSize: config.maxPoolSize || 10,
      status: "DRAFT",
      updatedAt: new Date().toISOString(),
      updatedBy: config.updatedBy || "ADMIN",
      ...encPass,
      ...encConn
    };

    return this.draftConfig;
  }

  activateDraftConfig(): DatabaseConfigRecord {
    if (!this.draftConfig) {
      throw new Error("No draft database configuration available to activate.");
    }
    this.activeConfig = {
      ...this.draftConfig,
      status: "ACTIVE",
      updatedAt: new Date().toISOString()
    };
    this.draftConfig = null;
    return this.activeConfig;
  }

  getDecryptedConnectionString(config: DatabaseConfigRecord): string {
    if (config.encryptedConnString && config.ivConnString && config.tagConnString) {
      return SecretManager.decrypt(config.encryptedConnString, config.ivConnString, config.tagConnString);
    }
    return "";
  }

  getDecryptedPassword(config: DatabaseConfigRecord): string {
    if (config.encryptedPassword && config.ivPassword && config.tagPassword) {
      return SecretManager.decrypt(config.encryptedPassword, config.ivPassword, config.tagPassword);
    }
    return "";
  }
}

export const databaseConfigRepository = new DatabaseConfigRepository();
