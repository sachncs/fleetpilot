import { NextRequest, NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';

import { authenticate } from '@/lib/auth/api-key';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/db/migrate';
import { vehicles, depots } from '@/lib/db/schema';
import { writeAudit } from '@/lib/audit';
import { vehicleCreateSchema } from '@/lib/registry-schemas';
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

    let rows;
    if (status === 'active' || status === 'maintenance' || status === 'retired') {
      rows = db.select().from(vehicles).where(eq(vehicles.status, status)).orderBy(desc(vehicles.createdAt)).limit(limit).offset(offset).all();
    } else {
      rows = db.select().from(vehicles).orderBy(desc(vehicles.createdAt)).limit(limit).offset(offset).all();
    }

    return NextResponse.json({ fleet: rows, limit, offset });
  } catch (err) {
    log.error('[API] GET /api/fleet error:', err);
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

  const parsed = vehicleCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 });
  }

  try {
    await ensureSchema();
    const db = getDb();

    if (parsed.data.depotId && !db.select().from(depots).where(eq(depots.id, parsed.data.depotId)).get()) {
      return NextResponse.json({ error: 'Depot not found' }, { status: 400 });
    }

    const id = `veh_${randomBytes(12).toString('hex')}`;
    const now = new Date().toISOString();

    db.insert(vehicles)
      .values({
        id,
        name: parsed.data.name,
        status: parsed.data.status ?? 'active',
        capacityKg: parsed.data.capacityKg ?? null,
        costPerKm: parsed.data.costPerKm ?? null,
        co2PerKm: parsed.data.co2PerKm ?? null,
        depotId: parsed.data.depotId ?? null,
        region: parsed.data.region ?? null,
        notes: parsed.data.notes ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    writeAudit({ entity: 'vehicle', entityId: id, action: 'created', actor: auth.keyName, payload: parsed.data });

    const created = db.select().from(vehicles).where(eq(vehicles.id, id)).get();
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    log.error('[API] POST /api/fleet error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
