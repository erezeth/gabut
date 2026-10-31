/**
 * Maps a left/right key pair to a direction. Holding both cancels out, which is
 * friendlier than letting the last key pressed win.
 *
 * @returns -1 for left, 1 for right, 0 for none or both.
 */
export function axisFromKeys(left: boolean, right: boolean): -1 | 0 | 1 {
  if (left === right) return 0;
  return left ? -1 : 1;
}
