# Gotchas

Traps we've hit in this project. **Read before adding code in the affected area.** Add new entries when you discover new traps.

---

## Next.js 16 + React 19

### `useSearchParams()` requires `<Suspense>`

The production build (`next build`) **fails** if any client component calls `useSearchParams()` outside a Suspense boundary.

```tsx
// src/app/(main)/review/page.tsx
import { Suspense } from "react";

export default function ReviewPage() {
  return (
    <Suspense fallback={null}>
      <ReviewClient />
    </Suspense>
  );
}
```

Fixed in commit `b8cab18`.

### Route handler params are `Promise`

```ts
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // ← must await
}
```

Forgetting the `await` returns `{}` at runtime — `id` will be `undefined`.

### Training data is stale

Your training data is most likely Next.js 13 or 14. Next.js 16 may have deprecated APIs. When uncertain, read `node_modules/next/dist/docs/` or the official Next.js 16 docs before copy-pasting patterns.

---

## shadcn/ui on `@base-ui/react` (NOT Radix)

### `asChild` does not exist

Common AI instinct: `<Button asChild><Link href="…">Go</Link></Button>`. **This will break.** `@base-ui/react` has no `asChild` prop.

**Correct pattern:**

```tsx
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

<Link href="/decks" className={buttonVariants({ variant: "outline" })}>
  Decks
</Link>;
```

### `<Switch>` in Playwright

`@base-ui/react` Switch renders with `role="switch"`. Query it with:

```ts
page.getByRole("switch");
// NOT page.locator('input[type="checkbox"]')
```

---

## Prisma 7

### No `url` in `schema.prisma`

Prisma 7 moved datasource URL to `prisma.config.ts`:

```ts
// prisma.config.ts
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env["DATABASE_URL"] },
});
```

Adding `url = env("DATABASE_URL")` to `schema.prisma` will error out.

### `PrismaClient` requires an adapter

Prisma 7 uses driver adapters. The client **must** be constructed with one:

```ts
// src/lib/prisma.ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
export const prisma = new PrismaClient({ adapter });
```

Always import the singleton from `@/lib/prisma`. Never `new PrismaClient()` elsewhere.

---

## Vercel Deploy

### Don't run `prisma migrate deploy` in `buildCommand`

Neon acquires an advisory lock for migrations. Vercel builds frequently race/timeout on this lock.

**`vercel.json` is frozen at:**

```json
{ "buildCommand": "prisma generate && next build" }
```

**Migration workflow:**

```bash
npx prisma migrate deploy   # apply pending migrations to prod DB first
vercel --prod               # then deploy
```

Fixed in commit `f2af5ae`.

### Env vars: no quotes

When running `vercel env add`, paste the value **without** surrounding quotes. Quotes become part of the value and break `DATABASE_URL` parsing.

```bash
echo "postgresql://user:pass@host/db" | vercel env add DATABASE_URL production --force
```

### Vercel Blob is private

The Blob store is configured as **private**. Direct Blob URLs are signed and leak. TTS endpoints return the proxy URL `/api/tts/audio/{hash}` instead of the raw Blob URL. The `/api/tts/audio/[hash]` route fetches the Blob and streams it through.

---

## Cards & Reverse Direction

### Every Card needs TWO CardStates

The `direction` field on `CardState` supports bidirectional review. Whenever you **create** or **import** a card, you must create both states:

```ts
await prisma.cardState.createMany({
  data: [
    { card_id: card.id, user_id: userId, direction: "normal" },
    { card_id: card.id, user_id: userId, direction: "reverse" },
  ],
});
```

Existing code paths: `src/app/api/decks/[id]/cards/route.ts`, `src/app/api/decks/[id]/import/route.ts`.

Unique constraint `@@unique([card_id, user_id, direction])` will throw on duplicate insert — good.

---

## Review Filtering

The `GET /api/review` endpoint hard-filters on `card.deck.review_enabled: true`. Paused decks are invisible to review, but their cards still exist. If you add new filters, preserve this constraint.

Current filters: `deckId` (optional), `tag` (optional `contains`), always `review_enabled: true`, always `due <= now`, limit 50.

---

## TTS Rate Limiting

- Daily limit: 100 requests/user (ElevenLabs free tier).
- On failure (rate-limited, API down, no key), client must fall back to `SpeechSynthesisUtterance`.
- See `src/lib/use-tts.ts` — do not remove the fallback branch.

---

## Tests Share the Dev DB

Playwright runs against the same database as `npm run dev`. Implications:

- Tests leave data behind — use `helpers.unique()` for names to avoid collisions.
- Don't run tests against prod.
- `global-setup.ts` idempotently creates the test user; DO NOT delete it between runs.

---

## SSH: Multi-Account Git

This repo uses the personal GitHub account, distinct from the work account on the same machine.

```
# ~/.ssh/config
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519          # work (vuongManabie)

Host github-personal
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_personal # personal (vuongvgc)
```

Remote for this project: `git@github-personal:vuongvgc/flashcard-srs.git`.

If you clone fresh elsewhere, verify the remote before pushing.

---

## Add Your Own

When you hit something that isn't documented here, **add it**. Format:

```markdown
## <Short Title>

<1-2 sentence description of the trap.>

<Code snippet or command showing the fix.>

(Fixed in commit `<hash>` if applicable.)
```
