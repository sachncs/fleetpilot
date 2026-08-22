import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { authenticate } from '@/lib/auth/api-key';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/db/migrate';
import { depots, vehicles as vehiclesTable } from '@/lib/db/schema';
import { writeAudit } from '@/lib/audit';
import { depotUpdateSchema } from '@/lib/registry-schemas';

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const auth = authenticate(request);
  if (auth instanceof NextResponse) return auth;

  await ensureSchema();
  const { id } = await ctx.params;
  const row = getDb().select().from(depots).where(eq(depots.id, id)).get();
  if (!row) return NextResponse.json({ error: 'Depot not found' }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(request: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const auth = authenticate(request);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = depotUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 });
  }

  try {
    await ensureSchema();
    const db = getDb();
    const { id } = await ctx.params;

    if (!db.select().from(depots).where(eq(depots.id, id)).get()) {
      return NextResponse.json({ error: 'Depot not found' }, { status: 404 });
    }

    db.update(depots)
      .set({ ...parsed.data, updatedAt: new Date().toISOString() })
      .where(eq(depots.id, id))
      .run();

    writeAudit({ entity: 'depot', entityId: id, action: 'updated', actor: auth.keyName, payload: parsed.data });

    return NextResponse.json(db.select().from(depots).where(eq(depots.id, id)).get());
  } catch (err) {
    console.error('[API] PATCH /api/depots/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const auth = authenticate(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await ensureSchema();
    const db = getDb();
    const { id } = await ctx.params;

    const row = db.select().from(depots).where(eq(depots.id, id)).get();
    if (!row) return NextResponse.json({ error: 'Depot not found' }, { status: 404 });

    // Referential check: vehicles stationed here block deletion.
    const vehicleCount = (
      db.select({ id: vehiclesTable.id }).from(vehiclesTable).where(eq(vehiclesTable.depotId, id)).all()
    ).length;
    if (vehicleCount > 0) {
      return NextResponse.json(
        { error: `Depot referenced by ${vehicleCount} vehicle(s)` },
        { status: 409 },
      );
    }

    db.delete(depots).where(eq(depots.id, id)).run();
    writeAudit({ entity: 'depot', entityId: id, action: 'deleted', actor: auth.keyName });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[API] DELETE /api/depots/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
