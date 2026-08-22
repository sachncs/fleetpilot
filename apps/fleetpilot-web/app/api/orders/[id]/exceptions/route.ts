import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { authenticate } from '@/lib/auth/api-key';

interface Ctx {
  params: Promise<{ id: string }>;
}

const exceptionSchema = z.object({
  orderId: z.string().nullable(),
  nodeId: z.number().int(),
  kind: z.enum(['late', 'early']),
  arrival: z.number().finite().min(0),
  windowStart: z.number().nullable(),
  windowEnd: z.number().nullable(),
  reportedAt: z.string().datetime(),
});

/**
 * Playback writeback target. The orders registry console lands in the next
 * milestone; until then the contract is validated but intentionally inert.
 */
export async function POST(request: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const auth = authenticate(request);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = exceptionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 });
  }

  const { id } = await ctx.params;
  return NextResponse.json(
    { error: `Order writeback is not enabled yet (order ${id})` },
    { status: 501 },
  );
}
