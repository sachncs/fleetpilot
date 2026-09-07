import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { createHash } from 'node:crypto';

import { authenticate } from '@/lib/auth/api-key';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/db/migrate';
import { geocodeCache } from '@/lib/db/schema';
import { log } from '@/lib/log';

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'FleetPilot/2.0 (+https://fleetpilot.local)';
const FETCH_TIMEOUT_MS = 5000;

// Token bucket per client IP: capacity 3 (burst), refill 1 token/second.
const buckets = new Map<string, { tokens: number; last: number }>();

function takeToken(ip: string): boolean {
  const now = Date.now();
  const b = buckets.get(ip) ?? { tokens: 3, last: now };
  const elapsedSec = Math.max(0, (now - b.last) / 1000);
  b.tokens = Math.min(3, b.tokens + elapsedSec);
  b.last = now;
  if (b.tokens < 1) {
    buckets.set(ip, b);
    return false;
  }
  b.tokens -= 1;
  buckets.set(ip, b);
  return true;
}

interface GeocodeHit {
  displayName: string;
  lat: number;
  lng: number;
}

function hashQuery(q: string): string {
  return createHash('sha256').update(q.trim().toLowerCase()).digest('hex');
}

async function searchNominatim(q: string): Promise<GeocodeHit[]> {
  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(q)}&format=jsonv2&limit=5&addressdetails=0`;
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`nominatim ${res.status}`);
  const data = (await res.json()) as Array<{ display_name?: string; lat?: string; lon?: string }>;
  return data
    .filter((r) => r.display_name && r.lat && r.lon)
    .map((r) => ({ displayName: r.display_name as string, lat: Number(r.lat), lng: Number(r.lon) }));
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = authenticate(request);
  if (auth instanceof NextResponse) return auth;

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';
  if (!takeToken(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const q = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (q.length < 2 || q.length > 200) {
    return NextResponse.json({ error: 'q must be 2..200 characters' }, { status: 400 });
  }

  try {
    await ensureSchema();
    const db = getDb();
    const hash = hashQuery(q);

    // NOTE: never log the raw query — only its hash.
    const cached = db.select().from(geocodeCache).where(eq(geocodeCache.queryHash, hash)).get();
    if (cached && Date.now() - Date.parse(cached.fetchedAt) < CACHE_TTL_MS) {
      return NextResponse.json({
        results: JSON.parse(cached.resultsJson) as GeocodeHit[],
        cached: true,
        queryHash: hash,
      });
    }

    const results = await searchNominatim(q);

    db.insert(geocodeCache)
      .values({
        queryHash: hash,
        resultsJson: JSON.stringify(results),
        provider: 'nominatim',
        fetchedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: geocodeCache.queryHash,
        set: { resultsJson: JSON.stringify(results), fetchedAt: new Date().toISOString() },
      })
      .run();

    return NextResponse.json({ results, cached: false, queryHash: hash });
  } catch (err) {
    log.error('[API] GET /api/geocode error:', err);
    return NextResponse.json({ error: 'Geocoding failed' }, { status: 502 });
  }
}
