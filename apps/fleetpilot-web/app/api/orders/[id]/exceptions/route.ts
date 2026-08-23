import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { authenticate } from '@/lib/auth/api-key';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/db/migrate';
import { orders } from '@/lib/db/schema';
import { writeAudit } from '@/lib/audit';
import { log } from '@/lib/log';

interface Ctx {
  params: Promise<{ id: string }>;
}

const exceptionSchema = z.object({
  nodeId: z.number().int(),
  kind: z.enum(['late', 'early']),
  arrival: z.number().finite().min(0),
  windowStart: z.number().nullable(),
  windowEnd: z.number().nullable(),
  reportedAt: z.string().datetime(),
});

/** Simulation playback writeback: flag an order as an exception. */
export async function POST(request: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const auth = authenticate(request);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = exceptionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 });
  }

  try {
    await ensureSchema();
    const db = getDb();
    const { id } = await ctx.params;

    const row = db.select().from(orders).where(eq(orders.id, id)).get();
    if (!row) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    db.update(orders)
      .set({ status: 'exception', updatedAt: new Date().toISOString() })
      .where(eq(orders.id, id))
      .run();

    writeAudit({
      entity: 'order',
      entityId: id,
      action: 'status:exception',
      actor: auth.keyName,
      payload: { previousStatus: row.status, ...parsed.data },
    });

    return NextResponse.json({ id, status: 'exception' });
  } catch (err) {
    log.error('[API] POST /api/orders/[id]/exceptions error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
