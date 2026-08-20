import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/api-key';
import { getDb } from '@/lib/db';
import { jobs } from '@/lib/db/schema';
import { ensureSchema } from '@/lib/db/migrate';
import { eq } from 'drizzle-orm';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = authenticate(_request);
  if (auth instanceof NextResponse) return auth;

  await ensureSchema();
  const db = getDb();
  const { id } = await params;

  const job = db.select().from(jobs).where(eq(jobs.id, id)).get();
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  return NextResponse.json(job);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = authenticate(_request);
  if (auth instanceof NextResponse) return auth;

  await ensureSchema();
  const db = getDb();
  const { id } = await params;

  const job = db.select().from(jobs).where(eq(jobs.id, id)).get();
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  if (job.status === 'pending' || job.status === 'running') {
    db.update(jobs).set({ status: 'cancelled', completedAt: new Date().toISOString() }).where(eq(jobs.id, id)).run();
  }

  return NextResponse.json({ ok: true });
}
