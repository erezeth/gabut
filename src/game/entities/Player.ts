import Phaser from 'phaser';

import { axisFromKeys } from '../util/axis';
import type { PlayerInput } from '../systems/input';
import { isDown } from '../systems/input';
import { isJumpAllowed } from '../systems/jump';

/** Horizontal top speed in world units per second. */
const MAX_SPEED_X = 120;
const ACCELERATION = 900;
const DRAG = 900;
/** Air control is weaker than ground acceleration; keeps air movement deliberate. */
const AIR_ACCELERATION = 620;
const JUMP_VELOCITY = -340;
/** Releasing jump early shortens the hop. */
const JUMP_CUT = 0.45;
const MAX_FALL_SPEED = 520;

/**
 * A single co-op player. Owns no input bindings itself: it receives a
 * {@link PlayerInput} so the same class works for P1, P2 and future gamepad support.
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  readonly playerIndex: 1 | 2;

  private readonly controls: PlayerInput;
  private lastGroundedAt = Number.NEGATIVE_INFINITY;
  private jumpPressedAt: number | null = null;
  private wasJumpDown = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    playerIndex: 1 | 2,
    controls: PlayerInput,
  ) {
    super(scene, x, y, texture);

    this.playerIndex = playerIndex;
    this.controls = controls;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setMaxVelocity(MAX_SPEED_X, MAX_FALL_SPEED);
    this.setDragX(DRAG);

    const body = this.body as Phaser.Physics.Arcade.Body;
    // Texture is 12x16; a slightly narrower body avoids catching on tile seams.
    body.setSize(10, 16).setOffset(1, 0);
  }

  override update(time: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const grounded = body.blocked.down || body.touching.down;

    if (grounded) {
      this.lastGroundedAt = time;
    }

    const jumpDown = isDown(this.controls.jump);
    const jumpJustPressed = jumpDown && !this.wasJumpDown;
    const jumpJustReleased = !jumpDown && this.wasJumpDown;
    this.wasJumpDown = jumpDown;

    // Only the press edge arms the buffer. Re-arming while the key is held would
    // let a held jump fire again the moment the player leaves the ground.
    if (jumpJustPressed) {
      this.jumpPressedAt = time;
    }

    const direction = axisFromKeys(this.controls.left.isDown, this.controls.right.isDown);

    if (direction === 0) {
      this.setAccelerationX(0);
    } else {
      this.setAccelerationX(direction * (grounded ? ACCELERATION : AIR_ACCELERATION));
      this.setFlipX(direction < 0);
    }

    if (isJumpAllowed(time, this.lastGroundedAt, this.jumpPressedAt)) {
      this.setVelocityY(JUMP_VELOCITY);
      this.jumpPressedAt = null;
      // Prevent a second jump from the same buffer entry.
      this.lastGroundedAt = Number.NEGATIVE_INFINITY;
    } else if (jumpJustReleased && body.velocity.y < 0) {
      this.setVelocityY(body.velocity.y * JUMP_CUT);
    }
  }

  /** Teleports back to a spawn point and clears all momentum. */
  respawnAt(x: number, y: number): void {
    this.setPosition(x, y);
    this.setVelocity(0, 0);
    this.setAcceleration(0, 0);
    this.lastGroundedAt = Number.NEGATIVE_INFINITY;
    this.jumpPressedAt = null;
    this.wasJumpDown = false;
  }
}
