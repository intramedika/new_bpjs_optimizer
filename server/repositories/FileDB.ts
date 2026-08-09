import fs from 'fs/promises';
import path from 'path';

const dataDir = path.join(process.cwd(), 'server', 'data_store');
const claimsFile = path.join(dataDir, 'claims.json');
const docsFile = path.join(dataDir, 'documents.json');

async function ensureDir() {
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (err) {
    // ignore
  }
}

export async function readDB(filename: string): Promise<any> {
  await ensureDir();
  try {
    const data = await fs.readFile(filename, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    return null;
  }
}

export async function writeDB(filename: string, data: any): Promise<void> {
  await ensureDir();
  await fs.writeFile(filename, JSON.stringify(data, null, 2), 'utf-8');
}

export const DB_FILES = {
  claims: claimsFile,
  documents: docsFile,
};
