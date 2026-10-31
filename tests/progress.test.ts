import { describe, expect, it } from 'vitest';

import {
  isUnlocked,
  parseProgress,
  recordRun,
  unlockNext,
  type Progress,
} from '../src/game/systems/progress';

describe('parseProgress', () => {
  it('returns a fresh progress for missing data', () => {
    expect(parseProgress(null)).toEqual({ unlocked: 1, records: {} });
  });

  it('recovers from corrupt JSON', () => {
    expect(parseProgress('{not json')).toEqual({ unlocked: 1, records: {} });
  });

  it('ignores records with invalid fields', () => {
    const progress = parseProgress(
      JSON.stringify({
        unlocked: 3,
        records: {
          good: { timeMs: 12345, deaths: 2 },
          badTime: { timeMs: -5, deaths: 0 },
          badType: { timeMs: 'fast', deaths: 0 },
          zeroDeaths: { timeMs: 9000, deaths: -3 },
        },
      }),
    );

    expect(progress.unlocked).toBe(3);
    expect(progress.records['good']).toEqual({ timeMs: 12345, deaths: 2 });
    expect(progress.records['badTime']).toBeUndefined();
    expect(progress.records['badType']).toBeUndefined();
    expect(progress.records['zeroDeaths']).toEqual({ timeMs: 9000, deaths: 0 });
  });

  it('never reports fewer than one unlocked level', () => {
    expect(parseProgress(JSON.stringify({ unlocked: 0, records: {} })).unlocked).toBe(1);
  });
});

describe('recordRun', () => {
  const base: Progress = { unlocked: 2, records: {} };

  it('stores the first clear', () => {
    expect(recordRun(base, 'level-1', 42000, 1).records['level-1']).toEqual({
      timeMs: 42000,
      deaths: 1,
    });
  });

  it('keeps the faster run', () => {
    const first = recordRun(base, 'level-1', 42000, 1);
    const faster = recordRun(first, 'level-1', 30000, 3);

    expect(faster.records['level-1']).toEqual({ timeMs: 30000, deaths: 3 });
  });

  it('ignores a slower run', () => {
    const first = recordRun(base, 'level-1', 30000, 0);
    const slower = recordRun(first, 'level-1', 50000, 0);

    expect(slower.records['level-1']).toEqual({ timeMs: 30000, deaths: 0 });
  });
});

describe('unlocking', () => {
  it('unlocks the next level but never relocks', () => {
    const progress = unlockNext({ unlocked: 1, records: {} }, 1);
    expect(progress.unlocked).toBe(2);
    expect(unlockNext(progress, 1).unlocked).toBe(2);
  });

  it('checks level access', () => {
    const progress = { unlocked: 2, records: {} };
    expect(isUnlocked(progress, 1)).toBe(true);
    expect(isUnlocked(progress, 2)).toBe(true);
    expect(isUnlocked(progress, 3)).toBe(false);
  });
});
