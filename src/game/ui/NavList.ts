import Phaser from 'phaser';

import { COLORS } from '../constants';
import { audio } from '../systems/audio';
import { textStyle } from './theme';

export interface NavItem {
  label: string | (() => string);
  disabled?: boolean;
  onSelect: () => void;
}

export interface NavListOptions {
  gap?: number;
  size?: number;
  align?: 'left' | 'center';
  depth?: number;
  initialIndex?: number;
}

/**
 * Keyboard + mouse menu list shared by every screen. Up/Down skip disabled
 * entries, Enter selects, the mouse can hover and click.
 */
export class NavList {
  private readonly scene: Phaser.Scene;
  private readonly items: NavItem[];
  private readonly texts: Phaser.GameObjects.Text[] = [];
  private readonly gap: number;
  private readonly size: number;
  private readonly align: 'left' | 'center';
  private readonly depth: number;

  private index = 0;
  private enabled = true;
  private updateHandler?: () => void;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    items: NavItem[],
    options: NavListOptions = {},
  ) {
    this.scene = scene;
    this.items = items;
    this.gap = options.gap ?? 16;
    this.size = options.size ?? 9;
    this.align = options.align ?? 'center';
    this.depth = options.depth ?? 0;

    this.index = Math.max(
      0,
      items.findIndex((item) => !item.disabled),
    );

    const preferred = options.initialIndex;
    if (preferred !== undefined) {
      const candidate = items[preferred];
      if (candidate && !candidate.disabled) this.index = preferred;
    }

    items.forEach((_, itemIndex) => {
      const text = scene.add
        .text(x, y + itemIndex * this.gap, '', textStyle(this.size))
        .setOrigin(this.align === 'center' ? 0.5 : 0, 0.5)
        .setDepth(this.depth)
        .setInteractive({ useHandCursor: true });

      text.on('pointerover', () => {
        if (!this.enabled || this.items[itemIndex]?.disabled) return;
        if (this.index === itemIndex) return;
        this.index = itemIndex;
        this.render();
        audio.play('click');
      });

      text.on('pointerdown', () => {
        if (!this.enabled || this.items[itemIndex]?.disabled) return;
        this.index = itemIndex;
        this.activate();
      });

      this.texts.push(text);
    });

    this.render();
  }

  /** Creates the list and wires the cursor/confirm keys for the given scene. */
  static withKeys(
    scene: Phaser.Scene,
    x: number,
    y: number,
    items: NavItem[],
    options: NavListOptions = {},
  ): NavList {
    const list = new NavList(scene, x, y, items, options);
    const keys = scene.input.keyboard?.addKeys('UP,DOWN,ENTER,SPACE') as
      Record<'UP' | 'DOWN' | 'ENTER' | 'SPACE', Phaser.Input.Keyboard.Key> | undefined;

    if (!keys) return list;

    list.updateHandler = () => {
      if (!list.enabled) return;
      if (Phaser.Input.Keyboard.JustDown(keys.UP)) list.move(-1);
      if (Phaser.Input.Keyboard.JustDown(keys.DOWN)) list.move(1);
      if (
        Phaser.Input.Keyboard.JustDown(keys.ENTER) ||
        Phaser.Input.Keyboard.JustDown(keys.SPACE)
      ) {
        list.activate();
      }
    };
    scene.events.on('update', list.updateHandler);

    return list;
  }

  move(delta: number): void {
    if (!this.enabled || this.items.length === 0) return;

    let next = this.index;
    for (let step = 0; step < this.items.length; step++) {
      next = (next + delta + this.items.length) % this.items.length;
      if (!this.items[next]?.disabled) break;
    }

    if (next !== this.index) {
      this.index = next;
      this.render();
      audio.play('click');
    }
  }

  activate(): void {
    const item = this.items[this.index];
    if (!this.enabled || !item || item.disabled) return;
    audio.play('click');
    item.onSelect();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.texts.forEach((text) => text.setVisible(enabled));
  }

  refresh(): void {
    this.render();
  }

  destroy(): void {
    this.enabled = false;
    if (this.updateHandler) {
      this.scene.events.off('update', this.updateHandler);
      this.updateHandler = undefined;
    }
    this.texts.forEach((text) => text.destroy());
    this.texts.length = 0;
  }

  private render(): void {
    this.items.forEach((item, itemIndex) => {
      const text = this.texts[itemIndex];
      if (!text) return;

      const label = typeof item.label === 'function' ? item.label() : item.label;
      const selected = itemIndex === this.index;
      const prefix = selected ? '› ' : '  ';
      const color = item.disabled ? '#4b5568' : selected ? COLORS.accent : '#a7b4c7';

      text.setText(`${prefix}${label.replace(/^› /, '')}`);
      text.setColor(color);
      text.setAlpha(item.disabled ? 0.7 : 1);
    });
  }
}
