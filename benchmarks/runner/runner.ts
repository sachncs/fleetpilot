// Benchmark runner — runs the solver against a single instance and writes
// a result JSON. Use --help for flags.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { FleetPilotSolver } from '../../src/index.js';
import { ADAPTERS, type Family } from './adapters.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');

interface Args {
  family: Family;
  instance: string;
  output: string;
  maxTimeMs: number;
  alnsIterations: number;
  populationSize: number;
  maxGenerations: number;
  seed: number;
  warmStart: boolean;
}

function parseArgs(argv: string[]): Args {
  const out: Partial<Args> & Record<string, unknown> = {
    family: 'synthetic',
    instance: 'synth-10c-small.json',
    output: '',
    maxTimeMs: 30_000,
    alnsIterations: 500,
    populationSize: 1000,
    maxGenerations: 500,
    seed: 1,
    warmStart: true,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      case '--family':
        out.family = argv[++i] as Family;
        break;
      case '--instance':
        out.instance = String(argv[++i]);
        break;
      case '--output':
        out.output = String(argv[++i]);
        break;
      case '--max-time':
        out.maxTimeMs = Number(argv[++i]);
        break;
      case '--alns-iterations':
        out.alnsIterations = Number(argv[++i]);
        break;
      case '--population-size':
        out.populationSize = Number(argv[++i]);
        break;
      case '--max-generations':
        out.maxGenerations = Number(argv[++i]);
        break;
      case '--seed':
        out.seed = Number(argv[++i]);
        break;
      case '--no-warm-start':
        out.warmStart = false;
        break;
      default:
        console.error(`Unknown flag: ${a}`);
        process.exit(1);
    }
  }
  if (!out.output) {
    out.output = resolve(
      root,
      'benchmarks',
      'results',
      String(out.family),
      `${out.instance}.json`,
    );
  }
  return out as Args;
}

function printHelp(): void {
  console.log(`benchmark runner — runs the solver against a single instance.

Usage: tsx benchmarks/runner/runner.ts --family <family> --instance <file> [options]

Families: lilim, solomon, cordeau, darp, salhi-nagy, synthetic

Options:
  --family <family>             benchmark family (default: synthetic)
  --instance <file>             instance file name within the family directory
  --output <path>               result JSON path (default: benchmarks/results/<family>/<file>.json)
  --max-time <ms>               solver wall-clock cap (default: 30000)
  --alns-iterations <n>         ALNS iterations (default: 500)
  --population-size <n>         BRKGA population size (default: 1000)
  --max-generations <n>         BRKGA max generations (default: 500)
  --seed <n>                    deterministic seed (default: 1)
  --no-warm-start               disable ALNS warm-start
  --help, -h                    show this help
`);
}

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

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const instancePath = resolve(familyDir(args.family), args.instance);
  const adapter = ADAPTERS[args.family];
  const parsed = adapter.parse(instancePath);
  const problem = adapter.toVrpProblem(parsed);
  const solver = new FleetPilotSolver(problem);
  const start = Date.now();
  let solution;
  try {
    solution = await solver.solve({
      maxTimeMs: args.maxTimeMs,
      alnsIterations: args.alnsIterations,
      populationSize: args.populationSize,
      maxGenerations: args.maxGenerations,
      seed: args.seed,
      warmStart: args.warmStart,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const result = {
      family: args.family,
      instance: args.instance,
      ok: false,
      error: msg,
      runtimeMs: Date.now() - start,
      config: {
        maxTimeMs: args.maxTimeMs,
        alnsIterations: args.alnsIterations,
        populationSize: args.populationSize,
        maxGenerations: args.maxGenerations,
        seed: args.seed,
        warmStart: args.warmStart,
      },
    };
    mkdirSync(dirname(args.output), { recursive: true });
    writeFileSync(args.output, JSON.stringify(result, null, 2));
    console.error(`FAIL ${args.family}/${args.instance}: ${msg}`);
    process.exit(1);
  }
  const runtimeMs = Date.now() - start;
  const result = {
    family: args.family,
    instance: args.instance,
    ok: true,
    customers: problem.customers.length,
    vehicles: problem.vehicles.length,
    makespan: solution.makespan,
    totalDistance: solution.totalDistance,
    totalCost: solution.totalCost,
    totalCo2: solution.totalCo2,
    feasible: solution.isFeasible(),
    complete: solution.isComplete(),
    routes: solution.routes.map((r) => ({
      vehicleId: r.vehicleId,
      nodes: r.nodes,
    })),
    runtimeMs,
    config: {
      maxTimeMs: args.maxTimeMs,
      alnsIterations: args.alnsIterations,
      populationSize: args.populationSize,
      maxGenerations: args.maxGenerations,
      seed: args.seed,
      warmStart: args.warmStart,
    },
  };
  mkdirSync(dirname(args.output), { recursive: true });
  writeFileSync(args.output, JSON.stringify(result, null, 2));
  console.log(
    `OK ${args.family}/${args.instance}: makespan=${result.makespan.toFixed(2)} ` +
      `runtime=${runtimeMs}ms feasible=${result.feasible}`,
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
