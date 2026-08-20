import { loadConfig } from './config-store';

const fileConfig = loadConfig();

export const config = {
  databaseUrl: process.env['DATABASE_URL']?.replace('file:', '') ?? fileConfig.databasePath,
  dataDir: fileConfig.dataDir,
  maxConcurrentSolves: Number(process.env['MAX_CONCURRENT_SOLVES'] ?? String(fileConfig.maxConcurrentSolves)),
  maxTimeMs: fileConfig.maxTimeMs,
  maxGenerations: fileConfig.maxGenerations,
  port: Number(process.env['PORT'] ?? String(fileConfig.port)),
} as const;
