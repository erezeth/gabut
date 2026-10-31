import Phaser from 'phaser';

import { COLORS } from '../constants';

export const PLAYER_TEXTURE_WIDTH = 12;
export const PLAYER_TEXTURE_HEIGHT = 16;

/**
 * Generates the placeholder art. No files are loaded yet: every texture is drawn
 * at runtime so the build stays asset-free until the pixel art pass in M5.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.createPlayerTexture('player-1', COLORS.playerOne);
    this.createPlayerTexture('player-2', COLORS.playerTwo);

    this.scene.start('Level');
  }

  private createPlayerTexture(key: string, color: string): void {
    const graphics = this.add.graphics();

    graphics.fillStyle(Phaser.Display.Color.HexStringToColor(color).color, 1);
    graphics.fillRect(0, 0, PLAYER_TEXTURE_WIDTH, PLAYER_TEXTURE_HEIGHT);

    graphics.lineStyle(1, 0x000000, 0.35);
    graphics.strokeRect(0.5, 0.5, PLAYER_TEXTURE_WIDTH - 1, PLAYER_TEXTURE_HEIGHT - 1);

    // Two pixels on the right edge double as an eye: flipping the sprite shows facing.
    graphics.fillStyle(0x10131a, 1);
    graphics.fillRect(7, 4, 2, 2);

    graphics.generateTexture(key, PLAYER_TEXTURE_WIDTH, PLAYER_TEXTURE_HEIGHT);
    graphics.destroy();
  }
}
