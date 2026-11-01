import Phaser from 'phaser';

import { TEX } from '../assets/textures';
import { PHYSICS } from '../constants';
import { isDown, type PlayerInput } from '../systems/input';
import { isJumpAllowed } from '../systems/jump';
import { axisFromKeys } from '../util/axis';

export interface PlayerHooks {
  onJump?: (player: Player) => void;
  onLand?: (player: Player) => void;
}

/**
 * One co-op player. Input bindings are injected, so the same class serves P1, P2
 * and future gamepads. Movement tuning lives in PHYSICS so both players match.
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  readonly playerIndex: 1 | 2;

  private readonly controls: PlayerInput;
  private readonly hooks: PlayerHooks;

  private lastGroundedAt = Number.NEGATIVE_INFINITY;
  private jumpPressedAt: number | null = null;
  private wasJumpDown = false;
  private wasGrounded = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    playerIndex: 1 | 2,
    controls: PlayerInput,
    hooks: PlayerHooks = {},
  ) {
    super(scene, x, y, TEX.player[playerIndex].idle);

    this.playerIndex = playerIndex;
    this.controls = controls;
    this.hooks = hooks;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setMaxVelocity(PHYSICS.maxSpeedX, PHYSICS.maxFallSpeed);
    this.setDragX(PHYSICS.drag);

    const body = this.body as Phaser.Physics.Arcade.Body;
    // Texture is 12x16; a slightly narrower body avoids catching on tile seams.
    body.setSize(10, 16).setOffset(1, 0);
    // If both bodies are pushable Phaser averages their velocities, which makes
    // a heavy crate crawl. Players stay put and transfer their full speed to the
    // crate instead, so pushing feels direct.
    body.pushable = false;
  }

  override update(time: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const grounded = body.blocked.down || body.touching.down;

    if (grounded) {
      this.lastGroundedAt = time;
    }
    if (grounded && !this.wasGrounded) {
      this.hooks.onLand?.(this);
    }
    this.wasGrounded = grounded;

    const jumpDown = isDown(this.controls.jump) || this.controls.touch.jump;
    const jumpJustPressed = jumpDown && !this.wasJumpDown;
    const jumpJustReleased = !jumpDown && this.wasJumpDown;
    this.wasJumpDown = jumpDown;

    // Only the press edge arms the buffer. Re-arming while the key is held would
    // let a held jump fire again the moment the player leaves the ground.
    if (jumpJustPressed) {
      this.jumpPressedAt = time;
    }

    const direction = axisFromKeys(
      this.controls.left.isDown || this.controls.touch.left,
      this.controls.right.isDown || this.controls.touch.right,
    );

    if (direction === 0) {
      this.setAccelerationX(0);
    } else {
      this.setAccelerationX(
        direction * (grounded ? PHYSICS.acceleration : PHYSICS.airAcceleration),
      );
      this.setFlipX(direction < 0);
    }

    if (isJumpAllowed(time, this.lastGroundedAt, this.jumpPressedAt)) {
      this.setVelocityY(PHYSICS.jumpVelocity);
      this.jumpPressedAt = null;
      // Prevent a second jump from the same buffer entry.
      this.lastGroundedAt = Number.NEGATIVE_INFINITY;
      this.hooks.onJump?.(this);
    } else if (jumpJustReleased && body.velocity.y < 0) {
      this.setVelocityY(body.velocity.y * PHYSICS.jumpCut);
    }

    this.updateAnimation(grounded, body.velocity.x);
  }

  private updateAnimation(grounded: boolean, velocityX: number): void {
    const textures = TEX.player[this.playerIndex];

    if (!grounded) {
      this.anims.stop();
      this.setTexture(textures.jump);
      return;
    }

    if (Math.abs(velocityX) > 12) {
      const walkKey = `walk-${this.playerIndex}`;
      if (this.anims.currentAnim?.key !== walkKey) {
        this.play(walkKey, true);
      }
      return;
    }

    this.anims.stop();
    this.setTexture(textures.idle);
  }

  /** Teleports back to a spawn point and clears all momentum. */
  respawnAt(x: number, y: number): void {
    this.setPosition(x, y);
    this.setVelocity(0, 0);
    this.setAcceleration(0, 0);
    this.lastGroundedAt = Number.NEGATIVE_INFINITY;
    this.jumpPressedAt = null;
    this.wasJumpDown = false;
    this.wasGrounded = false;
  }
}
