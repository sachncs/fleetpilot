import { loadConfig } from './config-store';

export interface AppConfig {
  databaseUrl: string;
  dataDir: string;
  maxConcurrentSolves: number;
  maxTimeMs: number;
  maxGenerations: number;
  port: number;
}

function buildConfig(): AppConfig {
  const fileConfig = loadConfig();
  return {
    databaseUrl: process.env['DATABASE_URL']?.replace('file:', '') ?? fileConfig.databasePath,
    dataDir: fileConfig.dataDir,
    maxConcurrentSolves: Number(process.env['MAX_CONCURRENT_SOLVES'] ?? String(fileConfig.maxConcurrentSolves)),
    maxTimeMs: fileConfig.maxTimeMs,
    maxGenerations: fileConfig.maxGenerations,
    port: Number(process.env['PORT'] ?? String(fileConfig.port)),
  };
}

export const config: AppConfig = buildConfig();

export function reloadConfig(): void {
  Object.assign(config, buildConfig());
}
