import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, SQL } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';

import { authenticate } from '@/lib/auth/api-key';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/db/migrate';
import { orders, problems } from '@/lib/db/schema';
import { writeAudit } from '@/lib/audit';
import { orderCreateSchema } from '@/lib/registry-schemas';
import { log } from '@/lib/log';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = authenticate(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await ensureSchema();
    const db = getDb();
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get('limit') ?? '50'), 200);
    const offset = Number(url.searchParams.get('offset') ?? '0');
    const status = url.searchParams.get('status');
    const priority = Number(url.searchParams.get('priority') ?? '');
    const problemId = url.searchParams.get('problemId');

    const filters: SQL[] = [];
    if (status === 'unassigned' || status === 'planned' || status === 'exception') {
      filters.push(eq(orders.status, status));
    }
    if (Number.isFinite(priority) && priority >= 1 && priority <= 5) {
      filters.push(eq(orders.priority, priority));
    }
    if (problemId) {
      filters.push(eq(orders.problemId, problemId));
    }

    const base = db.select().from(orders).$dynamic();
    const rows = (filters.length ? base.where(and(...filters)) : base)
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset)
      .all();

    return NextResponse.json({ orders: rows, limit, offset });
  } catch (err) {
    log.error('[API] GET /api/orders error:', err);
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

  const parsed = orderCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 });
  }

  try {
    await ensureSchema();
    const db = getDb();

    if (parsed.data.problemId && !db.select().from(problems).where(eq(problems.id, parsed.data.problemId)).get()) {
      return NextResponse.json({ error: 'Problem not found' }, { status: 400 });
    }

    // Window sanity: start must not be after end when both present.
    if (parsed.data.windowStart && parsed.data.windowEnd && parsed.data.windowStart > parsed.data.windowEnd) {
      return NextResponse.json({ error: 'windowStart is after windowEnd' }, { status: 400 });
    }

    const id = `ord_${randomBytes(12).toString('hex')}`;
    const now = new Date().toISOString();

    try {
      db.insert(orders)
        .values({
          id,
          ref: parsed.data.ref,
          kind: parsed.data.kind ?? 'pickup',
          pairRefId: parsed.data.pairRefId ?? null,
          priority: parsed.data.priority ?? 3,
          windowStart: parsed.data.windowStart ?? null,
          windowEnd: parsed.data.windowEnd ?? null,
          processingMin: parsed.data.processingMin ?? 0,
          quantity: parsed.data.quantity ?? 0,
          lat: parsed.data.lat,
          lng: parsed.data.lng,
          status: parsed.data.status ?? 'unassigned',
          problemId: parsed.data.problemId ?? null,
          region: parsed.data.region ?? null,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    } catch {
      return NextResponse.json({ error: `Order ref '${parsed.data.ref}' already exists` }, { status: 409 });
    }

    writeAudit({ entity: 'order', entityId: id, action: 'created', actor: auth.keyName, payload: parsed.data });

    const created = db.select().from(orders).where(eq(orders.id, id)).get();
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    log.error('[API] POST /api/orders error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
