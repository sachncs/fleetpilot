import { NextRequest, NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';

import { authenticate } from '@/lib/auth/api-key';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/db/migrate';
import { problems, solutions } from '@/lib/db/schema';

/** KPI rows for recent solutions — no solution JSON, charts only need metrics. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = authenticate(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await ensureSchema();
    const db = getDb();
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get('limit') ?? '30'), 100);

    const rows = db
      .select({
        id: solutions.id,
        problemId: solutions.problemId,
        name: problems.name,
        makespan: solutions.makespan,
        totalDistance: solutions.totalDistance,
        totalCost: solutions.totalCost,
        totalCo2: solutions.totalCo2,
        feasible: solutions.feasible,
        createdAt: solutions.createdAt,
      })
      .from(solutions)
      .innerJoin(problems, eq(solutions.problemId, problems.id))
      .orderBy(desc(solutions.createdAt))
      .limit(limit);

    return NextResponse.json({ solutions: rows });
  } catch (err) {
    console.error('[API] GET /api/solutions error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
