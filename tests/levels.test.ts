import { describe, expect, it } from 'vitest';

import { LEVELS } from '../src/game/level/levels';
import { parseLevel } from '../src/game/level/parseLevel';

describe('level data', () => {
  it('ships five levels with unique ids and names', () => {
    expect(LEVELS).toHaveLength(5);
    expect(new Set(LEVELS.map((level) => level.id)).size).toBe(LEVELS.length);
    expect(new Set(LEVELS.map((level) => level.name)).size).toBe(LEVELS.length);
  });

  it.each(LEVELS.map((level) => [level.id, level] as const))('%s parses cleanly', (_id, spec) => {
    const parsed = parseLevel(spec);

    expect(parsed.spawns).toHaveLength(2);
    expect(parsed.exit.width).toBeGreaterThan(0);
    expect(parsed.walls.length).toBeGreaterThan(0);
    expect(spec.hint.length).toBeGreaterThan(10);
  });

  it('only uses plates and switches that have doors, and vice versa', () => {
    for (const spec of LEVELS) {
      const parsed = parseLevel(spec);
      const doorLinks = new Set(parsed.doors.map((door) => door.link));
      const sources = [...parsed.plates, ...parsed.switches].map((source) => source.link);

      for (const link of sources) {
        expect(doorLinks.has(link)).toBe(true);
      }
    }
  });

  it('keeps every map rectangular and 17 rows tall', () => {
    for (const spec of LEVELS) {
      expect(spec.map).toHaveLength(17);
      const widths = new Set(spec.map.map((row) => row.length));
      expect(widths.size).toBe(1);
    }
  });
});
