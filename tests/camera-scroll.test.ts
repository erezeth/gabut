import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';

import { SharedCamera } from '../src/game/systems/camera';

/**
 * Phaser centres zoom on the viewport, so the camera scroll is not the world
 * view's top-left once zoom drops below 1. This guards the compensation that
 * keeps both players in frame on a wide level.
 */
describe('SharedCamera', () => {
  it('applies scroll so the visible world matches the computed view', () => {
    const state = { zoom: 1, scrollX: 0, scrollY: 0 };
    const camera = {
      setZoom(zoom: number) {
        state.zoom = zoom;
      },
      setScroll(x: number, y: number) {
        state.scrollX = x;
        state.scrollY = y;
      },
    } as unknown as Phaser.Cameras.Scene2D.Camera;

    const viewport = { width: 480, height: 270 };
    const rig = new SharedCamera(camera, { width: 576, height: 272 }, viewport);

    // Far apart on the 576px finale: the camera zooms out and centres the level.
    rig.snap([
      { x: 40, y: 248 },
      { x: 550, y: 248 },
    ]);

    const worldX = state.scrollX + (viewport.width - viewport.width / state.zoom) / 2;
    const worldY = state.scrollY + (viewport.height - viewport.height / state.zoom) / 2;

    expect(state.zoom).toBeCloseTo(480 / 606, 5);
    expect(worldX).toBeCloseTo(-15, 5);
    expect(worldY).toBeCloseTo(-34.4375, 4);
  });

  it('keeps the same framing when the canvas renders at 2x', () => {
    const state = { zoom: 1, scrollX: 0, scrollY: 0 };
    const camera = {
      setZoom(zoom: number) {
        state.zoom = zoom;
      },
      setScroll(x: number, y: number) {
        state.scrollX = x;
        state.scrollY = y;
      },
    } as unknown as Phaser.Cameras.Scene2D.Camera;

    const viewport = { width: 480, height: 270 };
    const scale = 2;
    const rig = new SharedCamera(camera, { width: 576, height: 272 }, viewport, {}, scale);

    rig.snap([
      { x: 40, y: 248 },
      { x: 550, y: 248 },
    ]);

    const renderWidth = viewport.width * scale;
    const renderHeight = viewport.height * scale;
    const worldX = state.scrollX + (renderWidth - renderWidth / state.zoom) / 2;
    const worldY = state.scrollY + (renderHeight - renderHeight / state.zoom) / 2;

    // The camera zoom doubles with the render buffer, but the visible world does not.
    expect(state.zoom).toBeCloseTo((480 / 606) * scale, 5);
    expect(worldX).toBeCloseTo(-15, 5);
    expect(worldY).toBeCloseTo(-34.4375, 4);
  });
});
