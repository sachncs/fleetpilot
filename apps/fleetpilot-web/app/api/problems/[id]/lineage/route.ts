import { NextRequest, NextResponse } from 'next/server';
import { eq, inArray } from 'drizzle-orm';

import { authenticate } from '@/lib/auth/api-key';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/db/migrate';
import { problems } from '@/lib/db/schema';

interface Ctx {
  params: Promise<{ id: string }>;
}

interface LineageNode {
  id: string;
  name: string;
  versionLabel: string | null;
  parentId: string | null;
  nodeCount: number;
  customerCount: number;
  createdAt: string;
}

const MAX_DEPTH = 32;

/**
 * Ancestor chain (root → this) and direct children for a problem.
 * Depth is capped defensively; real chains are a handful deep.
 */
export async function GET(request: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const auth = authenticate(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await ensureSchema();
    const db = getDb();
    const { id } = await ctx.params;

    const start = db.select().from(problems).where(eq(problems.id, id)).get();
    if (!start) return NextResponse.json({ error: 'Problem not found' }, { status: 404 });

    // Walk up the parent chain
    const chain: LineageNode[] = [];
    let current = start as typeof problems.$inferSelect | undefined;
    let depth = 0;
    while (current && depth < MAX_DEPTH) {
      chain.push({
        id: current.id,
        name: current.name,
        versionLabel: current.versionLabel,
        parentId: current.parentId,
        nodeCount: current.nodeCount,
        customerCount: current.customerCount,
        createdAt: current.createdAt,
      });
      current = current.parentId
        ? (db.select().from(problems).where(eq(problems.id, current.parentId)).get() as
            | typeof problems.$inferSelect
            | undefined)
        : undefined;
      depth += 1;
    }
    chain.reverse(); // root first

    const children = (
      db
        .select({
          id: problems.id,
          name: problems.name,
          versionLabel: problems.versionLabel,
          parentId: problems.parentId,
          nodeCount: problems.nodeCount,
          customerCount: problems.customerCount,
          createdAt: problems.createdAt,
        })
        .from(problems)
        .where(inArray(problems.parentId, [id]))
        .all()
    ) as LineageNode[];
    children.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    return NextResponse.json({ ancestors: chain, children });
  } catch (err) {
    console.error('[API] GET /api/problems/[id]/lineage error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
