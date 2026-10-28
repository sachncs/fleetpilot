import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import nft from '../node_modules/next/dist/compiled/@vercel/nft/index.js';

const root = process.cwd();
const output = resolve(root, 'runtime');
const entries = ['custom-server.mjs', 'worker.mjs'];

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

const trace = await nft.nodeFileTrace(entries, { base: root, processCwd: root });
for (const file of trace.fileList) {
  if (entries.includes(file)) continue;
  const destination = resolve(output, file);
  mkdirSync(dirname(destination), { recursive: true });
  cpSync(resolve(root, file), destination, { dereference: true });
}
for (const entry of entries) cpSync(resolve(root, entry), resolve(output, entry));

// Next installs these aliases through dynamic require.resolve calls, which
// static file tracing cannot discover.
for (const compiledPath of ['webpack', '@babel/runtime']) {
  cpSync(
    resolve(root, 'node_modules/next/dist/compiled', compiledPath),
    resolve(output, 'node_modules/next/dist/compiled', compiledPath),
    { recursive: true, dereference: true },
  );
}

// Next's standalone build owns the compiled application and manifests. The
// custom server dependencies above are traced separately so the runtime keeps
// WebSocket progress and the solver worker without shipping build caches.
cpSync(resolve(root, 'frontend/.next/standalone/frontend'), resolve(output, 'frontend'), {
  recursive: true,
  dereference: true,
});
