#!/usr/bin/env node
// check-samples.mjs — Validate every samples/*.json is a parseable VRP problem.
// Runs as `npm run check-samples` (chained by `prebuild`).
// Exits non-zero if any sample fails.

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const samplesDir = resolve(root, 'samples');

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`✓ ${msg}`);
}

function validateProblemShape(data, file) {
  if (typeof data !== 'object' || data === null) {
    fail(`${file}: not a JSON object`);
  }
  const obj = data;
  if (!Array.isArray(obj.nodes) || obj.nodes.length === 0) {
    fail(`${file}: 'nodes' must be a non-empty array`);
  }
  if (!Array.isArray(obj.customers) || obj.customers.length === 0) {
    fail(`${file}: 'customers' must be a non-empty array`);
  }
  if (!Array.isArray(obj.vehicles) || obj.vehicles.length === 0) {
    fail(`${file}: 'vehicles' must be a non-empty array`);
  }
  const nodeIds = new Set();
  for (const node of obj.nodes) {
    if (typeof node.id !== 'number') fail(`${file}: node missing numeric id`);
    if (typeof node.x !== 'number') fail(`${file}: node ${node.id} missing numeric x`);
    if (typeof node.y !== 'number') fail(`${file}: node ${node.id} missing numeric y`);
    if (nodeIds.has(node.id)) fail(`${file}: duplicate node id ${node.id}`);
    nodeIds.add(node.id);
  }
  for (const customer of obj.customers) {
    if (typeof customer.id !== 'number') fail(`${file}: customer missing numeric id`);
    if (typeof customer.deliveryNodeId !== 'number') {
      fail(`${file}: customer ${customer.id} missing numeric deliveryNodeId`);
    }
    if (typeof customer.pickupNodeId !== 'number') {
      fail(`${file}: customer ${customer.id} missing numeric pickupNodeId`);
    }
    if (typeof customer.processingTime !== 'number') {
      fail(`${file}: customer ${customer.id} missing numeric processingTime`);
    }
    if (!nodeIds.has(customer.deliveryNodeId)) {
      fail(`${file}: customer ${customer.id}.deliveryNodeId=${customer.deliveryNodeId} not in nodes`);
    }
    if (!nodeIds.has(customer.pickupNodeId)) {
      fail(`${file}: customer ${customer.id}.pickupNodeId=${customer.pickupNodeId} not in nodes`);
    }
    if (customer.deliveryNodeId === customer.pickupNodeId) {
      fail(`${file}: customer ${customer.id} has identical delivery/pickup node`);
    }
  }
  for (const vehicle of obj.vehicles) {
    if (typeof vehicle.id !== 'number') fail(`${file}: vehicle missing numeric id`);
    if (typeof vehicle.capacity !== 'number') fail(`${file}: vehicle ${vehicle.id} missing numeric capacity`);
    if (vehicle.capacity <= 0) fail(`${file}: vehicle ${vehicle.id} has non-positive capacity`);
  }
  if (typeof obj.depotNodeId !== 'number') {
    fail(`${file}: depotNodeId must be a number`);
  }
  if (!nodeIds.has(obj.depotNodeId)) {
    fail(`${file}: depotNodeId=${obj.depotNodeId} not in nodes`);
  }
}

function main() {
  let files;
  try {
    files = readdirSync(samplesDir).filter((f) => f.endsWith('.json'));
  } catch (err) {
    fail(`could not read samples directory ${samplesDir}: ${err.message}`);
  }
  if (files.length === 0) {
    fail(`no JSON files found in ${samplesDir}`);
  }
  console.log(`Checking ${files.length} sample files in ${samplesDir}...`);
  for (const file of files) {
    const fullPath = resolve(samplesDir, file);
    let data;
    try {
      const raw = readFileSync(fullPath, 'utf8');
      data = JSON.parse(raw);
    } catch (err) {
      fail(`${file}: ${err.message}`);
    }
    validateProblemShape(data, file);
    ok(`${file}`);
  }
  console.log(`\nAll ${files.length} samples are valid.`);
}

main();
