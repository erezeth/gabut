import { TILE_SIZE } from '../constants';

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DoorTile extends Point {
  /** Link id shared with the plates or switches that open this door. */
  link: string;
}

export interface PlateTile extends Point {
  link: string;
}

export interface SwitchTile extends Point {
  link: string;
}

export interface ParsedLevel {
  id: string;
  name: string;
  hint: string;
  /** Dimensions in tiles. */
  columns: number;
  rows: number;
  /** Dimensions in world pixels. */
  width: number;
  height: number;
  spawns: [Point, Point];
  walls: Rect[];
  platforms: Rect[];
  doors: DoorTile[];
  plates: PlateTile[];
  switches: SwitchTile[];
  crates: Point[];
  spikes: Rect[];
  exit: Rect;
}

export interface LevelSpec {
  id: string;
  name: string;
  hint: string;
  /** ASCII map, one string per row. Every row must have the same length. */
  map: readonly string[];
}

const PLATE_CHARS = 'abcdef';
const PLATE_DOOR_CHARS = 'ABCDEF';
const SWITCH_CHARS = 'st';
const SWITCH_DOOR_CHARS = 'ST';
const SOLID = '#';
const PLATFORM = '-';
const EMPTY = '.';
const CRATE = 'X';
const SPIKE = '^';
const EXIT = 'E';

const ALLOWED = new Set([
  EMPTY,
  SOLID,
  PLATFORM,
  CRATE,
  SPIKE,
  EXIT,
  '1',
  '2',
  ...PLATE_CHARS,
  ...PLATE_DOOR_CHARS,
  ...SWITCH_CHARS,
  ...SWITCH_DOOR_CHARS,
]);

/** Merges adjacent tiles on the same row into wider collision rectangles. */
export function mergeRuns(tiles: Point[]): Rect[] {
  const rows = new Map<number, number[]>();

  for (const tile of tiles) {
    const row = rows.get(tile.y) ?? [];
    row.push(tile.x);
    rows.set(tile.y, row);
  }

  const rects: Rect[] = [];
  for (const [y, xs] of rows) {
    xs.sort((a, b) => a - b);

    let start = xs[0];
    if (start === undefined) continue;

    let previous = start;
    for (let index = 1; index <= xs.length; index++) {
      const current = xs[index];

      if (current === undefined || current !== previous + 1) {
        rects.push(tileRect(start, y, previous - start + 1, 1));
        if (current !== undefined) start = current;
      }

      if (current !== undefined) previous = current;
    }
  }

  return rects;
}

export function tileRect(x: number, y: number, width = 1, height = 1): Rect {
  return { x: x * TILE_SIZE, y: y * TILE_SIZE, width: width * TILE_SIZE, height: height * TILE_SIZE };
}

/**
 * Turns an ASCII map into everything the level scene needs: collision rects,
 * linked puzzle pieces, spawn points and the exit zone.
 *
 * Throws with a readable message on malformed maps, so a typo in a level is
 * caught by the unit tests instead of becoming an unplayable level.
 */
export function parseLevel(spec: LevelSpec): ParsedLevel {
  const { map } = spec;

  if (map.length === 0) {
    throw new Error(`${spec.id}: level map is empty`);
  }

  const columns = map[0]?.length ?? 0;
  if (columns === 0) {
    throw new Error(`${spec.id}: level map has no columns`);
  }

  map.forEach((row, y) => {
    if (row.length !== columns) {
      throw new Error(
        `${spec.id}: row ${y} has ${row.length} columns, expected ${columns} (ragged map)`,
      );
    }
  });

  const wallTiles: Point[] = [];
  const platformTiles: Point[] = [];
  const spikeTiles: Point[] = [];
  const doors: DoorTile[] = [];
  const plates: PlateTile[] = [];
  const switches: SwitchTile[] = [];
  const crates: Point[] = [];
  const spawns: Point[] = [];
  let exitMinX = Number.POSITIVE_INFINITY;
  let exitMinY = Number.POSITIVE_INFINITY;
  let exitMaxX = -1;
  let exitMaxY = -1;

  map.forEach((row, y) => {
    for (let x = 0; x < columns; x++) {
      const char = row[x];
      if (char === undefined) continue;

      if (!ALLOWED.has(char)) {
        throw new Error(`${spec.id}: unknown tile "${char}" at column ${x}, row ${y}`);
      }

      switch (char) {
        case EMPTY:
          break;
        case SOLID:
          wallTiles.push({ x, y });
          break;
        case PLATFORM:
          platformTiles.push({ x, y });
          break;
        case SPIKE:
          spikeTiles.push({ x, y });
          break;
        case CRATE:
          crates.push(tileCenter(x, y));
          break;
        case '1':
        case '2':
          spawns[Number(char) - 1] = tileBottomCenter(x, y);
          break;
        case EXIT:
          exitMinX = Math.min(exitMinX, x);
          exitMinY = Math.min(exitMinY, y);
          exitMaxX = Math.max(exitMaxX, x);
          exitMaxY = Math.max(exitMaxY, y);
          break;
        default: {
          if (PLATE_CHARS.includes(char)) {
            plates.push({ x, y, link: char });
          } else if (SWITCH_CHARS.includes(char)) {
            switches.push({ x, y, link: char });
          } else if (PLATE_DOOR_CHARS.includes(char) || SWITCH_DOOR_CHARS.includes(char)) {
            doors.push({ x, y, link: char.toLowerCase() });
          } else {
            throw new Error(`${spec.id}: unsupported tile "${char}" at column ${x}, row ${y}`);
          }
        }
      }
    }
  });

  if (spawns.length !== 2) {
    throw new Error(`${spec.id}: expected one "1" spawn and one "2" spawn, found ${spawns.length}`);
  }

  if (exitMaxX < 0) {
    throw new Error(`${spec.id}: level has no exit ("E")`);
  }

  const doorLinks = new Set(doors.map((door) => door.link));
  const sourceLinks = new Set([...plates, ...switches].map((source) => source.link));

  for (const link of doorLinks) {
    if (!sourceLinks.has(link)) {
      throw new Error(`${spec.id}: door "${link}" has no matching plate or switch`);
    }
  }
  for (const link of sourceLinks) {
    if (!doorLinks.has(link)) {
      throw new Error(`${spec.id}: plate/switch "${link}" has no matching door`);
    }
  }

  return {
    id: spec.id,
    name: spec.name,
    hint: spec.hint,
    columns,
    rows: map.length,
    width: columns * TILE_SIZE,
    height: map.length * TILE_SIZE,
    spawns: [spawns[0]!, spawns[1]!],
    walls: mergeRuns(wallTiles),
    platforms: mergeRuns(platformTiles),
    doors,
    plates,
    switches,
    crates,
    spikes: mergeRuns(spikeTiles),
    exit: tileRect(exitMinX, exitMinY, exitMaxX - exitMinX + 1, exitMaxY - exitMinY + 1),
  };
}

export function tileCenter(x: number, y: number): Point {
  return { x: x * TILE_SIZE + TILE_SIZE / 2, y: y * TILE_SIZE + TILE_SIZE / 2 };
}

/** Position where a 16px tall sprite can stand on the bottom of the tile. */
export function tileBottomCenter(x: number, y: number): Point {
  return { x: x * TILE_SIZE + TILE_SIZE / 2, y: y * TILE_SIZE + TILE_SIZE };
}
