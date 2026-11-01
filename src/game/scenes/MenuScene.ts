import Phaser from 'phaser';

import { TEX } from '../assets/textures';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, SCENES } from '../constants';
import { LEVELS } from '../level/levels';
import { audio } from '../systems/audio';
import { isUnlocked, loadProgress, type Progress } from '../systems/progress';
import { NavList } from '../ui/NavList';
import { addBackdrop, addDivider } from '../ui/backdrop';
import { formatTime, textStyle } from '../ui/theme';

/**
 * Title screen. The "Continue" entry jumps straight into the first level the
 * pair has not cleared yet, so resuming takes one key press.
 */
export class MenuScene extends Phaser.Scene {
  private nav?: NavList;
  private muteKey?: Phaser.Input.Keyboard.Key;

  constructor() {
    super(SCENES.menu);
  }

  create(): void {
    addBackdrop(this);

    const progress = this.currentProgress();
    const nextIndex = nextPlayableIndex(progress);

    this.add
      .text(GAME_WIDTH / 2, 18, 'A LOCAL CO-OP PUZZLE PLATFORMER', textStyle(6, COLORS.muted))
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 38, 'CO-OP PUZZLE', {
        ...textStyle(28, COLORS.text),
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setShadow(0, 3, '#000000', 6, false, true);

    this.add
      .text(GAME_WIDTH / 2, 64, 'TWO PLAYERS  ·  ONE KEYBOARD', textStyle(8, COLORS.accent))
      .setOrigin(0.5);

    addDivider(this, 78, 300);

    this.buildPreviews();

    const allCleared = LEVELS.every((level) => progress.records[level.id]);
    const continueLabel = allCleared
      ? 'Replay levels'
      : progress.unlocked > 1 || Object.keys(progress.records).length > 0
        ? `Continue · Level ${String(nextIndex + 1).padStart(2, '0')}`
        : 'Play';

    this.nav = NavList.withKeys(
      this,
      GAME_WIDTH / 2,
      104,
      [
        {
          label: continueLabel,
          onSelect: () =>
            this.scene.start(allCleared ? SCENES.levelSelect : SCENES.level, {
              index: nextIndex,
            }),
        },
        { label: 'Level select', onSelect: () => this.scene.start(SCENES.levelSelect) },
        { label: 'How to play', onSelect: () => this.scene.start(SCENES.howTo) },
        {
          label: () => (audio.isMuted ? 'Sound: Off' : 'Sound: On'),
          onSelect: () => {
            audio.toggleMuted();
            this.nav?.refresh();
          },
        },
      ],
      { gap: 16, size: 9 },
    );

    const clearedCount = LEVELS.filter((level) => progress.records[level.id]).length;
    const totalBest = LEVELS.reduce(
      (total, level) => total + (progress.records[level.id]?.timeMs ?? 0),
      0,
    );
    const bestLabel = clearedCount > 0 ? formatTime(totalBest) : '--:--.--';

    this.add
      .text(
        GAME_WIDTH / 2,
        196,
        `CLEARED ${clearedCount}/${LEVELS.length}   ·   TOTAL BEST ${bestLabel}`,
        textStyle(7, COLORS.muted),
      )
      .setOrigin(0.5);

    this.add
      .text(
        GAME_WIDTH / 2,
        212,
        'Both players must stand in the exit to finish a level.',
        textStyle(6, '#5b6678'),
      )
      .setOrigin(0.5);

    this.add
      .text(12, GAME_HEIGHT - 8, 'PHASER 4 · TYPESCRIPT', textStyle(6, '#4b5568'))
      .setOrigin(0, 1);
    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 8,
        '↑↓ SELECT · ENTER CONFIRM · M SOUND',
        textStyle(6, '#5b6678'),
      )
      .setOrigin(0.5, 1);
    this.add
      .text(GAME_WIDTH - 12, GAME_HEIGHT - 8, 'LOCAL CO-OP', textStyle(6, '#4b5568'))
      .setOrigin(1, 1);

    this.muteKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.M);
  }

  override update(): void {
    if (this.muteKey && Phaser.Input.Keyboard.JustDown(this.muteKey)) {
      audio.toggleMuted();
      audio.play('click');
      this.nav?.refresh();
    }
  }

  private currentProgress(): Progress {
    return (this.registry.get('progress') as Progress | undefined) ?? loadProgress();
  }

  private buildPreviews(): void {
    const spots: Array<{ x: number; id: 1 | 2; flip: boolean; tint: number }> = [
      { x: 92, id: 1, flip: false, tint: 0x4cc9f0 },
      { x: GAME_WIDTH - 92, id: 2, flip: true, tint: 0xf4a261 },
    ];

    for (const spot of spots) {
      this.add
        .image(spot.x, 190, TEX.glow)
        .setScale(2.6)
        .setTint(spot.tint)
        .setAlpha(0.22)
        .setBlendMode(Phaser.BlendModes.ADD);

      this.add.image(spot.x, 197, TEX.platform).setDisplaySize(52, 5).setAlpha(0.9);

      const sprite = this.add
        .image(spot.x, 183, TEX.player[spot.id].idle)
        .setScale(2)
        .setFlipX(spot.flip);

      this.tweens.add({
        targets: sprite,
        y: 180,
        duration: 1250,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: spot.id === 2 ? 380 : 0,
      });
    }
  }
}

/** First unlocked, uncleared level; falls back to the last unlocked level. */
export function nextPlayableIndex(progress: Progress): number {
  for (let index = 0; index < LEVELS.length; index++) {
    const level = LEVELS[index];
    if (!level) continue;
    if (isUnlocked(progress, index + 1) && !progress.records[level.id]) {
      return index;
    }
  }

  return Math.min(progress.unlocked - 1, LEVELS.length - 1);
}
