/**
 * Mulberry32: a fast 32-bit PRNG with reasonable statistical quality.
 * Deterministic given a fixed seed; used by solvers for reproducible runs.
 */
export function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A seedable random source. Either create one via `fromSeed(seed)` or
 * wrap an existing `() => number` with `asRandomSource(...)`.
 */
export interface RandomSource {
  /** Returns a float in [0, 1). */
  next(): number;
  /** Returns an integer in [0, n). */
  int(n: number): number;
  /** Returns true with probability p. */
  chance(p: number): boolean;
}

/**
 * Wraps a `() => number` that returns floats in [0, 1) as a RandomSource.
 * @param next - Underlying PRNG returning floats in [0, 1)
 * @returns A `RandomSource` whose `int` and `chance` derive from `next`
 */
export function asRandomSource(next: () => number): RandomSource {
  return {
    next,
    int(n: number): number {
      return Math.floor(next() * n);
    },
    chance(p: number): boolean {
      return next() < p;
    },
  };
}

/**
 * Builds a deterministic `RandomSource` from a fixed seed using mulberry32.
 * @param seed - Any 32-bit integer
 * @returns A `RandomSource` that produces the same sequence on every run
 */
export function fromSeed(seed: number): RandomSource {
  return asRandomSource(mulberry32(seed));
}