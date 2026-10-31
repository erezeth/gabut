import type Phaser from 'phaser';

import { computeCameraView, type CameraOptions, type LevelSize, type ViewportSize } from './cameraView';

/**
 * Applies {@link computeCameraView} to a Phaser camera with smoothing, so the
 * view glides instead of snapping when players separate.
 */
export class SharedCamera {
  private readonly camera: Phaser.Cameras.Scene2D.Camera;
  private readonly level: LevelSize;
  private readonly viewport: ViewportSize;
  private readonly options: CameraOptions;

  private zoom: number;
  private scrollX: number;
  private scrollY: number;

  constructor(
    camera: Phaser.Cameras.Scene2D.Camera,
    level: LevelSize,
    viewport: ViewportSize,
    options: CameraOptions = {},
  ) {
    this.camera = camera;
    this.level = level;
    this.viewport = viewport;
    this.options = options;

    const initial = computeCameraView([], level, viewport, options);
    this.zoom = initial.zoom;
    this.scrollX = initial.scrollX;
    this.scrollY = initial.scrollY;
    this.apply();
  }

  update(points: ReadonlyArray<{ x: number; y: number }>, deltaMs: number): void {
    const target = computeCameraView(points, this.level, this.viewport, this.options);
    const smoothing = 1 - Math.exp(-Math.min(deltaMs, 50) / 110);

    this.zoom += (target.zoom - this.zoom) * smoothing;
    this.scrollX += (target.scrollX - this.scrollX) * smoothing;
    this.scrollY += (target.scrollY - this.scrollY) * smoothing;

    this.apply();
  }

  snap(points: ReadonlyArray<{ x: number; y: number }>): void {
    const target = computeCameraView(points, this.level, this.viewport, this.options);
    this.zoom = target.zoom;
    this.scrollX = target.scrollX;
    this.scrollY = target.scrollY;
    this.apply();
  }

  /** Small punch-in used when a level is cleared. */
  punch(amount = 0.04, duration = 220): void {
    this.camera.zoomTo(this.camera.zoom + amount, duration, 'Sine.easeOut');
  }

  shake(duration = 140, intensity = 0.004): void {
    this.camera.shake(duration, intensity);
  }

  get worldView(): Phaser.Geom.Rectangle {
    return this.camera.worldView;
  }

  private apply(): void {
    this.camera.setZoom(this.zoom);
    this.camera.setScroll(this.scrollX, this.scrollY);
  }
}
