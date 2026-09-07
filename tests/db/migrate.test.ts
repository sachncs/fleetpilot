import { strict as assert } from 'node:assert';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { sql as SqlTag } from 'drizzle-orm';
import { before, after, describe, it } from 'mocha';

import type { getDb as GetDbFn } from '../../frontend/lib/db';

describe('@fleetpilot/web schema migrations', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fp-web-migrate-'));
  process.env['DATABASE_URL'] = `file:${join(dir, 'test.db')}`;

  let ensureSchema: () => Promise<void>;
  let getDb: typeof GetDbFn;
  let sql: typeof SqlTag;

  before(async () => {
    ({ ensureSchema } = await import('../../frontend/lib/db/migrate'));
    ({ getDb } = await import('../../frontend/lib/db'));
    ({ sql } = await import('drizzle-orm'));
    await ensureSchema();
  });

  after(() => {
    rmSync(dir, { recursive: true, force: true });
    delete process.env['DATABASE_URL'];
  });

  function tableNames(): string[] {
    const rows = getDb().all<{ name: string }>(
      sql`SELECT name FROM sqlite_master WHERE type='table'`,
    );
    return rows.map((r) => r.name);
  }

  function columns(table: string): string[] {
    return getDb()
      .all<{ name: string }>(sql.raw(`PRAGMA table_info(${table})`))
      .map((c) => c.name);
  }

  it('creates all console tables', () => {
    const names = tableNames();
    for (const t of [
      'problems',
      'solutions',
      'jobs',
      'api_keys',
      'depots',
      'vehicles',
      'orders',
      'audit_log',
      'geocode_cache',
    ]) {
      assert.ok(names.includes(t), `missing table ${t}`);
    }
  });

  it('is idempotent — repeated runs are no-ops', async () => {
    await ensureSchema();
    await ensureSchema(); // must not throw or duplicate ALTERs
  });

  it('adds parent_id and version_label to problems', () => {
    const cols = columns('problems');
    assert.ok(cols.includes('parent_id'), 'missing problems.parent_id');
    assert.ok(cols.includes('version_label'), 'missing problems.version_label');
  });

  it('accepts registry rows with constraints enforced', () => {
    const db = getDb();

    db.run(
      sql`INSERT INTO depots (id, name, lat, lng) VALUES ('dep_t1', 'Test Depot', 12.9716, 77.5946)`,
    );
    db.run(sql`INSERT INTO vehicles (id, name, depot_id) VALUES ('veh_t1', 'Truck 1', 'dep_t1')`);
    db.run(sql`INSERT INTO orders (id, ref, lat, lng) VALUES ('ord_t1', 'REF-001', 12.9, 77.6)`);

    // unique ref
    assert.throws(() => {
      db.run(sql`INSERT INTO orders (id, ref, lat, lng) VALUES ('ord_t2', 'REF-001', 12.9, 77.6)`);
    });

    // status CHECK
    assert.throws(() => {
      db.run(sql`INSERT INTO vehicles (id, name, status) VALUES ('veh_t2', 'Truck 2', 'flying')`);
    });

    // depot delete nulls vehicle references (ON DELETE SET NULL);
    // hard blocking lives at the API layer (409 on referencing rows).
    db.run(sql`DELETE FROM depots WHERE id = 'dep_t1'`);
    const veh = getDb().get<{ depot_id: string | null }>(
      sql`SELECT depot_id FROM vehicles WHERE id = 'veh_t1'`,
    );
    assert.equal(veh.depot_id, null);
  });

  it('writes audit entries', () => {
    getDb().run(sql`
      INSERT INTO audit_log (entity, entity_id, action, actor) VALUES ('order', 'ord_t1', 'created', 'test')
    `);
    const rows = getDb().all<{ entity_id: string; actor: string }>(
      sql`SELECT * FROM audit_log WHERE entity = 'order'`,
    );
    assert.equal(rows.length, 1);
    const row = rows.at(0);
    assert.ok(row, 'expected one audit entry');
    assert.equal(row.entity_id, 'ord_t1');
    assert.equal(row.actor, 'test');
  });
});
