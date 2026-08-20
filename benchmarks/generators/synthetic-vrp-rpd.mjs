#!/usr/bin/env node
// Synthetic generator for paper-range FleetPilot-style instances (Tier 6 filler).

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '..', 'synthetic');
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

function buildInstance({ customers, capacity, seed, name }) {
  const rng = makeRng(seed);
  const nodes = { 0: { id: 0, x: 50, y: 50, name: 'Depot' } };
  const cust = [];
  let nodeId = 1;
  for (let i = 1; i <= customers; i++) {
    const dId = nodeId++;
    const pId = nodeId++;
    const dX = Math.round(rng() * 100);
    const dY = Math.round(rng() * 100);
    nodes[dId] = { id: dId, x: dX, y: dY, name: `D${i}` };
    nodes[pId] = { id: pId, x: Math.min(100, dX + 2), y: Math.min(100, dY + 2), name: `P${i}` };
    cust.push({
      id: i,
      deliveryNodeId: dId,
      pickupNodeId: pId,
      processingTime: 10 + Math.round(rng() * 20),
    });
  }
  const vehicles = [];
  const vehCount = Math.max(1, Math.ceil(customers / 8));
  for (let v = 1; v <= vehCount; v++) {
    vehicles.push({ id: v, capacity });
  }
  return { depotNodeId: 0, nodes, customers: cust, vehicles };
}

const presets = [
  { name: 'synth-10c-small.json', customers: 10, capacity: 100, seed: 300 },
  { name: 'synth-20c-medium.json', customers: 20, capacity: 100, seed: 301 },
  { name: 'synth-50c-large.json', customers: 50, capacity: 150, seed: 302 },
  { name: 'synth-100c-stress.json', customers: 100, capacity: 200, seed: 303 },
  { name: 'synth-200c-mega.json', customers: 200, capacity: 250, seed: 304 },
];

for (const p of presets) {
  const inst = buildInstance(p);
  const out = resolve(outDir, p.name);
  writeFileSync(out, JSON.stringify(inst, null, 2));
  console.log(`Wrote ${out} (${inst.customers.length} customers, ${inst.vehicles.length} vehicles)`);
}
