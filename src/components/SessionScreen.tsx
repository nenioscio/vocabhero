import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  CircleHelp,
  Home,
  Play,
  RefreshCw,
  Volume2,
  X,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { getMode } from "@/lib/config";
import { playAudio, stopAudio } from "@/lib/audio";
import { recordAnswer, recordSession } from "@/lib/progress";
import type { SessionConfig } from "@/lib/session";
import { matchesAny, type WordEntry } from "@/lib/wordlist";

type Phase = "answer" | "reveal";

interface SessionScreenProps {
  config: SessionConfig;
  queue: WordEntry[];
  onRepeat: () => void;
  onRepeatWrong: (words: WordEntry[]) => void;
  onExit: () => void;
}

export function SessionScreen({ config, queue, onRepeat, onRepeatWrong, onExit }: SessionScreenProps) {
  const mode = getMode(config.mode);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("answer");
  const [answer, setAnswer] = useState("");
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const [finished, setFinished] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionRecorded = useRef(false);

  const word = queue[index];
  const options = mode.answerLang === "en" ? word.enOptions : word.geOptions;
  const prompt = mode.answerLang === "en" ? word.ge : word.en;

  useEffect(() => {
    return () => stopAudio();
  }, []);

  useEffect(() => {
    if (mode.id === "en-audio" && phase === "answer" && word) {
      playAudio(word.audioUrl);
    }
  }, [mode.id, phase, word]);

  useEffect(() => {
    if (phase === "answer" && mode.usesInput) {
      inputRef.current?.focus();
    }
  }, [phase, mode.usesInput, index]);

  const check = useCallback(() => {
    if (!word || phase !== "answer" || !mode.usesInput) return;
    const correct = matchesAny(answer, options);
    recordAnswer(word.id, correct);
    setWasCorrect(correct);
    setResults((prev) => [...prev, correct]);
    setPhase("reveal");
  }, [answer, mode.usesInput, options, phase, word]);

  const judge = useCallback(
    (correct: boolean) => {
      if (!word || phase !== "reveal") return;
      recordAnswer(word.id, correct);
      setWasCorrect(correct);
      setResults((prev) => [...prev, correct]);
      advance();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [word, phase],
  );

  function advance() {
    if (index + 1 >= queue.length) {
      if (!sessionRecorded.current) {
        sessionRecorded.current = true;
        recordSession(config.mode);
      }
      setFinished(true);
      return;
    }
    setIndex((prev) => prev + 1);
    setPhase("answer");
    setAnswer("");
    setWasCorrect(null);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (finished) return;
      if (phase === "answer" && mode.usesInput) {
        if (event.key === "Enter") check();
      } else if (phase === "reveal") {
        if (event.key === "Enter" && mode.usesInput) advance();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  if (queue.length === 0) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center gap-4 px-4">
        <CircleHelp className="size-10 text-muted-foreground" />
        <p className="text-muted-foreground">No words in this pool. Try a different filter.</p>
        <Button variant="outline" onClick={onExit}>
          <ArrowLeft className="mr-2 size-4" />
          Back
        </Button>
      </div>
    );
  }

  if (finished) {
    const correctCount = results.filter(Boolean).length;
    const missed = results
      .map((correct, i) => ({ correct, word: queue[i] }))
      .filter((entry) => !entry.correct);
    const percent = Math.round((correctCount / results.length) * 100);
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-4 py-10">
        <h1 className="text-2xl font-bold">Session complete</h1>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8">
            <span
              className={
                percent >= 80
                  ? "text-5xl font-bold text-green-600"
                  : percent >= 50
                    ? "text-5xl font-bold text-amber-600"
                    : "text-5xl font-bold text-red-600"
              }
            >
              {percent}%
            </span>
            <p className="text-muted-foreground">
              {correctCount} of {results.length} correct
            </p>
          </CardContent>
        </Card>
        {missed.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <h2 className="mb-3 font-semibold">Words to review</h2>
              <ul className="grid gap-2">
                {missed.map(({ word: w }) => (
                  <li key={w.id} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                    <span className="font-medium">{promptFor(config.mode, w)}</span>
                    <span className="text-muted-foreground">
                      → {optionsFor(config.mode, w).join(" / ")}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
        <div className="flex flex-wrap gap-3">
          {missed.length > 0 && (
            <Button onClick={() => onRepeatWrong(missed.map((entry) => entry.word))}>
              <RefreshCw className="mr-2 size-4" />
              Repeat missed words ({missed.length})
            </Button>
          )}
          <Button onClick={onRepeat} variant={missed.length > 0 ? "outline" : "default"}>
            <RefreshCw className="mr-2 size-4" />
            Practice these words again
          </Button>
          <Button variant="outline" onClick={onExit}>
            <Home className="mr-2 size-4" />
            New session
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-4 px-4 py-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onExit} aria-label="Quit session">
          <X className="size-5" />
        </Button>
        <ThemeToggle />
        <div className="flex-1">
          <div className="mb-1 flex items-baseline justify-between text-sm">
            <span className="font-medium">{mode.title}</span>
            <span className="text-muted-foreground">
              {index + 1} / {queue.length}
            </span>
          </div>
          <Progress value={((index + (phase === "reveal" ? 1 : 0)) / queue.length) * 100} />
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-5 py-8">
          {mode.id === "en-audio" ? (
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => playAudio(word.audioUrl)}
                className="flex size-24 items-center justify-center rounded-full border-2 border-primary/40 text-primary transition hover:scale-105 hover:border-primary"
                aria-label="Play audio"
              >
                <Play className="size-10 fill-current" />
              </button>
              <span className="text-muted-foreground text-sm">Tap to play again</span>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-muted-foreground mb-2 text-sm uppercase tracking-wide">
                {mode.answerLang === "de" ? "German" : "English"}
              </p>
              <p className="text-balance text-3xl font-semibold">{prompt}</p>
            </div>
          )}

          {mode.usesInput && phase === "answer" && (
            <>
              <Input
                ref={inputRef}
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder={
                  mode.answerLang === "en"
                    ? "Type the English word…"
                    : "Gib das deutsche Wort ein…"
                }
                className="h-12 text-lg"
                autoFocus
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
              />
              <Button
                size="lg"
                className="w-full"
                onClick={check}
                disabled={answer.trim().length === 0}
              >
                Check
              </Button>
            </>
          )}

          {mode.usesInput && phase === "answer" && (
            <Button
              variant="outline"
              size="sm"
              className="self-center"
              onClick={() => playAudio(word.audioUrl)}
            >
              <Volume2 className="mr-2 size-4" />
              Listen
            </Button>
          )}

          {!mode.usesInput && phase === "answer" && (
            <div className="flex flex-col items-center gap-3">
              <p className="text-muted-foreground text-sm">
                Say the English word out loud, then reveal the answer.
              </p>
              <Button size="lg" onClick={() => setPhase("reveal")}>
                Reveal answer
              </Button>
            </div>
          )}

          {phase === "reveal" && (
            <div className="flex flex-col gap-4">
              <Separator />
              <div className="text-center">
                <p className="text-muted-foreground mb-1 text-sm">Answer</p>
                <p className="text-2xl font-semibold">{options.join(" / ")}</p>
              </div>
              {wasCorrect !== null && (
                <div
                  className={cn(
                    "mx-auto flex w-fit items-center gap-2 rounded-full px-6 py-2.5 text-xl font-bold text-white shadow",
                    wasCorrect ? "bg-green-600" : "bg-red-600",
                  )}
                >
                  {wasCorrect ? <Check className="size-6" /> : <X className="size-6" />}
                  {wasCorrect
                    ? "Correct"
                    : mode.usesInput
                      ? `Not quite — you said “${answer.trim() || "—"}”`
                      : "Not yet"}
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="self-center"
                onClick={() => playAudio(word.audioUrl)}
              >
                <Volume2 className="mr-2 size-4" />
                Listen to the answer
              </Button>
              {mode.usesInput ? (
                <Button size="lg" className="w-full" onClick={advance}>
                  Next <span className="text-muted-foreground ml-1 text-sm">(Enter)</span>
                </Button>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Button size="lg" variant="default" onClick={() => judge(true)}>
                    <Check className="mr-2 size-5" />
                    Correct
                  </Button>
                  <Button size="lg" variant="destructive" onClick={() => judge(false)}>
                    <X className="mr-2 size-5" />
                    Not yet
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        {mode.usesInput
          ? "Enter checks your answer, then advances to the next word."
          : "Judge yourself honestly — the review list is built from your “Not yet” answers."}
      </p>
    </div>
  );
}

function promptFor(modeId: SessionConfig["mode"], word: WordEntry): string {
  const mode = getMode(modeId);
  return mode.answerLang === "en" ? word.ge : word.en;
}

function optionsFor(modeId: SessionConfig["mode"], word: WordEntry): string[] {
  const mode = getMode(modeId);
  return mode.answerLang === "en" ? word.enOptions : word.geOptions;
}
