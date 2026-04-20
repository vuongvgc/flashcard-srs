# Conventions

Patterns and style rules enforced in this codebase. For the entry point, see `../AGENTS.md`.

---

## 1. Folder & File Layout

| Rule                                                                          | Example                                                         |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Route groups: `(auth)` for unauth, `(main)` for auth-required                 | `src/app/(main)/dashboard/page.tsx`                             |
| Server component = `page.tsx`; client interactivity in sibling `*-client.tsx` | `decks/page.tsx` (server) + `decks-client.tsx` (`"use client"`) |
| API handlers live at `src/app/api/<resource>/route.ts`                        | `src/app/api/decks/[id]/cards/route.ts`                         |
| UI primitives (shadcn) in `src/components/ui/`                                | `button.tsx`, `switch.tsx`                                      |
| Domain components in `src/components/`                                        | `bottom-nav.tsx`, `shadow-panel.tsx`                            |
| Hooks + helpers in `src/lib/`                                                 | `use-tts.ts`, `api-auth.ts`                                     |

**Naming:**

- Files: `kebab-case.tsx` / `kebab-case.ts`
- Components: `PascalCase` (inside file)
- Hooks: `useXxx` in a file named `use-xxx.ts`
- Prisma columns: `snake_case` (e.g., `user_id`, `last_review`, `review_enabled`)
- TS local vars/functions: `camelCase`

---

## 2. Server / Client Split

- Default to **Server Components**. Add `"use client"` only when needed (state, effects, events, browser APIs).
- Pages that need client interactivity: keep `page.tsx` server-side doing `auth()` + Prisma fetch, pass data to a `*-client.tsx` component.
- Route handlers are always server-side; never import client hooks there.

---

## 3. Authentication in API Routes

**Every protected handler starts the same way:**

```ts
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId, error } = await getAuthUser();
  if (error) return error;

  const { id } = await params;
  // ... business logic scoped to userId
}
```

- `getAuthUser()` returns `{ userId, error: null }` or `{ userId: never, error: NextResponse(401) }`.
- **Never trust client-supplied user IDs.** Always derive from the session.
- **Always scope queries** by `user_id` (directly or via relation filter `deck: { user_id: userId }`).

---

## 4. Prisma Usage

- **Always** `import { prisma } from "@/lib/prisma";` — never construct a new client.
- **Transactions** for multi-step writes that must be atomic (e.g., creating Card + both CardStates). Current code uses `createMany` for the states; wrap in `prisma.$transaction([...])` if you need stronger guarantees.
- Relation filters preferred over manual joins: `where: { card: { deck: { user_id } } }`.
- When writing a card, **always create both CardStates** (`direction: "normal"` and `"reverse"`). Single-direction cards are a bug.

---

## 5. Route Handler Conventions

- Params are `Promise<>`. Always `await params`.
- Responses: `NextResponse.json(body, { status })`. Errors: `{ error: "message" }` with 4xx.
- Validation: check required fields, trim strings, reject empty. Return `400` on bad input.
- Ownership checks: fetch the resource filtered by `user_id` first; return `404` if not found.
- Return shape: objects for single resources, arrays for lists. Keep consistent.

---

## 6. UI Component Rules (shadcn/ui on `@base-ui/react`)

**There is no `asChild` prop in this codebase.** It does not exist on `@base-ui/react` components.

- **Styled Link:** combine `buttonVariants()` with `className`:

  ```tsx
  import Link from "next/link";
  import { buttonVariants } from "@/components/ui/button";

  <Link href="/decks" className={buttonVariants({ variant: "outline" })}>
    Decks
  </Link>;
  ```

- **Never** wrap with `<Button asChild>` — compile error / runtime bug.
- **Switch** renders an accessible `role="switch"` element. Query in Playwright via `page.getByRole("switch")`.
- **Dropdown / Dialog / Sheet**: use component-specific `Trigger`/`Content` APIs. Pass `className` directly to triggers, not via child elements.

---

## 7. Styling (Tailwind v4)

- Tokens in `src/app/globals.css` under `@theme` (design tokens) + CSS variables for light/dark.
- Prefer utility classes; extract to component only if repeated 3+ times.
- Dark variants: `dark:bg-muted`, `dark:text-foreground`.
- Use `cn()` from `@/lib/utils` to merge conditional classes.
- Mobile-first: default styles are mobile, use `md:`/`lg:` for wider screens.

---

## 8. Forms

Current pattern is plain React:

```tsx
"use client";
const [email, setEmail] = useState("");
// ...
<form onSubmit={async (e) => { e.preventDefault(); await fetch(...) }}>
  <input name="email" value={email} onChange={(e) => setEmail(e.target.value)} />
</form>
```

- Use `name` attributes — the E2E suite queries by `input[name="email"]`.
- On success, use `router.push()` or `router.refresh()`.
- Show errors inline with `sonner` toasts.

---

## 9. Tests (Playwright E2E)

- Config: `playwright.config.ts`. `fullyParallel: false`, `workers: 1` — tests run sequentially and share the dev DB.
- Global setup (`e2e/global-setup.ts`) registers a test user (`playwright-test@e2e.local` / `test123456`) and saves storage state to `e2e/.auth/user.json`. All specs reuse that state.
- Use `helpers.unique("prefix")` to avoid name collisions in tests that share the DB.
- Keep each test idempotent: create own data, clean up if possible.
- File naming: `<feature>.spec.ts` in `e2e/`.
- Selectors: prefer accessible roles/labels (`getByRole`, `getByLabel`) over CSS selectors.

---

## 10. Commits & Git

- Commit style: imperative mood, focused scope. Examples from history:
  - `feat: add deck review toggle`
  - `fix: wrap useSearchParams in Suspense`
  - `fix: remove migrate deploy from build`
  - `feat: add reverse cards, quiz mode, and tag filtering`
- **Never `git add .`** — stage specific files only.
- **Never force-push** `main`/`master`.
- **Never bypass hooks** (`--no-verify`).
- Ask the user before committing on their behalf.

---

## 11. Error Handling

- **Server:** route handlers return `NextResponse.json({ error }, { status })`. Let unexpected errors surface as 500 rather than swallowing.
- **Client:** `try { await fetch(...) } catch { toast.error(...) }`.
- **TTS:** must degrade gracefully — fall back to `SpeechSynthesisUtterance` on any failure (see `use-tts.ts`).

---

## 12. Environment Variables

All env usage goes through `process.env`. Required vars listed in `.env.example`. See `docs/deploy.md` for the full list and how they flow into Vercel.
