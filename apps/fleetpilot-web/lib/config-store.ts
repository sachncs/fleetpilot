import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface FleetPilotConfig {
  dataDir: string;
  databasePath: string;
  port: number;
  maxConcurrentSolves: number;
  maxTimeMs: number;
  maxGenerations: number;
  initialApiKeyHash?: string;
}

function getDefaultDataDir(): string {
  return resolve(__dirname, '../../../data');
}

function getConfigPath(dataDir: string): string {
  return resolve(dataDir, 'fleetpilot.json');
}

export function loadConfig(): FleetPilotConfig {
  const dataDir = getDefaultDataDir();
  const configPath = getConfigPath(dataDir);
  if (!existsSync(configPath)) {
    return {
      dataDir,
      databasePath: resolve(dataDir, 'fleetpilot.db'),
      port: 3000,
      maxConcurrentSolves: 1,
      maxTimeMs: 600_000,
      maxGenerations: 50_000,
    };
  }
  try {
    const raw = readFileSync(configPath, 'utf-8');
    const saved = JSON.parse(raw) as Partial<FleetPilotConfig>;
    const dir = saved.dataDir ?? dataDir;
    return {
      dataDir: dir,
      databasePath: resolve(dir, 'fleetpilot.db'),
      port: saved.port ?? 3000,
      maxConcurrentSolves: saved.maxConcurrentSolves ?? 1,
      maxTimeMs: saved.maxTimeMs ?? 600_000,
      maxGenerations: saved.maxGenerations ?? 50_000,
      initialApiKeyHash: saved.initialApiKeyHash,
    };
  } catch {
    return {
      dataDir,
      databasePath: resolve(dataDir, 'fleetpilot.db'),
      port: 3000,
      maxConcurrentSolves: 1,
      maxTimeMs: 600_000,
      maxGenerations: 50_000,
    };
  }
}

export function saveConfig(config: FleetPilotConfig): void {
  mkdirSync(config.dataDir, { recursive: true });
  const out: Record<string, unknown> = {
    dataDir: config.dataDir,
    port: config.port,
    maxConcurrentSolves: config.maxConcurrentSolves,
    maxTimeMs: config.maxTimeMs,
    maxGenerations: config.maxGenerations,
  };
  if (config.initialApiKeyHash) {
    out.initialApiKeyHash = config.initialApiKeyHash;
  }
  writeFileSync(getConfigPath(config.dataDir), JSON.stringify(out, null, 2) + '\n');
}

export function isFirstRun(): boolean {
  return !existsSync(getConfigPath(getDefaultDataDir()));
}
