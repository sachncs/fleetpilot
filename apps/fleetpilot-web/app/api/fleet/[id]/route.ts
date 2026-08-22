import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { authenticate } from '@/lib/auth/api-key';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/db/migrate';
import { vehicles, depots } from '@/lib/db/schema';
import { writeAudit } from '@/lib/audit';
import { vehicleUpdateSchema } from '@/lib/registry-schemas';

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const auth = authenticate(request);
  if (auth instanceof NextResponse) return auth;

  await ensureSchema();
  const { id } = await ctx.params;
  const row = getDb().select().from(vehicles).where(eq(vehicles.id, id)).get();
  if (!row) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
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

  const parsed = vehicleUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 });
  }

  try {
    await ensureSchema();
    const db = getDb();
    const { id } = await ctx.params;

    if (!db.select().from(vehicles).where(eq(vehicles.id, id)).get()) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }
    if (parsed.data.depotId && !db.select().from(depots).where(eq(depots.id, parsed.data.depotId)).get()) {
      return NextResponse.json({ error: 'Depot not found' }, { status: 400 });
    }

    db.update(vehicles)
      .set({ ...parsed.data, updatedAt: new Date().toISOString() })
      .where(eq(vehicles.id, id))
      .run();

    writeAudit({ entity: 'vehicle', entityId: id, action: 'updated', actor: auth.keyName, payload: parsed.data });

    return NextResponse.json(db.select().from(vehicles).where(eq(vehicles.id, id)).get());
  } catch (err) {
    console.error('[API] PATCH /api/fleet/[id] error:', err);
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

    const row = db.select().from(vehicles).where(eq(vehicles.id, id)).get();
    if (!row) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });

    db.delete(vehicles).where(eq(vehicles.id, id)).run();
    writeAudit({ entity: 'vehicle', entityId: id, action: 'deleted', actor: auth.keyName });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[API] DELETE /api/fleet/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
