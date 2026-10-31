import { clamp } from '../util/clamp';

export interface ViewportSize {
  width: number;
  height: number;
}

export interface LevelSize {
  width: number;
  height: number;
}

export interface CameraView {
  centerX: number;
  centerY: number;
  scrollX: number;
  scrollY: number;
  zoom: number;
}

export interface CameraOptions {
  /** Extra world units kept visible around the players. */
  paddingX?: number;
  paddingY?: number;
  minZoom?: number;
  maxZoom?: number;
}

const DEFAULTS = {
  paddingX: 48,
  paddingY: 40,
  minZoom: 0.62,
  maxZoom: 1,
} as const;

/**
 * Computes the camera needed to keep every player on screen at a comfortable
 * zoom. Kept free of Phaser imports so it can be unit-tested in plain Node.
 *
 * The zoom is the tighter of the horizontal and vertical fits, clamped between
 * minZoom (see a lot of the level) and maxZoom (native pixel scale). Scroll is
 * clamped to the level so the camera never shows the void.
 */
export function computeCameraView(
  points: ReadonlyArray<{ x: number; y: number }>,
  level: LevelSize,
  viewport: ViewportSize,
  options: CameraOptions = {},
): CameraView {
  const paddingX = options.paddingX ?? DEFAULTS.paddingX;
  const paddingY = options.paddingY ?? DEFAULTS.paddingY;
  const minZoom = options.minZoom ?? DEFAULTS.minZoom;
  const maxZoom = options.maxZoom ?? DEFAULTS.maxZoom;

  const fallback = { x: level.width / 2, y: level.height / 2 };
  const first = points[0] ?? fallback;

  let minX = first.x;
  let maxX = first.x;
  let minY = first.y;
  let maxY = first.y;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }

  const requiredWidth = Math.max(160, maxX - minX + paddingX * 2);
  const requiredHeight = Math.max(120, maxY - minY + paddingY * 2);

  const zoom = clamp(
    Math.min(viewport.width / requiredWidth, viewport.height / requiredHeight),
    minZoom,
    maxZoom,
  );

  const viewWidth = viewport.width / zoom;
  const viewHeight = viewport.height / zoom;

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  const scrollX =
    level.width <= viewWidth
      ? (level.width - viewWidth) / 2
      : clamp(centerX - viewWidth / 2, 0, level.width - viewWidth);

  const scrollY =
    level.height <= viewHeight
      ? (level.height - viewHeight) / 2
      : clamp(centerY - viewHeight / 2, 0, level.height - viewHeight);

  return { centerX, centerY, scrollX, scrollY, zoom };
}
