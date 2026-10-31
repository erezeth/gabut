import { describe, expect, it } from 'vitest';

import { COYOTE_MS, isJumpAllowed, JUMP_BUFFER_MS } from '../src/game/systems/jump';

describe('isJumpAllowed', () => {
  it('allows a jump pressed while standing on the ground', () => {
    expect(isJumpAllowed(1000, 1000, 1000)).toBe(true);
  });

  it('allows a jump inside the coyote window after leaving a ledge', () => {
    expect(isJumpAllowed(1000, 1000 - (COYOTE_MS - 1), 995)).toBe(true);
  });

  it('rejects a jump after the coyote window expires', () => {
    expect(isJumpAllowed(1000, 1000 - (COYOTE_MS + 1), 1000 - (JUMP_BUFFER_MS + 1))).toBe(false);
  });

  it('fires a buffered jump pressed just before landing', () => {
    expect(isJumpAllowed(1000, Number.NEGATIVE_INFINITY, 1000 - (JUMP_BUFFER_MS - 1))).toBe(true);
  });

  it('ignores a jump buffered too long ago', () => {
    expect(isJumpAllowed(1000, Number.NEGATIVE_INFINITY, 1000 - (JUMP_BUFFER_MS + 1))).toBe(false);
  });

  it('never jumps without a jump request, even while grounded', () => {
    expect(isJumpAllowed(1000, 1000, null)).toBe(false);
  });

  it('never jumps in mid-air without a request', () => {
    expect(isJumpAllowed(1000, Number.NEGATIVE_INFINITY, null)).toBe(false);
  });
});
