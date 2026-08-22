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

  // --- v2 console registries ---

  const problemCols = (
    db.all(sql`PRAGMA table_info(problems)`) as Array<{ name: string }>
  ).map((c) => c.name);
  if (!problemCols.includes('parent_id')) {
    db.run(sql`ALTER TABLE problems ADD COLUMN parent_id TEXT REFERENCES problems(id)`);
  }
  if (!problemCols.includes('version_label')) {
    db.run(sql`ALTER TABLE problems ADD COLUMN version_label TEXT`);
  }

  db.run(sql`
    CREATE TABLE IF NOT EXISTS depots (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      region TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(sql`
    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'retired')),
      capacity_kg INTEGER,
      cost_per_km REAL,
      co2_per_km REAL,
      depot_id TEXT REFERENCES depots(id) ON DELETE SET NULL,
      region TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(sql`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      ref TEXT NOT NULL UNIQUE,
      kind TEXT NOT NULL DEFAULT 'pickup' CHECK (kind IN ('pickup', 'delivery', 'pair')),
      pair_ref_id TEXT,
      priority INTEGER NOT NULL DEFAULT 3,
      window_start TEXT,
      window_end TEXT,
      processing_min INTEGER NOT NULL DEFAULT 0,
      quantity REAL NOT NULL DEFAULT 0,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'unassigned' CHECK (status IN ('unassigned', 'planned', 'exception')),
      problem_id TEXT REFERENCES problems(id) ON DELETE SET NULL,
      region TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(sql`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      actor TEXT NOT NULL,
      payload_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(sql`
    CREATE TABLE IF NOT EXISTS geocode_cache (
      query_hash TEXT PRIMARY KEY,
      results_json TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT 'nominatim',
      fetched_at TEXT NOT NULL
    )
  `);

  db.run(sql`CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status)`);
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`);
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_log(created_at)`);
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity, entity_id)`);
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_problems_parent_id ON problems(parent_id)`);

  _migrated = true;
}
