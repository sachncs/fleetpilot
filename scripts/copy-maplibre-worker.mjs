import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(
  repositoryRoot,
  'node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs',
);
const publicDirectory = resolve(repositoryRoot, 'frontend/public');
const destination = resolve(publicDirectory, 'maplibre-gl-worker.mjs');

if (!existsSync(source)) {
  throw new Error(`MapLibre worker not found at ${source}. Run npm install first.`);
}

mkdirSync(publicDirectory, { recursive: true });
copyFileSync(source, destination);
console.log(`MapLibre worker copied to ${destination}`);
