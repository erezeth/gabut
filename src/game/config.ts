import Phaser from 'phaser';

import { COLORS, GAME_HEIGHT, GAME_WIDTH, PHYSICS } from './constants';
import { BootScene } from './scenes/BootScene';
import { HowToScene } from './scenes/HowToScene';
import { HudScene } from './scenes/HudScene';
import { LevelScene } from './scenes/LevelScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { MenuScene } from './scenes/MenuScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: COLORS.background,
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: PHYSICS.gravityY },
      debug: false,
    },
  },
  scene: [BootScene, MenuScene, LevelSelectScene, HowToScene, LevelScene, HudScene],
};
