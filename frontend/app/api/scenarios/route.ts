import { NextRequest, NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';

import { authenticate } from '@/lib/auth/api-key';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/db/migrate';
import { problems, solutions } from '@/lib/db/schema';
import { writeAudit } from '@/lib/audit';
import { log } from '@/lib/log';

const scenarioCreateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  duplicateFrom: z.string().optional(),
  versionLabel: z.string().max(100).optional(),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = authenticate(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await ensureSchema();
    const db = getDb();
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get('limit') ?? '50'), 100);
    const offset = Number(url.searchParams.get('offset') ?? '0');

    const rows = db
      .select({
        id: problems.id,
        name: problems.name,
        description: problems.description,
        nodeCount: problems.nodeCount,
        customerCount: problems.customerCount,
        vehicleCount: problems.vehicleCount,
        parentId: problems.parentId,
        versionLabel: problems.versionLabel,
        createdAt: problems.createdAt,
        updatedAt: problems.updatedAt,
      })
      .from(problems)
      .orderBy(desc(problems.createdAt))
      .limit(limit)
      .offset(offset)
      .all();

    return NextResponse.json({ scenarios: rows, limit, offset });
  } catch (err) {
    log.error('[API] GET /api/scenarios error:', err);
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

  const parsed = scenarioCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 });
  }

  try {
    await ensureSchema();
    const db = getDb();

    // Duplicate-as-version: deep-copy the source row and its solutions.
    if (parsed.data.duplicateFrom) {
      const srcId = parsed.data.duplicateFrom;
      const src = db.select().from(problems).where(eq(problems.id, srcId)).get();
      if (!src) return NextResponse.json({ error: 'Source scenario not found' }, { status: 404 });

      const id = `prob_${randomBytes(16).toString('hex')}`;
      const now = new Date().toISOString();

      db.insert(problems)
        .values({
          ...src,
          id,
          name: parsed.data.name ?? `${src.name} (copy)`,
          description: parsed.data.description !== undefined ? parsed.data.description : src.description,
          parentId: srcId,
          versionLabel: parsed.data.versionLabel ?? null,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      const srcSolutions = db.select().from(solutions).where(eq(solutions.problemId, srcId)).all();
      for (const s of srcSolutions) {
        db.insert(solutions)
          .values({ ...s, id: `sol_${randomBytes(16).toString('hex')}`, problemId: id, createdAt: now })
          .run();
      }

      writeAudit({
        entity: 'scenario',
        entityId: id,
        action: 'duplicated',
        actor: auth.keyName,
        payload: { duplicateFrom: srcId, copiedSolutions: srcSolutions.length },
      });

      const created = db.select().from(problems).where(eq(problems.id, id)).get();
      return NextResponse.json(created, { status: 201 });
    }

    // Fresh empty scenario shell requires problemJson — not supported here;
    // scenarios are created via /api/problems or duplicated.
    return NextResponse.json(
      { error: 'duplicateFrom is required to create a scenario' },
      { status: 400 },
    );
  } catch (err) {
    log.error('[API] POST /api/scenarios error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
