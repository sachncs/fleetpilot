import { randomBytes } from 'node:crypto';

import { inArray, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { writeAudit } from '@/lib/audit';
import { authenticate } from '@/lib/auth/api-key';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/db/migrate';
import { depots, orders, problems, vehicles } from '@/lib/db/schema';
import { log } from '@/lib/log';

const requestSchema = z.object({
  name: z.string().trim().min(1).max(200),
  depotId: z.string().min(1),
  orderIds: z.array(z.string().min(1)).min(1).max(500),
  vehicleIds: z.array(z.string().min(1)).min(1).max(100),
});

const EARTH_RADIUS_M = 6_371_000;
const DEG_TO_RAD = Math.PI / 180;

function project(origin: { lat: number; lng: number }, lat: number, lng: number): [number, number] {
  const dLat = (lat - origin.lat) * DEG_TO_RAD;
  const dLng = (lng - origin.lng) * DEG_TO_RAD;
  const avgLat = ((lat + origin.lat) / 2) * DEG_TO_RAD;
  return [
    dLng * Math.cos(avgLat) * EARTH_RADIUS_M,
    dLat * EARTH_RADIUS_M,
  ];
}

function clockMinutes(value: string | null): number | null {
  if (!value) return null;
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours! * 60 + minutes!;
}

/** Build a server-owned scenario from live registry demand and fleet capacity. */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = authenticate(request);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Choose a name, station, at least one order, and at least one vehicle.', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    await ensureSchema();
    const db = getDb();
    const input = parsed.data;
    const depot = db.select().from(depots).where(eq(depots.id, input.depotId)).get();
    if (!depot) return NextResponse.json({ error: 'Station not found' }, { status: 404 });

    const selectedOrders = db.select().from(orders).where(inArray(orders.id, input.orderIds)).all();
    if (selectedOrders.length !== new Set(input.orderIds).size) {
      return NextResponse.json({ error: 'One or more selected orders no longer exist.' }, { status: 409 });
    }

    const selectedVehicles = db.select().from(vehicles).where(inArray(vehicles.id, input.vehicleIds)).all();
    if (selectedVehicles.length !== new Set(input.vehicleIds).size) {
      return NextResponse.json({ error: 'One or more selected vehicles no longer exist.' }, { status: 409 });
    }
    const unavailable = selectedVehicles.find((vehicle) => vehicle.status !== 'active');
    if (unavailable) {
      return NextResponse.json({ error: `${unavailable.name} is not active.` }, { status: 409 });
    }
    const missingCapacity = selectedVehicles.find(
      (vehicle) => vehicle.capacityKg === null || vehicle.capacityKg <= 0,
    );
    if (missingCapacity) {
      return NextResponse.json(
        { error: `${missingCapacity.name} needs a positive capacity before it can be planned.` },
        { status: 409 },
      );
    }
    const largestCapacity = Math.max(...selectedVehicles.map((vehicle) => vehicle.capacityKg!));
    const oversizedOrder = selectedOrders.find((order) => (order.quantity > 0 ? order.quantity : 1) > largestCapacity);
    if (oversizedOrder) {
      const demand = oversizedOrder.quantity > 0 ? oversizedOrder.quantity : 1;
      return NextResponse.json(
        { error: `${oversizedOrder.ref} needs ${demand.toLocaleString()} kg, but the largest selected vehicle holds ${largestCapacity.toLocaleString()} kg.` },
        { status: 409 },
      );
    }

    const nodes: Array<{ id: number; x: number; y: number; name: string }> = [
      { id: 0, x: 0, y: 0, name: depot.name },
    ];
    const customers = selectedOrders.map((order, index) => {
      const [x, y] = project(depot, order.lat, order.lng);
      const deliveryNodeId = index * 2 + 1;
      const pickupNodeId = index * 2 + 2;
      nodes.push(
        { id: deliveryNodeId, x, y, name: `${order.ref} · service` },
        { id: pickupNodeId, x, y, name: `${order.ref} · complete` },
      );

      const windowStart = clockMinutes(order.windowStart);
      const windowEnd = clockMinutes(order.windowEnd);
      return {
        id: index + 1,
        deliveryNodeId,
        pickupNodeId,
        processingTime: order.processingMin,
        demand: order.quantity > 0 ? order.quantity : 1,
        orderId: order.id,
        orderRef: order.ref,
        ...(windowStart !== null || windowEnd !== null
          ? {
              earliestDeliveryTime: windowStart ?? 0,
              latestDeliveryTime: windowEnd ?? 1440,
              earliestPickupTime: windowStart ?? 0,
              latestPickupTime: windowEnd ?? 1440,
            }
          : {}),
      };
    });

    const scenarioVehicles = selectedVehicles.map((vehicle, index) => ({
      id: index + 1,
      capacity: vehicle.capacityKg!,
      startDepotId: 0,
      endDepotId: 0,
      costPerKm: vehicle.costPerKm ?? 1,
      co2PerKm: vehicle.co2PerKm ?? 0,
      name: vehicle.name,
      registryId: vehicle.id,
    }));

    const problemJson = {
      depotNodeId: 0,
      nodes,
      customers,
      vehicles: scenarioVehicles,
      referenceOrigin: { lat: depot.lat, lng: depot.lng },
      registry: {
        depotId: depot.id,
        orderIds: selectedOrders.map((order) => order.id),
        vehicleIds: selectedVehicles.map((vehicle) => vehicle.id),
      },
    };

    const id = `prob_${randomBytes(16).toString('hex')}`;
    const now = new Date().toISOString();
    db.transaction((tx) => {
      tx.insert(problems)
        .values({
          id,
          name: input.name,
          description: `Registry plan from ${depot.name}`,
          problemJson: JSON.stringify(problemJson),
          nodeCount: nodes.length,
          customerCount: customers.length,
          vehicleCount: scenarioVehicles.length,
          createdAt: now,
          updatedAt: now,
        })
        .run();
      tx.update(orders)
        .set({ status: 'planned', problemId: id, updatedAt: now })
        .where(inArray(orders.id, selectedOrders.map((order) => order.id)))
        .run();
    });

    writeAudit({
      entity: 'scenario',
      entityId: id,
      action: 'created_from_registry',
      actor: auth.keyName,
      payload: problemJson.registry,
    });

    return NextResponse.json(
      { id, name: input.name, orderCount: customers.length, vehicleCount: scenarioVehicles.length },
      { status: 201 },
    );
  } catch (error) {
    log.error('[API] POST /api/scenarios/from-registry error:', error);
    return NextResponse.json({ error: 'Could not create the planning scenario.' }, { status: 500 });
  }
}
