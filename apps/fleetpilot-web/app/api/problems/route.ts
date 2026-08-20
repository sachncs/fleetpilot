import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/api-key';
import { getDb } from '@/lib/db';
import { problems } from '@/lib/db/schema';
import { ensureSchema } from '@/lib/db/migrate';
import { randomBytes } from 'node:crypto';
import { desc } from 'drizzle-orm';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = authenticate(request);
  if (auth instanceof NextResponse) return auth;

  await ensureSchema();
  const db = getDb();

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '50'), 100);
  const offset = Number(url.searchParams.get('offset') ?? '0');

  const rows = db.select().from(problems).orderBy(desc(problems.createdAt)).limit(limit).offset(offset).all();
  const total = db.select({ count: problems.id }).from(problems).all().length;

  return NextResponse.json({ problems: rows, total, limit, offset });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = authenticate(request);
  if (auth instanceof NextResponse) return auth;

  await ensureSchema();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, description, problemJson } = body as {
    name?: string;
    description?: string;
    problemJson?: unknown;
  };

  if (!problemJson || typeof problemJson !== 'object') {
    return NextResponse.json({ error: 'problemJson is required' }, { status: 400 });
  }

  const pj = problemJson as Record<string, unknown>;
  const nodes = Array.isArray(pj['nodes'])
    ? (pj['nodes'] as unknown[])
    : pj['nodes']
      ? Object.values(pj['nodes'] as Record<string, unknown>)
      : [];
  const customers = Array.isArray(pj['customers']) ? (pj['customers'] as unknown[]) : [];
  const vehicles = Array.isArray(pj['vehicles']) ? (pj['vehicles'] as unknown[]) : [];

  const id = `prob_${randomBytes(16).toString('hex')}`;
  const now = new Date().toISOString();

  db.insert(problems)
    .values({
      id,
      name: name ?? `Problem ${id.slice(-8)}`,
      description: description ?? null,
      problemJson: JSON.stringify(problemJson),
      nodeCount: nodes.length,
      customerCount: customers.length,
      vehicleCount: vehicles.length,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  const created = db.select().from(problems).where((p) => p.id === id).get();
  return NextResponse.json(created, { status: 201 });
}
