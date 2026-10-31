/**
 * Restricts `value` to the inclusive range [min, max].
 *
 * Used by the shared camera to keep zoom levels and scroll targets inside the
 * bounds of the level, and by gameplay tuning code.
 *
 * @throws RangeError when `min` is greater than `max`, which almost always
 * means the caller mixed up the arguments.
 */
export function clamp(value: number, min: number, max: number): number {
  if (min > max) {
    throw new RangeError(`clamp: min (${min}) must not be greater than max (${max})`);
  }

  return Math.min(Math.max(value, min), max);
}
