/**
 * Fixed internal render resolution. Every coordinate in the game is expressed in
 * these units; Phaser's Scale.FIT upscales the canvas to the window.
 * Changing this value changes the effective world size of every level, so keep
 * it stable once real levels exist.
 */
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;

/**
 * The canvas is rendered at twice the design size so text is rasterised at a
 * readable pixel size instead of being magnified from a 480px buffer. Cameras
 * zoom by this factor; world coordinates stay in design units.
 */
export const RENDER_SCALE = 2;
export const RENDER_WIDTH = GAME_WIDTH * RENDER_SCALE;
export const RENDER_HEIGHT = GAME_HEIGHT * RENDER_SCALE;

/** Size of one level tile in world units. */
export const TILE_SIZE = 16;

/** Player sprite footprint in world units. */
export const PLAYER_WIDTH = 12;
export const PLAYER_HEIGHT = 16;

/** Physics tuning shared by the player and the level scene. */
export const PHYSICS = {
  gravityY: 1200,
  maxSpeedX: 120,
  acceleration: 900,
  airAcceleration: 620,
  drag: 900,
  jumpVelocity: -340,
  jumpCut: 0.45,
  maxFallSpeed: 520,
} as const;

export const COLORS = {
  bgDeep: '#070a11',
  background: '#10131a',
  panel: 0x161d2c,
  panelEdge: 0x35425f,
  grid: 0x1a2030,
  text: '#e6edf3',
  muted: '#7d8899',
  playerOne: '#4cc9f0',
  playerTwo: '#f4a261',
  accent: '#ffd166',
  danger: '#ef476f',
  success: '#06d6a0',
  wall: 0x232d44,
  wallTop: 0x3b4a6b,
} as const;

export const SCENES = {
  boot: 'Boot',
  menu: 'Menu',
  levelSelect: 'LevelSelect',
  howTo: 'HowTo',
  level: 'Level',
  hud: 'Hud',
} as const;

export const STORAGE_KEYS = {
  progress: 'coop-puzzle:progress-v1',
  muted: 'coop-puzzle:muted-v1',
} as const;

/** Touch-first device: on-screen pads replace the keyboard hints. */
export const TOUCH =
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
