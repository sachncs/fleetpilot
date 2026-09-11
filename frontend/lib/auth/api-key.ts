import { NextRequest, NextResponse } from 'next/server';
import type { IncomingMessage } from 'node:http';
import { hashApiKey } from '../db/seed';
import { getDb } from '../db';
import { apiKeys } from '../db/schema';
import { eq } from 'drizzle-orm';

export interface AuthContext {
  keyId: string;
  keyName: string;
}

function extractToken(request: NextRequest | IncomingMessage): string | undefined {
  const header = request.headers['authorization'] ?? request.headers['Authorization'];
  const raw = Array.isArray(header) ? header[0] : header;
  if (raw && raw.startsWith('Bearer ')) return raw.slice(7);
  const url =
    'nextUrl' in request
      ? request.nextUrl
      : new URL(request.url ?? '', 'http://localhost');
  const fromQuery = url.searchParams.get('key');
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

  return resolveKey(token);
}

export function authenticateUpgrade(request: IncomingMessage): AuthContext | null {
  const token = extractToken(request);
  if (!token || !token.startsWith('fp_')) return null;
  const ctx = resolveKey(token);
  return ctx instanceof NextResponse ? null : ctx;
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
