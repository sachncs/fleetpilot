export const config = {
  databaseUrl: process.env['DATABASE_URL']?.replace('file:', '') ?? './data/fleetpilot.db',
  maxConcurrentSolves: Number(process.env['MAX_CONCURRENT_SOLVES'] ?? '1'),
  maxTimeMs: 600_000,
  maxGenerations: 50_000,
  port: Number(process.env['PORT'] ?? '3000'),
} as const;
