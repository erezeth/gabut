import type Phaser from 'phaser';

/**
 * Every visual is generated at boot: no image files, no external asset licenses,
 * and the whole game still ships as a single static build.
 *
 * Each drawer works on a small canvas, so the art is true pixel art at the same
 * scale as the 480x270 internal resolution.
 */
export const TEX = {
  player: {
    1: { idle: 'p1-idle', walkA: 'p1-walk-a', walkB: 'p1-walk-b', jump: 'p1-jump' },
    2: { idle: 'p2-idle', walkA: 'p2-walk-a', walkB: 'p2-walk-b', jump: 'p2-jump' },
  },
  wall: 'tile-wall',
  platform: 'tile-platform',
  crate: 'crate',
  plateOff: 'plate-off',
  plateOn: 'plate-on',
  switchOff: 'switch-off',
  switchOn: 'switch-on',
  door: 'door',
  exit: 'exit',
  spike: 'spike',
  particle: 'particle',
  glow: 'glow',
  background: 'bg-tile',
  gradient: 'bg-gradient',
  vignette: 'vignette',
} as const;

type Ctx = CanvasRenderingContext2D;

function makeTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (ctx: Ctx) => void,
): void {
  if (scene.textures.exists(key)) return;

  const texture = scene.textures.createCanvas(key, width, height);
  if (!texture) throw new Error(`Could not create texture "${key}"`);

  const ctx = texture.getContext();
  ctx.imageSmoothingEnabled = false;
  draw(ctx);
  texture.refresh();
}

const PLAYER_PALETTES = {
  1: { body: '#4cc9f0', light: '#b6f1ff', dark: '#1b6f8f', ink: '#0a1a22' },
  2: { body: '#f4a261', light: '#ffd9b0', dark: '#a05a2c', ink: '#241207' },
} as const;

type PlayerPose = 'idle' | 'walkA' | 'walkB' | 'jump';

function drawPlayer(ctx: Ctx, id: 1 | 2, pose: PlayerPose): void {
  const p = PLAYER_PALETTES[id];

  // Silhouette with clipped corners, 12x16.
  ctx.fillStyle = p.dark;
  ctx.fillRect(3, 0, 6, 1);
  ctx.fillRect(2, 1, 8, 1);
  ctx.fillRect(1, 2, 10, 11);
  ctx.fillRect(2, 13, 8, 1);

  // Body fill and lighting.
  ctx.fillStyle = p.body;
  ctx.fillRect(3, 1, 6, 1);
  ctx.fillRect(2, 2, 8, 11);
  ctx.fillStyle = p.light;
  ctx.fillRect(2, 2, 1, 10);
  ctx.fillRect(3, 2, 5, 1);

  // Eye, facing right by default.
  ctx.fillStyle = p.ink;
  ctx.fillRect(7, 4, 2, 3);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(7, 4, 1, 1);

  // Belt.
  ctx.fillStyle = p.dark;
  ctx.fillRect(2, 10, 8, 1);

  // Feet vary per pose so walking reads at 12px wide.
  ctx.fillStyle = p.ink;
  if (pose === 'walkA') {
    ctx.fillRect(1, 14, 4, 2);
    ctx.fillRect(7, 13, 4, 2);
  } else if (pose === 'walkB') {
    ctx.fillRect(2, 13, 3, 2);
    ctx.fillRect(6, 14, 4, 2);
  } else if (pose === 'jump') {
    ctx.fillRect(2, 12, 3, 2);
    ctx.fillRect(7, 12, 4, 2);
  } else {
    ctx.fillRect(2, 14, 3, 2);
    ctx.fillRect(7, 14, 3, 2);
  }
}

function drawWall(ctx: Ctx): void {
  ctx.fillStyle = '#232d44';
  ctx.fillRect(0, 0, 16, 16);
  ctx.fillStyle = '#3b4a6b';
  ctx.fillRect(0, 0, 16, 2);
  ctx.fillStyle = '#2b3752';
  ctx.fillRect(0, 2, 16, 1);
  ctx.fillStyle = '#151c2c';
  ctx.fillRect(0, 15, 16, 1);
  ctx.fillRect(15, 0, 1, 16);

  // A couple of rivets and specks so large walls are not flat.
  ctx.fillStyle = '#4a5980';
  ctx.fillRect(3, 6, 1, 1);
  ctx.fillRect(12, 10, 1, 1);
  ctx.fillStyle = '#1c2438';
  ctx.fillRect(6, 11, 2, 1);
  ctx.fillRect(10, 4, 1, 2);
}

function drawPlatform(ctx: Ctx): void {
  ctx.fillStyle = '#3b4a6b';
  ctx.fillRect(0, 0, 16, 2);
  ctx.fillStyle = '#232d44';
  ctx.fillRect(0, 2, 16, 3);
  ctx.fillStyle = '#151c2c';
  ctx.fillRect(0, 5, 16, 1);
  ctx.fillStyle = '#4a5980';
  ctx.fillRect(2, 0, 2, 1);
  ctx.fillRect(11, 0, 2, 1);
}

function drawCrate(ctx: Ctx): void {
  ctx.fillStyle = '#5c3a1f';
  ctx.fillRect(0, 0, 14, 14);
  ctx.fillStyle = '#8a5a33';
  ctx.fillRect(1, 1, 12, 12);
  ctx.fillStyle = '#b07a45';
  ctx.fillRect(2, 2, 10, 2);
  ctx.fillRect(2, 2, 2, 10);

  // Diagonal braces.
  ctx.fillStyle = '#5c3a1f';
  for (let i = 0; i < 9; i++) {
    ctx.fillRect(2 + i, 2 + i, 2, 1);
    ctx.fillRect(10 - i, 2 + i, 2, 1);
  }

  // Metal corners.
  ctx.fillStyle = '#c9d3e3';
  ctx.fillRect(1, 1, 2, 2);
  ctx.fillRect(11, 1, 2, 2);
  ctx.fillRect(1, 11, 2, 2);
  ctx.fillRect(11, 11, 2, 2);
  ctx.fillStyle = '#6d7a90';
  ctx.fillRect(2, 2, 1, 1);
  ctx.fillRect(12, 2, 1, 1);
  ctx.fillRect(2, 12, 1, 1);
  ctx.fillRect(12, 12, 1, 1);
}

function drawPlate(ctx: Ctx, on: boolean): void {
  ctx.fillStyle = '#0e1420';
  ctx.fillRect(0, 2, 16, 4);
  ctx.fillStyle = on ? '#ffd166' : '#6b7cff';
  ctx.fillRect(1, 2, 14, 2);
  ctx.fillRect(2, 4, 12, 1);
  ctx.fillStyle = on ? '#fff2c2' : '#b9c4ff';
  ctx.fillRect(2, 2, 12, 1);
  ctx.fillStyle = '#0a0f18';
  ctx.fillRect(4, 5, 8, 1);
}

function drawSwitch(ctx: Ctx, on: boolean): void {
  ctx.fillStyle = '#0e1420';
  ctx.fillRect(1, 3, 10, 9);
  ctx.fillStyle = '#3b4a6b';
  ctx.fillRect(2, 4, 8, 7);
  ctx.fillStyle = on ? '#06d6a0' : '#7d8899';
  ctx.fillRect(3, 9, 6, 2);
  // Lever arm points left when off, right when on.
  ctx.fillStyle = '#e6edf3';
  if (on) {
    ctx.fillRect(6, 4, 2, 5);
    ctx.fillRect(8, 4, 2, 2);
  } else {
    ctx.fillRect(4, 4, 2, 5);
    ctx.fillRect(2, 4, 2, 2);
  }
}

function drawDoor(ctx: Ctx): void {
  ctx.fillStyle = '#2a3550';
  ctx.fillRect(0, 0, 16, 16);
  ctx.fillStyle = '#46577d';
  ctx.fillRect(1, 1, 14, 14);
  ctx.fillStyle = '#dbe6ff';
  ctx.fillRect(2, 2, 12, 2);
  ctx.fillRect(2, 12, 12, 2);
  ctx.fillStyle = '#8b9bbd';
  ctx.fillRect(3, 6, 10, 4);
  ctx.fillStyle = '#65779c';
  ctx.fillRect(4, 7, 8, 2);
  // Bolts.
  ctx.fillStyle = '#dbe6ff';
  ctx.fillRect(2, 6, 1, 1);
  ctx.fillRect(13, 6, 1, 1);
  ctx.fillRect(2, 9, 1, 1);
  ctx.fillRect(13, 9, 1, 1);
}

function drawExit(ctx: Ctx): void {
  ctx.fillStyle = '#0a0f18';
  ctx.fillRect(0, 0, 16, 24);
  ctx.fillStyle = '#2a3550';
  ctx.fillRect(1, 1, 14, 22);
  ctx.fillStyle = '#0e1b1a';
  ctx.fillRect(3, 3, 10, 19);
  ctx.fillStyle = '#0f6b56';
  ctx.fillRect(4, 5, 8, 16);
  ctx.fillStyle = '#06d6a0';
  ctx.fillRect(5, 7, 6, 12);
  ctx.fillStyle = '#b8ffe8';
  ctx.fillRect(6, 9, 4, 8);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(7, 11, 2, 4);
}

function drawSpike(ctx: Ctx): void {
  ctx.fillStyle = '#3a1020';
  ctx.fillRect(0, 5, 16, 3);
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = '#ef476f';
    ctx.beginPath();
    ctx.moveTo(i * 4, 6);
    ctx.lineTo(i * 4 + 2, 0);
    ctx.lineTo(i * 4 + 4, 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffd0dc';
    ctx.fillRect(i * 4 + 1, 2, 1, 2);
  }
}

function drawGradient(ctx: Ctx): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, 270);
  gradient.addColorStop(0, '#0b1220');
  gradient.addColorStop(0.55, '#0d1424');
  gradient.addColorStop(1, '#151d2f');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 480, 270);

  // Distant stars / dust, static per level.
  let seed = 1337;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(rand() * 480);
    const y = Math.floor(rand() * 200);
    const bright = rand();
    ctx.fillStyle = bright > 0.85 ? 'rgba(160, 190, 255, 0.55)' : 'rgba(90, 110, 150, 0.28)';
    ctx.fillRect(x, y, 1, 1);
  }
}

function drawBackgroundTile(ctx: Ctx): void {
  ctx.fillStyle = '#0c1220';
  ctx.fillRect(0, 0, 32, 32);
  ctx.fillStyle = '#0f1728';
  ctx.fillRect(0, 0, 16, 1);
  ctx.fillRect(0, 16, 16, 1);
  ctx.fillStyle = '#111a2c';
  ctx.fillRect(0, 8, 1, 1);
  ctx.fillRect(20, 22, 1, 1);
}

function drawVignette(ctx: Ctx): void {
  const gradient = ctx.createRadialGradient(240, 135, 90, 240, 135, 280);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 480, 270);
}

function drawGlow(ctx: Ctx): void {
  const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
  gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.25)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 32, 32);
}

/** Generates every texture the game needs. Called once from BootScene. */
export function createGameTextures(scene: Phaser.Scene): void {
  const poses: PlayerPose[] = ['idle', 'walkA', 'walkB', 'jump'];

  for (const id of [1, 2] as const) {
    for (const pose of poses) {
      const key = TEX.player[id][pose];
      makeTexture(scene, key, 12, 16, (ctx) => drawPlayer(ctx, id, pose));
    }
  }

  makeTexture(scene, TEX.wall, 16, 16, drawWall);
  makeTexture(scene, TEX.platform, 16, 6, drawPlatform);
  makeTexture(scene, TEX.crate, 14, 14, drawCrate);
  makeTexture(scene, TEX.plateOff, 16, 6, (ctx) => drawPlate(ctx, false));
  makeTexture(scene, TEX.plateOn, 16, 6, (ctx) => drawPlate(ctx, true));
  makeTexture(scene, TEX.switchOff, 12, 12, (ctx) => drawSwitch(ctx, false));
  makeTexture(scene, TEX.switchOn, 12, 12, (ctx) => drawSwitch(ctx, true));
  makeTexture(scene, TEX.door, 16, 16, drawDoor);
  makeTexture(scene, TEX.exit, 16, 24, drawExit);
  makeTexture(scene, TEX.spike, 16, 8, drawSpike);
  makeTexture(scene, TEX.particle, 2, 2, (ctx) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 2, 2);
  });
  makeTexture(scene, TEX.glow, 32, 32, drawGlow);
  makeTexture(scene, TEX.background, 32, 32, drawBackgroundTile);
  makeTexture(scene, TEX.gradient, 480, 270, drawGradient);
  makeTexture(scene, TEX.vignette, 480, 270, drawVignette);
}

/** Registers sprite animations from the generated player frames. */
export function createPlayerAnimations(scene: Phaser.Scene): void {
  const walkFrames = (id: 1 | 2) => [
    { key: TEX.player[id].walkA },
    { key: TEX.player[id].idle },
    { key: TEX.player[id].walkB },
    { key: TEX.player[id].idle },
  ];

  for (const id of [1, 2] as const) {
    const key = `walk-${id}`;
    if (scene.anims.exists(key)) continue;

    scene.anims.create({
      key,
      frames: walkFrames(id),
      frameRate: 9,
      repeat: -1,
    });
  }
}

export function playerTexture(id: 1 | 2, pose: PlayerPose): string {
  return TEX.player[id][pose];
}
