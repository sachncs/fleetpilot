import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/api-key';
import { getDb } from '@/lib/db';
import { apiKeys } from '@/lib/db/schema';
import { ensureSchema } from '@/lib/db/migrate';
import { eq } from 'drizzle-orm';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = authenticate(_request);
  if (auth instanceof NextResponse) return auth;

  try {
    await ensureSchema();
    const db = getDb();
    const { id } = await params;

    const key = db.select().from(apiKeys).where(eq(apiKeys.id, id)).get();
    if (!key) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    }

    db.delete(apiKeys).where(eq(apiKeys.id, id)).run();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[API] DELETE /api/keys/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
