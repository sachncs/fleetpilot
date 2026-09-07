// VROOM baseline — opt-in external reference.
// Runs the `vroom` binary on the same small instances and writes
// benchmarks/results/vroom-baseline.json. Skipped if `vroom` is not on PATH.
//
// Install vroom: https://github.com/VROOM-Project/vroom
//   brew install vroom   # macOS
//   apt install vroom    # Debian/Ubuntu
//   docker run -i vroom/vroom   # Docker
//
// Run:
//   npm run benchmark:vroom
//
// Output:
//   benchmarks/results/vroom-baseline.json

import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ADAPTERS, type Family } from './runner/adapters.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const INSTANCES: Array<{ family: Family; instance: string }> = [
  { family: 'synthetic', instance: 'synth-10c-small.json' },
  { family: 'synthetic', instance: 'synth-20c-medium.json' },
  { family: 'cordeau', instance: 'mdvrp-2d-16c.json' },
  { family: 'darp', instance: 'darp-8req-4veh.json' },
  { family: 'salhi-nagy', instance: 'vrpb-20c.json' },
];

function familyDir(family: Family): string {
  switch (family) {
    case 'lilim':
      return resolve(root, 'benchmarks', 'lilim', 'pdptw', '100');
    case 'solomon':
      return resolve(root, 'benchmarks', 'solomon', '100');
    case 'cordeau':
      return resolve(root, 'benchmarks', 'cordeau', 'mdvrp');
    case 'darp':
      return resolve(root, 'benchmarks', 'darp');
    case 'salhi-nagy':
      return resolve(root, 'benchmarks', 'salhi-nagy', 'vrpb');
    case 'synthetic':
      return resolve(root, 'benchmarks', 'synthetic');
  }
}

function checkVroomAvailable(): string | null {
  const result = spawnSync('vroom', ['--help'], { encoding: 'utf8' });
  if (result.status === 0 || result.status === 1) {
    return 'vroom';
  }
  return null;
}

function toVroomInput(problem: import('../src/core/problem.js').Problem): string {
  // VROOM expects its own JSON format. For now, emit a minimal VRP (no TW,
  // no P/D) using only the depot, customer stops, and capacity.
  const jobs: unknown[] = [];
  for (const c of problem.customers) {
    jobs.push({
      id: c.id,
      location: [c.deliveryNodeId],
      service: 0,
    });
  }
  const vehicles = problem.vehicles.map((v) => ({
    id: v.id,
    profile: 'car',
    start: [v.startDepotId],
    end: [v.endDepotId],
    capacity: [v.capacity],
  }));
  return JSON.stringify({ jobs, vehicles }, null, 2);
}

function runVroomOnInstance(family: Family, instance: string): {
  ok: boolean;
  makespan?: number;
  durationMs?: number;
  error?: string;
} {
  const vroom = checkVroomAvailable();
  if (!vroom) {
    return { ok: false, error: 'vroom not installed — see https://github.com/VROOM-Project/vroom' };
  }
  const instancePath = resolve(familyDir(family), instance);
  const adapter = ADAPTERS[family];
  const parsed = adapter.parse(instancePath);
  const problem = adapter.toProblem(parsed);
  const input = toVroomInput(problem);
  const tmpFile = `/tmp/vroom-${family}-${instance}.json`;
  writeFileSync(tmpFile, input);
  const start = Date.now();
  const result = spawnSync(vroom, ['-i', tmpFile, '-o', '/tmp/vroom-out.json'], {
    encoding: 'utf8',
    timeout: 30_000,
  });
  const durationMs = Date.now() - start;
  if (result.status !== 0) {
    return { ok: false, durationMs, error: `vroom exit ${result.status}: ${result.stderr}` };
  }
  try {
    const out = JSON.parse(require('node:fs').readFileSync('/tmp/vroom-out.json', 'utf8')) as {
      summary?: { duration?: number; cost?: number };
      routes?: Array<{ duration: number }>;
    };
    const makespan = Math.max(0, ...(out.routes ?? []).map((r) => r.duration));
    return { ok: true, makespan, durationMs };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, durationMs, error: `parse error: ${msg}` };
  }
}

function main(): void {
  const vroom = checkVroomAvailable();
  if (!vroom) {
    console.error('vroom binary not found on PATH.');
    console.error('Install: https://github.com/VROOM-Project/vroom');
    console.error('  brew install vroom  (macOS)');
    console.error('  apt install vroom   (Debian/Ubuntu)');
    process.exit(0); // Exit 0; this is opt-in.
  }
  console.log(`Found ${vroom} on PATH.`);
  const out: {
    generated: string;
    vroomVersion: string;
    results: Array<{ family: string; instance: string; ok: boolean; makespan?: number; durationMs?: number; error?: string }>;
  } = {
    generated: new Date().toISOString(),
    vroomVersion: 'unknown',
    results: [],
  };
  for (const { family, instance } of INSTANCES) {
    const result = runVroomOnInstance(family, instance);
    out.results.push({ family, instance, ...result });
    console.log(
      `${result.ok ? 'OK' : 'FAIL'} ${family}/${instance}: ` +
        `makespan=${result.makespan ?? 'n/a'} runtime=${result.durationMs ?? 'n/a'}ms`,
    );
  }
  const outPath = resolve(root, 'benchmarks', 'results', 'vroom-baseline.json');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`Wrote ${outPath}`);
}

main();
