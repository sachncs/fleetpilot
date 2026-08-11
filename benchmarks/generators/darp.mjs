#!/usr/bin/env node
// Synthetic generator for DARP-style instances, mapped to VRP-RPD shape.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '..', 'darp');
mkdirSync(outDir, { recursive: true });

function makeRng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildInstance({ requests, vehCount, capacity, seed, name }) {
  const rng = makeRng(seed);
  const nodes = { 0: { id: 0, x: 50, y: 50, name: 'Depot' } };
  const customers = [];
  let nodeId = 1;
  for (let i = 1; i <= requests; i++) {
    const dId = nodeId++;
    const pId = nodeId++;
    const dX = 10 + Math.round(rng() * 80);
    const dY = 10 + Math.round(rng() * 80);
    const pX = 10 + Math.round(rng() * 80);
    const pY = 10 + Math.round(rng() * 80);
    nodes[dId] = { id: dId, x: dX, y: dY, name: `D${i}` };
    nodes[pId] = { id: pId, x: pX, y: pY, name: `P${i}` };
    // Wide time windows: 0 to 1000 minutes.
    const e = Math.round(rng() * 60);
    const w = 400 + Math.round(rng() * 200);
    customers.push({
      id: i,
      deliveryNodeId: dId,
      pickupNodeId: pId,
      processingTime: 5,
      earliestDeliveryTime: e,
      latestDeliveryTime: e + w,
      earliestPickupTime: e + 5,
      latestPickupTime: e + w + 5,
    });
  }
  const vehicles = [];
  for (let v = 1; v <= vehCount; v++) {
    vehicles.push({ id: v, capacity });
  }
  return { depotNodeId: 0, nodes, customers, vehicles };
}

const presets = [
  { name: 'darp-8req-4veh.json', requests: 8, vehCount: 4, capacity: 4, seed: 100 },
  { name: 'darp-12req-4veh.json', requests: 12, vehCount: 4, capacity: 4, seed: 101 },
  { name: 'darp-16req-6veh.json', requests: 16, vehCount: 6, capacity: 4, seed: 102 },
  { name: 'darp-20req-6veh.json', requests: 20, vehCount: 6, capacity: 4, seed: 103 },
  { name: 'darp-24req-8veh.json', requests: 24, vehCount: 8, capacity: 4, seed: 104 },
];

for (const p of presets) {
  const inst = buildInstance(p);
  const out = resolve(outDir, p.name);
  writeFileSync(out, JSON.stringify(inst, null, 2));
  console.log(`Wrote ${out} (${inst.customers.length} customers, ${inst.vehicles.length} vehicles)`);
}
