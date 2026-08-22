import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const problems = sqliteTable('problems', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  problemJson: text('problem_json').notNull(),
  nodeCount: integer('node_count').notNull(),
  customerCount: integer('customer_count').notNull(),
  vehicleCount: integer('vehicle_count').notNull(),
  parentId: text('parent_id'),
  versionLabel: text('version_label'),
  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const solutions = sqliteTable('solutions', {
  id: text('id').primaryKey(),
  problemId: text('problem_id')
    .notNull()
    .references(() => problems.id, { onDelete: 'cascade' }),
  solutionJson: text('solution_json').notNull(),
  makespan: integer('makespan').notNull(),
  totalDistance: integer('total_distance').notNull(),
  totalCost: integer('total_cost').notNull(),
  totalCo2: integer('total_co2').notNull(),
  feasible: integer('feasible', { mode: 'boolean' }).notNull(),
  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const jobs = sqliteTable('jobs', {
  id: text('id').primaryKey(),
  problemId: text('problem_id')
    .notNull()
    .references(() => problems.id, { onDelete: 'cascade' }),
  status: text('status', {
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
  })
    .notNull()
    .default('pending'),
  solverOptionsJson: text('solver_options_json').notNull(),
  progressJson: text('progress_json'),
  solutionId: text('solution_id').references(() => solutions.id),
  error: text('error'),
  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  startedAt: text('started_at'),
  completedAt: text('completed_at'),
});

export const apiKeys = sqliteTable('api_keys', {
  id: text('id').primaryKey(),
  keyHash: text('key_hash').notNull().unique(),
  name: text('name').notNull(),
  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  lastUsedAt: text('last_used_at'),
});

export const depots = sqliteTable('depots', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  lat: real('lat').notNull(),
  lng: real('lng').notNull(),
  region: text('region'),
  notes: text('notes'),
  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const vehicles = sqliteTable('vehicles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  status: text('status', { enum: ['active', 'maintenance', 'retired'] })
    .notNull()
    .default('active'),
  capacityKg: integer('capacity_kg'),
  costPerKm: real('cost_per_km'),
  co2PerKm: real('co2_per_km'),
  depotId: text('depot_id').references(() => depots.id, { onDelete: 'set null' }),
  region: text('region'),
  notes: text('notes'),
  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  ref: text('ref').notNull().unique(),
  kind: text('kind', { enum: ['pickup', 'delivery', 'pair'] })
    .notNull()
    .default('pickup'),
  pairRefId: text('pair_ref_id'),
  priority: integer('priority').notNull().default(3),
  windowStart: text('window_start'),
  windowEnd: text('window_end'),
  processingMin: integer('processing_min').notNull().default(0),
  quantity: real('quantity').notNull().default(0),
  lat: real('lat').notNull(),
  lng: real('lng').notNull(),
  status: text('status', { enum: ['unassigned', 'planned', 'exception'] })
    .notNull()
    .default('unassigned'),
  problemId: text('problem_id').references(() => problems.id, { onDelete: 'set null' }),
  region: text('region'),
  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const auditLog = sqliteTable('audit_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entity: text('entity').notNull(),
  entityId: text('entity_id').notNull(),
  action: text('action').notNull(),
  actor: text('actor').notNull(),
  payloadJson: text('payload_json'),
  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const geocodeCache = sqliteTable('geocode_cache', {
  queryHash: text('query_hash').primaryKey(),
  resultsJson: text('results_json').notNull(),
  provider: text('provider').notNull().default('nominatim'),
  fetchedAt: text('fetched_at').notNull(),
});
