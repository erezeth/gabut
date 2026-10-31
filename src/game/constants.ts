/**
 * Fixed internal render resolution. Every coordinate in the game is expressed in
 * these units; Phaser's Scale.FIT upscales the canvas to the window.
 * Changing this value changes the effective world size of every level, so keep
 * it stable once real levels exist.
 */
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;

/** Size of one level tile in world units. */
export const TILE_SIZE = 16;

/** Palette shared by scenes so the placeholder art stays coherent. */
export const COLORS = {
  background: '#10131a',
  grid: '#1a2030',
  playerOne: '#4cc9f0',
  playerTwo: '#f4a261',
  text: '#e6edf3',
  textMuted: '#7d8899',
} as const;
