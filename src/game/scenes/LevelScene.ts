import Phaser from 'phaser';

import { TEX } from '../assets/textures';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, RENDER_SCALE, SCENES, TILE_SIZE } from '../constants';
import { Crate } from '../entities/Crate';
import { Player, type PlayerHooks } from '../entities/Player';
import { LEVELS } from '../level/levels';
import { parseLevel, type ParsedLevel, type Rect } from '../level/parseLevel';
import { audio } from '../systems/audio';
import { SharedCamera } from '../systems/camera';
import { createPlayerInput } from '../systems/input';
import {
  loadProgress,
  recordRun,
  saveProgress,
  unlockNext,
  type Progress,
} from '../systems/progress';
import type { HudCompleteData, HudScene, HudState } from './HudScene';

interface LevelSceneData {
  index?: number;
  deaths?: number;
}

interface Door {
  image: Phaser.GameObjects.Image;
  body: Phaser.Physics.Arcade.StaticBody;
  link: string;
  open: boolean;
}

interface Plate {
  image: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  link: string;
  zone: Rect;
  down: boolean;
}

interface Switch {
  image: Phaser.GameObjects.Image;
  link: string;
  zone: Rect;
  occupied: boolean;
}

const LINK_TINTS: Record<string, number> = {
  a: 0x4cc9f0,
  b: 0xf4a261,
  c: 0x06d6a0,
  d: 0xb388ff,
  e: 0xff8fa3,
  f: 0xffd166,
  s: 0x7cf2c8,
  t: 0xffb4a2,
};

/**
 * One playable level: builds the world from ASCII data, runs the puzzle state,
 * and talks to the HUD. All gameplay tuning lives in PHYSICS.
 */
export class LevelScene extends Phaser.Scene {
  private levelIndex = 0;
  private deaths = 0;
  private spec = LEVELS[0]!;
  private level!: ParsedLevel;

  private players: Player[] = [];
  private crates: Crate[] = [];
  private crateSpawns: Array<{ x: number; y: number }> = [];
  private doors: Door[] = [];
  private plates: Plate[] = [];
  private switches: Switch[] = [];

  private wallBodies: Phaser.GameObjects.Zone[] = [];
  private platformBodies: Phaser.GameObjects.Zone[] = [];
  private doorBodies: Phaser.GameObjects.Zone[] = [];

  private ready: [boolean, boolean] = [false, false];
  private switchState = new Map<string, boolean>();

  private elapsedMs = 0;
  private paused = false;
  private failed = false;
  private completed = false;
  private cameraRig?: SharedCamera;
  private dust?: Phaser.GameObjects.Particles.ParticleEmitter;
  private sparkles?: Phaser.GameObjects.Particles.ParticleEmitter;
  private exitCenter = new Phaser.Math.Vector2();

  private restartKey?: Phaser.Input.Keyboard.Key;

  constructor() {
    super(SCENES.level);
  }

  init(data: LevelSceneData): void {
    this.levelIndex = Phaser.Math.Clamp(data.index ?? 0, 0, LEVELS.length - 1);
    this.deaths = Math.max(0, data.deaths ?? 0);
  }

  create(): void {
    this.spec = LEVELS[this.levelIndex]!;
    this.level = parseLevel(this.spec);

    this.players = [];
    this.crates = [];
    this.crateSpawns = [];
    this.doors = [];
    this.plates = [];
    this.switches = [];
    this.wallBodies = [];
    this.platformBodies = [];
    this.doorBodies = [];
    this.ready = [false, false];
    this.switchState = new Map();
    this.elapsedMs = 0;
    this.paused = false;
    this.failed = false;
    this.completed = false;
    // A previous attempt may have paused physics on death, pause or clear.
    this.physics.resume();

    // Extra room below the map so falling players are visible for a moment.
    this.physics.world.setBounds(0, 0, this.level.width, this.level.height + 64);
    this.cameras.main.setBackgroundColor(COLORS.bgDeep);
    this.cameras.main.resetFX();

    this.buildBackground();
    this.buildSolids();
    this.buildPuzzlePieces();
    this.buildExit();
    this.buildActors();
    this.buildParticles();
    this.registerControls();

    this.cameraRig = new SharedCamera(
      this.cameras.main,
      { width: this.level.width, height: this.level.height },
      { width: GAME_WIDTH, height: GAME_HEIGHT },
      {},
      RENDER_SCALE,
    );
    this.cameraRig.snap(this.playerPoints());
    this.cameras.main.fadeIn(180, 6, 8, 12);

    // Always relaunch the HUD: on a scene restart the old HUD is shutting down,
    // and Phaser restarts it cleanly if it is still active at this point.
    this.scene.launch(SCENES.hud);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scene.stop(SCENES.hud);
    });
  }

  override update(time: number, delta: number): void {
    if (this.failed || this.completed) return;

    if (this.paused) return;

    if (this.restartKey && Phaser.Input.Keyboard.JustDown(this.restartKey)) {
      this.retryLevel();
      return;
    }

    this.elapsedMs += delta;
    this.players.forEach((player, index) => {
      if (!this.ready[index]) player.update(time);
    });

    this.updatePuzzle();
    this.respawnLostCrates();
    this.checkExit();
    this.checkHazards();
    this.cameraRig?.update(this.playerPoints(), delta);
  }

  // --- public API used by the HUD -----------------------------------------

  requestPause(): void {
    if (this.paused || this.completed || this.failed) return;
    this.paused = true;
    this.physics.pause();
    audio.play('click');
    this.hud()?.showPause();
  }

  resumeGame(): void {
    if (!this.paused) return;
    this.paused = false;
    this.physics.resume();
    this.hud()?.hidePause();
  }

  retryLevel(): void {
    this.scene.restart({ index: this.levelIndex, deaths: this.deaths });
  }

  nextLevel(): void {
    if (this.levelIndex + 1 >= LEVELS.length) {
      this.exitToLevels();
      return;
    }
    this.scene.restart({ index: this.levelIndex + 1, deaths: 0 });
  }

  exitToLevels(): void {
    this.scene.start(SCENES.levelSelect);
  }

  exitToMenu(): void {
    this.scene.start(SCENES.menu);
  }

  getHudState(): HudState {
    return {
      levelNumber: this.levelIndex + 1,
      totalLevels: LEVELS.length,
      levelName: this.spec.name,
      timeMs: this.elapsedMs,
      ready: [this.ready[0], this.ready[1]],
      hint: this.spec.hint,
    };
  }

  // --- construction -------------------------------------------------------

  private buildBackground(): void {
    // Overscan keeps the backdrop visible when the shared camera zooms out far
    // enough to show past the level edges.
    const pad = 160;
    this.add
      .image(this.level.width / 2, this.level.height / 2, TEX.gradient)
      .setDisplaySize(this.level.width + pad, this.level.height + pad)
      .setDepth(-20);

    this.add
      .tileSprite(
        -pad / 2,
        -pad / 2,
        this.level.width + pad,
        this.level.height + pad,
        TEX.background,
      )
      .setOrigin(0)
      .setDepth(-19)
      .setAlpha(0.45);
  }

  private buildSolids(): void {
    for (const rect of this.level.walls) {
      this.paintTiles(rect, TEX.wall);
      this.wallBodies.push(this.addStaticZone(rect));
    }

    for (const rect of this.level.platforms) {
      for (let x = rect.x; x < rect.x + rect.width; x += TILE_SIZE) {
        this.add.image(x + TILE_SIZE / 2, rect.y + 3, TEX.platform).setDepth(1);

        const zone = this.add.zone(x + TILE_SIZE / 2, rect.y + 3, TILE_SIZE, 6);
        this.physics.add.existing(zone, true);
        const body = zone.body as Phaser.Physics.Arcade.StaticBody;
        body.checkCollision.down = false;
        body.checkCollision.left = false;
        body.checkCollision.right = false;
        this.platformBodies.push(zone);
      }
    }
  }

  private paintTiles(rect: Rect, texture: string): void {
    for (let y = rect.y; y < rect.y + rect.height; y += TILE_SIZE) {
      for (let x = rect.x; x < rect.x + rect.width; x += TILE_SIZE) {
        this.add.image(x + TILE_SIZE / 2, y + TILE_SIZE / 2, texture).setDepth(0);
      }
    }
  }

  private addStaticZone(rect: Rect): Phaser.GameObjects.Zone {
    const zone = this.add.zone(
      rect.x + rect.width / 2,
      rect.y + rect.height / 2,
      rect.width,
      rect.height,
    );
    this.physics.add.existing(zone, true);
    return zone;
  }

  private buildPuzzlePieces(): void {
    for (const spike of this.level.spikes) {
      for (let x = spike.x; x < spike.x + spike.width; x += TILE_SIZE) {
        this.add
          .image(x + TILE_SIZE / 2, spike.y + spike.height, TEX.spike)
          .setOrigin(0.5, 1)
          .setDepth(1);
      }
    }

    for (const door of this.level.doors) {
      const x = door.x * TILE_SIZE + TILE_SIZE / 2;
      const y = door.y * TILE_SIZE + TILE_SIZE / 2;
      const tint = LINK_TINTS[door.link] ?? 0x8b9bbd;

      const image = this.add.image(x, y, TEX.door).setDepth(2).setTint(tint);
      const zone = this.addStaticZone({
        x: door.x * TILE_SIZE,
        y: door.y * TILE_SIZE,
        width: TILE_SIZE,
        height: TILE_SIZE,
      });

      this.doors.push({
        image,
        body: zone.body as Phaser.Physics.Arcade.StaticBody,
        link: door.link,
        open: false,
      });
      this.doorBodies.push(zone);
    }

    for (const plate of this.level.plates) {
      const x = plate.x * TILE_SIZE + TILE_SIZE / 2;
      const y = plate.y * TILE_SIZE + TILE_SIZE;

      const image = this.add.image(x, y - 3, TEX.plateOff).setDepth(2);
      const glow = this.add
        .image(x, y - 10, TEX.glow)
        .setTint(0xffd166)
        .setAlpha(0.5)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(3)
        .setVisible(false);

      this.plates.push({
        image,
        glow,
        link: plate.link,
        zone: {
          x: plate.x * TILE_SIZE,
          y: y - 10,
          width: TILE_SIZE,
          height: 10,
        },
        down: false,
      });
    }

    for (const lever of this.level.switches) {
      const x = lever.x * TILE_SIZE + TILE_SIZE / 2;
      const y = lever.y * TILE_SIZE + TILE_SIZE;

      this.switches.push({
        image: this.add.image(x, y, TEX.switchOff).setOrigin(0.5, 1).setDepth(2),
        link: lever.link,
        zone: {
          x: x - 7,
          y: y - 14,
          width: 14,
          height: 14,
        },
        occupied: false,
      });
    }

    for (const crate of this.level.crates) {
      this.crateSpawns.push({ ...crate });
      this.crates.push(new Crate(this, crate.x, crate.y));
    }
  }

  private buildExit(): void {
    const exit = this.level.exit;
    this.exitCenter.set(exit.x + exit.width / 2, exit.y + exit.height / 2);

    const columns = Math.max(1, Math.round(exit.width / TILE_SIZE));
    for (let index = 0; index < columns; index++) {
      this.add
        .image(exit.x + index * TILE_SIZE + TILE_SIZE / 2, exit.y + exit.height, TEX.exit)
        .setOrigin(0.5, 1)
        .setDepth(2);
    }

    const glow = this.add
      .image(this.exitCenter.x, this.exitCenter.y - 6, TEX.glow)
      .setTint(0x06d6a0)
      .setScale(2.4)
      .setAlpha(0.45)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(1);

    this.tweens.add({
      targets: glow,
      alpha: { from: 0.25, to: 0.6 },
      scale: { from: 2.1, to: 2.7 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private buildActors(): void {
    const [playerOneInput, playerTwoInput] = createPlayerInput(this);

    const hooks: PlayerHooks = {
      onJump: (player) => {
        audio.play('jump');
        this.spawnDust(player.x, player.y + 8);
      },
      onLand: (player) => {
        audio.play('land');
        this.spawnDust(player.x, player.y + 8);
      },
    };

    this.players = [
      new Player(
        this,
        this.level.spawns[0].x,
        this.level.spawns[0].y - 8,
        1,
        playerOneInput,
        hooks,
      ),
      new Player(
        this,
        this.level.spawns[1].x,
        this.level.spawns[1].y - 8,
        2,
        playerTwoInput,
        hooks,
      ),
    ];

    const solids: Phaser.GameObjects.GameObject[] = [
      ...this.wallBodies,
      ...this.platformBodies,
      ...this.doorBodies,
    ];

    this.physics.add.collider(this.players, solids);
    this.physics.add.collider(this.crates, solids);
    this.physics.add.collider(this.players, this.crates);
    this.physics.add.collider(this.crates, this.crates);
    this.physics.add.collider(this.players, this.players);
  }

  private buildParticles(): void {
    this.dust = this.add
      .particles(0, 0, TEX.particle, {
        lifespan: 340,
        speed: { min: 12, max: 52 },
        angle: { min: 200, max: 340 },
        scale: { start: 1, end: 0 },
        alpha: { start: 0.8, end: 0 },
        tint: 0x9fb4d8,
        emitting: false,
      })
      .setDepth(30);

    this.sparkles = this.add
      .particles(0, 0, TEX.particle, {
        lifespan: 620,
        speed: { min: 20, max: 90 },
        angle: { min: 180, max: 360 },
        gravityY: 120,
        scale: { start: 1.4, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: [0x06d6a0, 0xb8ffe8, 0xffd166],
        emitting: false,
      })
      .setDepth(30);
  }

  private registerControls(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;

    this.restartKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
  }

  // --- per-frame logic ----------------------------------------------------

  private updatePuzzle(): void {
    const actors = this.actorRects();
    const playerRects = this.playerRects();
    const downLinks = new Set<string>();

    for (const plate of this.plates) {
      const down = actors.some((rect) => rectsOverlap(rect, plate.zone));
      if (down !== plate.down) {
        plate.down = down;
        plate.image.setTexture(down ? TEX.plateOn : TEX.plateOff);
        plate.glow.setVisible(down);
        audio.play('plate');
        if (down) {
          this.sparkles?.explode(6, plate.zone.x + plate.zone.width / 2, plate.zone.y + 2);
        }
      }
      if (down) downLinks.add(plate.link);
    }

    for (const lever of this.switches) {
      const inside = playerRects.some((rect) => rectsOverlap(rect, lever.zone));
      const alreadyOn = this.switchState.get(lever.link) ?? false;
      if (inside && !lever.occupied && !alreadyOn) {
        this.switchState.set(lever.link, true);
        lever.image.setTexture(TEX.switchOn);
        audio.play('switch');
        this.sparkles?.explode(8, lever.zone.x + lever.zone.width / 2, lever.zone.y);
      }
      lever.occupied = inside;
    }

    const openLinks = new Set<string>(downLinks);
    for (const [link, on] of this.switchState) {
      if (on) openLinks.add(link);
    }

    let doorChanged = false;
    for (const door of this.doors) {
      const open = openLinks.has(door.link);
      if (open === door.open) continue;

      door.open = open;
      door.body.enable = !open;
      door.image.setAlpha(open ? 0.18 : 1);
      doorChanged = true;
    }

    if (doorChanged) {
      audio.play('door');
      this.cameraRig?.shake(90, 0.003);
    }
  }

  /** A crate pushed into a pit would make a level unsolvable, so bring it back. */
  private respawnLostCrates(): void {
    this.crates.forEach((crate, index) => {
      if (crate.y <= this.level.height + 24) return;

      const spawn = this.crateSpawns[index];
      if (!spawn) return;

      (crate.body as Phaser.Physics.Arcade.Body).reset(spawn.x, spawn.y);
      crate.setVelocity(0, 0);
      audio.play('respawn');
      this.sparkles?.explode(10, spawn.x, spawn.y);
    });
  }

  private checkExit(): void {
    const exit = this.level.exit;

    this.players.forEach((player, index) => {
      if (this.ready[index]) return;
      if (!rectsOverlap(this.bodyRect(player), exit)) return;

      this.ready[index] = true;
      player.setVelocity(0, 0);
      (player.body as Phaser.Physics.Arcade.Body).enable = false;
      audio.play('ready');
      this.sparkles?.explode(14, player.x, player.y);
      this.tweens.add({
        targets: player,
        alpha: 0.25,
        scale: 0.7,
        duration: 200,
        ease: 'Sine.easeOut',
      });
    });

    if (this.ready[0] && this.ready[1]) {
      this.completeLevel();
    }
  }

  private checkHazards(): void {
    this.players.forEach((player, index) => {
      if (this.ready[index]) return;

      if (player.y > this.level.height + 24) {
        this.failLevel();
        return;
      }

      const rect = this.bodyRect(player);
      for (const spike of this.level.spikes) {
        if (rectsOverlap(rect, { ...spike, y: spike.y + 6, height: 10 })) {
          this.failLevel();
          return;
        }
      }
    });
  }

  private failLevel(): void {
    if (this.failed || this.completed) return;

    this.failed = true;
    this.deaths += 1;
    audio.play('death');
    this.cameraRig?.shake(240, 0.008);
    this.cameras.main.flash(200, 239, 71, 111);
    this.physics.pause();
    this.sparkles?.explode(18, this.players[0]?.x ?? 0, this.players[0]?.y ?? 0);

    this.time.delayedCall(520, () => {
      this.scene.restart({ index: this.levelIndex, deaths: this.deaths });
    });
  }

  private completeLevel(): void {
    if (this.completed) return;

    this.completed = true;
    this.physics.pause();
    audio.play('complete');
    this.cameraRig?.punch(0.05);
    this.sparkles?.explode(30, this.exitCenter.x, this.exitCenter.y);

    const timeMs = Math.round(this.elapsedMs);
    let progress = this.registry.get('progress') as Progress | undefined;
    progress ??= loadProgress();

    progress = recordRun(progress, this.level.id, timeMs, this.deaths);
    // Clearing the final level must not report an unlock beyond the last one.
    progress = unlockNext(progress, Math.min(this.levelIndex + 1, LEVELS.length - 1));
    saveProgress(progress);
    this.registry.set('progress', progress);

    const best = progress.records[this.level.id]?.timeMs ?? timeMs;
    const data: HudCompleteData = {
      levelName: this.spec.name,
      levelNumber: this.levelIndex + 1,
      totalLevels: LEVELS.length,
      timeMs,
      bestMs: best,
      deaths: this.deaths,
      isLast: this.levelIndex + 1 >= LEVELS.length,
    };

    this.time.delayedCall(420, () => this.hud()?.showComplete(data));
  }

  // --- helpers ------------------------------------------------------------

  private playerPoints(): Array<{ x: number; y: number }> {
    const points = this.players
      .filter((_, index) => !this.ready[index])
      .map((player) => ({ x: player.x, y: player.y }));

    if (points.length === 0) {
      return [{ x: this.exitCenter.x, y: this.exitCenter.y }];
    }
    return points;
  }

  private actorRects(): Rect[] {
    return [...this.playerRects(), ...this.crates.map((crate) => this.bodyRect(crate))];
  }

  private playerRects(): Rect[] {
    return this.players
      .filter((_, index) => !this.ready[index])
      .map((player) => this.bodyRect(player));
  }

  private bodyRect(sprite: Phaser.Physics.Arcade.Sprite): Rect {
    const body = sprite.body as Phaser.Physics.Arcade.Body;
    return { x: body.x, y: body.y, width: body.width, height: body.height };
  }

  private spawnDust(x: number, y: number): void {
    this.dust?.explode(5, x, y);
  }

  private hud(): HudScene | undefined {
    if (!this.scene.isActive(SCENES.hud)) return undefined;
    return this.scene.get(SCENES.hud) as HudScene;
  }
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
