import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/api-key';
import { getDb } from '@/lib/db';
import { jobs, problems } from '@/lib/db/schema';
import { ensureSchema } from '@/lib/db/migrate';
import { randomBytes } from 'node:crypto';
import { config } from '@/lib/config';
import { eq, desc } from 'drizzle-orm';
import { getJobQueue } from '@/lib/worker/spawn';
import { log } from '@/lib/log';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = authenticate(request);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { problemId, solverOptions } = body as {
    problemId?: string;
    solverOptions?: Record<string, unknown>;
  };

  if (!problemId) {
    return NextResponse.json({ error: 'problemId is required' }, { status: 400 });
  }

  try {
    await ensureSchema();
    const db = getDb();
    const problem = db.select().from(problems).where(eq(problems.id, problemId)).get();
    if (!problem) {
      return NextResponse.json({ error: 'Problem not found' }, { status: 404 });
    }

    const opts = {
      alnsIterations: Math.min(Number(solverOptions?.['alnsIterations'] ?? 200), 5000),
      populationSize: Math.min(Number(solverOptions?.['populationSize'] ?? 1000), 10000),
      maxGenerations: Math.min(Number(solverOptions?.['maxGenerations'] ?? 500), config.maxGenerations),
      maxTimeMs: Math.min(Number(solverOptions?.['maxTimeMs'] ?? 30000), config.maxTimeMs),
      seed: Number(solverOptions?.['seed'] ?? 1),
      warmStart: solverOptions?.['warmStart'] !== false,
    };

    const id = `job_${randomBytes(16).toString('hex')}`;
    const now = new Date().toISOString();

    db.insert(jobs)
      .values({
        id,
        problemId,
        status: 'pending',
        solverOptionsJson: JSON.stringify(opts),
        createdAt: now,
      })
      .run();

    const queue = getJobQueue();
    queue.enqueue(id);

    const job = db.select().from(jobs).where(eq(jobs.id, id)).get();
    return NextResponse.json(job, { status: 201 });
  } catch (err) {
    log.error('[API] POST /api/jobs error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = authenticate(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await ensureSchema();
    const db = getDb();

    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const limit = Math.min(Number(url.searchParams.get('limit') ?? '50'), 100);
    const offset = Number(url.searchParams.get('offset') ?? '0');

    let rows;
    if (status) {
      rows = db.select().from(jobs).where(eq(jobs.status, status as 'pending' | 'running' | 'completed' | 'failed' | 'cancelled')).orderBy(desc(jobs.createdAt)).limit(limit).offset(offset).all();
    } else {
      rows = db.select().from(jobs).orderBy(desc(jobs.createdAt)).limit(limit).offset(offset).all();
    }
    return NextResponse.json({ jobs: rows, limit, offset });
  } catch (err) {
    log.error('[API] GET /api/jobs error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
