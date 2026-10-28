import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/api-key';
import { getDb } from '@/lib/db';
import { solutions, problems } from '@/lib/db/schema';
import { ensureSchema } from '@/lib/db/migrate';
import { log } from '@/lib/log';
import { eq } from 'drizzle-orm';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = authenticate(_request);
  if (auth instanceof NextResponse) return auth;

  try {
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
      nodes?: Record<string, { id: number; x: number; y: number; name?: string }> | Array<{ id: number; x: number; y: number; name?: string }>;
      depotNodeId?: number;
      referenceOrigin?: { lat: number; lng: number };
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

    const toLngLat = (node: { x: number; y: number } | undefined): [number, number] => {
      if (!node) return [0, 0];
      const origin = probData.referenceOrigin;
      if (!origin) return [node.x, node.y];
      const earthRadius = 6_371_000;
      const degrees = 180 / Math.PI;
      const lat = origin.lat + (node.y / earthRadius) * degrees;
      const lng = origin.lng + (node.x / (earthRadius * Math.cos(origin.lat * Math.PI / 180))) * degrees;
      return [lng, lat];
    };

    const routeNodeIds = (route: { nodes: number[] }): number[] => {
      const depot = probData.depotNodeId;
      return depot === undefined ? route.nodes : [depot, ...route.nodes, depot];
    };

    const downloadHeaders = (contentType: string, extension: string): Record<string, string> => ({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="fleetpilot-${solution.id}.${extension}"`,
    });

    if (format === 'geojson') {
      const features = (solData.routes ?? []).map((route) => ({
        type: 'Feature' as const,
        properties: { vehicleId: route.vehicleId, type: 'route' },
        geometry: {
          type: 'LineString' as const,
          coordinates: routeNodeIds(route).map((nid) => toLngLat(nodeMap.get(nid))),
        },
      }));
      const geojson = { type: 'FeatureCollection' as const, features };
      return NextResponse.json(geojson, {
        headers: downloadHeaders('application/geo+json', 'geojson'),
      });
    }

    if (format === 'csv') {
      const csv = (value: string | number): string => `"${String(value).replaceAll('"', '""')}"`;
      const lines = ['vehicleId,nodeIndex,nodeId,nodeName,longitude,latitude'];
      for (const route of solData.routes ?? []) {
        routeNodeIds(route).forEach((nid, idx) => {
          const node = nodeMap.get(nid);
          const [lng, lat] = toLngLat(node);
          lines.push([route.vehicleId, idx, nid, node?.name ?? '', lng, lat].map(csv).join(','));
        });
      }
      return new NextResponse(lines.join('\n'), {
        headers: downloadHeaders('text/csv; charset=utf-8', 'csv'),
      });
    }

    if (format === 'kml') {
      const xml = (value: string | number): string => String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;');
      const placemarks = (solData.routes ?? []).map((route) => {
        const coordinates = routeNodeIds(route)
          .map((id) => `${toLngLat(nodeMap.get(id)).join(',')},0`)
          .join(' ');
        return `<Placemark><name>${xml(`Vehicle ${route.vehicleId}`)}</name><LineString><tessellate>1</tessellate><coordinates>${coordinates}</coordinates></LineString></Placemark>`;
      }).join('');
      const kml = `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${xml(problem?.name ?? 'FleetPilot routes')}</name>${placemarks}</Document></kml>`;
      return new NextResponse(kml, { headers: downloadHeaders('application/vnd.google-earth.kml+xml', 'kml') });
    }

    return NextResponse.json({ error: 'Unsupported format. Use geojson, kml or csv.' }, { status: 400 });
  } catch (err) {
    log.error('[API] GET /api/solutions/[id]/export error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
