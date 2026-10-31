import { describe, expect, it } from 'vitest';

import { clamp } from '../src/game/util/clamp';

describe('clamp', () => {
  it('returns the value when it is inside the range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('returns the lower bound when the value is below it', () => {
    expect(clamp(-3, 0, 10)).toBe(0);
  });

  it('returns the upper bound when the value is above it', () => {
    expect(clamp(42, 0, 10)).toBe(10);
  });

  it('supports ranges that are a single point', () => {
    expect(clamp(7, 4, 4)).toBe(4);
  });

  it('throws when the bounds are inverted', () => {
    expect(() => clamp(5, 10, 0)).toThrow(RangeError);
  });
});
