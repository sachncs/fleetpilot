import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const config = {
  databaseUrl: process.env['DATABASE_URL']?.replace('file:', '') ?? resolve(__dirname, '../data/fleetpilot.db'),
  maxConcurrentSolves: Number(process.env['MAX_CONCURRENT_SOLVES'] ?? '1'),
  maxTimeMs: 600_000,
  maxGenerations: 50_000,
  port: Number(process.env['PORT'] ?? '3000'),
} as const;
