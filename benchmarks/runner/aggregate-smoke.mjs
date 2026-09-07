// Aggregate smoke benchmark results into a single JSON for the docs table.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const resultsDir = resolve(root, 'benchmarks', 'results');
const outFile = resolve(resultsDir, 'smoke-results.json');

const families = ['synthetic', 'cordeau', 'darp', 'salhi-nagy', 'lilim', 'solomon'];
const results = [];

for (const family of families) {
  const dir = resolve(resultsDir, family);
  if (!existsSync(dir)) continue;
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    const data = JSON.parse(readFileSync(resolve(dir, file), 'utf8'));
    results.push({
      family: data.family,
      instance: data.instance,
      customers: data.customers ?? 0,
      vehicles: data.vehicles ?? 0,
      makespan: data.makespan ?? null,
      runtimeMs: data.runtimeMs,
      feasible: data.feasible ?? null,
      error: data.error,
    });
  }
}

const smoke = {
  generated: new Date().toISOString(),
  config: {
    note: 'Reduced config for CI smoke. Paper-quality run uses 30000 popSize, 20000 generations.',
    seed: 1,
    maxTimeMs: 5000,
    alnsIterations: 50,
    populationSize: 100,
    maxGenerations: 50,
  },
  results,
};

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify(smoke, null, 2));
console.log(`Wrote ${outFile} (${results.length} results).`);
