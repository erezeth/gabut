import Phaser from 'phaser';

import { TEX } from '../assets/textures';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, SCENES } from '../constants';
import { addBackdrop, addDivider } from '../ui/backdrop';
import { addPanel, textStyle } from '../ui/theme';

const BULLETS = [
  'Plates open a door only while held down.',
  'A crate is heavy enough to hold a plate.',
  'Levers stay flipped once touched.',
  'Spikes or falling restart the level.',
  'Both players must touch the exit.',
];

/**
 * Static reference screen: controls for both keyboard halves, the five puzzle
 * rules, and a compact legend of every mechanic.
 */
export class HowToScene extends Phaser.Scene {
  private backKey?: Phaser.Input.Keyboard.Key;
  private enterKey?: Phaser.Input.Keyboard.Key;
  private spaceKey?: Phaser.Input.Keyboard.Key;

  constructor() {
    super(SCENES.howTo);
  }

  create(): void {
    addBackdrop(this);

    const back = this.add
      .text(16, 12, '‹ BACK', textStyle(8, COLORS.muted))
      .setInteractive({ useHandCursor: true });
    back.on('pointerover', () => back.setColor(COLORS.accent));
    back.on('pointerout', () => back.setColor(COLORS.muted));
    back.on('pointerdown', () => this.scene.start(SCENES.menu));

    this.add
      .text(GAME_WIDTH / 2, 20, 'HOW TO PLAY', {
        ...textStyle(16, COLORS.text),
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    addDivider(this, 42, 440);

    this.add
      .text(20, 52, 'CONTROLS', textStyle(8, COLORS.accent))
      .setOrigin(0, 0);

    this.add
      .text(20, 68, 'PLAYER 1', { ...textStyle(8, COLORS.playerOne), fontStyle: 'bold' })
      .setOrigin(0, 0);
    this.add
      .text(20, 82, 'A / D  move     ·     W / Space  jump', textStyle(7, '#a7b4c7'))
      .setOrigin(0, 0);

    this.add
      .text(20, 102, 'PLAYER 2', { ...textStyle(8, COLORS.playerTwo), fontStyle: 'bold' })
      .setOrigin(0, 0);
    this.add
      .text(20, 116, '← / →  move     ·     ↑ / Enter  jump', textStyle(7, '#a7b4c7'))
      .setOrigin(0, 0);

    this.add
      .text(20, 138, 'GENERAL', { ...textStyle(8, '#a7b4c7'), fontStyle: 'bold' })
      .setOrigin(0, 0);
    this.add
      .text(20, 151, 'R retry  ·  Esc pause  ·  M sound', textStyle(7, '#a7b4c7'))
      .setOrigin(0, 0);

    this.add
      .text(248, 52, 'PUZZLE RULES', textStyle(8, COLORS.accent))
      .setOrigin(0, 0);

    BULLETS.forEach((text, index) => {
      this.add
        .text(248, 68 + index * 16, `·  ${text}`, {
          ...textStyle(7, '#a7b4c7'),
          wordWrap: { width: 216 },
          lineSpacing: 2,
        })
        .setOrigin(0, 0);
    });

    this.buildLegend();

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 12,
        'ENTER / SPACE / ESC — BACK      ·      EVERY SPRITE AND SOUND IS GENERATED IN CODE',
        textStyle(6, '#4b5568'),
      )
      .setOrigin(0.5, 1);

    const keyboard = this.input.keyboard;
    if (keyboard) {
      this.backKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
      this.enterKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
      this.spaceKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }
  }

  override update(): void {
    const pressed = [this.backKey, this.enterKey, this.spaceKey].some(
      (key) => key !== undefined && Phaser.Input.Keyboard.JustDown(key),
    );
    if (pressed) this.scene.start(SCENES.menu);
  }

  private buildLegend(): void {
    addPanel(this, 16, 166, 448, 62).setDepth(1);

    const items: Array<{
      x: number;
      icon: string;
      iconY: number;
      tint?: number;
      label: string;
      detail: string;
    }> = [
      { x: 64, icon: TEX.plateOff, iconY: 184, label: 'PLATE', detail: 'holds a door' },
      { x: 152, icon: TEX.door, iconY: 181, tint: 0x4cc9f0, label: 'DOOR', detail: 'same letter' },
      { x: 240, icon: TEX.crate, iconY: 181, label: 'CRATE', detail: 'weighs it down' },
      { x: 328, icon: TEX.switchOn, iconY: 181, tint: 0x7cf2c8, label: 'LEVER', detail: 'stays on' },
      { x: 416, icon: TEX.exit, iconY: 182, label: 'EXIT', detail: 'both players' },
    ];

    for (const item of items) {
      this.add
        .image(item.x, item.iconY, item.icon)
        .setTint(item.tint ?? 0xffffff)
        .setDepth(2);
      this.add
        .text(item.x, 198, item.label, textStyle(6, COLORS.accent))
        .setOrigin(0.5, 0)
        .setDepth(2);
      this.add
        .text(item.x, 208, item.detail, textStyle(6, COLORS.muted))
        .setOrigin(0.5, 0)
        .setDepth(2);
    }

    for (const x of [108, 196, 284, 372]) {
      this.add.rectangle(x, 196, 1, 46, 0x35425f, 0.5).setDepth(2);
    }
  }
}
