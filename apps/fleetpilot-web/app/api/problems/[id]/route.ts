import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/api-key';
import { getDb } from '@/lib/db';
import { problems, solutions, jobs } from '@/lib/db/schema';
import { ensureSchema } from '@/lib/db/migrate';
import { eq, desc } from 'drizzle-orm';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = authenticate(_request);
  if (auth instanceof NextResponse) return auth;

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

  const problem = db.select().from(problems).where(eq(problems.id, id)).get();
  if (!problem) {
    return NextResponse.json({ error: 'Problem not found' }, { status: 404 });
  }

  db.delete(problems).where(eq(problems.id, id)).run();

  return NextResponse.json({ ok: true });
}
