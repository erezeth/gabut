import Phaser from 'phaser';

import { COLORS, GAME_HEIGHT, GAME_WIDTH, TILE_SIZE } from '../constants';

const P1_KEYS = 'W A S D + SPACE';
const P2_KEYS = 'ARROWS + ENTER';

/**
 * M0 sandbox scene. It exists to prove the render pipeline works: fixed
 * internal resolution, grid, and the two player slots with their key maps.
 * Real gameplay scenes replace it from M1 onwards.
 */
export class SandboxScene extends Phaser.Scene {
  constructor() {
    super('Sandbox');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.background);

    this.drawGrid();
    this.drawFrame();

    this.add
      .text(GAME_WIDTH / 2, 40, 'COOP PUZZLE', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: COLORS.text,
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 56, 'M0 scaffold — M1 adds movement', {
        fontFamily: 'monospace',
        fontSize: '7px',
        color: COLORS.textMuted,
      })
      .setOrigin(0.5);

    this.createPlayerSlot(GAME_WIDTH * 0.3, GAME_HEIGHT * 0.62, COLORS.playerOne, 'P1', P1_KEYS);
    this.createPlayerSlot(GAME_WIDTH * 0.7, GAME_HEIGHT * 0.62, COLORS.playerTwo, 'P2', P2_KEYS);

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 14,
        `${GAME_WIDTH}x${GAME_HEIGHT} · ${TILE_SIZE}px tiles · scale FIT`,
        {
          fontFamily: 'monospace',
          fontSize: '7px',
          color: COLORS.textMuted,
        },
      )
      .setOrigin(0.5);
  }

  private drawGrid(): void {
    const grid = this.add.graphics();
    grid.lineStyle(1, Phaser.Display.Color.HexStringToColor(COLORS.grid).color, 1);

    for (let x = 0; x <= GAME_WIDTH; x += TILE_SIZE) {
      grid.lineBetween(x, 0, x, GAME_HEIGHT);
    }

    for (let y = 0; y <= GAME_HEIGHT; y += TILE_SIZE) {
      grid.lineBetween(0, y, GAME_WIDTH, y);
    }
  }

  private drawFrame(): void {
    const frame = this.add.graphics();
    frame.lineStyle(1, Phaser.Display.Color.HexStringToColor(COLORS.textMuted).color, 0.5);
    frame.strokeRect(0.5, 0.5, GAME_WIDTH - 1, GAME_HEIGHT - 1);
  }

  private createPlayerSlot(x: number, y: number, color: string, label: string, keys: string): void {
    const body = this.add.rectangle(x, y, 12, 20, Phaser.Display.Color.HexStringToColor(color).color);
    body.setStrokeStyle(1, 0x000000, 0.35);

    this.add
      .text(x, y - 22, label, {
        fontFamily: 'monospace',
        fontSize: '8px',
        color,
      })
      .setOrigin(0.5);

    this.add
      .text(x, y + 22, keys, {
        fontFamily: 'monospace',
        fontSize: '6px',
        color: COLORS.textMuted,
        align: 'center',
      })
      .setOrigin(0.5, 0);
  }
}
