import Database from 'better-sqlite3';
import { randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { config } from '../config';
import { ensureSchema } from '../db/migrate';
import { writeAudit } from '../audit';

const POLL_INTERVAL = 1000;
const MAX_CONCURRENT_SOLVES = Math.max(1, Number(process.env['MAX_CONCURRENT_SOLVES'] ?? 1));

interface Job {
  id: string;
  problem_id: string;
  solver_options_json: string;
}

interface Problem {
  id: string;
  problem_json: string;
}

const activeJobs = new Map<string, AbortController>();

function getDb() {
  mkdirSync(config.databaseUrl.replace(/\/[^/]+$/, ''), { recursive: true });
  const db = new Database(config.databaseUrl);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

let wakeup: () => void = () => {};

process.on('message', (msg: unknown) => {
  if (!msg || typeof msg !== 'object') return;
  const m = msg as { type?: string; jobId?: string };
  if (m.type === 'cancel' && m.jobId) {
    const controller = activeJobs.get(m.jobId);
    controller?.abort();
  } else if (m.type === 'enqueue') {
    wakeup();
  }
});

async function waitForWakeup(): Promise<void> {
  return new Promise<void>((resolve) => {
    wakeup = () => {
      wakeup = () => {};
      resolve();
    };
  });
}

async function run() {
  await ensureSchema();
  const db = getDb();
  const runners = new Set<Promise<void>>();

  while (true) {
    while (activeJobs.size < MAX_CONCURRENT_SOLVES) {
      const job = db
        .prepare("SELECT * FROM jobs WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1")
        .get() as Job | undefined;
      if (!job) break;
      db.prepare("UPDATE jobs SET status = 'running', started_at = datetime('now') WHERE id = ?").run(job.id);
      const p = processJob(job).finally(() => runners.delete(p));
      runners.add(p);
    }

    if (runners.size >= MAX_CONCURRENT_SOLVES) {
      await Promise.race([...runners].map((p) => p.catch(() => undefined)));
    } else if (runners.size > 0) {
      await Promise.race([...runners].map((p) => p.catch(() => undefined)));
    } else {
      await Promise.race([sleep(POLL_INTERVAL), waitForWakeup()]);
    }
  }
}

async function processJob(job: Job): Promise<void> {
  const controller = new AbortController();
  activeJobs.set(job.id, controller);

  const db = getDb();
  send({ type: 'progress', jobId: job.id, stage: 'ALNS', iteration: 0, maxGenerations: 0, bestMakespan: Infinity, elapsedMs: 0 });

  try {
    const problem = db.prepare('SELECT * FROM problems WHERE id = ?').get(job.problem_id) as Problem | undefined;
    if (!problem) {
      throw new Error(`Problem ${job.problem_id} not found`);
    }

    const { FleetPilotSolver, Problem, LocationNode, Customer, CustomerWithTimeWindows, Vehicle } = await import('../../../src/index.js');

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

    const solverProblem = new Problem(nodes, customers, vehicles, probData['depotNodeId'] as number);
    const opts = JSON.parse(job.solver_options_json) as Record<string, unknown>;

    const solver = new FleetPilotSolver(solverProblem);
    const solution = await solver.solve({
      alnsIterations: opts['alnsIterations'] as number,
      populationSize: opts['populationSize'] as number,
      maxGenerations: opts['maxGenerations'] as number,
      maxTimeMs: opts['maxTimeMs'] as number,
      seed: opts['seed'] as number,
      warmStart: opts['warmStart'] as boolean,
      signal: controller.signal,
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

    writeAudit({
      entity: 'job',
      entityId: job.id,
      action: 'completed',
      actor: 'worker',
      payload: { problemId: job.problem_id, solutionId, feasible: solution.isFeasible() },
    });

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
    send({ type: 'completed', jobId: job.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (controller.signal.aborted) {
      db.prepare("UPDATE jobs SET status = 'cancelled', completed_at = datetime('now') WHERE id = ?").run(job.id);
      writeAudit({ entity: 'job', entityId: job.id, action: 'cancelled', actor: 'worker', payload: {} });
      send({ type: 'error', jobId: job.id, error: 'cancelled' });
      send({ type: 'cancelled', jobId: job.id });
    } else {
      db.prepare("UPDATE jobs SET status = 'failed', error = ?, completed_at = datetime('now') WHERE id = ?").run(msg, job.id);
      writeAudit({ entity: 'job', entityId: job.id, action: 'failed', actor: 'worker', payload: { error: msg } });
      send({ type: 'error', jobId: job.id, error: msg });
      send({ type: 'failed', jobId: job.id });
    }
  } finally {
    activeJobs.delete(job.id);
  }
}

function send(msg: unknown): void {
  process.send?.(msg);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

void run();
