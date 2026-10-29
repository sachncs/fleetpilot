# Worker Deployment Guide

This package uses `worker_threads` (Node) / Web Workers (browser) for two
distinct parallel features:

1. **Island-model BRKGA** — multiple independent populations evolve in
   parallel; each island is a worker. Used when `solve({ islands: 2+ })`.
2. **Parallel ALNS + BRKGA** — ALNS runs in one worker, BRKGA in another;
   the orchestrator takes the best. Used when `solve({ parallel: true })`.

This guide covers the operational concerns of running the worker bundle in
production.

## 1. Worker sizing

Each `worker_threads` worker runs on its own operating-system thread;
`UV_THREADPOOL_SIZE` does not control their count. Reserve one core for the
main process and I/O, then keep the combined island and parallel-worker count
within the remaining physical cores. Oversubscription increases context
switching and can reduce solver throughput.

The libuv thread-pool setting only affects native asynchronous work such as
some filesystem, DNS, compression, and cryptography operations. Tune it only
when profiling shows those operations are a bottleneck.

## 2. Container memory ceiling

The default Node heap is `~1.5 GB`. The paper-default config
(`populationSize: 30000`, `maxGenerations: 20000`) allocates per-generation
arrays and should be measured against representative problem sizes. In containers:

- **Repository image default**: `--max-old-space-size=1024` (1 GB V8 heap).
- **Paper-quality**: `--max-old-space-size=2048` (2 GB).
- **Stress-test**: `--max-old-space-size=4096` (4 GB).

Set the container memory limit at least **2× the V8 heap limit** to leave
room for native allocations and the worker thread stacks.

```dockerfile
# Minimal Dockerfile pattern
FROM node:26-alpine
ENV NODE_OPTIONS="--max-old-space-size=1024"
CMD ["node", "your-solver.js"]
```

## 3. `AbortSignal` propagation

`SolveOptions.signal` is checked on every ALNS iteration and at the start of
every BRKGA generation. When the signal triggers, the worker throws
`AbortError` and the orchestrator terminates the worker via
`worker.terminate()`.

If you fire the signal from a request handler (e.g. on `req.aborted`), the
worker pool will leak if you don't also call `AbortController#abort()`. The
bundle exports `AbortError` for explicit handling:

```typescript
import { FleetPilotSolver, AbortError } from 'fleetpilot';

try {
  const solution = await solver.solve({ signal: controller.signal });
} catch (err) {
  if (err instanceof AbortError) {
    // Client disconnected; nothing to do.
  } else {
    throw err;
  }
}
```

## 4. Worker bundle path

The orchestrator locates the worker bundle via `import.meta.url` (Node) or
relative URL (browser). When the package is bundled into a single file
(e.g. via `esbuild --bundle`), the worker path resolution may break.

Override the path with the `FLEETPILOT_WORKER_PATH` environment variable:

```bash
FLEETPILOT_WORKER_PATH=/abs/path/to/dist/worker.js node your-solver.js
```

For browser bundlers, the browser worker at `dist/worker.browser.js` is
selected via the `worker` export condition:

```js
import workerUrl from 'fleetpilot/worker';
```

Vite and Webpack both honour this; Rollup users should add the `worker`
condition to their config.

## 5. Alpine / musl quirks

The default `Dockerfile` uses `node:26-alpine` (musl libc). Two known
caveats:

1. **io_uring**: Node 26 on musl may use io_uring for file I/O, which has
   historically had floating-point edge cases. If you see NaN distances in
   logs, set `UV_USE_IO_URING=0` before launching.
2. **`BCMath` polyfills**: not needed — the solver uses native `Math` only,
   but downstream consumers linking against it should be aware.

If you hit any other musl issue, switch to `node:26-slim` (glibc) and
double-check that the change is documented in the resulting image rebuild.

## 6. Graceful shutdown

Workers do not handle `SIGTERM` directly. The orchestrator handles `SIGINT`
locally; remote `SIGTERM` requires explicit wiring:

```typescript
const controller = new AbortController();
process.on('SIGTERM', () => controller.abort());

await solver.solve({ signal: controller.signal });
```

This causes the in-flight worker to throw `AbortError` and exit cleanly.
Workers that fail to terminate within 5 seconds are `worker.terminate()`-ed
forcibly.

## 7. Observability

The `onProgress` callback receives `SolverProgress` events with `stage`
(`'ALNS' | 'BRKGA' | 'parallel'`), `iteration`, `maxGenerations`,
`bestMakespan`, and `elapsedMs`. For production, consider:

- Logging `stage`, `iteration`, `bestMakespan` to a structured logger.
- Emitting Prometheus metrics: `fleetpilot_solver_iterations_total`,
  `fleetpilot_solver_best_makespan`, `fleetpilot_solver_elapsed_seconds`.
- Sampling progress (every N iterations) to avoid log volume.

## 8. Anti-patterns

- **Don't share `FleetPilotSolver` instances across requests.** Each instance
  owns a worker pool that is sized for that solve; sharing would deadlock.
- **Don't set `parallel: true` and `islands: 2+` together.** The semantics
  overlap (parallel-mode already forks ALNS+BRKGA); the doubling buys nothing
  and may trigger OOM.
- **Don't disable `warmStart` in production.** The ALNS-warmed BRKGA
  converges 2–3× faster on the smoke instances; see `docs/benchmarks.md`.

## 9. Quick-check

```bash
# Confirms the worker bundle exists and a parallel solve returns.
node -e "
  const { FleetPilotSolver, Problem, LocationNode, Customer, Vehicle } = require('fleetpilot');
  const nodes = { 0: new LocationNode(0,0,0,'D'), 1: new LocationNode(1,10,0,'D1'), 2: new LocationNode(2,20,0,'P1') };
  const problem = new Problem(nodes, [new Customer(1,1,2,5)], [new Vehicle(1,10)]);
  new FleetPilotSolver(problem).solve({ parallel: true, maxTimeMs: 5000 })
    .then(s => console.log('OK', s.makespan))
    .catch(e => { console.error('FAIL', e); process.exit(1); });
"
```

If the above prints `OK <number>`, the worker bundle is correctly resolved
and the parallel path is healthy.
