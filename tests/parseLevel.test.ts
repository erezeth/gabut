import { describe, expect, it } from 'vitest';

import { mergeRuns, parseLevel, type LevelSpec } from '../src/game/level/parseLevel';

const BASE: LevelSpec = {
  id: 'test',
  name: 'Test',
  hint: '',
  map: [
    '########',
    '#1.....#',
    '#..a..2#',
    '#......#',
    '###A####',
    '#......#',
    '#...E..#',
    '########',
  ],
};

describe('parseLevel', () => {
  it('parses spawns, doors, plates and the exit', () => {
    const level = parseLevel(BASE);

    expect(level.columns).toBe(8);
    expect(level.rows).toBe(8);
    expect(level.width).toBe(8 * 16);
    expect(level.height).toBe(8 * 16);

    expect(level.spawns[0]).toEqual({ x: 1 * 16 + 8, y: 1 * 16 + 16 });
    expect(level.spawns[1]).toEqual({ x: 6 * 16 + 8, y: 2 * 16 + 16 });

    expect(level.plates).toHaveLength(1);
    expect(level.plates[0]).toMatchObject({ x: 3, y: 2, link: 'a' });

    expect(level.doors).toHaveLength(1);
    expect(level.doors[0]).toMatchObject({ x: 3, y: 4, link: 'a' });

    expect(level.exit).toEqual({ x: 4 * 16, y: 6 * 16, width: 16, height: 16 });
  });

  it('merges horizontal wall runs into wider rects', () => {
    const level = parseLevel(BASE);
    const floor = level.walls.find((rect) => rect.y === 7 * 16);

    expect(level.walls).toContainEqual({ x: 0, y: 7 * 16, width: 8 * 16, height: 16 });
    expect(floor).toBeDefined();
  });

  it('rejects ragged maps', () => {
    const bad: LevelSpec = { ...BASE, map: ['###', '#1#', '#####'] };
    expect(() => parseLevel(bad)).toThrow(/ragged map/);
  });

  it('rejects unknown tiles', () => {
    const bad: LevelSpec = {
      ...BASE,
      map: BASE.map.map((row, index) => (index === 2 ? '#..q..2#' : row)),
    };
    expect(() => parseLevel(bad)).toThrow(/unknown tile "q"/);
  });

  it('rejects maps missing a spawn', () => {
    const bad: LevelSpec = {
      ...BASE,
      map: BASE.map.map((row, index) => (index === 2 ? '#..a...#' : row)),
    };
    expect(() => parseLevel(bad)).toThrow(/expected one "1" spawn and one "2" spawn/);
  });

  it('requires a matching door for every plate', () => {
    const bad: LevelSpec = {
      ...BASE,
      map: BASE.map.map((row) => row.replace('A', '#')),
    };
    expect(() => parseLevel(bad)).toThrow(/plate\/switch "a" has no matching door/);
  });

  it('requires a matching source for every door', () => {
    const bad: LevelSpec = {
      ...BASE,
      map: BASE.map.map((row) => row.replace('a', '.')),
    };
    expect(() => parseLevel(bad)).toThrow(/door "a" has no matching plate or switch/);
  });

  it('requires an exit', () => {
    const bad: LevelSpec = {
      ...BASE,
      map: BASE.map.map((row) => row.replace('E', '.')),
    };
    expect(() => parseLevel(bad)).toThrow(/no exit/);
  });
});

describe('mergeRuns', () => {
  it('merges contiguous tiles per row and keeps separate rows apart', () => {
    expect(
      mergeRuns([
        { x: 2, y: 0 },
        { x: 3, y: 0 },
        { x: 4, y: 0 },
        { x: 8, y: 0 },
        { x: 2, y: 1 },
      ]),
    ).toEqual([
      { x: 32, y: 0, width: 48, height: 16 },
      { x: 128, y: 0, width: 16, height: 16 },
      { x: 32, y: 16, width: 16, height: 16 },
    ]);
  });

  it('returns nothing for an empty list', () => {
    expect(mergeRuns([])).toEqual([]);
  });
});
