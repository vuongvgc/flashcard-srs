# Adding Features

Step-by-step playbook for extending this app. Read `../AGENTS.md`, `architecture.md`, and `gotchas.md` first.

---

## General Flow

```
1. Schema change?  →  Edit prisma/schema.prisma → migrate
2. API endpoint?   →  Add src/app/api/.../route.ts with getAuthUser()
3. UI?             →  page.tsx (server) + *-client.tsx (client)
4. Nav update?     →  Edit src/components/bottom-nav.tsx
5. E2E test        →  Add to existing or new e2e/*.spec.ts
6. Verify          →  lint + tsc + test:e2e
7. Deploy          →  migrate deploy (if schema) → vercel --prod
```

---

## Step 1 — Schema Change (if needed)

Edit `prisma/schema.prisma`. Keep:

- `snake_case` column names
- `@@index([...])` for common query patterns
- Cascade deletes where parent-child relationship

Create + apply migration locally:

```bash
npx prisma migrate dev --name add_descriptive_name
```

This generates `prisma/migrations/<timestamp>_add_descriptive_name/` and regenerates the client.

**Do NOT edit old migrations.** Always add new ones.

If you add or change a column on `Card` or `CardState`, check that **both direction rows** are still created/updated correctly (`src/app/api/decks/[id]/cards/route.ts` and `.../import/route.ts`).

---

## Step 2 — API Endpoint

Template (`src/app/api/<resource>/route.ts`):

```ts
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { userId, error } = await getAuthUser();
  if (error) return error;

  // Always scope by userId
  const items = await prisma.<model>.findMany({ where: { user_id: userId } });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const { userId, error } = await getAuthUser();
  if (error) return error;

  const body = await req.json();
  // Validate, reject with 400 on bad input
  // Write, scoped by userId

  return NextResponse.json(result, { status: 201 });
}
```

Dynamic route (`[id]`):

```ts
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId, error } = await getAuthUser();
  if (error) return error;
  const { id } = await params;

  // Verify ownership first
  const resource = await prisma.deck.findFirst({ where: { id, user_id: userId } });
  if (!resource) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // ...
}
```

Rules:

- Start with `getAuthUser()`. Always.
- Scope every query by `userId` (direct or via relation).
- Validate inputs; return 400 with `{ error }` on bad input.
- Return 404 on missing resources rather than leaking existence.

---

## Step 3 — UI (Page + Client)

### Server page (`page.tsx`)

```tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { MyClient } from "./my-client";

export default async function MyPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const data = await prisma.<model>.findMany({
    where: { user_id: session.user.id },
  });

  return <MyClient initialData={data} />;
}
```

### Client component (`my-client.tsx`)

```tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function MyClient({ initialData }: { initialData: MyType[] }) {
  const [items, setItems] = useState(initialData);

  async function handleAction() {
    try {
      const res = await fetch("/api/...", { method: "POST", body: JSON.stringify({}) });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Done");
    } catch (e) {
      toast.error(String(e));
    }
  }

  return <Button onClick={handleAction}>Do it</Button>;
}
```

### Linking (no `asChild`!)

```tsx
<Link href="/review" className={buttonVariants({ variant: "default" })}>
  Review
</Link>
```

### Search params

If you use `useSearchParams()`, wrap the component that reads them in `<Suspense>`:

```tsx
export default function Page() {
  return (
    <Suspense fallback={null}>
      <InnerClient />
    </Suspense>
  );
}
```

---

## Step 4 — Navigation

If your feature needs a top-level section, edit `src/components/bottom-nav.tsx`. Otherwise, link from within existing pages.

---

## Step 5 — E2E Test

Add to an existing spec in `e2e/` or create a new one. Pattern:

```ts
import { expect, test } from "@playwright/test";
import { unique } from "./helpers";

test.describe("Feature X", () => {
  test("does the thing", async ({ page }) => {
    const name = unique("test");
    await page.goto("/decks");
    await page.getByRole("button", { name: /create/i }).click();
    await page.fill('input[name="name"]', name);
    await page.getByRole("button", { name: /save/i }).click();
    await expect(page.getByText(name)).toBeVisible();
  });
});
```

Storage state is pre-loaded (test user logged in automatically). Use `helpers.unique()` to avoid collisions across runs.

---

## Step 6 — Verify

```bash
npm run lint
npx tsc --noEmit
npm run test:e2e
```

All must pass.

---

## Step 7 — Deploy

```bash
# 1. If schema changed, apply migration to prod first:
npx prisma migrate deploy

# 2. Commit & push specific files (NO git add .)
git add src/... prisma/... docs/...
git commit -m "feat: <description>"
git push

# 3. Deploy
vercel --prod
```

---

## Worked Example — "Deck Review Toggle" (commit `677b353`)

Feature: pause a deck so its cards stop appearing in review.

1. **Schema:** added `review_enabled Boolean @default(true)` to `Deck`.
   ```bash
   npx prisma migrate dev --name add_deck_review_enabled
   ```
2. **API:** added `PATCH /api/decks/[id]` to toggle the field.
3. **Query change:** `GET /api/review` now filters `card: { deck: { review_enabled: true } }`.
4. **UI:** dropdown menu item in `decks-client.tsx` to call PATCH; "Paused" badge + reduced opacity for paused decks.
5. **Test:** `decks.spec.ts` — toggle → verify badge appears; unrelated cards still show in review.
6. **Ship:** `npx prisma migrate deploy && vercel --prod`.

---

## When to Update Docs

After your feature is merged:

- **New trap hit?** → add entry to `docs/gotchas.md`.
- **New convention established?** → add to `docs/conventions.md`.
- **New top-level domain concept?** → update `docs/architecture.md`.
- **New env var?** → update `docs/deploy.md`.
- **User-facing change?** → update `README.md`.
