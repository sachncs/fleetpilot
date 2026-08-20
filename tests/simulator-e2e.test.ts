// End-to-end simulator test: load sample → solve → verify the polyline
// and markers would render correctly. Tests the data path that the
// browser-based simulator consumes.

import { readFileSync } from 'node:fs';

import { expect } from 'chai';

import { FleetPilotSolver, VrpProblem, LocationNode, Customer, Vehicle } from '../src/index.js';

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

function loadDelhiSample() {
  const sample = JSON.parse(readFileSync('samples/delhi-10.json', 'utf8')) as Sample;
  const nodeList = Array.isArray(sample.nodes) ? sample.nodes : Object.values(sample.nodes);
  const nodes: Record<number, LocationNode> = {};
  for (const n of nodeList) nodes[n.id] = new LocationNode(n.id, n.x, n.y, n.name);
  const customers = sample.customers.map(
    (c) => new Customer(c.id, c.deliveryNodeId, c.pickupNodeId, c.processingTime),
  );
  const vehicles = sample.vehicles.map((v) => new Vehicle(v.id, v.capacity));
  return { problem: new VrpProblem(nodes, customers, vehicles, sample.depotNodeId), sample };
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
