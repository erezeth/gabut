import Phaser from 'phaser';

import { COLORS, GAME_HEIGHT, GAME_WIDTH, SCENES } from '../constants';
import { LEVELS } from '../level/levels';
import { audio } from '../systems/audio';
import { isUnlocked, loadProgress, saveProgress, type Progress } from '../systems/progress';
import { NavList, type NavItem } from '../ui/NavList';
import { addBackdrop } from '../ui/backdrop';
import { addPanel, formatTime, textStyle, zoomUiCamera } from '../ui/theme';

/**
 * Level browser with best times, locks and a two-step progress reset.
 * Locked entries are skipped by keyboard navigation.
 */
export class LevelSelectScene extends Phaser.Scene {
  private nav?: NavList;
  private escKey?: Phaser.Input.Keyboard.Key;
  private resetArmed = false;

  constructor() {
    super(SCENES.levelSelect);
  }

  create(): void {
    zoomUiCamera(this);
    addBackdrop(this);
    this.resetArmed = false;

    this.add
      .text(GAME_WIDTH / 2, 24, 'LEVEL SELECT', {
        ...textStyle(16, COLORS.text),
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const progress = this.currentProgress();
    const cleared = LEVELS.filter((level) => progress.records[level.id]).length;
    const totalBest = LEVELS.reduce(
      (total, level) => total + (progress.records[level.id]?.timeMs ?? 0),
      0,
    );

    this.add
      .text(
        GAME_WIDTH / 2,
        43,
        `${cleared}/${LEVELS.length} CLEARED   ·   TOTAL BEST ${
          cleared > 0 ? formatTime(totalBest) : '--:--.--'
        }`,
        textStyle(7, COLORS.muted),
      )
      .setOrigin(0.5);

    addPanel(this, 112, 58, 256, 156).setDepth(1);

    const items: NavItem[] = LEVELS.map((level, index) => ({
      label: () => this.levelLabel(level.id, index),
      disabled: !isUnlocked(progress, index + 1),
      onSelect: () => this.scene.start(SCENES.level, { index }),
    }));

    items.push(
      {
        label: 'Back to menu',
        disabled: false,
        onSelect: () => this.scene.start(SCENES.menu),
      },
      {
        label: () => (this.resetArmed ? 'Press Enter again to reset' : 'Reset progress'),
        disabled: false,
        onSelect: () => this.handleReset(),
      },
    );

    this.nav = NavList.withKeys(this, 136, 72, items, {
      gap: 20,
      size: 8,
      align: 'left',
      depth: 2,
      initialIndex: this.initialIndex(progress),
    });

    this.add
      .text(
        GAME_WIDTH / 2,
        226,
        'New levels unlock in order. Best times are saved on this device.',
        textStyle(6, '#5b6678'),
      )
      .setOrigin(0.5);

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 8,
        'ESC BACK · ↑↓ SELECT · ENTER PLAY',
        textStyle(6, '#5b6678'),
      )
      .setOrigin(0.5, 1);

    this.escKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
  }

  override update(): void {
    if (this.escKey && Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.scene.start(SCENES.menu);
    }
  }

  private currentProgress(): Progress {
    return (this.registry.get('progress') as Progress | undefined) ?? loadProgress();
  }

  private initialIndex(progress: Progress): number {
    for (let index = 0; index < LEVELS.length; index++) {
      const level = LEVELS[index];
      if (!level) continue;
      if (isUnlocked(progress, index + 1) && !progress.records[level.id]) return index;
    }
    return 0;
  }

  private levelLabel(levelId: string, index: number): string {
    const progress = this.currentProgress();
    const level = LEVELS[index];
    const number = String(index + 1).padStart(2, '0');
    if (!level) return '';

    const name = level.name.toUpperCase();
    const locked = !isUnlocked(progress, index + 1);
    const best = progress.records[levelId];

    const left = `${number}  ${name}`;
    const dots = '.'.repeat(Math.max(2, 24 - left.length));
    const right = locked ? 'LOCKED'.padStart(8) : best ? formatTime(best.timeMs) : '--:--.--';

    return `${left} ${dots} ${right}`;
  }

  private handleReset(): void {
    if (!this.resetArmed) {
      this.resetArmed = true;
      audio.play('click');
      this.nav?.refresh();
      this.time.delayedCall(4000, () => {
        this.resetArmed = false;
        this.nav?.refresh();
      });
      return;
    }

    const fresh: Progress = { unlocked: 1, records: {} };
    saveProgress(fresh);
    this.registry.set('progress', fresh);
    audio.play('unlock');
    this.scene.restart();
  }
}
