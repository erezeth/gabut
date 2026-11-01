import Phaser from 'phaser';

import { touchPads, type TouchPad } from './touch';

/** Keys for one player. Two keyboards worth of keys, shared on one device. */
export interface PlayerInput {
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  /** Multiple accepted jump keys, e.g. Space and W for P1. */
  jump: Phaser.Input.Keyboard.Key[];
  /** Thumb-pad state on touch devices; always all false on desktop. */
  touch: TouchPad;
}

const { KeyCodes } = Phaser.Input.Keyboard;

/**
 * Creates the key maps for both players from a single source of truth. Keeping
 * this in one place avoids two players silently binding the same key.
 */
export function createPlayerInput(scene: Phaser.Scene): [PlayerInput, PlayerInput] {
  const keyboard = scene.input.keyboard;
  if (!keyboard) {
    throw new Error('Keyboard input plugin is not available');
  }

  const key = (code: number): Phaser.Input.Keyboard.Key => keyboard.addKey(code, true, false);

  const playerOne: PlayerInput = {
    left: key(KeyCodes.A),
    right: key(KeyCodes.D),
    jump: [key(KeyCodes.SPACE), key(KeyCodes.W)],
    touch: touchPads[0],
  };

  const playerTwo: PlayerInput = {
    left: key(KeyCodes.LEFT),
    right: key(KeyCodes.RIGHT),
    jump: [key(KeyCodes.UP), key(KeyCodes.ENTER)],
    touch: touchPads[1],
  };

  // Stop the browser from scrolling when the arrows or space bar are pressed.
  keyboard.addCapture([KeyCodes.LEFT, KeyCodes.RIGHT, KeyCodes.UP, KeyCodes.DOWN, KeyCodes.SPACE]);

  return [playerOne, playerTwo];
}

export function isDown(keys: Phaser.Input.Keyboard.Key[]): boolean {
  return keys.some((k) => k.isDown);
}
