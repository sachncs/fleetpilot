# Benchmarks

Reproducible benchmark suite for FleetPilot. Five canonical benchmark
families plus a synthetic-Tier-6 filler. The suite is **not** a paper-parity
claim — it is a fixed baseline for regression detection and a feature-coverage
matrix.

## ⚠️ Disclaimer

**We do not claim paper parity.** The published VRP-RPD paper (arXiv:2602.23685)
does not host public instances, and the benchmark families used here are only
**structurally** related to VRP-RPD (most are PDPTW, VRPTW, or VRP variants
that lack the "process after delivery" constraint). BKS columns below are
**published literature best-known solutions**, not the paper's reported
performance.

Comparing our `makespan` to published BKS tells you whether the solver is in
the right ballpark, **not** whether it has matched the paper.

## Families

| Tier | Family | Source | Format | Tests |
| ---- | ------ | ------ | ------ | ----- |
| T1 | **Li & Lim PDPTW** 100-cust | SINTEF mirror | `l{c,r,rc}{1,2}_2_*.txt` | P/D pairing + TW + capacity |
| T2 | **Solomon / Gehring-Homberger** 100-cust | rogalski mirror | `c1_2_1.txt` etc. | TW + capacity (degenerate P/D) |
| T3 | **Cordeau MDVRP** | synthetic | `mdvrp-*d-*c.json` | Multi-depot |
| T4 | **DARP** | synthetic | `darp-*req-*veh.json` | Resource-as-temporal-chain |
| T5 | **Salhi-Nagy VRPB** | synthetic | `vrpb-*c.json` | Delivery-before-pickup sequencing |
| T6 | **Synthetic** (paper ranges) | generated | `synth-*c-*.json` | Gap-filler, regression |

Vendoring source for each family is in `benchmarks/<family>/SOURCES.md`.

## How to run

```bash
# Run a single instance:
npx tsx benchmarks/runner/runner.ts --family synthetic --instance synth-10c-small.json

# Run the Li & Lim smoke (slow, ~30s):
npx tsx benchmarks/runner/runner.ts --family lilim --instance lc1_2_1.txt --max-time 5000

# Aggregate results into JSON:
node benchmarks/runner/aggregate-smoke.mjs
```

Output results land in `benchmarks/results/<family>/<instance>.json` and
are aggregated into `benchmarks/results/smoke-results.json`.

## Smoke results (CI run)

Updated automatically by the `benchmarks-smoke` mocha test. Source:
`benchmarks/results/smoke-results.json`.

| Family | Instance | Customers | Vehicles | Makespan | Runtime (ms) | Feasible |
| ------ | -------- | --------- | -------- | -------- | ------------ | -------- |
| synthetic | synth-10c-small.json | 10 | 2 | 379.24 | 41 | ✅ |
| synthetic | synth-20c-medium.json | 20 | 3 | 453.15 | 185 | ✅ |
| synthetic | synth-50c-large.json | 50 | 7 | 714.13 | 5279 | ✅ |
| cordeau | mdvrp-2d-16c.json | 16 | 4 | 153.99 | 105 | ✅ |
| cordeau | mdvrp-3d-24c.json | 24 | 6 | 233.93 | 274 | ✅ |
| cordeau | mdvrp-4d-32c.json | 32 | 8 | 254.87 | 782 | ✅ |
| cordeau | mdvrp-3d-48c.json | 48 | 6 | 497.79 | 1357 | ✅ |
| darp | darp-8req-4veh.json | 8 | 4 | 186.57 | 39 | ✅ |
| darp | darp-12req-4veh.json | 12 | 4 | 250.64 | 68 | ✅ |
| darp | darp-16req-6veh.json | 16 | 6 | 243.49 | 125 | ✅ |
| salhi-nagy | vrpb-20c.json | 20 | 2 | 310.91 | 171 | ✅ |
| salhi-nagy | vrpb-30c.json | 30 | 3 | 357.25 | 864 | ✅ |
| salhi-nagy | vrpb-40c.json | 40 | 4 | 622.30 | 2743 | ✅ |

**Run config:** `seed=1, maxTimeMs=5000, alnsIterations=50, populationSize=100,
maxGenerations=50`. Paper-quality config is `seed=1, populationSize=30000,
maxGenerations=20000` — ~600× slower.

## Adding a new family

1. Vendor instances under `benchmarks/<family>/`.
2. Add a `SOURCES.md` documenting origin, license, and adapter mapping.
3. Add a parser + adapter to `benchmarks/runner/adapters.ts`.
4. Register the family in the `ADAPTERS` map.
5. Add a smoke-test entry to `tests/benchmarks-smoke.test.ts`.
6. Run the runner end-to-end and update this table.

## Regression baseline

`benchmarks/results/smoke-results.json` is the committed baseline. The
`benchmarks/results/regression.test.ts` test runs the smoke on every CI
and asserts CI makespan is within **1.3×** of the baseline. To bump the
baseline:

```bash
node benchmarks/runner/aggregate-smoke.mjs
git add benchmarks/results/smoke-results.json
git commit -m "benchmarks: update baseline"
```

## VROOM baseline (opt-in)

VROOM is a production-grade open-source solver. To get an external reference
baseline on the same instances:

```bash
# Install vroom (https://github.com/VROOM-Project/vroom)
brew install vroom  # or apt install vroom
npm run benchmark:vroom
```

The script is opt-in and skipped if `vroom` is not on `PATH`. See
`benchmarks/vroom-baseline.ts`.
