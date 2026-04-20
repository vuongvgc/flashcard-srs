<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# AGENTS.md — FlashCard SRS

Entry point for any AI agent (Claude, Copilot, Cursor, …) working on this project.
**Read this file first. Load `docs/*.md` on demand.**

---

## 1. Project Identity

**FlashCard SRS** — mobile-first web app for learning English via flashcards.
Uses FSRS spaced-repetition + TTS pronunciation + shadowing (record & compare).

- **Live:** https://flashcard-srs-theta.vercel.app
- **Stack:** Next.js 16 · React 19 · Prisma 7 · NextAuth v5 · Tailwind v4 · shadcn/ui (on `@base-ui/react`) · PostgreSQL (Neon) · Vercel Blob · ElevenLabs · Playwright E2E
- **Single-dev project.** User communicates in Vietnamese. **All code, docs, commits, comments in English.**

---

## 2. Golden Rules (violate at your peril)

1. **Next.js 16 + React 19** — your training data is probably Next.js 13/14. Check `node_modules/next/dist/docs/` or official Next.js 16 docs before using any router/API feature.
2. **Route handler params are `Promise`** — `{ params }: { params: Promise<{ id: string }> }` → `const { id } = await params;`
3. **`useSearchParams()` MUST be wrapped in `<Suspense>`** — otherwise the production build fails.
4. **shadcn/ui here is built on `@base-ui/react`, not Radix.** → **NO `asChild` prop exists.** For link styling, use `buttonVariants({ variant })` + `className` on `<Link>`. In tests, query `<Switch>` via `getByRole("switch")`.
5. **Prisma 7:**
   - `schema.prisma` has NO `url` field. The datasource URL lives in `prisma.config.ts`.
   - `PrismaClient` MUST be constructed with the `PrismaPg` adapter. Always import from `@/lib/prisma` — never `new PrismaClient()`.
6. **Do NOT run migrations from Vercel build** — Neon's advisory lock times out. `vercel.json` is frozen at `"prisma generate && next build"`. Migrations are applied manually (`npx prisma migrate deploy`) BEFORE `vercel --prod`.
7. **Each card has TWO `CardState` rows** (`direction: "normal"` + `"reverse"`). Any code creating or importing cards must create both. See `src/app/api/decks/[id]/cards/route.ts`.
8. **Every API route handler starts with `getAuthUser()`** from `@/lib/api-auth` and returns the `error` response if unauthenticated. No exceptions.
9. **Tests are E2E only (Playwright).** Do NOT add unit tests, Jest, Vitest. All tests share the dev database.
10. **Never run destructive git ops** (`reset --hard`, `checkout .`, `clean -fd`) or close beads without explicit user approval. Never `git add .` — stage specific files only.

---

## 3. Documentation Map

Load these on demand based on the task at hand:

| When you need to…                                 | Read                      |
| ------------------------------------------------- | ------------------------- |
| Understand data model, request flow, file layout  | `docs/architecture.md`    |
| Know naming, folder structure, API/test patterns  | `docs/conventions.md`     |
| Avoid known traps (Prisma 7, base-ui, Vercel, …)  | `docs/gotchas.md`         |
| Add a new feature end-to-end (schema → UI → test) | `docs/adding-features.md` |
| Deploy, set env vars, handle migrations           | `docs/deploy.md`          |
| Understand user-facing setup                      | `README.md`               |

**Rule:** if you discover a new trap or convention, update the relevant `docs/*.md`. Docs stay current or they die.

---

## 4. Commands Cheatsheet

From `package.json`:

```bash
npm run dev              # Next.js dev server, http://localhost:3000
npm run build            # Production build
npm run start            # Run production build
npm run lint             # ESLint
npm run test:e2e         # Playwright headless
npm run test:e2e:ui      # Playwright interactive UI
npm run test:e2e:headed  # Playwright with visible browser
npm run deploy           # vercel --prod
```

**No `typecheck` script.** Run `npx tsc --noEmit` if you need to verify types without building.

**Prisma:**

```bash
npx prisma migrate dev --name <desc>   # Create + apply migration locally
npx prisma migrate deploy              # Apply pending migrations to prod DB (run before deploy)
npx prisma generate                    # Regenerate client (auto-run on build)
npx prisma studio                      # DB GUI
```

---

## 5. Project Structure (at a glance)

```
src/
├── app/
│   ├── (auth)/              # Login/register (unauthenticated layout)
│   ├── (main)/              # Authenticated app: dashboard, decks, review, settings
│   ├── api/                 # Route handlers (auth, decks, review, tts)
│   └── layout.tsx           # Root layout
├── components/
│   ├── ui/                  # shadcn/ui primitives (on @base-ui/react)
│   ├── bottom-nav.tsx       # Mobile bottom navigation
│   ├── shadow-panel.tsx     # TTS + recorder for shadowing practice
│   └── dark-mode-toggle.tsx
└── lib/
    ├── prisma.ts            # Singleton PrismaClient with PrismaPg adapter — ALWAYS import from here
    ├── auth.ts              # NextAuth v5 config (Credentials + JWT)
    ├── api-auth.ts          # getAuthUser() helper for route handlers
    ├── use-tts.ts           # Client hook: calls /api/tts, falls back to Web Speech
    ├── use-recorder.ts      # Client hook: MediaRecorder wrapper
    └── utils.ts             # cn() classname merger

prisma/
├── schema.prisma            # Models: User, Deck, Card, CardState, ReviewLog, Streak, AudioCache
└── migrations/              # 3 migrations applied to date

e2e/                         # Playwright tests (6 suites, 25 tests, all passing)
```

Full tree with responsibilities: see `docs/architecture.md`.

---

## 6. Definition of Done

Before claiming a task complete:

- [ ] Relevant file reads done, edits verified
- [ ] `npm run lint` passes
- [ ] `npx tsc --noEmit` passes (if TS touched)
- [ ] `npm run test:e2e` passes (if behavior changed)
- [ ] If schema changed: migration created with descriptive name
- [ ] If deploying: migration applied via `npx prisma migrate deploy` BEFORE `vercel --prod`
- [ ] New traps discovered? → added to `docs/gotchas.md`
- [ ] No `git add .`, no force push, no bypassed hooks

---

## 7. Communication

- **User speaks Vietnamese.** You may reply in Vietnamese, but all written artifacts (code, commits, docs, comments, commit messages) are English.
- **Be concise.** The user is a single developer iterating fast — skip ceremony.
- **Ask before irreversible actions** (delete branches, force ops, close beads, commit on user's behalf).
