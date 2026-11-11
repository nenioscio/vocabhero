import raw from "../../wordlist.json";
import { AUDIO_BASE_URL } from "./config";

export interface WordEntry {
  id: string;
  /** English as written in the book, e.g. "a / an" */
  en: string;
  /** German as written in the book, e.g. "über; ungefähr" */
  ge: string;
  audioUrl: string;
  /** All accepted English answers, normalized-friendly (display case kept). */
  enOptions: string[];
  /** All accepted German answers. */
  geOptions: string[];
}

// ---------------------------------------------------------------------------
// Parsing of option lists
//
// Book entries pack several valid variants into one string:
//   "a / an"                  -> a, an
//   "Schmerz/en"              -> Schmerz, Schmerzen
//   "(dar-)über, oberhalb"    -> über, darüber, oberhalb
//   "child (pl children)"     -> child, children
//   "advice (no pl)"          -> advice
//   "to be afraid (of)"       -> to be afraid, to be afraid of
//   "UFO (unidentified flying object)" -> UFO, unidentified flying object
//   "Zoll (= 2,54 cm)"        -> Zoll
// ---------------------------------------------------------------------------

const ANNOTATIONS = new Set(["no pl", "informal", "°", "£", "pl"]);

/** Single words that are optional prepositions/particles attached in parentheses. */
const PREPS = new Set([
  "of", "vor", "auf", "von", "an", "wie", "zu", "in", "für", "for", "to",
  "the", "it", "a", "e", "ein", "one", "up", "at", "s", "pe", "hier", "mehr",
  "more", "immer",
]);

/** Multi-word phrases that are optional additions, e.g. "ago (two days)". */
const PHRASES = new Set([
  "two days", "zwei tagen", "at home", "zu hause", "im sport",
  "von einem spuk", "i am",
]);

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const key = value.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(value);
    }
  }
  return result;
}

/** German plural suffixes written abbreviated, e.g. "Schmerz/en" -> Schmerzen. */
const PLURAL_SUFFIXES = new Set(["en", "er", "es", "em"]);

/** Split on , / ; but only outside parentheses. */
function splitRespectingParens(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of value) {
    if (char === "(") depth += 1;
    if (char === ")") depth = Math.max(0, depth - 1);
    if (depth === 0 && (char === "," || char === "/" || char === ";")) {
      parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  parts.push(current);

  const trimmed = parts.map((part) => part.trim()).filter((part) => part.length > 0);
  const result: string[] = [];
  for (let i = 0; i < trimmed.length; i += 1) {
    const part = trimmed[i];
    const prev = result[result.length - 1];
    // "Schmerz/en" -> "Schmerzen" (abbreviated plural suffix)
    if (prev && PLURAL_SUFFIXES.has(part.toLowerCase()) && prev.length >= 2) {
      result.push(prev + part.toLowerCase());
      continue;
    }
    result.push(part);
  }
  return result;
}

/** Expand a trailing parenthetical: "base (content)". */
function expandTrailing(base: string, content: string): string[] {
  const lower = content.toLowerCase();
  if (content.startsWith("=") || ANNOTATIONS.has(lower)) {
    return [base];
  }
  if (/^pl\b/i.test(lower)) {
    const plural = lower.replace(/^pl\s*/, "").trim();
    // "pl -men" is a stem, not a standalone word -> only accept the base form.
    return plural && !plural.startsWith("-") ? [base, plural] : [base];
  }
  if (PREPS.has(lower) || PHRASES.has(lower)) {
    return [base, `${base} ${content}`];
  }
  // Anything else is an alternative form ("maths (matik)", "UFO (unidentified flying object)")
  const inner = content.split(/[,/;]+/).map((part) => part.trim()).filter(Boolean);
  return inner.length > 1 ? [base, ...inner] : [base, content];
}

/** Expand a single parenthetical group in the value, returning new variants. */
function expandOneParens(value: string): [string[], boolean] {
  const open = value.indexOf("(");
  if (open === -1) return [[value], false];
  const close = value.indexOf(")", open);
  if (close === -1) return [[value], false];

  const content = value.slice(open + 1, close).trim();
  const before = value.slice(0, open).trim();
  const after = value.slice(close + 1).trim();

  if (before === "" && after === "") {
    return [[value, content], true];
  }

  // Optional prefix: "(ver-)brennen" -> brennen, verbrennen (also "vor-/zu-")
  if (content.endsWith("-")) {
    const prefixes = content
      .split("/")
      .map((part) => part.trim().replace(/-$/, ""))
      .filter(Boolean);
    const joinedBefore = before ? `${before} ` : "";
    const variants = [`${joinedBefore}${after}`];
    for (const prefix of prefixes) {
      variants.push(`${joinedBefore}${prefix}${after}`);
    }
    return [variants, true];
  }

  if (before === "") {
    // Leading optional part: "(a) cup" -> cup, a cup
    const inner = content.split(/[,/;]+/).map((part) => part.trim()).filter(Boolean);
    return [[after, ...inner.map((part) => `${part} ${after}`)], true];
  }

  if (after === "") {
    return [expandTrailing(before, content), true];
  }

  // Middle parenthetical: accept it with and without the part.
  const without = `${before} ${after}`.replace(/\s+/g, " ").trim();
  const with_ = `${before} ${content} ${after}`.replace(/\s+/g, " ").trim();
  return [[without, with_], true];
}

function expandToken(token: string): string[] {
  let variants: string[] = [token];
  for (let guard = 0; guard < 8; guard += 1) {
    const next: string[] = [];
    let changed = false;
    for (const variant of variants) {
      const [expanded, didChange] = expandOneParens(variant);
      next.push(...expanded);
      if (didChange) changed = true;
    }
    variants = dedupe(next);
    if (!changed) break;
  }
  return variants;
}

/** Parse a raw book entry into all accepted answer variants. */
export function parseOptions(rawValue: string): string[] {
  return dedupe(
    splitRespectingParens(rawValue)
      .flatMap((token) => expandToken(token))
      .map((variant) => variant.replace(/\s+/g, " ").trim())
      .filter((variant) => variant.length > 0),
  );
}

// ---------------------------------------------------------------------------
// Answer matching
// ---------------------------------------------------------------------------

export function normalizeAnswer(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\u2019\u2018]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\.$/, "");
}

/** Fold diacritics so "straße" matches "strasse" and "Über" matches "uber". */
function asciiFold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss");
}

export function matchesAny(input: string, options: string[]): boolean {
  const normalized = normalizeAnswer(input);
  if (!normalized) return false;
  const folded = asciiFold(normalized);
  return options.some((option) => {
    const target = normalizeAnswer(option);
    return normalized === target || folded === asciiFold(target);
  });
}

// ---------------------------------------------------------------------------
// Word list
// ---------------------------------------------------------------------------

function hashCode(value: string): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) + hash + value.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

interface RawEntry {
  en: string;
  ge: string;
  src: string;
}

const rawList: RawEntry[] = (raw as { wordlist: RawEntry[] }).wordlist;

export const WORDS: WordEntry[] = rawList.map((entry, index) => {
  const en = entry.en.trim();
  const ge = entry.ge.trim();
  return {
    id: `w${index}-${hashCode(`${en}|${ge}`)}`,
    en,
    ge,
    audioUrl: `${AUDIO_BASE_URL}${entry.src}`,
    enOptions: parseOptions(en),
    geOptions: parseOptions(ge),
  };
});
