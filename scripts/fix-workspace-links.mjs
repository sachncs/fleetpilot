#!/usr/bin/env node
// Fixes workspace symlinks that npm miscomputes: npm builds the relative
// target from the link path INCLUDING its basename, producing links that
// resolve one directory too deep whenever a workspace changes depth.
import { readFile } from 'node:fs/promises';
import { lstat, readlink, readdir, symlink, unlink, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url)));

/**
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
async function listWorkspaceDirs(dir) {
  if (!existsSync(join(dir, 'package.json'))) return [];
  return [dir];
}

/** @returns {Promise<string[]>} */
async function collectWorkspaces() {
  const patterns = pkg.workspaces ?? [];
  /** @type {string[]} */
  const dirs = [];
  for (const pattern of patterns) {
    if (pattern.includes('*')) {
      const base = pattern.slice(0, pattern.indexOf('*'));
      const absBase = resolve(root, base);
      if (!existsSync(absBase)) continue;
      for (const entry of await readdir(absBase, { withFileTypes: true })) {
        dirs.push(...(await listWorkspaceDirs(join(absBase, entry.name))));
      }
    } else {
      dirs.push(...(await listWorkspaceDirs(resolve(root, pattern))));
    }
  }
  return dirs;
}

for (const ws of await collectWorkspaces()) {
  const nm = join(ws, 'node_modules');
  const link = join(nm, pkg.name);
  const desired = relative(nm, root);
  let current = null;
  try {
    const stat = await lstat(link);
    if (stat.isSymbolicLink()) current = await readlink(link);
  } catch {
    // missing — create below
  }
  if (current === desired) continue;
  await mkdir(nm, { recursive: true });
  try {
    await unlink(link);
  } catch {
    // nothing to remove
  }
  await symlink(desired, link, 'dir');
  console.log(`fix-workspace-links: ${relative(root, link)} -> ${desired}`);
}
