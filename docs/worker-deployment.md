# Worker Deployment Guide

This package uses `worker_threads` (Node) / Web Workers (browser) for two
distinct parallel features:

1. **Island-model BRKGA** — multiple independent populations evolve in
   parallel; each island is a worker. Used when `solve({ islands: 2+ })`.
2. **Parallel ALNS + BRKGA** — ALNS runs in one worker, BRKGA in another;
   the orchestrator takes the best. Used when `solve({ parallel: true })`.

This guide covers the operational concerns of running the worker bundle in
production.

## 1. Thread-pool sizing

Node multiplexes all `worker_threads` onto a single thread pool whose size is
governed by `UV_THREADPOOL_SIZE`. The default is `4`. The Node thread pool is
shared with `libuv` I/O, so a busy production server may need to be tuned.

```bash
# 8-thread pool (6 workers + 2 buffer for I/O)
UV_THREADPOOL_SIZE=8 node your-solver.js
```

**Rule of thumb:** `UV_THREADPOOL_SIZE` should be **at least**
`islands + max(0, parallel ? 1 : 0) + 2`. The "+2" buffer is for libuv
file/network I/O.

Setting `UV_THREADPOOL_SIZE` higher than the number of physical cores
provides no benefit and may slow things down due to context switching.

## 2. Container memory ceiling

The default Node heap is `~1.5 GB`. The paper-default config
(`populationSize: 30000`, `maxGenerations: 20000`) holds comfortably in 512 MB
of RSS, but the BRKGA decoder allocates per-generation arrays. In containers:

- **Production default**: `--max-old-space-size=512` (512 MB V8 heap).
- **Paper-quality**: `--max-old-space-size=2048` (2 GB).
- **Stress-test**: `--max-old-space-size=4096` (4 GB).

Set the container memory limit at least **2× the V8 heap limit** to leave
room for native allocations and the worker thread stacks.

```dockerfile
# Minimal Dockerfile pattern
FROM node:20-alpine
ENV NODE_OPTIONS="--max-old-space-size=512"
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
import { VrpRpdSolver, AbortError } from 'vehicle-routing';

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

Override the path with the `VRP_WORKER_PATH` environment variable:

```bash
VRP_WORKER_PATH=/abs/path/to/dist/worker.js node your-solver.js
```

For browser bundlers, the browser worker at `dist/worker.browser.js` is
selected via the `worker` export condition:

```js
import workerUrl from 'vehicle-routing/worker';
```

Vite and Webpack both honour this; Rollup users should add the `worker`
condition to their config.

## 5. Alpine / musl quirks

The default `Dockerfile` uses `node:20-alpine` (musl libc). Two known
caveats:

1. **io_uring**: Node 20 on musl may use io_uring for file I/O, which has
   historically had floating-point edge cases. If you see NaN distances in
   logs, set `UV_USE_IO_URING=0` before launching.
2. **`BCMath` polyfills**: not needed — the solver uses native `Math` only,
   but downstream consumers linking against it should be aware.

If you hit any other musl issue, switch to `node:20-slim` (glibc) and
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
- Emitting Prometheus metrics: `vrp_solver_iterations_total`,
  `vrp_solver_best_makespan`, `vrp_solver_elapsed_seconds`.
- Sampling progress (every N iterations) to avoid log volume.

## 8. Anti-patterns

- **Don't share `VrpRpdSolver` instances across requests.** Each instance
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
  const { VrpRpdSolver, VrpProblem, LocationNode, Customer, Vehicle } = require('vehicle-routing');
  const nodes = { 0: new LocationNode(0,0,0,'D'), 1: new LocationNode(1,10,0,'D1'), 2: new LocationNode(2,20,0,'P1') };
  const problem = new VrpProblem(nodes, [new Customer(1,1,2,5)], [new Vehicle(1,10)]);
  new VrpRpdSolver(problem).solve({ parallel: true, maxTimeMs: 5000 })
    .then(s => console.log('OK', s.makespan))
    .catch(e => { console.error('FAIL', e); process.exit(1); });
"
```

If the above prints `OK <number>`, the worker bundle is correctly resolved
and the parallel path is healthy.
