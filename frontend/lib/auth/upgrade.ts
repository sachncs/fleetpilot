import type { IncomingMessage } from 'node:http';

import { eq } from 'drizzle-orm';

import { getDb } from '../db';
import { apiKeys } from '../db/schema';
import { hashApiKey } from '../db/seed';
import type { AuthContext } from './api-key';

const PUBLIC_CONSOLE_TOKEN = 'fp_public_console';

/** Authenticate a WebSocket upgrade without importing Next's response runtime. */
export function authenticateUpgrade(request: IncomingMessage): AuthContext | null {
  const raw = Array.isArray(request.headers.authorization)
    ? request.headers.authorization[0]
    : request.headers.authorization;
  const fromHeader = raw?.startsWith('Bearer ') ? raw.slice(7) : undefined;
  const fromQuery = new URL(request.url ?? '', 'http://localhost').searchParams.get('key') ?? undefined;
  const token = fromHeader ?? fromQuery;
  if (!token?.startsWith('fp_')) return null;
  if (token === PUBLIC_CONSOLE_TOKEN) {
    return { keyId: 'public-console', keyName: 'FleetPilot Console' };
  }

  const db = getDb();
  const row = db.select().from(apiKeys).where(eq(apiKeys.keyHash, hashApiKey(token))).get();
  if (!row) return null;
  db.update(apiKeys)
    .set({ lastUsedAt: new Date().toISOString() })
    .where(eq(apiKeys.id, row.id))
    .run();
  return { keyId: row.id, keyName: row.name };
}
