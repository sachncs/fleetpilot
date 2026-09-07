import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { config } from '../config';

let _db: ReturnType<typeof createDb> | null = null;

function createDb() {
  mkdirSync(config.databaseUrl.replace(/\/[^/]+$/, ''), { recursive: true });
  const sqlite = new Database(config.databaseUrl);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  return drizzle(sqlite, { schema });
}

export function getDb() {
  if (!_db) {
    _db = createDb();
  }
  return _db;
}
