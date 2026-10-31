import { describe, expect, it } from 'vitest';

import { computeCameraView } from '../src/game/systems/cameraView';

const VIEWPORT = { width: 480, height: 270 };
const LEVEL = { width: 480, height: 272 };

describe('computeCameraView', () => {
  it('uses native zoom when the level fits on one screen', () => {
    const view = computeCameraView([{ x: 100, y: 200 }], LEVEL, VIEWPORT);
    expect(view.zoom).toBe(1);
  });

  it('zooms out to keep two distant players on screen', () => {
    const wideLevel = { width: 960, height: 272 };
    const view = computeCameraView(
      [
        { x: 40, y: 200 },
        { x: 920, y: 200 },
      ],
      wideLevel,
      VIEWPORT,
    );

    expect(view.zoom).toBeLessThan(1);
    expect(view.zoom).toBeGreaterThanOrEqual(0.62);
    expect(view.scrollX).toBeGreaterThanOrEqual(0);
    expect(view.scrollX + VIEWPORT.width / view.zoom).toBeLessThanOrEqual(wideLevel.width + 0.001);
  });

  it('never zooms out further than minZoom', () => {
    const huge = { width: 4000, height: 2000 };
    const view = computeCameraView(
      [
        { x: 0, y: 0 },
        { x: 4000, y: 2000 },
      ],
      huge,
      VIEWPORT,
      { minZoom: 0.5 },
    );

    expect(view.zoom).toBe(0.5);
  });

  it('centers levels that are smaller than the view', () => {
    const small = { width: 320, height: 180 };
    const view = computeCameraView([{ x: 160, y: 90 }], small, VIEWPORT);

    expect(view.zoom).toBe(1);
    expect(view.scrollX).toBe((small.width - VIEWPORT.width) / 2);
    expect(view.scrollY).toBe((small.height - VIEWPORT.height) / 2);
  });

  it('clamps the camera to the level bounds', () => {
    const level = { width: 960, height: 540 };
    const view = computeCameraView([{ x: 950, y: 530 }], level, VIEWPORT);
    const viewWidth = VIEWPORT.width / view.zoom;
    const viewHeight = VIEWPORT.height / view.zoom;

    expect(view.scrollX).toBeLessThanOrEqual(level.width - viewWidth + 0.001);
    expect(view.scrollY).toBeLessThanOrEqual(level.height - viewHeight + 0.001);
  });

  it('falls back to the level center without players', () => {
    const view = computeCameraView([], LEVEL, VIEWPORT);
    expect(view.zoom).toBe(1);
    expect(view.scrollX).toBe(0);
  });
});
