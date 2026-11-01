import type Phaser from 'phaser';

import { COLORS, GAME_HEIGHT, GAME_WIDTH, RENDER_SCALE } from '../constants';

/** One text style shared by every scene, so the UI stays consistent. */
export function textStyle(
  size: number,
  color: string = COLORS.text,
): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: 'ui-monospace, Consolas, monospace',
    fontSize: `${size}px`,
    color,
    // Rasterise glyphs at the render scale; without this the text is drawn at
    // design size and magnified, which is what made the UI look blurry.
    resolution: RENDER_SCALE,
  };
}

/**
 * Menus and the HUD lay out in the 480x270 design grid. Zooming the scene
 * camera by the render scale keeps those coordinates and fills the bigger
 * canvas at the same time.
 */
export function zoomUiCamera(scene: Phaser.Scene): void {
  scene.cameras.main.setZoom(RENDER_SCALE).centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
}

/** Dim, full-screen rectangle used behind menus and overlays. */
export function addDimmer(scene: Phaser.Scene, alpha = 0.72): Phaser.GameObjects.Rectangle {
  return scene.add
    .rectangle(0, 0, scene.scale.width, scene.scale.height, 0x05070c, alpha)
    .setOrigin(0);
}

/** Panel with a subtle border, used for pause and completion windows. */
export function addPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
): Phaser.GameObjects.Graphics {
  const panel = scene.add.graphics();
  panel.fillStyle(COLORS.panel, 0.97);
  panel.fillRoundedRect(x, y, width, height, 4);
  panel.lineStyle(1, COLORS.panelEdge, 1);
  panel.strokeRoundedRect(x + 0.5, y + 0.5, width - 1, height - 1, 4);
  panel.lineStyle(1, 0x000000, 0.5);
  panel.strokeRoundedRect(x + 2.5, y + 2.5, width - 5, height - 5, 3);
  return panel;
}

export function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, ms) / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const hundredths = Math.floor((totalSeconds * 100) % 100);

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(
    hundredths,
  ).padStart(2, '0')}`;
}
