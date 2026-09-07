#!/usr/bin/env node
// Synthetic generator for Cordeau MDVRP-style instances.
// Writes JSON files in FleetPilot shape so the adapter can be a passthrough.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '..', 'cordeau', 'mdvrp');
mkdirSync(outDir, { recursive: true });

// Seeded PRNG (mulberry32).
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

function buildInstance({ depots, customersPerDepot, capacity, seed, name }) {
  const rng = makeRng(seed);
  const nodes = {};
  const depotsArr = [];
  let nodeId = 0;
  for (let d = 0; d < depots; d++) {
    const id = nodeId++;
    const x = Math.round(rng() * 100);
    const y = Math.round(rng() * 100);
    nodes[id] = { id, x, y, name: `Depot ${d}` };
    depotsArr.push({ id, x, y, name: `Depot ${d}` });
  }
  const depotNodeId = depotsArr[0].id;
  const customers = [];
  const vehicles = [];
  let vehicleId = 1;
  let customerId = 1;
  for (let d = 0; d < depots; d++) {
    const depot = depotsArr[d];
    for (let c = 0; c < customersPerDepot; c++) {
      // Customer near its depot.
      const baseX = Math.max(0, Math.min(100, depot.x + (rng() - 0.5) * 40));
      const baseY = Math.max(0, Math.min(100, depot.y + (rng() - 0.5) * 40));
      const dId = nodeId++;
      const pId = nodeId++;
      const dOffset = (rng() - 0.5) * 2;
      const pOffset = (rng() - 0.5) * 2;
      nodes[dId] = { id: dId, x: Math.max(0, Math.round(baseX + dOffset)), y: Math.max(0, Math.round(baseY + dOffset)), name: `D${customerId}` };
      nodes[pId] = { id: pId, x: Math.max(0, Math.round(baseX + pOffset)), y: Math.max(0, Math.round(baseY + pOffset)), name: `P${customerId}` };
      customers.push({
        id: customerId++,
        deliveryNodeId: dId,
        pickupNodeId: pId,
        processingTime: 10,
      });
    }
    // 2 vehicles per depot.
    for (let v = 0; v < 2; v++) {
      vehicles.push({
        id: vehicleId++,
        capacity,
        startDepotId: depot.id,
        endDepotId: depot.id,
      });
    }
  }
  return {
    depotNodeId,
    depots: depotsArr,
    nodes,
    customers,
    vehicles,
  };
}

const presets = [
  { name: 'mdvrp-2d-16c.json', depots: 2, customersPerDepot: 8, capacity: 100, seed: 42 },
  { name: 'mdvrp-3d-24c.json', depots: 3, customersPerDepot: 8, capacity: 120, seed: 43 },
  { name: 'mdvrp-4d-32c.json', depots: 4, customersPerDepot: 8, capacity: 120, seed: 44 },
  { name: 'mdvrp-3d-48c.json', depots: 3, customersPerDepot: 16, capacity: 200, seed: 45 },
];

for (const p of presets) {
  const inst = buildInstance(p);
  const out = resolve(outDir, p.name);
  writeFileSync(out, JSON.stringify(inst, null, 2));
  console.log(`Wrote ${out} (${inst.customers.length} customers, ${inst.vehicles.length} vehicles)`);
}
