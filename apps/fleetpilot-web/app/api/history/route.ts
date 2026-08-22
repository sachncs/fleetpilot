import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, lt, SQL } from 'drizzle-orm';

import { authenticate } from '@/lib/auth/api-key';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/db/migrate';
import { auditLog } from '@/lib/db/schema';

const PAGE_SIZE_DEFAULT = 50;
const PAGE_SIZE_MAX = 200;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = authenticate(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await ensureSchema();
    const db = getDb();
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get('limit') ?? String(PAGE_SIZE_DEFAULT)), PAGE_SIZE_MAX);

    // Cursor pagination on the autoincrement id: stable under inserts.
    const cursorParam = url.searchParams.get('cursor');
    const entity = url.searchParams.get('entity');

    const filters: SQL[] = [];
    if (cursorParam) {
      const cursor = Number(cursorParam);
      if (!Number.isFinite(cursor)) {
        return NextResponse.json({ error: 'Invalid cursor' }, { status: 400 });
      }
      filters.push(lt(auditLog.id, cursor));
    }
    if (entity) {
      filters.push(eq(auditLog.entity, entity));
    }

    const base = db.select().from(auditLog).$dynamic();
    const rows = (filters.length ? base.where(and(...filters)) : base)
      .orderBy(desc(auditLog.id))
      .limit(limit + 1)
      .all();

    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);

    return NextResponse.json({
      entries: page,
      nextCursor: hasMore ? page[page.length - 1].id : null,
      limit,
    });
  } catch (err) {
    console.error('[API] GET /api/history error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
