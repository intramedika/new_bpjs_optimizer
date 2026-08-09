import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const MASTER_KEY_STRING = process.env.DB_ENCRYPTION_KEY || process.env.SERVER_SECRET || "bpjs-optimizer-enterprise-master-key-2026-secure-salt";
const KEY = crypto.scryptSync(MASTER_KEY_STRING, "bpjs-optimizer-salt", 32);

export class SecretManager {
  static encrypt(plainText: string): { encryptedData: string; iv: string; tag: string } {
    if (!plainText) return { encryptedData: "", iv: "", tag: "" };
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    let encrypted = cipher.update(plainText, "utf8", "hex");
    encrypted += cipher.final("hex");
    const tag = cipher.getAuthTag().toString("hex");
    return {
      encryptedData: encrypted,
      iv: iv.toString("hex"),
      tag
    };
  }

  static decrypt(encryptedData: string, iv: string, tag: string): string {
    if (!encryptedData || !iv || !tag) return "";
    try {
      const decipher = crypto.createDecipheriv(ALGORITHM, KEY, Buffer.from(iv, "hex"));
      decipher.setAuthTag(Buffer.from(tag, "hex"));
      let decrypted = decipher.update(encryptedData, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch (err) {
      console.error("[SecretManager] Decryption failed:", err);
      return "";
    }
  }

  static maskPassword(password?: string): string {
    if (!password) return "";
    return "••••••••";
  }

  static maskConnectionString(connString?: string): string {
    if (!connString) return "";
    try {
      return connString.replace(/(postgres(?:ql)?:\/\/[^:]+:)[^@]+(@.+)/i, "$1••••••••$2");
    } catch {
      return "postgresql://••••••••@host/database";
    }
  }

  static validateSSRF(host: string, connectionString?: string): { safe: boolean; reason?: string } {
    const target = (host || connectionString || "").toLowerCase();
    
    // Check forbidden URL schemes
    if (/^(file|http|https|ftp|gopher|tftp):\/\//.test(target)) {
      return { safe: false, reason: "Banned URL scheme detected. Only postgresql:// and postgres:// are supported." };
    }

    // Check Cloud Metadata & Loopback IP addresses
    const FORBIDDEN_IPS = [
      "169.254.169.254", // AWS/GCP/Azure Metadata
      "127.0.0.1",
      "localhost",
      "0.0.0.0",
      "::1"
    ];

    for (const ip of FORBIDDEN_IPS) {
      if (target.includes(ip) && process.env.NODE_ENV === "production") {
        return { safe: false, reason: `Target IP/Host ${ip} is blocked for production database configuration due to SSRF protection.` };
      }
    }

    return { safe: true };
  }
}
