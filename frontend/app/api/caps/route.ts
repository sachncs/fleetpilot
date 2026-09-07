import { NextRequest, NextResponse } from 'next/server';

import { authenticate } from '@/lib/auth/api-key';
import { config } from '@/lib/config';

/** Read-only solver limits so clients can clamp inputs to server truth. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = authenticate(request);
  if (auth instanceof NextResponse) return auth;

  return NextResponse.json({
    maxTimeMs: config.maxTimeMs,
    maxGenerations: config.maxGenerations,
    maxConcurrentSolves: config.maxConcurrentSolves,
  });
}
