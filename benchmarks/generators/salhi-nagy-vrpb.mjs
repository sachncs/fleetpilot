#!/usr/bin/env node
// Synthetic generator for Salhi-Nagy VRPB-style instances.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '..', 'salhi-nagy', 'vrpb');
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
  const half = Math.floor(customers / 2);
  for (let i = 1; i <= customers; i++) {
    const isLinehaul = i <= half;
    const baseX = isLinehaul ? 20 + rng() * 20 : 60 + rng() * 20;
    const baseY = 20 + rng() * 60;
    const dId = nodeId++;
    const pId = nodeId++;
    nodes[dId] = { id: dId, x: Math.round(baseX), y: Math.round(baseY), name: `D${i}` };
    nodes[pId] = { id: pId, x: Math.round(baseX + 2), y: Math.round(baseY + 2), name: `P${i}` };
    cust.push({
      id: i,
      deliveryNodeId: dId,
      pickupNodeId: pId,
      processingTime: 10,
    });
  }
  const vehicles = [];
  const vehCount = Math.ceil(customers / 10);
  for (let v = 1; v <= vehCount; v++) {
    vehicles.push({ id: v, capacity });
  }
  return { depotNodeId: 0, nodes, customers: cust, vehicles };
}

const presets = [
  { name: 'vrpb-20c.json', customers: 20, capacity: 100, seed: 200 },
  { name: 'vrpb-30c.json', customers: 30, capacity: 100, seed: 201 },
  { name: 'vrpb-40c.json', customers: 40, capacity: 100, seed: 202 },
  { name: 'vrpb-50c.json', customers: 50, capacity: 150, seed: 203 },
];

for (const p of presets) {
  const inst = buildInstance(p);
  const out = resolve(outDir, p.name);
  writeFileSync(out, JSON.stringify(inst, null, 2));
  console.log(`Wrote ${out} (${inst.customers.length} customers, ${inst.vehicles.length} vehicles)`);
}
