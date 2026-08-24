import { spawnSync } from 'child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { expect } from 'chai';

const CLI_PATH = new URL('../dist/cli.mjs', import.meta.url).pathname;
const PACKAGE_JSON = new URL('../package.json', import.meta.url).pathname;

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
  return {
    path,
    cleanup: () => {
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

function makeMultiDepotFile(): { path: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'vrp-cli-'));
  const path = join(dir, 'problem.json');
  const problem = {
    nodes: [
      { id: 0, x: 0, y: 0 },
      { id: 1, x: 10, y: 0 },
      { id: 2, x: 20, y: 0 },
      { id: 3, x: 30, y: 0 },
    ],
    customers: [{ id: 1, deliveryNodeId: 1, pickupNodeId: 2, processingTime: 5 }],
    vehicles: [{ id: 1, capacity: 10 }],
    depots: [
      { id: 0, x: 0, y: 0, name: 'North' },
      { id: 3, x: 30, y: 0, name: 'South' },
    ],
    vehicleDepotAssignments: { '1': 0 },
  };
  writeFileSync(path, JSON.stringify(problem));
  return {
    path,
    cleanup: () => {
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

function runCli(args: string[]): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync('node', [CLI_PATH, ...args], {
    encoding: 'utf-8',
    cwd: process.cwd(),
  });
  return { status: result.status, stderr: result.stderr, stdout: result.stdout };
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

  it('--version outputs the package.json version', () => {
    const { status, stdout } = runCli(['--version']);
    expect(status).to.equal(0);
    const pkg = JSON.parse(readFileSync(PACKAGE_JSON, 'utf-8')) as { version: string };
    expect(stdout.trim()).to.equal(pkg.version);
  });

  it('auto-detects and solves a multi-depot problem', () => {
    const { path, cleanup } = makeMultiDepotFile();
    try {
      const { status, stdout } = runCli([
        '--problem',
        path,
        '--alns-iterations',
        '20',
        '--max-time',
        '5000',
      ]);
      expect(status).to.equal(0);
      const parsed = JSON.parse(stdout) as { makespan: number; routes: unknown[] };
      expect(parsed.makespan).to.be.greaterThan(0);
      expect(parsed.routes).to.be.an('array');
    } finally {
      cleanup();
    }
  });

  it('honors --seed for deterministic runs', () => {
    const { path, cleanup } = makeProblemFile();
    try {
      const a = runCli([
        '--problem',
        path,
        '--alns-iterations',
        '20',
        '--max-time',
        '2000',
        '--seed',
        '42',
      ]);
      const b = runCli([
        '--problem',
        path,
        '--alns-iterations',
        '20',
        '--max-time',
        '2000',
        '--seed',
        '42',
      ]);
      const resultA = JSON.parse(a.stdout) as { makespan: number; routes: unknown[] };
      const resultB = JSON.parse(b.stdout) as { makespan: number; routes: unknown[] };
      expect(resultA.makespan).to.equal(resultB.makespan);
      expect(JSON.stringify(resultA.routes)).to.equal(JSON.stringify(resultB.routes));
    } finally {
      cleanup();
    }
  });

  it('errors on unknown --problem-kind', () => {
    const { path, cleanup } = makeProblemFile();
    try {
      const { status, stderr } = runCli(['--problem', path, '--problem-kind', 'wrong']);
      expect(status).to.equal(1);
      expect(stderr).to.include('problem-kind');
    } finally {
      cleanup();
    }
  });
});
