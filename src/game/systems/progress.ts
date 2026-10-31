import { STORAGE_KEYS } from '../constants';

export interface LevelRecord {
  timeMs: number;
  deaths: number;
}

export interface Progress {
  /** Number of unlocked levels, counting from 1. */
  unlocked: number;
  records: Record<string, LevelRecord>;
}

export const EMPTY_PROGRESS: Progress = { unlocked: 1, records: {} };

/**
 * Parses whatever is in localStorage into a valid Progress. Corrupt or partial
 * data must never break the game, so this always returns a usable object.
 */
export function parseProgress(raw: string | null): Progress {
  if (!raw) return { ...EMPTY_PROGRESS, records: {} };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ...EMPTY_PROGRESS, records: {} };
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return { ...EMPTY_PROGRESS, records: {} };
  }

  const candidate = parsed as Partial<Progress>;
  const unlocked =
    typeof candidate.unlocked === 'number' && Number.isFinite(candidate.unlocked)
      ? Math.max(1, Math.floor(candidate.unlocked))
      : 1;

  const records: Record<string, LevelRecord> = {};
  if (candidate.records && typeof candidate.records === 'object') {
    for (const [id, value] of Object.entries(candidate.records)) {
      if (
        value &&
        typeof value === 'object' &&
        typeof (value as LevelRecord).timeMs === 'number' &&
        (value as LevelRecord).timeMs > 0 &&
        typeof (value as LevelRecord).deaths === 'number'
      ) {
        records[id] = {
          timeMs: Math.floor((value as LevelRecord).timeMs),
          deaths: Math.max(0, Math.floor((value as LevelRecord).deaths)),
        };
      }
    }
  }

  return { unlocked, records };
}

/** Keeps the fastest time; deaths are recorded from that same run. */
export function recordRun(
  progress: Progress,
  levelId: string,
  timeMs: number,
  deaths: number,
): Progress {
  const previous = progress.records[levelId];
  const nextRecord = previous && previous.timeMs <= timeMs ? previous : { timeMs, deaths };

  return {
    unlocked: progress.unlocked,
    records: { ...progress.records, [levelId]: nextRecord },
  };
}

export function unlockNext(progress: Progress, levelNumber: number): Progress {
  return {
    ...progress,
    unlocked: Math.max(progress.unlocked, levelNumber + 1),
  };
}

export function isUnlocked(progress: Progress, levelNumber: number): boolean {
  return levelNumber <= progress.unlocked;
}

export function loadProgress(): Progress {
  try {
    return parseProgress(globalThis.localStorage?.getItem(STORAGE_KEYS.progress) ?? null);
  } catch {
    return { ...EMPTY_PROGRESS, records: {} };
  }
}

export function saveProgress(progress: Progress): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEYS.progress, JSON.stringify(progress));
  } catch {
    // Storage can be unavailable (private mode); the session still works.
  }
}
