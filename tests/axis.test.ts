import { describe, expect, it } from 'vitest';

import { axisFromKeys } from '../src/game/util/axis';

describe('axisFromKeys', () => {
  it('returns 0 when nothing is pressed', () => {
    expect(axisFromKeys(false, false)).toBe(0);
  });

  it('returns -1 for left only', () => {
    expect(axisFromKeys(true, false)).toBe(-1);
  });

  it('returns 1 for right only', () => {
    expect(axisFromKeys(false, true)).toBe(1);
  });

  it('cancels out when both directions are held', () => {
    expect(axisFromKeys(true, true)).toBe(0);
  });
});
