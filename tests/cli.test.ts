import { spawnSync } from 'child_process';
import { writeFileSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { expect } from 'chai';

const CLI_PATH = new URL('../dist/cli.mjs', import.meta.url).pathname;

function makeProblemFile(): { path: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'vrp-cli-'));
  const path = join(dir, 'problem.json');
  const problem = {
    nodes: [
      { id: 0, x: 0, y: 0 },
      { id: 1, x: 10, y: 0 },
      { id: 2, x: 20, y: 0 },
    ],
    customers: [{ id: 1, deliveryNodeId: 1, pickupNodeId: 2, processingTime: 5 }],
    vehicles: [{ id: 1, capacity: 10 }],
    depotNodeId: 0,
  };
  writeFileSync(path, JSON.stringify(problem));
  return { path, cleanup: () => { rmSync(dir, { recursive: true, force: true }); } };
}

function runCli(args: string[]): { status: number | null; stderr: string } {
  const result = spawnSync('node', [CLI_PATH, ...args], { encoding: 'utf-8', cwd: process.cwd() });
  return { status: result.status, stderr: result.stderr };
}

describe('CLI', () => {
  it('errors cleanly on NaN-like --alns-iterations', () => {
    const { path, cleanup } = makeProblemFile();
    try {
      const { status, stderr } = runCli(['--problem', path, '--alns-iterations', 'xyz']);
      expect(status).to.equal(1);
      expect(stderr).to.include('alns-iterations');
      expect(stderr).to.include('finite number');
    } finally {
      cleanup();
    }
  });

  it('errors cleanly on NaN-like --max-time', () => {
    const { path, cleanup } = makeProblemFile();
    try {
      const { status, stderr } = runCli(['--problem', path, '--max-time', 'abc']);
      expect(status).to.equal(1);
      expect(stderr).to.include('max-time');
    } finally {
      cleanup();
    }
  });

  it('errors cleanly on Infinity-like --target-makespan', () => {
    const { path, cleanup } = makeProblemFile();
    try {
      const { status, stderr } = runCli(['--problem', path, '--target-makespan', 'Infinity']);
      expect(status).to.equal(1);
      expect(stderr).to.include('target-makespan');
    } finally {
      cleanup();
    }
  });
});
