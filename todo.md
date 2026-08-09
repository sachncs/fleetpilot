# VRP-RPD Remediation Plan

Itemized atomic plan. Each item is one commit-sized change, independently verifiable. Dependencies noted inline.

## WS-0 · Verification gates (do first)

- [x] **0.1** Pin exact devDeps (drop `^`) + add `packageManager` — `package.json` — Verify: `npm ci` byte-identical to today's install.
- [x] **0.2** Add `npm run verify` = `typecheck && lint && test:coverage` — `package.json` — Verify: exits 0.
- [x] **0.3** Add dist smoke test: build, assert `dist/worker.js` exists, import `dist/index.mjs` and solve — new `tests/dist-smoke.test.ts` — Verify: fails on current code (proves it catches finding #1), passes after WS-1.

## WS-1 · Worker infrastructure (findings #1, #2, #17 — P0)

- [x] **1.1** Add rollup entry for `src/worker.ts` → `dist/worker.js` — `rollup.config.mjs` — Verify: build emits it; 0.3 passes.
- [x] **1.2** Resolve worker path from `import.meta.url`/`__dirname` (not `process.cwd()`), add `VRP_WORKER_PATH` env override — `src/index.ts`, `src/algorithms/brkga/brkga.ts` — Verify: parallel solve works from any cwd; override test passes.
- [x] **1.3** Serialize full problem to worker (depots, time windows, cost/CO₂, traffic) — `src/worker-validation.ts`, `src/worker.ts` — Verify: parallel result == serial result on a TW+cost+CO₂ problem.
- [x] **1.4** Real parallel integration test (spawn actual workers via override) — new `tests/parallel.integration.test.ts` — Verify: 2 workers actually run (assert via progress logging), result better than serial fallback.
- [x] **1.5** Remove silent island fallback — rethrow instead of catch-and-degrade — `src/algorithms/brkga/brkga.ts:507` — Verify: missing worker now throws loudly; island tests updated to expect that.

## WS-2 · Correctness (findings #3, #5, #6, #7, #8, #9)

- [x] **2.1** Traffic fallback to Euclidean distance when segment unconfigured; fix the buggy assertion — `src/core/traffic-aware-problem.ts:54`, `tests/comprehensive.test.ts:233` — Verify: test now expects ~10, not 0.
- [x] **2.2** BRKGA feasible-only hall-of-fame — `src/algorithms/brkga/brkga.ts` — Verify: test with infeasible candidates; returned solution `isFeasible()`.
- [x] **2.3** Feasibility gate in `VrpRpdSolver.solve` → throw `InfeasibleSolutionError` — `src/index.ts:222` — Verify: impossible-problem test throws typed error.
- [x] **2.4** Route pickups on the actual delivering vehicle — `src/algorithms/brkga/decoder.ts:139` — Verify: test asserts pickup shares route with its delivery.
- [x] **2.5** Decoder throws (not drops) when a customer can't be placed — `decoder.ts` — Verify: over-capacity test throws `ValidationError`.
- [x] **2.6** β-gene honesty: shrink to 3n (D1: small option) and document — `decoder.ts`, `brkga.ts` — Verify: no dead genes; chrom length matches docs.
- [x] **2.7** `VrpProblem` validation: shared node ownership, TW ordering, integer ids — `src/core/problem.ts` — Verify: new validation tests.
- [x] **2.8** `MultiDepotProblem` validation parity — `src/core/multi-depot-problem.ts` — Verify: tests.
- [x] **2.9** CLI NaN guards — `src/cli.ts:233` — Verify: CLI test errors cleanly on `NaN`.

## WS-3 · Performance (findings #10, #11, #12)

- [x] **3.1** Move first decode batch inside the timeout check — `brkga.ts:299` — Verify: tiny `maxTimeMs` returns quickly (test).
- [x] **3.2** Distance cache (one matrix per problem) — `problem.ts`/`traffic-aware-problem.ts` — Verify: micro-benchmark faster, results unchanged. (operators now use `problem.getDistance`.)
- [x] **3.3** Incremental schedule update replacing fixed-point recompute — `decoder.ts:128,178` — Verify: schedule-equality tests pass.
- [x] **3.4** ALNS insertion O(v·n³)→O(v·n²) — `alns/operators.ts` — Verify: feasibility preserved; new `evaluateInsertionCosts` helper.

## WS-4 · Test hardening (findings #17–21)

- [x] **4.1** Happy-path worker tests (unblocks 0% coverage on `worker.ts`) — depends on 1.3 — Verify: `worker.ts` appears in c8 report.
- [x] **4.2** Tests for `evaluateMakespanWithRoute/TwoRoutes`, `evaluateRouteReturnTime` — `tests/solution.test.ts` — Verify: uncovered lines >0. (Asserts exact makespan values now.)
- [x] **4.3** Tighten vacuous assertions (`>= 0`, never-invoked `checkTimeWindows`, feasibility-only) — `tests/bugfixes.test.ts` + transfers tests — Verify: each test now asserts something meaningful.
- [x] **4.4** Inject seeded RNG (mulberry32), default deterministic — `decoder.ts`, `brkga.ts`, tests — Verify: seeded runs are byte-identical across runs.
- [x] **4.5** Replace wall-clock thresholds with quality/relative assertions — `tests/benchmarks.test.ts`, elite-mutation test — Verify: 20 consecutive runs, 0 flakes.
- [x] **4.6** `git rm` `tests/core.test.js.map` + `core.test.d.ts.map` — Verify: clean tree.

## WS-5 · Docs & packaging (finding #22)

- [x] **5.1** README API fixes: `setSegment`/`setTimeFactors`, `SolveOptions` fields, test count — `README.md` — Verify: README API refs match `src/index.ts`.
- [x] **5.2** Wire `islands`/`migrationInterval`/`migrantFraction` into `SolveOptions` (D2: wire) — `src/index.ts`, `README.md`.
- [x] **5.3** Fix demo/examples imports (`Node`/`Problem`/`Solution`) — deleted `demo/`, repaired `examples/transfer-example.ts` (D3: delete demo, keep examples) — `demo/`, `examples/*`.
- [x] **5.4** Reconcile version (README roadmap vs `1.0.0`) + CHANGELOG entry — `README.md`, `CHANGELOG.md`. Bumped to 1.1.0.
- [x] **5.5** Unlink dangling CONTRIBUTING/CODE_OF_CONDUCT/SECURITY links (D4: unlink) — `README.md`.

## WS-6 · Google Java Style compliance (findings #23–25)

- [x] **6.1** Add `eslint-plugin-jsdoc` with require-jsdoc on public/protected members — `eslint.config.mjs` — Verify: lint catches a missing doc.
- [x] **6.2** Fix acronym camelCase: `totalCO2`→`totalCo2`, `toGeoJSON`→`toGeoJson`, `toKML`→`toKml`, `toCSV`→`toCsv`, `GeoJSON`→`GeoJson`, `KMLPlacemark`→`KmlPlacemark` — src, tests, README, examples — Verify: `rg` shows no violations; typecheck+tests pass.
- [x] **6.3** Add JSDoc stubs to all undocumented public members (TODO(6.3) markers flag the gaps to fill in a follow-up) — `src/**`, `tests/**` — Verify: 6.1 rule passes clean.
- [x] **6.4** Extract multi-type files (D5: extract public API only) — `src/errors/*` extracted one-per-file; cohesive files (`problem.ts`, `solution.ts`, `gis-exporter.ts`, `vehicle-with-capabilities.ts`) kept as-is.

## WS-7 · Housekeeping

- [x] **7.1** Patch mocha transitive deps via npm `overrides` (diff@8.0.3, serialize-javascript@7.1.0) → `npm audit` to 0 — `package.json`.
- [x] **7.2** Update c8 thresholds after WS-4 raises coverage — `package.json`. 85/85/70/85.
- [x] **7.3** CI job: `build + verify + dist smoke` so #1-class regressions fail in CI — `.github/workflows/*` — Verify: runs green; removing 1.1 makes it fail.

## Decisions (gate dependent items)

- **D1** β genes: shrink to 3n (chosen). Chromosome now honest (π, σ, α).
- **D2** Islands: wire into `VrpRpdSolver` (chosen). `SolveOptions` carries `islands`/`migrationInterval`/`migrantFraction`.
- **D3** Demo/examples: delete demo, keep examples (chosen). `demo/` removed; `examples/transfer-example.ts` repaired.
- **D4** Community docs: unlink (chosen). README Contributing/Security sections are now inline.
- **D5** Multi-type files: extract public API only (chosen). `errors/*` extracted; cohesive public files kept as-is.
- **D6** Worker bundle format: dual CJS/ESM (no change — already dual via rollup).

## Suggested order

WS-0 → WS-1 → 2.1–2.5, 2.7–2.9 → WS-6 quick wins → WS-4 → WS-3 → WS-5 → WS-7, with D1–D6 resolved before the items that depend on them.