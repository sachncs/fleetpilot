import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/api-key';
import { getDb } from '@/lib/db';
import { solutions, problems } from '@/lib/db/schema';
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

  const problem = db.select().from(problems).where(eq(problems.id, solution.problemId)).get();
  const format = new URL(_request.url).searchParams.get('format') ?? 'geojson';

  const solData = JSON.parse(solution.solutionJson) as {
    routes?: Array<{ vehicleId: number; nodes: number[] }>;
  };
  const probData = JSON.parse(problem?.problemJson ?? '{}') as {
    nodes?: Record<string, { id: number; x: number; y: number; name?: string }>;
  };

  const nodeMap = new Map<number, { id: number; x: number; y: number; name?: string }>();
  if (probData.nodes) {
    const nodeList = Array.isArray(probData.nodes)
      ? probData.nodes
      : Object.values(probData.nodes);
    for (const n of nodeList) {
      nodeMap.set(n.id, n);
    }
  }

  if (format === 'geojson') {
    const features = (solData.routes ?? []).map((route) => ({
      type: 'Feature' as const,
      properties: { vehicleId: route.vehicleId, type: 'route' },
      geometry: {
        type: 'LineString' as const,
        coordinates: route.nodes.map((nid) => {
          const node = nodeMap.get(nid);
          return [node?.x ?? 0, node?.y ?? 0];
        }),
      },
    }));
    const geojson = { type: 'FeatureCollection' as const, features };
    return NextResponse.json(geojson, {
      headers: { 'Content-Type': 'application/geo+json' },
    });
  }

  if (format === 'csv') {
    const lines = ['vehicleId,nodeIndex,nodeId,nodeName'];
    for (const route of solData.routes ?? []) {
      route.nodes.forEach((nid, idx) => {
        const node = nodeMap.get(nid);
        lines.push(`${route.vehicleId},${idx},${nid},${node?.name ?? ''}`);
      });
    }
    return new NextResponse(lines.join('\n'), {
      headers: { 'Content-Type': 'text/csv' },
    });
  }

  return NextResponse.json({ error: 'Unsupported format. Use geojson or csv.' }, { status: 400 });
}
