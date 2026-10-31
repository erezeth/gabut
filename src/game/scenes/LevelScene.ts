import Phaser from 'phaser';

import { COLORS, GAME_HEIGHT, GAME_WIDTH, TILE_SIZE } from '../constants';
import { Player } from '../entities/Player';
import { createPlayerInput, type PlayerInput } from '../systems/input';

interface SolidSpec {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Hand-placed test room for M1. It is intentionally hard-coded: the ASCII level
 * parser and real level data arrive in M3, and this room is deleted then.
 */
const SOLIDS: SolidSpec[] = [
  { x: 0, y: 250, width: GAME_WIDTH, height: 20 },
  { x: 0, y: 0, width: 8, height: 250 },
  { x: GAME_WIDTH - 8, y: 0, width: 8, height: 250 },
  { x: 64, y: 214, width: 56, height: 10 },
  { x: 160, y: 186, width: 56, height: 10 },
  { x: 216, y: 234, width: 48, height: 16 },
  { x: 264, y: 214, width: 56, height: 10 },
  { x: 360, y: 190, width: 56, height: 10 },
];

const SPAWNS = [
  { x: 56, y: 234 },
  { x: 424, y: 234 },
] as const;

export class LevelScene extends Phaser.Scene {
  private players: Player[] = [];
  private labels: Phaser.GameObjects.Text[] = [];
  private solids: Phaser.GameObjects.Rectangle[] = [];
  private restartKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super('Level');
  }

  create(): void {
    // Scenes are reused if restarted, so clear anything a previous run left behind.
    this.players = [];
    this.labels = [];
    this.solids = [];

    this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.cameras.main.setBackgroundColor(COLORS.background);

    this.drawGrid();
    this.buildSolids();

    const [playerOneInput, playerTwoInput] = createPlayerInput(this);

    this.players = [
      this.createPlayer(1, 'player-1', playerOneInput),
      this.createPlayer(2, 'player-2', playerTwoInput),
    ];

    this.physics.add.collider(this.players, this.solids);

    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input plugin is not available');
    }
    this.restartKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R, true, false);

    this.add
      .text(
        GAME_WIDTH / 2,
        10,
        'P1  A / D  +  W or SPACE        P2  ARROWS  +  UP or ENTER        R  RESET',
        {
          fontFamily: 'monospace',
          fontSize: '7px',
          color: COLORS.textMuted,
        },
      )
      .setOrigin(0.5);
  }

  override update(time: number): void {
    this.players.forEach((player, index) => {
      player.update(time);

      const label = this.labels[index];
      if (label) {
        label.setPosition(player.x, player.y - 14);
      }
    });

    if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
      this.respawnAll();
    }
  }

  private createPlayer(index: 1 | 2, texture: string, controls: PlayerInput): Player {
    const spawn = SPAWNS[index - 1] ?? SPAWNS[0];

    const player = new Player(this, spawn.x, spawn.y, texture, index, controls);

    const label = this.add
      .text(spawn.x, spawn.y - 14, `P${index}`, {
        fontFamily: 'monospace',
        fontSize: '6px',
        color: index === 1 ? COLORS.playerOne : COLORS.playerTwo,
      })
      .setOrigin(0.5);

    this.labels.push(label);

    return player;
  }

  private respawnAll(): void {
    this.players.forEach((player, index) => {
      const spawn = SPAWNS[index] ?? SPAWNS[0];
      player.respawnAt(spawn.x, spawn.y);
    });
  }

  private buildSolids(): void {
    for (const spec of SOLIDS) {
      const solid = this.add
        .rectangle(
          spec.x + spec.width / 2,
          spec.y + spec.height / 2,
          spec.width,
          spec.height,
          0x2a3550,
        )
        .setStrokeStyle(1, 0x3d4b6e);

      this.physics.add.existing(solid, true);
      this.solids.push(solid);
    }
  }

  private drawGrid(): void {
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x1a2030, 1);

    for (let x = 0; x <= GAME_WIDTH; x += TILE_SIZE) {
      grid.lineBetween(x, 0, x, GAME_HEIGHT);
    }

    for (let y = 0; y <= GAME_HEIGHT; y += TILE_SIZE) {
      grid.lineBetween(0, y, GAME_WIDTH, y);
    }
  }
}
