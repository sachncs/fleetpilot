import { parentPort } from 'node:worker_threads';
import Database from 'better-sqlite3';
import { randomBytes } from 'node:crypto';

const POLL_INTERVAL = 1000;

interface Job {
  id: string;
  problem_id: string;
  solver_options_json: string;
}

interface Problem {
  id: string;
  problem_json: string;
}

function getDb() {
  const dbPath = process.env['DATABASE_URL']?.replace('file:', '') ?? './data/fleetpilot.db';
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

async function run() {
  const db = getDb();

  while (true) {
    const job = db
      .prepare("SELECT * FROM jobs WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1")
      .get() as Job | undefined;

    if (!job) {
      await sleep(POLL_INTERVAL);
      continue;
    }

    db.prepare("UPDATE jobs SET status = 'running', started_at = datetime('now') WHERE id = ?").run(job.id);
    send({ type: 'progress', jobId: job.id, stage: 'ALNS', iteration: 0, maxGenerations: 0, bestMakespan: Infinity, elapsedMs: 0 });

    try {
      const problem = db.prepare('SELECT * FROM problems WHERE id = ?').get(job.problem_id) as Problem | undefined;
      if (!problem) {
        throw new Error(`Problem ${job.problem_id} not found`);
      }

      const { FleetPilotSolver, VrpProblem, LocationNode, Customer, CustomerWithTimeWindows, Vehicle } = await import('fleetpilot');

      const probData = JSON.parse(problem.problem_json) as Record<string, unknown>;
      const nodeList = Array.isArray(probData['nodes'])
        ? (probData['nodes'] as Array<{ id: number; x: number; y: number; name?: string }>)
        : Object.values(probData['nodes'] as Record<string, { id: number; x: number; y: number; name?: string }>);

      const nodes: Record<number, InstanceType<typeof LocationNode>> = {};
      for (const n of nodeList) {
        nodes[n.id] = new LocationNode(n.id, n.x, n.y, n.name ?? '');
      }

      const customers = (probData['customers'] as Array<Record<string, unknown>>).map((c) => {
        if (c['earliestDeliveryTime'] != null && c['latestDeliveryTime'] != null && c['earliestPickupTime'] != null && c['latestPickupTime'] != null) {
          return new CustomerWithTimeWindows(
            c['id'] as number,
            c['deliveryNodeId'] as number,
            c['pickupNodeId'] as number,
            c['processingTime'] as number,
            c['earliestDeliveryTime'] as number,
            c['latestDeliveryTime'] as number,
            c['earliestPickupTime'] as number,
            c['latestPickupTime'] as number,
          );
        }
        return new Customer(c['id'] as number, c['deliveryNodeId'] as number, c['pickupNodeId'] as number, c['processingTime'] as number);
      });

      const vehicles = (probData['vehicles'] as Array<Record<string, unknown>>).map((v) => {
        return new Vehicle(
          v['id'] as number,
          v['capacity'] as number,
          (v['startDepotId'] as number) ?? (probData['depotNodeId'] as number),
          (v['endDepotId'] as number) ?? (probData['depotNodeId'] as number),
          (v['costPerKm'] as number) ?? 1,
          (v['co2PerKm'] as number) ?? 1,
        );
      });

      const vrpProblem = new VrpProblem(nodes, customers, vehicles, probData['depotNodeId'] as number);
      const opts = JSON.parse(job.solver_options_json) as Record<string, unknown>;

      const startTime = Date.now();
      const solver = new FleetPilotSolver(vrpProblem);
      const solution = await solver.solve({
        alnsIterations: opts['alnsIterations'] as number,
        populationSize: opts['populationSize'] as number,
        maxGenerations: opts['maxGenerations'] as number,
        maxTimeMs: opts['maxTimeMs'] as number,
        seed: opts['seed'] as number,
        warmStart: opts['warmStart'] as boolean,
        onProgress: (p) => {
          send({
            type: 'progress',
            jobId: job.id,
            stage: p.stage,
            iteration: p.iteration,
            maxGenerations: p.maxGenerations,
            bestMakespan: p.bestMakespan,
            elapsedMs: p.elapsedMs,
          });
        },
      });

      const solutionId = `sol_${randomBytes(16).toString('hex')}`;
      const solutionJson = JSON.stringify({
        makespan: solution.makespan,
        totalDistance: solution.totalDistance,
        totalCost: solution.totalCost,
        totalCo2: solution.totalCo2,
        feasible: solution.isFeasible(),
        routes: solution.routes.map((r) => ({ vehicleId: r.vehicleId, nodes: r.nodes })),
        nodeTimes: solution.nodeTimes,
      });

      db.prepare(
        `INSERT INTO solutions (id, problem_id, solution_json, makespan, total_distance, total_cost, total_co2, feasible, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      ).run(
        solutionId,
        job.problem_id,
        solutionJson,
        Math.round(solution.makespan),
        Math.round(solution.totalDistance * 100),
        Math.round(solution.totalCost * 100),
        Math.round(solution.totalCo2 * 100),
        solution.isFeasible() ? 1 : 0,
      );

      db.prepare(
        "UPDATE jobs SET status = 'completed', solution_id = ?, completed_at = datetime('now') WHERE id = ?",
      ).run(solutionId, job.id);

      send({
        type: 'solution',
        jobId: job.id,
        solutionJson,
        makespan: solution.makespan,
        totalDistance: solution.totalDistance,
        totalCost: solution.totalCost,
        totalCo2: solution.totalCo2,
        feasible: solution.isFeasible(),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      db.prepare("UPDATE jobs SET status = 'failed', error = ?, completed_at = datetime('now') WHERE id = ?").run(msg, job.id);
      send({ type: 'error', jobId: job.id, error: msg });
    }
  }
}

function send(msg: unknown): void {
  parentPort?.postMessage(msg);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

void run();
