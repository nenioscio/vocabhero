# VocabHero

React-based vocabulary trainer for the Helbling "More 2" student book word list.
German native speaker learning English. Pure client-side app — all progression is
stored in the browser (localStorage), no server needed.

## Word list

`wordlist.json` (1,741 entries) from the student book:

```json
{ "en": "a / an", "ge": "ein/e", "src": "wordlist/audios/a-an.mp3" }
```

mp3s available via the ebook server, e.g.:

```
curl https://ebooks.helbling.com/ebook/books/more/more-2-sb-2023-ebook-jOomrahlF7jc1I09rd7dGB66K1IC6xQN/wordlist/audios/a-an.mp3 -O
```

The audio base URL can be overridden with `VITE_AUDIO_BASE_URL`.

## Modes

- **De → En** — German word shown, type the English word
- **Audio → En** — audio plays in the browser, type the English word
- **En → De** — English word shown, type the German word
- **De → En (self check)** — German word shown, say it out loud, reveal the
  answer, then mark correct / not yet (Whisper-based audio checking can be
  added later)

## Answer parsing

Book entries pack multiple valid variants into one string. `src/lib/wordlist.ts`
expands them all, e.g.:

- `a / an` → `a`, `an`
- `Schmerz/en` → `Schmerz`, `Schmerzen`
- `(dar-)über, oberhalb` → `über`, `darüber`, `oberhalb`
- `child (pl children)` → `child`, `children`
- `advice (no pl)` → `advice`
- `to be afraid (of)` → `to be afraid`, `to be afraid of`
- `UFO (unidentified flying object)` → `UFO`, `unidentified flying object`
- `Zoll (= 2,54 cm)` → `Zoll`

Matching is case- and whitespace-insensitive and accepts umlaut variants
(`strasse` = `Straße`, `uber` = `über`).

## Progression

- Per word: attempts, correct/wrong, streak, state `new → learning → known`
  (known after 3 correct in a row; a miss drops `known` back to `learning`)
- Per mode: sessions, answered, correct
- Sessions can be sized (10/20/50/all) and filtered (all / not known / new);
  weak words are queued first

## Run

```bash
npm install
npm run dev      # development server
npm run build    # production build (dist/)
npm run preview  # serve the production build
```

## Tech

Vite + React 19 + TypeScript, shadcn/ui (Tailwind v4), lucide icons, sonner toasts.
