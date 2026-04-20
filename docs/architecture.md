# Architecture

Deep-dive for AI agents. For the entry point, see `../AGENTS.md`.

---

## 1. Data Model

Defined in `prisma/schema.prisma`. PostgreSQL (Neon).

```
User (id, email, password_hash, created_at)
 ├── decks:       Deck[]
 ├── card_states: CardState[]
 ├── review_logs: ReviewLog[]
 └── streak:      Streak?        (1:1, optional)

Deck (id, user_id, name, description?, review_enabled=true, created_at)
 └── cards: Card[]
 @@index([user_id])

Card (id, deck_id, front, back, example?, tags?, audio_url?, created_at)
 ├── states:  CardState[]   (ALWAYS 2 per card: "normal" + "reverse")
 └── reviews: ReviewLog[]
 @@index([deck_id])

CardState (id, card_id, user_id, direction,
           stability, difficulty, elapsed_days, scheduled_days,
           reps, lapses, state, due, last_review?)
 direction ∈ {"normal", "reverse"}
 @@unique([card_id, user_id, direction])
 @@index([user_id, due])

ReviewLog (id, card_id, user_id, rating 1..4, reviewed_at)
 @@index([user_id, reviewed_at])

Streak (id, user_id UNIQUE, current_streak, longest_streak, last_review_date?)

AudioCache (id, text_hash UNIQUE, text, lang="en", voice_id, blob_url, created_at)
```

### Key invariants

- **2 CardStates per Card.** Created atomically when a card is added (see `src/app/api/decks/[id]/cards/route.ts` and `.../import/route.ts`). The `@@unique([card_id, user_id, direction])` enforces uniqueness.
- **Cascade deletes.** Deleting a `Deck` cascades to `Card` → `CardState` + `ReviewLog`.
- **FSRS fields on CardState** mirror the `ts-fsrs` `Card` type 1:1 — rename carefully.
- **AudioCache is global** (no user_id) — content-addressed by SHA-256 of text.

---

## 2. Request Flow

```
Browser
  │ (cookie: NextAuth JWT session)
  ▼
Next.js Route Handler  (src/app/api/**/route.ts)
  │  ┌─ getAuthUser() → { userId } | { error }   [src/lib/api-auth.ts]
  ▼
Prisma Client  (src/lib/prisma.ts, singleton with PrismaPg adapter)
  │
  ▼
Neon Postgres (DATABASE_URL)
```

### Auth

- Provider: NextAuth v5 (beta), Credentials only, JWT sessions.
- Config: `src/lib/auth.ts`. Exports `handlers`, `signIn`, `signOut`, `auth`.
- Session shape extended in `src/lib/auth.d.ts` (adds `user.id`).
- All protected API routes start with `const { userId, error } = await getAuthUser(); if (error) return error;`.
- UI pages under `src/app/(main)/**` are gated via the layout calling `auth()`.

### Review Flow

1. `GET /api/review?deckId=…&tag=…` → `CardState`s with `due <= now`, filtered by `card.deck.review_enabled: true`, ordered by `due ASC`, limit 50.
2. Client picks top card, user flips, rates 1..4 (Again/Hard/Good/Easy).
3. `POST /api/review { cardStateId, rating }` →
   - Load `CardState`
   - `fsrs().repeat(fsrsCard, now)[rating].card` computes next scheduling
   - Update `CardState` + create `ReviewLog` + update `Streak`
4. Streak logic: `diffDays === 0` no-op, `=== 1` increment, `> 1` reset to 1. See `updateStreak()` in `src/app/api/review/route.ts`.

### TTS Flow

1. Client hook `useTTS(text)` calls `POST /api/tts { text }`.
2. Server SHA-256 hashes `text`. If `AudioCache` hit → returns proxy URL `/api/tts/audio/{hash}`.
3. Miss → call ElevenLabs (voice `CwhRBWXzGAHq8TQ4Fs17` "Roger", free tier), upload MP3 to Vercel Blob (**private** store), persist `AudioCache`, return proxy URL.
4. `GET /api/tts/audio/{hash}` → look up blob URL, stream bytes (prevents leaking signed Blob URLs).
5. On ElevenLabs failure or daily rate limit (100/day), client falls back to browser `SpeechSynthesisUtterance`.

---

## 3. API Surface

| Endpoint                  | Methods            | Description                                                              |
| ------------------------- | ------------------ | ------------------------------------------------------------------------ |
| `/api/auth/[...nextauth]` | GET, POST          | NextAuth handlers                                                        |
| `/api/auth/register`      | POST               | Create user + initial Streak                                             |
| `/api/decks`              | GET, POST          | List / create decks (scoped to user)                                     |
| `/api/decks/[id]`         | GET, DELETE, PATCH | Get deck + cards / delete / toggle `review_enabled`                      |
| `/api/decks/[id]/cards`   | POST, DELETE       | Add single card (creates both CardStates) / delete card by body `cardId` |
| `/api/decks/[id]/import`  | POST               | CSV import via `papaparse` (front, back, example, tags, audio_url)       |
| `/api/review`             | GET, POST          | Due cards (filters: `deckId`, `tag`) / submit rating & advance FSRS      |
| `/api/tts`                | POST               | Generate (or return cached) TTS audio URL                                |
| `/api/tts/audio/[hash]`   | GET                | Stream cached audio from private Vercel Blob                             |

---

## 4. File Tree (annotated)

```
src/
├── app/
│   ├── layout.tsx                        # Root layout (theme provider, toaster)
│   ├── page.tsx                          # Landing → redirects to dashboard or login
│   ├── globals.css                       # Tailwind v4 + design tokens
│   │
│   ├── (auth)/                           # Route group: unauthenticated pages
│   │   ├── layout.tsx                    # Centered auth layout
│   │   ├── login/page.tsx                # Email/password form → signIn()
│   │   └── register/page.tsx             # Register → POST /api/auth/register → signIn()
│   │
│   ├── (main)/                           # Route group: authenticated app
│   │   ├── layout.tsx                    # Calls auth(), renders BottomNav
│   │   ├── dashboard/page.tsx            # Streak, due count, deck grid
│   │   ├── decks/
│   │   │   ├── page.tsx                  # Server: fetch decks
│   │   │   ├── decks-client.tsx          # Client: create/delete, toggle enable
│   │   │   └── [id]/
│   │   │       ├── page.tsx              # Server: fetch deck + cards
│   │   │       └── deck-detail-client.tsx  # Client: add card, CSV import, delete
│   │   ├── review/page.tsx               # Review loop — wraps useSearchParams in <Suspense>
│   │   └── settings/
│   │       ├── page.tsx
│   │       └── sign-out-button.tsx
│   │
│   └── api/                              # Route handlers — see table above
│
├── components/
│   ├── ui/                               # shadcn/ui on @base-ui/react (NO asChild)
│   ├── bottom-nav.tsx                    # Home / Decks / Settings (mobile-first)
│   ├── dark-mode-toggle.tsx              # next-themes
│   ├── shadow-panel.tsx                  # Props: { text, label, cachedAudioUrl? }
│   └── theme-provider.tsx
│
└── lib/
    ├── prisma.ts                         # Singleton PrismaClient + PrismaPg adapter
    ├── auth.ts                           # NextAuth v5 config
    ├── auth.d.ts                         # Module augmentation: user.id on Session
    ├── api-auth.ts                       # getAuthUser() — use in every protected handler
    ├── use-tts.ts                        # Client hook: TTS with fallback
    ├── use-recorder.ts                   # Client hook: MediaRecorder
    └── utils.ts                          # cn() via clsx + tailwind-merge

prisma/
├── schema.prisma
└── migrations/
    ├── 20260417053617_init/
    ├── 20260417161045_add_card_direction/
    └── 20260419202640_add_deck_review_enabled/

e2e/
├── global-setup.ts                       # Registers test user, saves storage state
├── helpers.ts                            # TEST_EMAIL, TEST_PASSWORD, unique()
├── fixtures/sample.csv
├── auth.spec.ts           (4 tests)
├── dashboard.spec.ts      (4 tests)
├── decks.spec.ts          (4 tests)
├── cards.spec.ts          (3 tests)
├── review.spec.ts         (7 tests)
└── settings.spec.ts       (2 tests)

playwright.config.ts                      # fullyParallel: false, workers: 1
vercel.json                               # { "buildCommand": "prisma generate && next build" }
prisma.config.ts                          # datasource url from env, migrations path
```

---

## 5. State Management

- **No global store.** React Server Components fetch data; client components get props or use local `useState`/hooks.
- **Dark mode:** `next-themes` via `theme-provider.tsx`.
- **Forms:** plain React state + native `<form>` submission (no react-hook-form yet).
- **Toasts:** `sonner` via `src/components/ui/sonner.tsx`.
- **Animations:** Framer Motion for card flip and swipe (review page).
