import { createHash, randomBytes } from 'node:crypto';
import { getDb } from './index';
import { apiKeys } from './schema';
import { loadConfig } from '../config-store';

export function generateApiKey(): string {
  return `fp_${randomBytes(32).toString('hex')}`;
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export async function seedDefaultApiKey(): Promise<string | null> {
  const db = getDb();

  const existing = db.select().from(apiKeys).all();
  if (existing.length > 0) return null;

  const cfg = loadConfig();
  const keyHash = cfg.initialApiKeyHash;

  if (keyHash) {
    db.insert(apiKeys)
      .values({
        id: `key_${randomBytes(16).toString('hex')}`,
        keyHash,
        name: 'Default',
      })
      .run();
    return null;
  }

  const rawKey = generateApiKey();
  const hash = hashApiKey(rawKey);

  db.insert(apiKeys)
    .values({
      id: `key_${randomBytes(16).toString('hex')}`,
      keyHash: hash,
      name: 'Default',
    })
    .run();

  return rawKey;
}
