/**
 * Tiny level-gated logger. Default level is `debug` in dev (so map/network/etc.
 * detail is visible by default) and `info` in production. Override with
 * FLEETPILOT_LOG_LEVEL=debug|info|warn|error|silent.
 *
 * Safe to import from client components — in the browser, the level falls
 * back to whatever the build-time `process.env.NODE_ENV` is (debug in dev,
 * info in prod) and only console.* methods exist anyway.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

const proc: { env: Record<string, string | undefined> } =
  typeof process !== 'undefined' && process.env ? process : { env: {} };

function resolveLevel(): LogLevel {
  const env = proc.env['FLEETPILOT_LOG_LEVEL'] as LogLevel | undefined;
  if (env && env in ORDER) return env;
  return proc.env['NODE_ENV'] === 'production' ? 'info' : 'debug';
}

const threshold = ORDER[resolveLevel()];

function emit(level: LogLevel, args: unknown[]): void {
  if (ORDER[level] < threshold) return;
  const fn =
    level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  fn('[FleetPilot]', ...args);
}

export const log = {
  debug: (...args: unknown[]): void => emit('debug', args),
  info: (...args: unknown[]): void => emit('info', args),
  warn: (...args: unknown[]): void => emit('warn', args),
  error: (...args: unknown[]): void => emit('error', args),
};
