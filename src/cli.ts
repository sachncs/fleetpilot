import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

import {
  Problem,
  LocationNode,
  Customer,
  CustomerWithTimeWindows,
  Vehicle,
  MultiDepotProblem,
  Depot,
  FleetPilotSolver,
  ValidationError,
} from './index.js';

const here = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(here, '..', 'package.json'), 'utf8')) as {
  version: string;
};
const VERSION: string = pkg.version;

function parseNodesAndCustomers(data: Record<string, unknown>): {
  nodes: Record<number, LocationNode>;
  customers: Customer[];
} {
  if (!('nodes' in data) || !Array.isArray(data['nodes'])) {
    throw new ValidationError('Problem must have a "nodes" array');
  }
  if (!('customers' in data) || !Array.isArray(data['customers'])) {
    throw new ValidationError('Problem must have a "customers" array');
  }
  const nodesRaw: unknown[] = data['nodes'];
  const customersRaw: unknown[] = data['customers'];
  if (nodesRaw.length === 0) throw new ValidationError('Problem must have at least one node');
  if (customersRaw.length === 0) {
    throw new ValidationError('Problem must have at least one customer');
  }

  const nodes: Record<number, LocationNode> = {};
  for (const nodeRaw of nodesRaw) {
    if (typeof nodeRaw !== 'object' || nodeRaw === null) {
      throw new ValidationError(`Node must be an object: ${JSON.stringify(nodeRaw)}`);
    }
    if (!('id' in nodeRaw) || typeof nodeRaw.id !== 'number') {
      throw new ValidationError(`Node missing numeric id: ${JSON.stringify(nodeRaw)}`);
    }
    if (!('x' in nodeRaw) || typeof nodeRaw.x !== 'number') {
      throw new ValidationError(`Node ${nodeRaw.id} missing numeric x coordinate`);
    }
    if (!('y' in nodeRaw) || typeof nodeRaw.y !== 'number') {
      throw new ValidationError(`Node ${nodeRaw.id} missing numeric y coordinate`);
    }
    const name = 'name' in nodeRaw && typeof nodeRaw.name === 'string' ? nodeRaw.name : undefined;
    nodes[nodeRaw.id] = new LocationNode(nodeRaw.id, nodeRaw.x, nodeRaw.y, name);
  }

  const customers: Customer[] = customersRaw.map((c) => {
    if (typeof c !== 'object' || c === null) {
      throw new ValidationError(`Customer must be an object: ${JSON.stringify(c)}`);
    }
    if (!('id' in c) || typeof c.id !== 'number') {
      throw new ValidationError(`Customer missing numeric id: ${JSON.stringify(c)}`);
    }
    if (!('deliveryNodeId' in c) || typeof c.deliveryNodeId !== 'number') {
      throw new ValidationError(`Customer ${c.id} missing numeric deliveryNodeId`);
    }
    if (!('pickupNodeId' in c) || typeof c.pickupNodeId !== 'number') {
      throw new ValidationError(`Customer ${c.id} missing numeric pickupNodeId`);
    }
    if (!('processingTime' in c) || typeof c.processingTime !== 'number') {
      throw new ValidationError(`Customer ${c.id} missing numeric processingTime`);
    }
    if (
      'earliestDeliveryTime' in c &&
      typeof c.earliestDeliveryTime === 'number' &&
      'latestDeliveryTime' in c &&
      typeof c.latestDeliveryTime === 'number' &&
      'earliestPickupTime' in c &&
      typeof c.earliestPickupTime === 'number' &&
      'latestPickupTime' in c &&
      typeof c.latestPickupTime === 'number'
    ) {
      return new CustomerWithTimeWindows(
        c.id,
        c.deliveryNodeId,
        c.pickupNodeId,
        c.processingTime,
        c.earliestDeliveryTime,
        c.latestDeliveryTime,
        c.earliestPickupTime,
        c.latestPickupTime,
      );
    }
    return new Customer(c.id, c.deliveryNodeId, c.pickupNodeId, c.processingTime);
  });
  return { nodes, customers };
}

function parseVehicles(data: Record<string, unknown>, fallbackDepot: number): Vehicle[] {
  if (!('vehicles' in data) || !Array.isArray(data['vehicles'])) {
    throw new ValidationError('Problem must have a "vehicles" array');
  }
  const vehiclesRaw: unknown[] = data['vehicles'];
  if (vehiclesRaw.length === 0) {
    throw new ValidationError('Problem must have at least one vehicle');
  }
  return vehiclesRaw.map((v) => {
    if (typeof v !== 'object' || v === null) {
      throw new ValidationError(`Vehicle must be an object: ${JSON.stringify(v)}`);
    }
    if (!('id' in v) || typeof v.id !== 'number') {
      throw new ValidationError(`Vehicle missing numeric id: ${JSON.stringify(v)}`);
    }
    if (!('capacity' in v) || typeof v.capacity !== 'number') {
      throw new ValidationError(`Vehicle ${v.id} missing numeric capacity`);
    }
    const startDepotId =
      'startDepotId' in v && typeof v.startDepotId === 'number' ? v.startDepotId : fallbackDepot;
    const endDepotId =
      'endDepotId' in v && typeof v.endDepotId === 'number' ? v.endDepotId : fallbackDepot;
    const costPerKm = 'costPerKm' in v && typeof v.costPerKm === 'number' ? v.costPerKm : 1;
    const co2PerKm = 'co2PerKm' in v && typeof v.co2PerKm === 'number' ? v.co2PerKm : 1;
    return new Vehicle(v.id, v.capacity, startDepotId, endDepotId, costPerKm, co2PerKm);
  });
}

function parseBaseProblem(data: unknown): Problem {
  if (typeof data !== 'object' || data === null) {
    throw new ValidationError('Problem must be a JSON object');
  }
  const record = data as Record<string, unknown>;
  const { nodes, customers } = parseNodesAndCustomers(record);
  const depotNodeId =
    'depotNodeId' in record && typeof record['depotNodeId'] === 'number'
      ? record['depotNodeId']
      : 0;
  const vehicles = parseVehicles(record, depotNodeId);
  return new Problem(nodes, customers, vehicles, depotNodeId);
}

function parseMultiDepotProblem(data: unknown): MultiDepotProblem {
  if (typeof data !== 'object' || data === null) {
    throw new ValidationError('Problem must be a JSON object');
  }
  const record = data as Record<string, unknown>;
  if (!('depots' in record) || !Array.isArray(record['depots'])) {
    throw new ValidationError('Multi-depot problem must have a "depots" array');
  }
  const depotsRaw: unknown[] = record['depots'];
  const depots: Depot[] = depotsRaw.map((d) => {
    if (typeof d !== 'object' || d === null) {
      throw new ValidationError(`Depot must be an object: ${JSON.stringify(d)}`);
    }
    if (!('id' in d) || typeof d.id !== 'number') {
      throw new ValidationError(`Depot missing numeric id: ${JSON.stringify(d)}`);
    }
    if (!('x' in d) || typeof d.x !== 'number') {
      throw new ValidationError(`Depot ${d.id} missing numeric x coordinate`);
    }
    if (!('y' in d) || typeof d.y !== 'number') {
      throw new ValidationError(`Depot ${d.id} missing numeric y coordinate`);
    }
    const name = 'name' in d && typeof d.name === 'string' ? d.name : undefined;
    return new Depot(d.id, d.x, d.y, name);
  });

  const { nodes, customers } = parseNodesAndCustomers(record);
  const depotNodeId =
    'depotNodeId' in record && typeof record['depotNodeId'] === 'number'
      ? record['depotNodeId']
      : (depots[0]?.id ?? 0);
  const vehicles = parseVehicles(record, depotNodeId);

  const vehicleDepotAssignments: Map<number, number> = new Map();
  if ('vehicleDepotAssignments' in record && record['vehicleDepotAssignments'] !== null) {
    const raw = record['vehicleDepotAssignments'];
    if (typeof raw !== 'object') {
      throw new ValidationError('vehicleDepotAssignments must be an object');
    }
    for (const [k, v] of Object.entries(raw as Record<string, number>)) {
      vehicleDepotAssignments.set(Number(k), v);
    }
  }

  return new MultiDepotProblem(nodes, customers, vehicles, depots, vehicleDepotAssignments);
}

function isMultiDepotShape(data: unknown): boolean {
  if (typeof data !== 'object' || data === null) return false;
  const record = data as Record<string, unknown>;
  return 'depots' in record && Array.isArray(record['depots']);
}

function parseProblem(
  data: unknown,
  kind: 'base' | 'multi-depot' | 'auto',
): Problem | MultiDepotProblem {
  if (kind === 'auto') {
    return isMultiDepotShape(data) ? parseMultiDepotProblem(data) : parseBaseProblem(data);
  }
  if (kind === 'multi-depot') return parseMultiDepotProblem(data);
  return parseBaseProblem(data);
}

function usage(): void {
  console.log(`fleetpilot v${VERSION} — Route optimization for delivery fleets

Usage: fleetpilot [options]

Required:
  --problem <file>          Path to problem JSON file

Output:
  --output <file>           Write solution JSON (default: stdout)

Algorithm:
  --alns-iterations <n>     ALNS iterations (default: 500)
  --population-size <n>     BRKGA population size (default: 30000)
  --max-generations <n>     BRKGA max generations (default: 20000)
  --max-time <ms>           Max solver time, 0 = unlimited (default: 0)
  --target-makespan <n>     Early stopping target (default: 0)
  --parallel                Run ALNS and BRKGA in parallel
  --no-warm-start           Disable ALNS warm-start for BRKGA
  --seed <n>                Deterministic seed for ALNS and BRKGA
  --problem-kind <kind>     base | multi-depot | auto (default: auto)

Info:
  --progress                Print progress to stderr
  --version                 Print version
  --help                    Show this help message

Examples:
  fleetpilot --problem problem.json --output solution.json
  fleetpilot --problem problem.json --max-time 30000 --progress
  fleetpilot --problem samples/mumbai-20.json --seed 42
`);
}

function parseNumericArg(value: string | boolean | undefined, flag: string): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new ValidationError(`--${flag} must be a finite number, got: ${String(value)}`);
  }
  return parsed;
}

function parseArgs(): Record<string, string | boolean> {
  const args: Record<string, string | boolean> = {};
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (!arg) continue;
    if (arg === '--help' || arg === '-h') {
      args['help'] = true;
    } else if (arg === '--version' || arg === '-v') {
      args['version'] = true;
    } else if (arg === '--progress') {
      args['progress'] = true;
    } else if (arg === '--parallel') {
      args['parallel'] = true;
    } else if (arg === '--no-warm-start') {
      args['warmStart'] = false;
    } else if (arg.startsWith('--')) {
      const key = arg.slice(2).replace(/-/g, '');
      const next = process.argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

async function main(): Promise<void> {
  const args = parseArgs();

  if (args['help']) {
    usage();
    process.exit(0);
  }

  if (args['version']) {
    console.log(VERSION);
    process.exit(0);
  }

  const problemArg = args['problem'];
  if (!problemArg || typeof problemArg !== 'string') {
    console.error('Error: --problem <file> is required');
    console.error('Run fleetpilot --help for usage information');
    process.exit(1);
  }

  const problemPath: string = problemArg;
  if (!existsSync(problemPath)) {
    console.error(`Error: File not found: ${problemPath}`);
    process.exit(1);
  }

  let problem: Problem | MultiDepotProblem;
  try {
    const raw = readFileSync(problemPath, 'utf-8');
    const kind = args['problemkind'] ?? 'auto';
    if (kind !== 'base' && kind !== 'multi-depot' && kind !== 'auto') {
      throw new ValidationError(
        `--problem-kind must be one of base, multi-depot, auto (got: ${String(kind)})`,
      );
    }
    problem = parseProblem(JSON.parse(raw), kind);
  } catch (err: unknown) {
    if (err instanceof SyntaxError) {
      console.error(`Error: Invalid JSON in ${problemPath}: ${err.message}`);
    } else if (err instanceof ValidationError) {
      console.error(`Error: Invalid problem: ${err.message}`);
    } else {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`Error: Could not read ${problemPath}: ${errorMsg}`);
    }
    process.exit(1);
  }

  console.error(
    `Problem: ${problem.customers.length} customers, ${problem.vehicles.length} vehicles`,
  );
  console.error('Starting solver...');

  const solverProblem = problem instanceof MultiDepotProblem ? problem.toProblem() : problem;
  const solver = new FleetPilotSolver(solverProblem);

  const options: Parameters<typeof solver.solve>[0] = {
    alnsIterations: parseNumericArg(args['alnsiterations'], 'alns-iterations'),
    populationSize: parseNumericArg(args['populationsize'], 'population-size'),
    maxGenerations: parseNumericArg(args['maxgenerations'], 'max-generations'),
    maxTimeMs: parseNumericArg(args['maxtime'], 'max-time'),
    targetMakespan: parseNumericArg(args['targetmakespan'], 'target-makespan'),
    parallel: args['parallel'] === true,
    warmStart: args['warmstart'] !== false,
    seed: parseNumericArg(args['seed'], 'seed'),
    onProgress:
      args['progress'] === true
        ? (progress) => {
            const pct = ((progress.iteration / progress.maxGenerations) * 100).toFixed(1);
            console.error(
              `[${progress.stage}] Gen ${progress.iteration}/${progress.maxGenerations} ` +
                `(${pct}%) best=${progress.bestMakespan.toFixed(2)} elapsed=${progress.elapsedMs}ms`,
            );
          }
        : undefined,
  };

  const startTime = Date.now();
  let solution;
  try {
    solution = await solver.solve(options);
  } catch (err: unknown) {
    console.error(`Solver error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
  const elapsed = Date.now() - startTime;

  console.error(`Solved in ${(elapsed / 1000).toFixed(1)}s`);
  console.error(`Makespan: ${solution.makespan.toFixed(2)}, Feasible: ${solution.isFeasible()}`);

  const output = {
    makespan: solution.makespan,
    totalDistance: solution.totalDistance,
    totalCost: solution.totalCost,
    totalCo2: solution.totalCo2,
    feasible: solution.isFeasible(),
    routes: solution.routes.map((r) => ({
      vehicleId: r.vehicleId,
      nodes: r.nodes,
    })),
    nodeTimes: solution.nodeTimes,
    elapsedMs: elapsed,
  };

  const json = JSON.stringify(output, null, 2);

  if (args['output'] && typeof args['output'] === 'string') {
    writeFileSync(args['output'], json);
    console.error(`Solution written to ${args['output']}`);
  } else {
    console.log(json);
  }
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error('Fatal error:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
