# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-08-10

### Added

- **Browser-side worker** - `src/worker-browser.ts` (Web Worker entry), `src/worker-spawn.ts` `CrossWorker` / `BrowserWorkerHandle`, `src/worker-path.ts` browser branch, `rollup.config.mjs` browser bundle → `dist/worker.browser.js` with `worker_threads` / `path` / `url` shims.
- **Runtime env detection** - `src/env.ts` `isNode()` / `isBrowser()`.
- **Ready-handshake protocol** - Workers post `{type:'ready'}` before parents send the problem; unified across Node worker, browser worker, and BRKGA island workers.
- **`AbortError`** - New typed error (extends `VrpError`); `ALNSOptions.signal`, `BRKGAOptions.signal`, `SolveOptions.signal`; aborted runs throw `AbortError` verbatim (no longer wrapped in `AlgorithmConvergenceError`). Re-exported from both `src/errors/index.ts` and `src/index.ts`.
- **Deterministic RNG** - `src/utils/rng.ts` (mulberry32 + `RandomSource`); `seed?` and `random?` on ALNS and BRKGA options; `SolveOptions.seed` plumbed through both algorithms and the parallel workers. Default seed=1 makes verify-gate stable.
- **`MultiDepotProblem.toVrpProblem(depotNodeId?)`** - Downcast helper so the orchestrator can solve multi-depot inputs natively.
- **CLI enhancements** - `--version` reads package.json at runtime; `--seed <n>`; `--problem-kind <base|multi-depot|auto>`; numeric args reject non-finite values cleanly; multi-depot auto-dispatch via `toVrpProblem()`.
- **`/worker` subpath export** - With `worker` and `node` conditions so bundlers pick the right entry per platform.
- **Sample problem** - `samples/mumbai-20.json` (real Mumbai coordinates).
- **CI** - SBOM artifact job; `verify` job includes `format:check`.
- **Toolchain** - Prettier 3.9.6 + `eslint-config-prettier`; new `npm run format` / `format:check` / `sbom` / `audit` scripts.

### Changed

- `ALNS` and `BRKGA` no longer call `Math.random()` directly; all random sources go through `this.random()` (seeded by default).
- `SolverProgress.maxIterations` renamed to `maxGenerations` to match `ALNSProgress` / `BRKGAProgress`.
- `worker_threads` is now lazy-imported inside `BRKGA.solveIslands()` so the static graph stays browser-safe.
- `MultiDepotProblem.toVrpProblem()` is the dispatch target used by the CLI when `--problem-kind auto` detects a `depots` array.
- **Engines** `node >= 18` → `node >= 20`.
- **TypeScript** `5.7+` → `7.0.2` via `typescript-7` alias; added `noUncheckedSideEffectImports`.

### Deprecated

- None.

### Removed

- None.

### Fixed

- **Island-BRKGA warm-start was silently dropped** due to a `warmStartolution` typo on the worker payload (`src/algorithms/brkga/brkga.ts`). Renamed to `warmStartSolution` and extracted `buildIslandWorkerData()` so the wire shape is testable.
- **`TransferAwareRemovalOperators.randomWithTransfers`** correlated transfers to customers by `hubNodeId === deliveryNodeId || hubNodeId === pickupNodeId`, which never matches because hub node IDs are separate. Now correlates via an optional `customerIds: readonly number[]` field on `ResourceTransfer`, threaded through `SolutionWithTransfers.scheduleTransfer` / `canScheduleTransfer`. Transfers recorded without `customerIds` are preserved for backwards compatibility.
- Aborted solves now throw `AbortError` (was wrapped in `AlgorithmConvergenceError`).
- Empty `export /** */` JSDoc stubs in `src/algorithms/alns/operators.ts` (REMOVAL_OPERATOR_KEYS / INSERTION_OPERATOR_KEYS) replaced with real descriptions.

## [1.1.0] - 2026-08-10

### Added

- **Island-model BRKGA** - Multi-population parallel evolution via `worker_threads` with `IslandMessenger` for elite migration between islands
- **CLI** - Command-line solver with JSON input/output (`vrp-solver`)
- **Solution serialization** - `serialize()` and `deserialize()` on `VrpSolution`
- **Solver capabilities** - `maxTimeMs`, `targetMakespan`, progress callbacks
- **Benchmark tests** - Performance and scalability validation
- **Decoder optimization** - O(n)→O(1) capacity checks with incremental `RouteLoad` tracking, precomputed vehicle assignments, single-pass pickup scheduling
- **ALNS improvements** - Adaptive removal sizing (10%→45% fraction based on stagnation), multi-restart (up to 3 restarts with temperature reset), clone avoidance
- **BRKGA improvements** - Elite diversity preservation (mild mutation on elite copies), adaptive mutation rate (up to +5% extra mutants when stagnant), periodic immigrant injection (20% population replacement), hall-of-fame tracking
- **Multi-objective optimization** - Pareto front support for makespan, distance, cost, CO₂
- **Time Windows (VRPTW)** - Earliest/latest delivery and pickup constraints via `CustomerWithTimeWindows`
- **Multi-depot problem** - Vehicles start/end at different depots via `MultiDepotProblem` + `Depot`
- **Traffic-aware routing** - Time-dependent travel speeds via `TrafficAwareProblem` + `TrafficModel`
- **Inter-vehicle resource transfer** - Hub-based exchanges via `TransferHub`, `TransferManager`, `VehicleWithCapabilities`
- **Route analytics** - Vehicle utilization, wait times, load profiles via `RouteAnalytics`
- **Solution comparison** - Pareto-ranking with dominance frontier via `SolutionComparator`
- **GIS export** - GeoJSON, KML, CSV output via `GISExporter`
- **Transfer-aware ALNS operators** - Dedicated destroy/repair for transfer operations
- **Typed errors** - `VrpError`, `ValidationError`, `InfeasibleSolutionError`, `AlgorithmConvergenceError`
- **Logger interface** - Pluggable logging via `Logger` interface with `defaultLogger`
- **CI/CD pipeline** - GitHub Actions with lint/typecheck/test/build/publish workflows
- **Verification tests** - 5 algorithm correctness tests + 2 decoder benchmark tests (212 total)

### Changed

- **Test framework** - Migrated from Jest to Mocha + Chai + tsx for module-native ESM support
- **ESLint** - Migrated to flat config (`eslint.config.mjs`) with `@typescript-eslint` strict rules at `error` level
- **TypeScript** - Strict mode with `noUncheckedIndexedAccess`, `noImplicitReturns`, `exactOptionalPropertyTypes`
- BRKGA decoder rewritten as multi-pass (delivery-first, then pickup after processing time)
- BRKGA chromosome expanded to 4n structure (π, σ, α, β)
- ALNS wired with all 6 destroy + 4 repair operators from paper
- Warm-start enabled by default (15% of BRKGA population seeded from ALNS)
- Per-vehicle depot support in `calculateSchedule()`
- `getTravelTime()` virtual method for `TrafficAwareProblem` override
- Converted entire codebase from JavaScript to TypeScript
- Updated ALNS default parameters to paper specs
- Enhanced `Solution` class with multi-objective tracking
- `VrpRpdSolver` accepts optional `Logger` in constructor
- Rollup build produces ESM + CJS + `.d.ts` type declarations
- File names renamed to kebab-case per Google TypeScript Style Guide

### Deprecated

- `Problem` alias (use `VrpProblem`)
- `Node` alias (use `LocationNode`)
- `Solution` alias (use `VrpSolution`)
- JavaScript source files (`.js` → `.ts`)

### Removed

- All `eslint-disable` comments (0 suppressed rules)
- All `as` type assertions from source code
- All non-null assertions (`!`) from source code
- All `Array()` constructor usage (replaced with `Array.from`)
- Redundant `public` on class body members (18 occurrences)
- Empty `.catch(() => {})` handlers (5 occurrences)
- `Object.keys() + as` pattern (replaced with typed key arrays)
- Old JavaScript source and test files (`.js`)
- 7 previously suppressed ESLint rules (now fully enabled)
- Jest configuration and dependencies
- Migration scripts

### Fixed

- BRKGA timeout and progress callback support
- Type safety issues with indexed access
- Undefined handling in operator functions
- ESLint 9 flat config with zero warnings
- All `any` types removed from source and tests
- Template expression type safety
- Decoder chromosome size corrected to 4n per paper specification
- ALNS operator index-shift bug (remove higher-index customers first)
- Stale fitness after elite diversity mutation (reset to `null` for re-evaluation)
- Stagnation detection now resets weights and temperature on multi-restart
- Google TypeScript Style Guide compliance (zero violations)

### Security

- Added strict TypeScript configuration for type safety
- Input validation on all problem constructors
- CI with explicit least-privilege permissions and provenance

---

## [1.0.0] - 2026-05-04

### Added

- Initial TypeScript implementation
- ALNS algorithm with 3 removal and 2 insertion operators
- BRKGA algorithm with 2n chromosome structure
- Basic VRP-RPD problem definition
- Solution feasibility checking
- Parallel solving via worker threads
- Interactive demo application

### Known Issues

- No GPU acceleration

---

## [0.1.0] - 2026-03-xx

### Added

- Original JavaScript implementation
- Basic ALNS and BRKGA algorithms
- Demo application

---

## Paper Reference

This implementation is based on:

> Saseendran, H., Sodhi, M., & Prasad, R. (2026).
> Vehicle Routing Problem with Resource-Constrained Pickup and Delivery.
> arXiv:2602.23685 [math.OC]

**Important:** This is an independent re-implementation. The authors of this code are not affiliated with the paper authors. See README.md for disclaimer.

---

## Version History

| Version | Date       | Notes                                            |
| ------- | ---------- | ------------------------------------------------ |
| 1.1.0   | 2026-08-10 | Worker infra, validation, ALNS+decoder hardening |
| 1.0.0   | 2026-05-04 | TypeScript conversion                            |
| 0.1.0   | 2026-03-xx | Initial JavaScript                               |
