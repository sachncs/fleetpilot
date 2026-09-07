import { expect } from 'chai';

import { isBrowser, isNode } from '../src/env.js';
import { asRandomSource, fromSeed, mulberry32 } from '../src/utils/rng.js';

describe('rng', () => {
  it('mulberry32 is deterministic for a fixed seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 10; i++) {
      expect(a()).to.equal(b());
    }
  });

  it('mulberry32 returns floats in [0, 1)', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).to.be.at.least(0);
      expect(v).to.be.below(1);
    }
  });

  it('int() stays within [0, n) and derives from next()', () => {
    const flips = [0.999, 0.4, 0.0];
    const src = asRandomSource(() => flips.shift() ?? 0);
    expect(src.int(10)).to.equal(9);
    expect(src.int(10)).to.equal(4);
    expect(src.int(5)).to.equal(0);

    const rng = fromSeed(123);
    for (let i = 0; i < 500; i++) {
      const v = rng.int(6);
      expect(v).to.be.at.least(0);
      expect(v).to.be.below(6);
    }
  });

  it('chance() compares next() against p', () => {
    let value = 0.5;
    const src = asRandomSource(() => value);
    expect(src.chance(0.6)).to.equal(true);
    expect(src.chance(0.4)).to.equal(false);

    value = 0.5;
    expect(src.chance(0.5)).to.equal(false);
  });
});

describe('env', () => {
  it('isNode() is true under Node', () => {
    expect(isNode()).to.equal(true);
  });

  it('isBrowser() is false under Node', () => {
    expect(isBrowser()).to.equal(false);
  });
});
