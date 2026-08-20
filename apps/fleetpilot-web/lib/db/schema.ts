import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const problems = sqliteTable('problems', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  problemJson: text('problem_json').notNull(),
  nodeCount: integer('node_count').notNull(),
  customerCount: integer('customer_count').notNull(),
  vehicleCount: integer('vehicle_count').notNull(),
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
