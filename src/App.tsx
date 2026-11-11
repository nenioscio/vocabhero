import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { HomeScreen } from "@/components/HomeScreen";
import { SessionScreen } from "@/components/SessionScreen";
import { buildQueue, type SessionConfig } from "@/lib/session";
import type { WordEntry } from "@/lib/wordlist";

interface ActiveSession {
  config: SessionConfig;
  queue: WordEntry[];
  key: number;
}

export default function App() {
  const [session, setSession] = useState<ActiveSession | null>(null);

  return (
    <div className="bg-background min-h-screen text-foreground">
      {session ? (
        <SessionScreen
          key={session.key}
          config={session.config}
          queue={session.queue}
          onRepeat={() => setSession({ ...session, key: session.key + 1 })}
          onExit={() => setSession(null)}
        />
      ) : (
        <HomeScreen
          onStart={(config) => setSession({ config, queue: buildQueue(config), key: 0 })}
        />
      )}
      <Toaster richColors position="top-center" />
    </div>
  );
}
