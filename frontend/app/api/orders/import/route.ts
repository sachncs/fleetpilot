import { randomBytes } from 'node:crypto';

import { inArray } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { writeAudit } from '@/lib/audit';
import { authenticate } from '@/lib/auth/api-key';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/db/migrate';
import { orders } from '@/lib/db/schema';
import { log } from '@/lib/log';
import { orderCreateSchema } from '@/lib/registry-schemas';

const importSchema = z.object({
  orders: z.array(orderCreateSchema).min(1).max(500),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = authenticate(request);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = importSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Manifest validation failed', issues: parsed.error.issues }, { status: 400 });
  }

  const refs = parsed.data.orders.map((order) => order.ref);
  if (new Set(refs.map((ref) => ref.toLowerCase())).size !== refs.length) {
    return NextResponse.json({ error: 'The manifest contains duplicate references.' }, { status: 400 });
  }

  try {
    await ensureSchema();
    const db = getDb();
    const existing = db.select({ ref: orders.ref }).from(orders).where(inArray(orders.ref, refs)).all();
    if (existing.length > 0) {
      return NextResponse.json(
        { error: `Already imported: ${existing.slice(0, 5).map((row) => row.ref).join(', ')}${existing.length > 5 ? '…' : ''}` },
        { status: 409 },
      );
    }

    const now = new Date().toISOString();
    const rows = parsed.data.orders.map((order) => ({
      id: `ord_${randomBytes(12).toString('hex')}`,
      ref: order.ref,
      kind: order.kind ?? 'delivery' as const,
      pairRefId: order.pairRefId ?? null,
      priority: order.priority ?? 3,
      windowStart: order.windowStart ?? null,
      windowEnd: order.windowEnd ?? null,
      processingMin: order.processingMin ?? 0,
      quantity: order.quantity ?? 1,
      lat: order.lat,
      lng: order.lng,
      status: 'unassigned' as const,
      problemId: null,
      region: order.region ?? null,
      createdAt: now,
      updatedAt: now,
    }));

    db.transaction((transaction) => {
      transaction.insert(orders).values(rows).run();
    });
    writeAudit({
      entity: 'order_import',
      entityId: `import_${randomBytes(8).toString('hex')}`,
      action: 'created',
      actor: auth.keyName,
      payload: { count: rows.length, firstRef: rows[0]?.ref, lastRef: rows.at(-1)?.ref },
    });
    return NextResponse.json({ count: rows.length, orders: rows }, { status: 201 });
  } catch (error) {
    log.error('[API] POST /api/orders/import error:', error);
    return NextResponse.json({ error: 'Could not import the delivery manifest.' }, { status: 500 });
  }
}
