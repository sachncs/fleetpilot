#!/usr/bin/env node
import { lstat, readlink, symlink, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const tsc = resolve(root, 'node_modules', '.bin', 'tsc');
const ts7bin = resolve(root, 'node_modules', 'typescript-7', 'bin', 'tsc');

if (!existsSync(tsc)) {
  process.exit(0);
}

if (!existsSync(ts7bin)) {
  process.exit(0);
}

const stat = await lstat(tsc);
if (stat.isSymbolicLink()) {
  const target = await readlink(tsc);
  const resolvedTarget = resolve(dirname(tsc), target);
  if (resolvedTarget === ts7bin) {
    process.exit(0);
  }
  await unlink(tsc);
}

const link = relative(dirname(tsc), ts7bin);
await symlink(link, tsc);
console.log(`[fix-tsc-symlink] node_modules/.bin/tsc -> ${link}`);
