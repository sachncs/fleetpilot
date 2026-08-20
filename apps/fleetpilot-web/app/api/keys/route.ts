import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/api-key';
import { getDb } from '@/lib/db';
import { apiKeys } from '@/lib/db/schema';
import { ensureSchema } from '@/lib/db/migrate';
import { generateApiKey, hashApiKey } from '@/lib/db/seed';
import { randomBytes } from 'node:crypto';
import { desc } from 'drizzle-orm';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = authenticate(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await ensureSchema();
    const db = getDb();

    const rows = db.select().from(apiKeys).orderBy(desc(apiKeys.createdAt)).all();

    return NextResponse.json({
      keys: rows.map((k) => ({
        id: k.id,
        name: k.name,
        createdAt: k.createdAt,
        lastUsedAt: k.lastUsedAt,
      })),
    });
  } catch (err) {
    console.error('[API] GET /api/keys error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = authenticate(request);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name } = body as { name?: string };
  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  try {
    await ensureSchema();

    const rawKey = generateApiKey();
    const keyHash = hashApiKey(rawKey);
    const db = getDb();

    db.insert(apiKeys)
      .values({
        id: `key_${randomBytes(16).toString('hex')}`,
        keyHash,
        name,
      })
      .run();

    return NextResponse.json({ key: rawKey, name }, { status: 201 });
  } catch (err) {
    console.error('[API] POST /api/keys error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
