import { NextRequest, NextResponse } from 'next/server';
import { count } from 'drizzle-orm';

import { authenticate } from '@/lib/auth/api-key';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/db/migrate';
import {
  auditLog,
  depots,
  orders,
  problems,
  solutions,
  vehicles,
} from '@/lib/db/schema';
import { config } from '@/lib/config';

/** Read-only system facts for the settings page. */
export async function GET(_request: NextRequest): Promise<NextResponse> {
  const auth = authenticate(_request);
  if (auth instanceof NextResponse) return auth;

  try {
    await ensureSchema();
    const db = getDb();

    const countOf = (table: typeof problems | typeof solutions | typeof orders | typeof vehicles | typeof depots | typeof auditLog): number => {
      const rows = db.select({ value: count() }).from(table).all();
      return rows[0]?.value ?? 0;
    };

    return NextResponse.json({
      database: {
        file: config.databaseUrl.split('/').pop() ?? config.databaseUrl,
        counts: {
          scenarios: countOf(problems),
          solutions: countOf(solutions),
          orders: countOf(orders),
          vehicles: countOf(vehicles),
          stations: countOf(depots),
          auditEntries: countOf(auditLog),
        },
      },
      solverLimits: {
        maxTimeMs: config.maxTimeMs,
        maxGenerations: config.maxGenerations,
        maxConcurrentSolves: config.maxConcurrentSolves,
      },
    });
  } catch (err) {
    console.error('[API] GET /api/system error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
