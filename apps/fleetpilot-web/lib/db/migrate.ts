import { sql } from 'drizzle-orm';
import { getDb } from './index';

let _migrated = false;

export async function ensureSchema(): Promise<void> {
  if (_migrated) return;

  const db = getDb();

  db.run(sql`
    CREATE TABLE IF NOT EXISTS problems (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      problem_json TEXT NOT NULL,
      node_count INTEGER NOT NULL,
      customer_count INTEGER NOT NULL,
      vehicle_count INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(sql`
    CREATE TABLE IF NOT EXISTS solutions (
      id TEXT PRIMARY KEY,
      problem_id TEXT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
      solution_json TEXT NOT NULL,
      makespan INTEGER NOT NULL,
      total_distance INTEGER NOT NULL,
      total_cost INTEGER NOT NULL,
      total_co2 INTEGER NOT NULL,
      feasible INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(sql`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      problem_id TEXT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
      solver_options_json TEXT NOT NULL,
      progress_json TEXT,
      solution_id TEXT REFERENCES solutions(id),
      error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      started_at TEXT,
      completed_at TEXT
    )
  `);

  db.run(sql`
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      key_hash TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_used_at TEXT
    )
  `);

  db.run(sql`CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status)`);
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_jobs_problem_id ON jobs(problem_id)`);
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_solutions_problem_id ON solutions(problem_id)`);
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash)`);

  _migrated = true;
}
