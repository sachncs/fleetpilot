import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/api-key';
import { getDb } from '@/lib/db';
import { problems, solutions, jobs, orders } from '@/lib/db/schema';
import { ensureSchema } from '@/lib/db/migrate';
import { log } from '@/lib/log';
import { eq, desc } from 'drizzle-orm';
import { writeAudit } from '@/lib/audit';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = authenticate(_request);
  if (auth instanceof NextResponse) return auth;

  try {
    await ensureSchema();
    const db = getDb();
    const { id } = await params;

    const problem = db.select().from(problems).where(eq(problems.id, id)).get();
    if (!problem) {
      return NextResponse.json({ error: 'Problem not found' }, { status: 404 });
    }

    const problemSolutions = db
      .select()
      .from(solutions)
      .where(eq(solutions.problemId, id))
      .orderBy(desc(solutions.createdAt))
      .all();

    const problemJobs = db
      .select()
      .from(jobs)
      .where(eq(jobs.problemId, id))
      .orderBy(desc(jobs.createdAt))
      .all();

    return NextResponse.json({ ...problem, solutions: problemSolutions, jobs: problemJobs });
  } catch (err) {
    log.error('[API] GET /api/problems/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = authenticate(_request);
  if (auth instanceof NextResponse) return auth;

  try {
    await ensureSchema();
    const db = getDb();
    const { id } = await params;

    const problem = db.select().from(problems).where(eq(problems.id, id)).get();
    if (!problem) {
      return NextResponse.json({ error: 'Problem not found' }, { status: 404 });
    }

    const linkedOrders = db.select().from(orders).where(eq(orders.problemId, id)).all();
    const now = new Date().toISOString();
    db.transaction((transaction) => {
      for (const order of linkedOrders) {
        transaction.update(orders)
          .set({
            problemId: null,
            status: order.status === 'planned' ? 'unassigned' : order.status,
            updatedAt: now,
          })
          .where(eq(orders.id, order.id))
          .run();
      }
      transaction.delete(problems).where(eq(problems.id, id)).run();
    });
    writeAudit({
      entity: 'problem',
      entityId: id,
      action: 'deleted',
      actor: auth.keyName,
      payload: { releasedOrders: linkedOrders.length },
    });

    return NextResponse.json({ ok: true, releasedOrders: linkedOrders.length });
  } catch (err) {
    log.error('[API] DELETE /api/problems/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
