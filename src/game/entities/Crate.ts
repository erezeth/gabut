import Phaser from 'phaser';

import { TEX } from '../assets/textures';
import { PHYSICS } from '../constants';

const CRATE_SIZE = 14;
const MAX_SPEED_X = 78;

/**
 * Pushable crate that can weigh down pressure plates. Arcade's `pushable` flag
 * lets a player shove it without any custom force code.
 */
export class Crate extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TEX.crate);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(CRATE_SIZE, CRATE_SIZE);
    body.setOffset(0, 0);
    body.setDragX(1100);
    body.setMaxVelocity(MAX_SPEED_X, PHYSICS.maxFallSpeed);
    body.setMass(2.5);
    body.setBounce(0, 0);
    body.pushable = true;
  }
}
