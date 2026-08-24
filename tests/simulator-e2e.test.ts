// End-to-end simulator test: load sample → solve → verify the polyline
// and markers would render correctly. Tests the data path that the
// browser-based simulator consumes.

import { expect } from 'chai';

import { FleetPilotSolver, Problem, LocationNode, Customer, Vehicle } from '../src/index.js';

interface SampleNode {
  id: number;
  x: number;
  y: number;
  name?: string;
}

interface Sample {
  depotNodeId: number;
  nodes: SampleNode[] | Record<string, SampleNode>;
  customers: Array<{
    id: number;
    deliveryNodeId: number;
    pickupNodeId: number;
    processingTime: number;
  }>;
  vehicles: Array<{ id: number; capacity: number }>;
  referenceOrigin?: { lat: number; lng: number };
}

const DELHI_SAMPLE: Sample = {
  depotNodeId: 0,
  nodes: [
    { id: 0, x: 28.61, y: 77.23, name: 'Delhi Hub - Rohini' },
    { id: 1, x: 28.63, y: 77.1, name: 'Pitampura - Drop' },
    { id: 2, x: 28.64, y: 77.12, name: 'Pitampura - Pick' },
    { id: 3, x: 28.59, y: 77.04, name: 'Paschim Vihar - Drop' },
    { id: 4, x: 28.6, y: 77.06, name: 'Paschim Vihar - Pick' },
    { id: 5, x: 28.56, y: 77.18, name: 'Rajouri Garden - Drop' },
    { id: 6, x: 28.57, y: 77.2, name: 'Rajouri Garden - Pick' },
    { id: 7, x: 28.54, y: 77.26, name: 'Karol Bagh - Drop' },
    { id: 8, x: 28.55, y: 77.28, name: 'Karol Bagh - Pick' },
    { id: 9, x: 28.52, y: 77.32, name: 'Daryaganj - Drop' },
    { id: 10, x: 28.53, y: 77.34, name: 'Daryaganj - Pick' },
    { id: 11, x: 28.5, y: 77.38, name: 'Lajpat Nagar - Drop' },
    { id: 12, x: 28.51, y: 77.4, name: 'Lajpat Nagar - Pick' },
    { id: 13, x: 28.47, y: 77.3, name: 'Saket - Drop' },
    { id: 14, x: 28.48, y: 77.32, name: 'Saket - Pick' },
    { id: 15, x: 28.45, y: 77.2, name: 'Dwarka - Drop' },
    { id: 16, x: 28.46, y: 77.22, name: 'Dwarka - Pick' },
    { id: 17, x: 28.4, y: 77.1, name: 'Najafgarh - Drop' },
    { id: 18, x: 28.41, y: 77.12, name: 'Najafgarh - Pick' },
    { id: 19, x: 28.67, y: 77.32, name: 'Yamuna Vihar - Drop' },
    { id: 20, x: 28.68, y: 77.34, name: 'Yamuna Vihar - Pick' },
  ],
  customers: [
    { id: 1, deliveryNodeId: 1, pickupNodeId: 2, processingTime: 10 },
    { id: 2, deliveryNodeId: 3, pickupNodeId: 4, processingTime: 15 },
    { id: 3, deliveryNodeId: 5, pickupNodeId: 6, processingTime: 12 },
    { id: 4, deliveryNodeId: 7, pickupNodeId: 8, processingTime: 20 },
    { id: 5, deliveryNodeId: 9, pickupNodeId: 10, processingTime: 8 },
    { id: 6, deliveryNodeId: 11, pickupNodeId: 12, processingTime: 15 },
    { id: 7, deliveryNodeId: 13, pickupNodeId: 14, processingTime: 10 },
    { id: 8, deliveryNodeId: 15, pickupNodeId: 16, processingTime: 12 },
    { id: 9, deliveryNodeId: 17, pickupNodeId: 18, processingTime: 18 },
    { id: 10, deliveryNodeId: 19, pickupNodeId: 20, processingTime: 10 },
  ],
  vehicles: [
    { id: 1, capacity: 100 },
    { id: 2, capacity: 100 },
    { id: 3, capacity: 80 },
  ],
};

function loadDelhiSample() {
  const sample = DELHI_SAMPLE;
  const nodeList = Array.isArray(sample.nodes) ? sample.nodes : Object.values(sample.nodes);
  const nodes: Record<number, LocationNode> = {};
  for (const n of nodeList) nodes[n.id] = new LocationNode(n.id, n.x, n.y, n.name);
  const customers = sample.customers.map(
    (c) => new Customer(c.id, c.deliveryNodeId, c.pickupNodeId, c.processingTime),
  );
  const vehicles = sample.vehicles.map((v) => new Vehicle(v.id, v.capacity));
  return { problem: new Problem(nodes, customers, vehicles, sample.depotNodeId), sample };
}

function ensureReferenceOrigin(p: Sample): Sample {
  if (p.referenceOrigin) return p;
  const nodeList = Array.isArray(p.nodes) ? p.nodes : Object.values(p.nodes);
  const depot = nodeList.find((n) => n.id === p.depotNodeId) ?? nodeList[0];
  return depot ? { ...p, referenceOrigin: { lat: depot.x, lng: depot.y } } : p;
}

function interpolate(
  positions: Array<[number, number]>,
  nodeTimes: number[],
  currentTime: number,
): { pos: [number, number]; heading: number } {
  if (positions.length === 0) return { pos: [0, 0], heading: 0 };
  if (positions.length === 1) return { pos: positions[0]!, heading: 0 };
  if (currentTime <= (nodeTimes[0] ?? 0)) return { pos: positions[0]!, heading: 0 };
  const last = positions.length - 1;
  const lastT = nodeTimes[last] ?? 0;
  if (currentTime >= lastT) return { pos: positions[last]!, heading: 0 };
  for (let i = 0; i < last; i++) {
    const t0 = nodeTimes[i] ?? 0;
    const t1 = nodeTimes[i + 1] ?? 0;
    if (currentTime >= t0 && currentTime <= t1) {
      const span = t1 - t0;
      const frac = span > 0 ? (currentTime - t0) / span : 0;
      const p0 = positions[i]!;
      const p1 = positions[i + 1]!;
      const pos: [number, number] = [
        p0[0] + (p1[0] - p0[0]) * frac,
        p0[1] + (p1[1] - p0[1]) * frac,
      ];
      const dLat = p1[0] - p0[0];
      const dLng = p1[1] - p0[1];
      const heading = frac > 0.001 ? (Math.atan2(dLng, dLat) * 180) / Math.PI : 0;
      return { pos, heading };
    }
  }
  return { pos: positions[last]!, heading: 0 };
}

describe('Simulator end-to-end (data path)', () => {
  it('load-sample ensures referenceOrigin from depot', () => {
    const { sample } = loadDelhiSample();
    expect(sample.referenceOrigin).to.equal(undefined);
    const ensured = ensureReferenceOrigin(sample);
    expect(ensured.referenceOrigin).to.deep.equal({ lat: 28.61, lng: 77.23 });
  });

  it('interpolate returns depot position at currentTime=0', () => {
    const positions: Array<[number, number]> = [
      [28.61, 77.23],
      [28.54, 77.26],
    ];
    const nodeTimes = [0, 20];
    const result = interpolate(positions, nodeTimes, 0);
    expect(result.pos).to.deep.equal([28.61, 77.23]);
    expect(result.heading).to.equal(0);
  });

  it('interpolate interpolates linearly between vertices', () => {
    const positions: Array<[number, number]> = [
      [28.61, 77.23],
      [28.54, 77.26],
    ];
    const nodeTimes = [0, 20];
    const result = interpolate(positions, nodeTimes, 10);
    expect(Math.abs(result.pos[0] - 28.575)).to.be.lessThan(1e-9);
    expect(Math.abs(result.pos[1] - 77.245)).to.be.lessThan(1e-9);
    expect(result.heading).to.not.equal(0);
  });

  it('interpolate returns end position at currentTime=makespan', () => {
    const positions: Array<[number, number]> = [
      [28.61, 77.23],
      [28.54, 77.26],
    ];
    const nodeTimes = [0, 20];
    const result = interpolate(positions, nodeTimes, 20);
    expect(result.pos).to.deep.equal([28.54, 77.26]);
  });

  it('real solution produces valid route traces (positions in Delhi range)', async () => {
    const { problem, sample } = loadDelhiSample();
    const solver = new FleetPilotSolver(problem);
    const solution = await solver.solve({
      alnsIterations: 50,
      populationSize: 50,
      maxGenerations: 50,
      seed: 1,
      maxTimeMs: 5000,
    });

    expect(solution.isFeasible()).to.equal(true);
    expect(solution.routes.length).to.be.greaterThan(0);
    expect(solution.makespan).to.be.greaterThan(0);
    expect(solution.nodeTimes).to.exist;

    const ensured = ensureReferenceOrigin(sample);
    const nodeList = Array.isArray(sample.nodes) ? sample.nodes : Object.values(sample.nodes);
    const nodeById = new Map<number, SampleNode>();
    for (const n of nodeList) nodeById.set(n.id, n);

    const nodeTimeEntries = Object.entries(solution.nodeTimes);
    const nodeTimeMap = new Map<number, number>();
    for (const [k, v] of nodeTimeEntries) nodeTimeMap.set(Number(k), v);

    for (const route of solution.routes) {
      const positions: Array<[number, number]> = [];
      const times: number[] = [];
      for (const nodeId of route.nodes) {
        const node = nodeById.get(nodeId);
        if (!node) continue;
        const [lat, lng] = ensured.referenceOrigin
          ? [
              ensured.referenceOrigin.lat + (node.x - ensured.referenceOrigin.lat),
              ensured.referenceOrigin.lng + (node.y - ensured.referenceOrigin.lng),
            ]
          : [node.x, node.y];
        positions.push([lat, lng]);
        times.push(nodeTimeMap.get(nodeId) ?? 0);
      }
      expect(positions.length).to.be.at.least(2);
      for (let i = 0; i < positions.length; i++) {
        const lat = positions[i]![0];
        const lng = positions[i]![1];
        expect(lat, `lat ${lat} for stop ${i} should be in Delhi range`).to.be.within(28.4, 28.7);
        expect(lng, `lng ${lng} for stop ${i} should be in Delhi range`).to.be.within(77.0, 77.4);
      }
      const mid = Math.floor(times.length / 2);
      const midTime = times[mid] ?? 0;
      const interp = interpolate(positions, times, midTime);
      expect(interp.pos[0]).to.be.within(28.4, 28.7);
      expect(interp.pos[1]).to.be.within(77.0, 77.4);
    }
  });
});
