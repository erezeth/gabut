import Phaser from 'phaser';

import { createGameTextures, createPlayerAnimations } from '../assets/textures';
import { SCENES } from '../constants';
import { loadProgress } from '../systems/progress';

/**
 * Builds every texture and animation at runtime, then hands over to the menu.
 * There is no network loading step: the whole game is code and generated art.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.boot);
  }

  create(): void {
    createGameTextures(this);
    createPlayerAnimations(this);
    this.registry.set('progress', loadProgress());
    this.scene.start(SCENES.menu);
  }
}
