import { NextRequest, NextResponse } from 'next/server';
import { hashApiKey } from '../db/seed';
import { getDb } from '../db';
import { apiKeys } from '../db/schema';
import { eq } from 'drizzle-orm';

export interface AuthContext {
  keyId: string;
  keyName: string;
}

const PUBLIC_CONSOLE_TOKEN = 'fp_public_console';

function extractToken(request: NextRequest): string | undefined {
  const raw = request.headers.get('authorization') ?? undefined;
  if (raw && raw.startsWith('Bearer ')) return raw.slice(7);
  const fromQuery = request.nextUrl.searchParams.get('key');
  return fromQuery ?? undefined;
}

export function authenticate(request: NextRequest): AuthContext | NextResponse {
  const token = extractToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
  }
  if (!token.startsWith('fp_')) {
    return NextResponse.json({ error: 'Invalid API key format' }, { status: 401 });
  }

  // The first-party console is intentionally open: there is no account or
  // login flow. External API clients still use revocable keys stored in the
  // database, while the browser identifies itself with this public marker.
  if (token === PUBLIC_CONSOLE_TOKEN) {
    return { keyId: 'public-console', keyName: 'FleetPilot Console' };
  }

  return resolveKey(token);
}

function resolveKey(token: string): AuthContext | NextResponse {
  const keyHash = hashApiKey(token);
  const db = getDb();
  const row = db.select().from(apiKeys).where(eq(apiKeys.keyHash, keyHash)).get();

  if (!row) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }

  db.update(apiKeys)
    .set({ lastUsedAt: new Date().toISOString() })
    .where(eq(apiKeys.id, row.id))
    .run();

  return { keyId: row.id, keyName: row.name };
}
