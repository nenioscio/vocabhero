import { getProgressData, getWordProgress, type ProgressData, type WordState } from "./progress";
import { WORDS, type WordEntry } from "./wordlist";
import type { Mode, PoolFilter } from "./config";

export interface SessionConfig {
  mode: Mode;
  /** Number of words; 0 = all. */
  size: number;
  filter: PoolFilter;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Words that need work come first: learning < new < known. */
const STATE_PRIORITY: Record<WordState, number> = { learning: 0, new: 1, known: 2 };

export function poolForFilter(
  filter: PoolFilter,
  progress: ProgressData = getProgressData(),
): WordEntry[] {
  if (filter === "weak") {
    return WORDS.filter((word) => getWordProgress(progress, word.id).state !== "known");
  }
  if (filter === "new") {
    return WORDS.filter((word) => getWordProgress(progress, word.id).state === "new");
  }
  return WORDS;
}

export function buildQueue(config: SessionConfig): WordEntry[] {
  const progress = getProgressData();
  const pool = poolForFilter(config.filter);

  const groups = new Map<number, WordEntry[]>();
  for (const word of pool) {
    const priority = STATE_PRIORITY[getWordProgress(progress, word.id).state];
    const group = groups.get(priority) ?? [];
    group.push(word);
    groups.set(priority, group);
  }

  const queued = [...groups.keys()]
    .sort((a, b) => a - b)
    .flatMap((key) => shuffle(groups.get(key) ?? []));

  return config.size > 0 ? queued.slice(0, config.size) : queued;
}
