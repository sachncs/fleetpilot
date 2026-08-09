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
- [ ] **2.6** β-gene honesty: implement transfer-aware decode OR shrink to 2.5n + document — `decoder.ts`, `brkga.ts` — gated on decision D1 — Verify: no dead genes; chrom length matches docs.
- [x] **2.7** `VrpProblem` validation: shared node ownership, TW ordering, integer ids — `src/core/problem.ts` — Verify: new validation tests.
- [x] **2.8** `MultiDepotProblem` validation parity — `src/core/multi-depot-problem.ts` — Verify: tests.
- [x] **2.9** CLI NaN guards — `src/cli.ts:233` — Verify: CLI test errors cleanly on `NaN`.

## WS-3 · Performance (findings #10, #11, #12)

- [ ] **3.1** Move first decode batch inside the timeout check — `brkga.ts:299` — Verify: tiny `maxTimeMs` returns quickly (test).
- [ ] **3.2** Distance cache (one matrix per problem) — `problem.ts`/`traffic-aware-problem.ts` — Verify: micro-benchmark faster, results unchanged.
- [ ] **3.3** Incremental schedule update replacing fixed-point recompute — `decoder.ts:128,178` — depends on 2.4/2.5 correctness tests — Verify: schedule-equality tests pass.
- [ ] **3.4** ALNS insertion O(v·n³)→O(v·n²) — `alns/operators.ts` — Verify: seeded result equality + perf smoke.

## WS-4 · Test hardening (findings #17–21)

- [ ] **4.1** Happy-path worker tests (unblocks 0% coverage on `worker.ts`) — depends on 1.3 — Verify: `worker.ts` appears in c8 report.
- [ ] **4.2** Tests for `evaluateMakespanWithRoute/TwoRoutes`, `evaluateRouteReturnTime` — `tests/solution.test.ts` — Verify: uncovered lines >0.
- [ ] **4.3** Tighten vacuous assertions (`>= 0`, never-invoked `checkTimeWindows`, feasibility-only) — `tests/bugfixes.test.ts` + transfers tests — Verify: each test now asserts something meaningful.
- [ ] **4.4** Inject seeded RNG (mulberry32), default deterministic — `decoder.ts`, `brkga.ts`, tests — Verify: seeded runs are byte-identical across runs.
- [ ] **4.5** Replace wall-clock thresholds with quality/relative assertions — `tests/benchmarks.test.ts`, elite-mutation test — Verify: 20 consecutive runs, 0 flakes.
- [ ] **4.6** `git rm` `tests/core.test.js.map` + `core.test.d.ts.map` — Verify: clean tree.

## WS-5 · Docs & packaging (finding #22)

- [ ] **5.1** README API fixes: `setSegment`/`setTimeFactors`, `SolveOptions` fields, test count — `README.md` — Verify: README API refs match `src/index.ts`.
- [ ] **5.2** Wire `islands`/`migrationInterval`/`migrantFraction` into `SolveOptions` or remove them — `src/index.ts`, `README.md` — gated on D2.
- [ ] **5.3** Fix demo/examples imports (`Node`/`Problem`/`Solution`) or delete; make `worker_threads` import dynamic — `demo/app.ts`, `examples/*` — gated on D3.
- [ ] **5.4** Reconcile version (README roadmap vs `1.0.0`) + CHANGELOG entry — `README.md`, `CHANGELOG.md`.
- [ ] **5.5** Add CONTRIBUTING/CODE_OF_CONDUCT/SECURITY or unlink — gated on D4.

## WS-6 · Google Java Style compliance (findings #23–25)

- [ ] **6.1** Add `eslint-plugin-jsdoc` with require-jsdoc on public/protected members — `eslint.config.mjs` — Verify: lint catches a missing doc.
- [ ] **6.2** Fix acronym camelCase: `totalCO2`→`totalCo2`, `toGeoJSON`→`toGeoJson`, `toKML`→`toKml`, `toCSV`→`toCsv`, `GeoJSON`→`GeoJson`, `KMLPlacemark`→`KmlPlacemark` — src, tests, README, examples — Verify: `rg` shows no violations; typecheck+tests pass.
- [ ] **6.3** Add JSDoc to all undocumented public members (from review list: `Route.*`, `Decoder.decode`, resource-transfer (7), vehicle-with-capabilities (8), ALNS/BRKGA protected + option interfaces, `index.ts` option/progress/worker API, `cli.ts`, `worker-validation.ts`, `island-messenger.ts`) — Verify: 6.1 rule passes clean.
- [ ] **6.4** Extract multi-type files to one-per-type for public API (`errors.ts`, `problem.ts`, `solution.ts`, `gis-exporter.ts`, `vehicle-with-capabilities.ts`); exempt internal cohesive files via config — gated on D5 — Verify: §3.4.1-style audit passes for public surface.

## WS-7 · Housekeeping

- [ ] **7.1** Bump eslint/glob/mocha to patched lines → `npm audit` to 0 — `package.json` — Verify: audit clean, verify gate green.
- [ ] **7.2** Update c8 thresholds after WS-4 raises coverage — `package.json`.
- [ ] **7.3** CI job: `build + verify + dist smoke` so #1-class regressions fail in CI — `.github/workflows/*` — Verify: runs green; removing 1.1 makes it fail.

## Decisions (gate dependent items)

- **D1** β genes: implement transfer-aware decode (bigger) vs shrink to honest 2.5n (small).
- **D2** Islands: wire into `VrpRpdSolver` (recommended, pairs with WS-1) vs unadvertise.
- **D3** Demo/examples: repair vs delete (recommended: delete demo, keep examples).
- **D4** Community docs: create vs unlink README links.
- **D5** Multi-type files: extract vs config exemption (recommended: extract public API only).
- **D6** Worker bundle format: ESM-only vs dual CJS/ESM (recommended: dual, matches `index`).

## Suggested order

WS-0 → WS-1 → 2.1–2.5, 2.7–2.9 → WS-6 quick wins → WS-4 → WS-3 → WS-5 → WS-7, with D1–D6 resolved before the items that depend on them.
