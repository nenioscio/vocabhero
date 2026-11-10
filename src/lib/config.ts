export const AUDIO_BASE_URL =
  (import.meta.env.VITE_AUDIO_BASE_URL as string | undefined) ??
  "https://ebooks.helbling.com/ebook/books/more/more-2-sb-2023-ebook-jOomrahlF7jc1I09rd7dGB66K1IC6xQN/";

export type Mode = "de-en" | "en-audio" | "en-de" | "de-en-self";

export interface ModeInfo {
  id: Mode;
  title: string;
  description: string;
  answerLang: "en" | "de";
  usesInput: boolean;
}

export const MODES: ModeInfo[] = [
  {
    id: "de-en",
    title: "De → En",
    description: "A German word is shown. Type the English word.",
    answerLang: "en",
    usesInput: true,
  },
  {
    id: "en-audio",
    title: "Audio → En",
    description: "Listen to the audio. Type the English word you hear.",
    answerLang: "en",
    usesInput: true,
  },
  {
    id: "en-de",
    title: "En → De",
    description: "An English word is shown. Type the German word.",
    answerLang: "de",
    usesInput: true,
  },
  {
    id: "de-en-self",
    title: "De → En (self check)",
    description:
      "A German word is shown. Say the English word out loud, reveal the answer, then judge yourself.",
    answerLang: "en",
    usesInput: false,
  },
];

export function getMode(id: Mode): ModeInfo {
  return MODES.find((mode) => mode.id === id) ?? MODES[0];
}

export type PoolFilter = "all" | "weak" | "new";

export const POOL_FILTERS: { id: PoolFilter; label: string }[] = [
  { id: "all", label: "All words" },
  { id: "weak", label: "Not known yet" },
  { id: "new", label: "New words only" },
];

export const SESSION_SIZES = [10, 20, 50, 0] as const;

export function sessionSizeLabel(size: number): string {
  return size === 0 ? "All words" : `${size} words`;
}
