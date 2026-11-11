import { useMemo, useState } from "react";
import { BookOpenCheck, Headphones, Languages, Mic, RotateCcw, Volume2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  MODES,
  POOL_FILTERS,
  SESSION_SIZES,
  sessionSizeLabel,
  type Mode,
  type PoolFilter,
} from "@/lib/config";
import { resetProgress, useProgress, getWordProgress } from "@/lib/progress";
import { poolForFilter, type SessionConfig } from "@/lib/session";
import { WORDS } from "@/lib/wordlist";

const MODE_ICONS: Record<Mode, typeof Languages> = {
  "de-en": Languages,
  "en-audio": Headphones,
  "en-de": BookOpenCheck,
  "de-en-self": Mic,
};

interface HomeScreenProps {
  onStart: (config: SessionConfig) => void;
}

export function HomeScreen({ onStart }: HomeScreenProps) {
  const progress = useProgress();
  const [size, setSize] = useState<number>(20);
  const [filter, setFilter] = useState<PoolFilter>("all");

  const counts = useMemo(() => {
    let known = 0;
    let learning = 0;
    for (const word of WORDS) {
      const state = getWordProgress(progress, word.id).state;
      if (state === "known") known += 1;
      else if (state === "learning") learning += 1;
    }
    return { total: WORDS.length, known, learning, fresh: WORDS.length - known - learning };
  }, [progress]);

  const poolSize = useMemo(() => poolForFilter(filter, progress).length, [filter, progress]);

  const modeStats = MODES.map((mode) => ({ mode, stats: progress.modes[mode.id] })).filter(
    (entry) => entry.stats && entry.stats.answered > 0,
  );

  function start(mode: Mode) {
    onStart({ mode, size, filter });
  }

  function handleReset() {
    if (window.confirm("Reset all saved progress? This cannot be undone.")) {
      resetProgress();
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">VocabHero</h1>
          <p className="text-muted-foreground mt-1">
            English words from your student book. Your progress is saved in this browser only.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Your progress</CardTitle>
          <CardDescription>
            A word counts as “known” after 3 correct answers in a row.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary" className="text-base px-3 py-1">
            {counts.total} words total
          </Badge>
          <Badge className="text-base px-3 py-1">{counts.known} known</Badge>
          <Badge variant="outline" className="text-base px-3 py-1">
            {counts.learning} learning
          </Badge>
          <Badge variant="outline" className="text-base px-3 py-1">
            {counts.fresh} new
          </Badge>
        </CardContent>
        {modeStats.length > 0 && (
          <>
            <Separator className="my-4" />
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
              {modeStats.map(({ mode, stats }) => (
                <span key={mode.id}>
                  {mode.title}: {Math.round((stats!.correct / stats!.answered) * 100)}% (
                  {stats!.correct}/{stats!.answered})
                </span>
              ))}
            </div>
          </>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session settings</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="session-size">Words per session</Label>
            <Select value={String(size)} onValueChange={(value) => setSize(Number(value))}>
              <SelectTrigger id="session-size" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SESSION_SIZES.map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    {sessionSizeLabel(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="word-pool">Word pool</Label>
            <Select value={filter} onValueChange={(value) => setFilter(value as PoolFilter)}>
              <SelectTrigger id="word-pool" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {POOL_FILTERS.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              {poolSize} words in this pool. Weak words are practiced first.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {MODES.map((mode) => {
          const Icon = MODE_ICONS[mode.id];
          return (
            <Card key={mode.id} className="flex flex-col">
              <CardHeader className="flex-row items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Icon className="size-5" />
                    {mode.title}
                  </CardTitle>
                  <CardDescription>{mode.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="mt-auto">
                <Button className="w-full" onClick={() => start(mode.id)} disabled={poolSize === 0}>
                  <Volume2 className="mr-2 size-4" />
                  Start
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <footer className="mt-auto flex items-center justify-between text-sm text-muted-foreground">
        <span>AUDIO files stream from the Helbling ebook server.</span>
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RotateCcw className="mr-2 size-4" />
          Reset progress
        </Button>
      </footer>
    </div>
  );
}
