# Benchmarks

Reproducible benchmark suite for the VRP-RPD solver. This directory is the
**only entry point** if you want to add a new benchmark family, regenerate
synthetic instances, or run end-to-end smoke tests.

## Layout

```
benchmarks/
├── README.md                  ← this file
├── docs/benchmarks.md         ← results table for users
├── lilim/                     ← Tier 1 (Li & Lim PDPTW 100-cust)
│   ├── pdptw/100/             ←    60 vendored .txt files
│   └── SOURCES.md
├── solomon/                   ← Tier 2 (Solomon/Gehring-Homberger 100-cust)
│   ├── 100/                   ←    60 vendored .txt files
│   └── SOURCES.md
├── cordeau/                   ← Tier 3 (Cordeau MDVRP, synthetic)
│   ├── mdvrp/                 ←    4 JSON files
│   └── SOURCES.md
├── darp/                      ← Tier 4 (DARP, synthetic)
│   ├── darp-*.json            ←    5 JSON files
│   └── SOURCES.md
├── salhi-nagy/                ← Tier 5 (Salhi-Nagy VRPB, synthetic)
│   ├── vrpb/                  ←    4 JSON files
│   └── SOURCES.md
├── synthetic/                 ← Tier 6 (paper-range filler)
│   └── synth-*.json
├── generators/                ← Deterministic synthetic generators
│   ├── cordeau-mdvrp.mjs
│   ├── darp.mjs
│   ├── salhi-nagy-vrpb.mjs
│   └── synthetic-vrp-rpd.mjs
├── runner/                    ← Solver harness
│   ├── adapters.ts            ←    Parse + adapter per family
│   ├── runner.ts              ←    Single-instance CLI
│   └── aggregate-smoke.mjs    ←    Aggregate results into smoke-results.json
├── vroom-baseline.ts          ← Opt-in VROOM external reference
└── results/
    ├── smoke-results.json     ← Committed baseline
    ├── regression.test.ts     ← Mocha test (asserts within 1.3× of baseline)
    ├── synthetic/             ← Per-instance result JSONs
    ├── cordeau/
    ├── darp/
    ├── salhi-nagy/
    ├── lilim/
    └── vroom-baseline.json    ← (optional, when vroom is installed)
```

## Running benchmarks

### Single instance

```bash
npx tsx benchmarks/runner/runner.ts --family <family> --instance <file> [options]
```

Options:

- `--family <family>` — `lilim`, `solomon`, `cordeau`, `darp`, `salhi-nagy`, `synthetic`
- `--instance <file>` — file name within the family directory
- `--output <path>` — result JSON path (default: `benchmarks/results/<family>/<file>.json`)
- `--max-time <ms>` — solver wall-clock cap (default: `30000`)
- `--alns-iterations <n>` — ALNS iterations (default: `500`)
- `--population-size <n>` — BRKGA population (default: `1000`)
- `--max-generations <n>` — BRKGA generations (default: `500`)
- `--seed <n>` — deterministic seed (default: `1`)
- `--no-warm-start` — disable ALNS warm-start

### Whole family

```bash
for f in benchmarks/lilim/pdptw/100/*.txt; do
  npx tsx benchmarks/runner/runner.ts --family lilim --instance "$(basename "$f")" \
    --max-time 60000 --alns-iterations 500 --population-size 5000 --max-generations 2000
done
```

### Aggregate

```bash
node benchmarks/runner/aggregate-smoke.mjs
```

Writes `benchmarks/results/smoke-results.json` from the per-instance results.

### Smoke test (CI)

```bash
npm test -- --grep "Benchmark smoke"
```

Runs the smallest instance per family with reduced config.

### Regression test (CI)

```bash
npm test -- --grep "Benchmark regression"
```

Asserts each instance's CI makespan is within **1.3×** of the committed
baseline in `benchmarks/results/smoke-results.json`.

## Adding a new family

1. Vendor instances under `benchmarks/<family>/`.
2. Create `SOURCES.md` documenting origin, license, and adapter mapping.
3. Add a parser + adapter to `benchmarks/runner/adapters.ts`.
4. Register the family in the `ADAPTERS` map.
5. Update `familyDir()` in `benchmarks/runner/runner.ts` and the equivalent
   in `tests/benchmarks-smoke.test.ts` and `benchmarks/results/regression.test.ts`.
6. Run end-to-end and update the results table in `docs/benchmarks.md`.

## Regenerating synthetic instances

```bash
node benchmarks/generators/cordeau-mdvrp.mjs
node benchmarks/generators/darp.mjs
node benchmarks/generators/salhi-nagy-vrpb.mjs
node benchmarks/generators/synthetic-vrp-rpd.mjs
```

Each generator uses a fixed seed, so re-running produces byte-identical files.

## Bumping the baseline

When the solver intentionally improves (or you want to expand the smoke):

```bash
node benchmarks/runner/aggregate-smoke.mjs
git add benchmarks/results/ benchmarks/results/smoke-results.json
git commit -m "benchmarks: update baseline"
```

Use a clear commit message so the regression can be reviewed.

## VROOM comparison

VROOM is a production-grade open-source solver with PDPTW support. To get
an external reference baseline:

```bash
brew install vroom  # or apt install vroom
npm run benchmark:vroom
```

Output: `benchmarks/results/vroom-baseline.json`. Skipped if `vroom` is not
on PATH.

## License

The vendored Li & Lim and Gehring-Homberger files are released for
unrestricted academic and commercial use under their original licenses
(see the per-family `SOURCES.md` for citations). Synthetic instances
generated by this repository are released under the same license as the
VRP-RPD solver (ISC).
