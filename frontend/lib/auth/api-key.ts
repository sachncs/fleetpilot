import { NextRequest, NextResponse } from 'next/server';
import { hashApiKey } from '../db/seed';
import { getDb } from '../db';
import { apiKeys } from '../db/schema';
import { eq } from 'drizzle-orm';

export interface AuthContext {
  keyId: string;
  keyName: string;
}

export function authenticate(request: NextRequest): AuthContext | NextResponse {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
  }

  const token = header.slice(7);
  if (!token.startsWith('fp_')) {
    return NextResponse.json({ error: 'Invalid API key format' }, { status: 401 });
  }

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
