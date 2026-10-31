/**
 * Forgiveness windows that make a platformer feel fair:
 * - coyote time: you may still jump shortly after walking off a ledge;
 * - jump buffer: a jump pressed just before landing fires on touchdown.
 *
 * All values are in milliseconds.
 */
export const COYOTE_MS = 100;
export const JUMP_BUFFER_MS = 120;

/**
 * Decides whether a jump should start on this frame.
 *
 * Returns `false` whenever there is no buffered jump request, so it is safe to
 * call every frame regardless of input state.
 *
 * @param now            current scene time
 * @param lastGroundedAt last time the player was touching ground (`-Infinity` if never)
 * @param jumpPressedAt  time of the buffered jump press (`null` if none)
 */
export function isJumpAllowed(
  now: number,
  lastGroundedAt: number,
  jumpPressedAt: number | null,
  coyoteMs: number = COYOTE_MS,
  jumpBufferMs: number = JUMP_BUFFER_MS,
): boolean {
  if (jumpPressedAt === null) return false;

  const withinCoyote = now - lastGroundedAt <= coyoteMs;
  const withinBuffer = now - jumpPressedAt <= jumpBufferMs;

  return withinCoyote || withinBuffer;
}
