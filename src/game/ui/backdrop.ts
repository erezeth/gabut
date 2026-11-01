import Phaser from 'phaser';

import { TEX } from '../assets/textures';
import { GAME_HEIGHT, GAME_WIDTH } from '../constants';

/**
 * Shared animated backdrop for every menu screen: gradient, faint grid, slow
 * rising dust and a vignette. All objects sit behind the UI layer.
 */
export function addBackdrop(scene: Phaser.Scene): void {
  scene.add
    .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, TEX.gradient)
    .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
    .setDepth(-20);

  scene.add
    .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, TEX.background)
    .setOrigin(0)
    .setDepth(-19)
    .setAlpha(0.38);

  scene.add
    .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, TEX.vignette)
    .setDepth(-5)
    .setAlpha(0.9);

  scene.add
    .particles(0, 0, TEX.particle, {
      lifespan: { min: 3200, max: 6400 },
      speedX: { min: -5, max: 5 },
      speedY: { min: -9, max: -2 },
      scale: { start: 0.7, end: 0 },
      alpha: { start: 0.38, end: 0 },
      frequency: 230,
      quantity: 1,
      emitZone: {
        type: 'random',
        source: {
          getRandomPoint: (point) => {
            point.x = Math.random() * GAME_WIDTH;
            point.y = Math.random() * GAME_HEIGHT;
          },
        },
      },
      tint: [0x7db2ff, 0xffd166, 0x9fe8d5],
    })
    .setDepth(-10)
    .setBlendMode(Phaser.BlendModes.ADD);
}

/** Draws a thin horizontal rule with a diamond in the middle. */
export function addDivider(
  scene: Phaser.Scene,
  y: number,
  width = 320,
): Phaser.GameObjects.Graphics {
  const graphics = scene.add.graphics();
  const half = width / 2;
  graphics.lineStyle(1, 0x35425f, 0.7);
  graphics.lineBetween(GAME_WIDTH / 2 - half, y, GAME_WIDTH / 2 - 8, y);
  graphics.lineBetween(GAME_WIDTH / 2 + 8, y, GAME_WIDTH / 2 + half, y);
  graphics.fillStyle(0xffd166, 0.8);
  graphics.fillPoints(
    [
      new Phaser.Math.Vector2(GAME_WIDTH / 2, y - 3),
      new Phaser.Math.Vector2(GAME_WIDTH / 2 + 3, y),
      new Phaser.Math.Vector2(GAME_WIDTH / 2, y + 3),
      new Phaser.Math.Vector2(GAME_WIDTH / 2 - 3, y),
    ],
    true,
  );
  return graphics;
}
