import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/api-key';
import { getDb } from '@/lib/db';
import { solutions } from '@/lib/db/schema';
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

  const solution = db.select().from(solutions).where(eq(solutions.id, id)).get();
  if (!solution) {
    return NextResponse.json({ error: 'Solution not found' }, { status: 404 });
  }

  return NextResponse.json(solution);
}
