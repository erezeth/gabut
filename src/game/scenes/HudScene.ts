import Phaser from 'phaser';

import { COLORS, GAME_HEIGHT, GAME_WIDTH, SCENES, TOUCH } from '../constants';
import { LEVELS } from '../level/levels';
import { audio } from '../systems/audio';
import { NavList } from '../ui/NavList';
import { addDimmer, addPanel, formatTime, textStyle, zoomUiCamera } from '../ui/theme';
import { setPauseHandler } from '../systems/actions';
import type { LevelScene } from './LevelScene';

export interface HudState {
  levelNumber: number;
  totalLevels: number;
  levelName: string;
  timeMs: number;
  ready: [boolean, boolean];
  hint: string;
}

export interface HudCompleteData {
  levelName: string;
  levelNumber: number;
  totalLevels: number;
  timeMs: number;
  bestMs: number;
  deaths: number;
  isLast: boolean;
}

type OverlayMode = 'none' | 'pause' | 'complete';

interface ReadyChip {
  text: Phaser.GameObjects.Text;
  ready: boolean;
}

/**
 * Screen-space overlay above the level: timer, ready indicators, a one-time
 * hint, the pause window and the level-clear window.
 *
 * The HUD owns the Esc and M keys, so pausing is handled in exactly one place
 * instead of racing the level scene for the same key press.
 */
export class HudScene extends Phaser.Scene {
  private levelScene?: LevelScene;

  private timerText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private muteText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private hintPanel!: Phaser.GameObjects.Graphics;
  private chips: ReadyChip[] = [];
  private intro: Phaser.GameObjects.GameObject[] = [];

  private overlayMode: OverlayMode = 'none';
  private overlayObjects: Phaser.GameObjects.GameObject[] = [];
  private nav?: NavList;

  private escKey?: Phaser.Input.Keyboard.Key;
  private muteKey?: Phaser.Input.Keyboard.Key;
  private retryKey?: Phaser.Input.Keyboard.Key;

  constructor() {
    super(SCENES.hud);
  }

  create(): void {
    zoomUiCamera(this);
    this.levelScene = this.scene.get(SCENES.level) as LevelScene;
    this.overlayMode = 'none';
    this.overlayObjects = [];
    this.chips = [];
    this.intro = [];

    this.buildTopBar();
    this.buildHint();
    this.buildIntro();
    this.registerKeys();

    // Touch players have no Esc key; the on-screen pause button comes through here.
    setPauseHandler(() => this.handlePause());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => setPauseHandler(undefined));
  }

  override update(): void {
    if (!this.levelScene) return;

    const state = this.levelScene.getHudState();
    this.timerText.setText(formatTime(state.timeMs));
    this.updateChips(state);

    if (this.escKey && Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.handlePause();
    }

    if (this.muteKey && Phaser.Input.Keyboard.JustDown(this.muteKey)) {
      this.toggleMute();
    }

    // While an overlay is open the level scene stops reading R, so the HUD
    // takes over there. During play the level scene owns the key.
    if (
      this.overlayMode !== 'none' &&
      this.retryKey &&
      Phaser.Input.Keyboard.JustDown(this.retryKey)
    ) {
      this.levelScene.retryLevel();
    }
  }

  // --- public API called by LevelScene ------------------------------------

  showPause(): void {
    if (this.overlayMode !== 'none') return;
    this.overlayMode = 'pause';
    this.buildPauseOverlay();
  }

  hidePause(): void {
    if (this.overlayMode !== 'pause') return;
    this.closeOverlay();
    this.overlayMode = 'none';
  }

  showComplete(data: HudCompleteData): void {
    if (this.overlayMode === 'complete') return;
    this.closeOverlay();
    this.overlayMode = 'complete';
    this.buildCompleteOverlay(data);
  }

  // --- building blocks ----------------------------------------------------

  private buildTopBar(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, 22, 0x05070c, 0.55).setOrigin(0).setDepth(15);

    this.add.rectangle(0, 22, GAME_WIDTH, 1, COLORS.panelEdge, 0.45).setOrigin(0).setDepth(15);

    this.levelText = this.add.text(10, 6, '', textStyle(7, COLORS.muted)).setDepth(16);

    this.timerText = this.add
      .text(GAME_WIDTH / 2, 3, '00:00.00', textStyle(14, COLORS.text))
      .setOrigin(0.5, 0)
      .setShadow(0, 1, '#000000', 3, false, true)
      .setDepth(16);

    this.chips = [this.makeChip(372, 'P1'), this.makeChip(412, 'P2')];

    this.muteText = this.add
      .text(GAME_WIDTH - 8, 7, '', textStyle(7))
      .setOrigin(1, 0)
      .setPadding(3, 2, 3, 2)
      .setBackgroundColor('#131a28')
      .setDepth(16)
      .setInteractive({ useHandCursor: true });

    this.muteText.on('pointerdown', () => this.toggleMute());
    this.updateMuteLabel();

    this.add
      .text(
        GAME_WIDTH - 10,
        GAME_HEIGHT - 6,
        TOUCH ? '' : 'ESC PAUSE   R RETRY   M SOUND   F FULLSCREEN',
        textStyle(6, '#5b6678'),
      )
      .setOrigin(1, 1)
      .setDepth(16);
  }

  private makeChip(x: number, label: string): ReadyChip {
    const chip: ReadyChip = {
      text: this.add
        .text(x, 7, label, textStyle(7))
        .setPadding(3, 2, 3, 2)
        .setBackgroundColor('#223047')
        .setDepth(16),
      ready: false,
    };
    return chip;
  }

  private buildHint(): void {
    this.hintPanel = addPanel(this, 10, 28, 334, 46).setDepth(17);
    this.hintText = this.add
      .text(18, 34, '', {
        ...textStyle(7, '#a7b4c7'),
        wordWrap: { width: 318 },
        lineSpacing: 2,
      })
      .setDepth(18);

    this.time.delayedCall(11000, () => {
      this.tweens.add({
        targets: [this.hintPanel, this.hintText],
        alpha: 0,
        duration: 700,
        ease: 'Sine.easeIn',
      });
    });
  }

  private buildIntro(): void {
    const number = this.add
      .text(GAME_WIDTH / 2, 88, '', textStyle(7, COLORS.accent))
      .setOrigin(0.5)
      .setDepth(18)
      .setAlpha(0);

    const name = this.add
      .text(GAME_WIDTH / 2, 102, '', textStyle(16, COLORS.text))
      .setOrigin(0.5)
      .setDepth(18)
      .setAlpha(0)
      .setShadow(0, 2, '#000000', 4, false, true);

    this.intro = [number, name];

    this.tweens.add({
      targets: [number, name],
      alpha: { from: 0, to: 1 },
      duration: 260,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: [number, name],
          alpha: 0,
          y: '-=8',
          delay: 1250,
          duration: 550,
          ease: 'Sine.easeIn',
        });
      },
    });
  }

  private registerKeys(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;

    this.escKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.muteKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    this.retryKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
  }

  // --- per-frame updates --------------------------------------------------

  private handlePause(): void {
    if (!this.levelScene) return;
    if (this.overlayMode === 'pause') {
      this.levelScene.resumeGame();
    } else if (this.overlayMode === 'complete') {
      this.levelScene.exitToLevels();
    } else {
      this.levelScene.requestPause();
    }
  }

  private updateChips(state: HudState): void {
    this.levelText.setText(
      `LEVEL ${String(state.levelNumber).padStart(2, '0')}/${String(state.totalLevels).padStart(
        2,
        '0',
      )}  ·  ${state.levelName.toUpperCase()}`,
    );

    this.chips.forEach((chip, index) => {
      const ready = state.ready[index] ?? false;
      const label = `P${index + 1}`;
      if (chip.ready === ready && chip.text.text.length > 0) return;

      chip.ready = ready;
      chip.text
        .setText(ready ? `${label} OK` : label)
        .setColor(ready ? '#b8ffe8' : '#8a97ab')
        .setBackgroundColor(ready ? '#0b4f3c' : '#223047');
    });

    const hintStillNeeded =
      this.overlayMode === 'none' && !(state.ready[0] && state.ready[1]) && !!state.hint;

    if (hintStillNeeded && this.hintText.text !== state.hint) {
      this.hintText.setText(state.hint);
    }

    const introNumber = this.intro[0] as Phaser.GameObjects.Text | undefined;
    const introName = this.intro[1] as Phaser.GameObjects.Text | undefined;
    const introLabel = `LEVEL ${String(state.levelNumber).padStart(2, '0')}`;
    if (introNumber && introNumber.text !== introLabel) {
      introNumber.setText(introLabel);
    }
    if (introName && introName.text !== state.levelName.toUpperCase()) {
      introName.setText(state.levelName.toUpperCase());
    }
  }

  private updateMuteLabel(): void {
    this.muteText
      .setText(audio.isMuted ? (TOUCH ? 'SOUND OFF' : 'M: OFF') : TOUCH ? 'SOUND ON' : 'M: ON')
      .setColor(audio.isMuted ? '#7d8899' : '#b8ffe8');
  }

  private toggleMute(): void {
    audio.toggleMuted();
    audio.play('click');
    this.updateMuteLabel();
  }

  // --- overlays -----------------------------------------------------------

  private buildPauseOverlay(): void {
    const dimmer = addDimmer(this, 0.72).setDepth(100);
    const panel = addPanel(this, 125, 54, 230, 152).setDepth(101);
    this.overlayObjects.push(dimmer, panel);

    this.addOverlayText(GAME_WIDTH / 2, 76, 'PAUSED', textStyle(16, COLORS.accent), 0.5, 103);
    this.addOverlayText(
      GAME_WIDTH / 2,
      95,
      'P1 + P2 — take a breath',
      textStyle(6, COLORS.muted),
      0.5,
      103,
    );

    this.nav = NavList.withKeys(
      this,
      GAME_WIDTH / 2,
      120,
      [
        { label: 'Resume', onSelect: () => this.levelScene?.resumeGame() },
        { label: 'Retry level', onSelect: () => this.levelScene?.retryLevel() },
        { label: 'Level select', onSelect: () => this.levelScene?.exitToLevels() },
        { label: 'Main menu', onSelect: () => this.levelScene?.exitToMenu() },
      ],
      { gap: 15, size: 8, depth: 103 },
    );

    this.addOverlayText(
      GAME_WIDTH / 2,
      191,
      TOUCH ? 'TAP AN OPTION TO CONTINUE' : 'ESC RESUME  ·  R RETRY  ·  M SOUND',
      textStyle(6, '#5b6678'),
      0.5,
      103,
    );
  }

  private buildCompleteOverlay(data: HudCompleteData): void {
    const dimmer = addDimmer(this, 0.78).setDepth(100);
    const panel = addPanel(this, 90, 38, 300, 204).setDepth(101);
    this.overlayObjects.push(dimmer, panel);

    this.addOverlayText(GAME_WIDTH / 2, 56, 'LEVEL CLEAR', textStyle(15, COLORS.success), 0.5, 103);
    this.addOverlayText(
      GAME_WIDTH / 2,
      76,
      `LEVEL ${String(data.levelNumber).padStart(2, '0')} · ${data.levelName.toUpperCase()}`,
      textStyle(7, COLORS.muted),
      0.5,
      103,
    );

    const line = this.add.graphics().setDepth(102);
    line.lineStyle(1, COLORS.panelEdge, 0.7);
    line.lineBetween(118, 88, 362, 88);
    this.overlayObjects.push(line);

    this.addStatRow(102, 'TIME', formatTime(data.timeMs));
    this.addStatRow(118, 'BEST', formatTime(data.bestMs));
    this.addStatRow(134, 'DEATHS', String(data.deaths));

    const isNewBest = data.timeMs <= data.bestMs;
    if (isNewBest) {
      this.addOverlayText(GAME_WIDTH / 2, 150, 'NEW BEST!', textStyle(7, COLORS.accent), 0.5, 103);
    }

    const items = [];
    if (!data.isLast) {
      const nextName = LEVELS[data.levelNumber]?.name.toUpperCase() ?? 'NEXT LEVEL';
      items.push({
        label: `Next · ${nextName}`,
        onSelect: () => this.levelScene?.nextLevel(),
      });
      items.push(
        { label: 'Replay level', onSelect: () => this.levelScene?.retryLevel() },
        { label: 'Level select', onSelect: () => this.levelScene?.exitToLevels() },
        { label: 'Main menu', onSelect: () => this.levelScene?.exitToMenu() },
      );
    } else {
      items.push(
        { label: 'Back to level select', onSelect: () => this.levelScene?.exitToLevels() },
        { label: 'Replay finale', onSelect: () => this.levelScene?.retryLevel() },
        { label: 'Main menu', onSelect: () => this.levelScene?.exitToMenu() },
      );
    }

    this.nav = NavList.withKeys(this, GAME_WIDTH / 2, 171, items, {
      gap: 15,
      size: 8,
      depth: 103,
    });

    this.addOverlayText(
      GAME_WIDTH / 2,
      228,
      TOUCH
        ? 'THANKS FOR PLAYING  ·  TAP AN OPTION TO CONTINUE'
        : data.isLast
          ? 'THANKS FOR PLAYING  ·  ESC CONTINUE'
          : 'ESC LEVEL SELECT  ·  R REPLAY  ·  M SOUND',
      textStyle(6, '#5b6678'),
      0.5,
      103,
    );
  }

  private addStatRow(y: number, label: string, value: string): void {
    this.addOverlayText(128, y, label, textStyle(7, COLORS.muted), 0, 103);
    this.addOverlayText(352, y, value, textStyle(8, COLORS.text), 1, 103);
  }

  private addOverlayText(
    x: number,
    y: number,
    text: string,
    style: Phaser.Types.GameObjects.Text.TextStyle,
    originX: number,
    depth: number,
  ): Phaser.GameObjects.Text {
    const object = this.add.text(x, y, text, style).setOrigin(originX, 0).setDepth(depth);
    this.overlayObjects.push(object);
    return object;
  }

  private closeOverlay(): void {
    this.nav?.destroy();
    this.nav = undefined;
    this.overlayObjects.forEach((object) => object.destroy());
    this.overlayObjects = [];
  }
}
