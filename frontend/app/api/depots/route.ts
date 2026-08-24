import { NextRequest, NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';

import { authenticate } from '@/lib/auth/api-key';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/db/migrate';
import { depots } from '@/lib/db/schema';
import { writeAudit } from '@/lib/audit';
import { depotCreateSchema } from '@/lib/registry-schemas';
import { log } from '@/lib/log';
import { randomBytes } from 'node:crypto';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = authenticate(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await ensureSchema();
    const db = getDb();
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get('limit') ?? '50'), 200);
    const offset = Number(url.searchParams.get('offset') ?? '0');

    const rows = db.select().from(depots).orderBy(desc(depots.createdAt)).limit(limit).offset(offset).all();
    return NextResponse.json({ depots: rows, limit, offset });
  } catch (err) {
    log.error('[API] GET /api/depots error:', err);
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

  const parsed = depotCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 });
  }

  try {
    await ensureSchema();
    const db = getDb();
    const id = `dep_${randomBytes(12).toString('hex')}`;
    const now = new Date().toISOString();

    db.insert(depots)
      .values({
        id,
        name: parsed.data.name,
        lat: parsed.data.lat,
        lng: parsed.data.lng,
        region: parsed.data.region ?? null,
        notes: parsed.data.notes ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    writeAudit({ entity: 'depot', entityId: id, action: 'created', actor: auth.keyName, payload: parsed.data });

    const created = db.select().from(depots).where(eq(depots.id, id)).get();
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    log.error('[API] POST /api/depots error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
