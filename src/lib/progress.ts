import { useSyncExternalStore } from "react";
import type { Mode } from "./config";

export type WordState = "new" | "learning" | "known";

export interface WordProgress {
  attempts: number;
  correct: number;
  wrong: number;
  /** Consecutive correct answers. */
  streak: number;
  lastSeenAt: number;
  state: WordState;
}

export interface ModeStats {
  sessions: number;
  answered: number;
  correct: number;
}

export interface ProgressData {
  words: Record<string, WordProgress>;
  modes: Partial<Record<Mode, ModeStats>>;
}

const STORAGE_KEY = "vocab-trainer:progress:v1";
const KNOWN_STREAK = 3;

const EMPTY: ProgressData = { words: {}, modes: {} };

function load(): ProgressData {
  try {
    const rawValue = localStorage.getItem(STORAGE_KEY);
    if (!rawValue) return EMPTY;
    const parsed = JSON.parse(rawValue) as Partial<ProgressData>;
    return { words: parsed.words ?? {}, modes: parsed.modes ?? {} };
  } catch {
    return EMPTY;
  }
}

let data: ProgressData = load();
const listeners = new Set<() => void>();

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage unavailable (private mode / quota) — progress stays in memory.
  }
}

function set(next: ProgressData): void {
  data = next;
  persist();
  for (const listener of listeners) listener();
}

export function subscribeProgress(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getProgressData(): ProgressData {
  return data;
}

export function useProgress(): ProgressData {
  return useSyncExternalStore(subscribeProgress, getProgressData);
}

export function getWordProgress(progress: ProgressData, wordId: string): WordProgress {
  return (
    progress.words[wordId] ?? {
      attempts: 0,
      correct: 0,
      wrong: 0,
      streak: 0,
      lastSeenAt: 0,
      state: "new",
    }
  );
}

export function recordAnswer(wordId: string, correct: boolean): void {
  const prev = getWordProgress(data, wordId);
  const next: WordProgress = {
    attempts: prev.attempts + 1,
    correct: prev.correct + (correct ? 1 : 0),
    wrong: prev.wrong + (correct ? 0 : 1),
    streak: correct ? prev.streak + 1 : 0,
    lastSeenAt: Date.now(),
    state: prev.state === "new" ? "learning" : prev.state,
  };
  if (next.streak >= KNOWN_STREAK) next.state = "known";
  if (!correct && prev.state === "known") next.state = "learning";
  set({ ...data, words: { ...data.words, [wordId]: next } });
}

export function recordSession(mode: Mode): void {
  const prev = data.modes[mode] ?? { sessions: 0, answered: 0, correct: 0 };
  set({
    ...data,
    modes: { ...data.modes, [mode]: { ...prev, sessions: prev.sessions + 1 } },
  });
}

export function resetProgress(): void {
  set({ words: {}, modes: {} });
}
