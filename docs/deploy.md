# Deploy

Deployment runbook for FlashCard SRS. Target: Vercel + Neon Postgres.

---

## Environment Variables

Full list required for production:

| Variable                | Purpose                                               | Required?                           |
| ----------------------- | ----------------------------------------------------- | ----------------------------------- |
| `DATABASE_URL`          | Neon Postgres connection string                       | Yes                                 |
| `AUTH_SECRET`           | NextAuth JWT signing secret (`openssl rand -hex 32`)  | Yes                                 |
| `NEXTAUTH_URL`          | Base URL of deployment                                | Vercel auto-provides                |
| `ELEVENLABS_API_KEY`    | ElevenLabs TTS (voice: Roger, `CwhRBWXzGAHq8TQ4Fs17`) | Optional — falls back to Web Speech |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob (private store) for audio caching         | Optional — no caching without it    |

`.env.example` is the source of truth for development — keep it in sync when adding new vars.

---

## First-Time Setup

```bash
# Install & login
npm i -g vercel
vercel login

# Link project
cd flashcard-srs
vercel link --yes

# Set env vars (production). NO quotes around values.
echo "postgresql://..."            | vercel env add DATABASE_URL         production --force
echo "$(openssl rand -hex 32)"     | vercel env add AUTH_SECRET          production --force
echo "sk_..."                      | vercel env add ELEVENLABS_API_KEY   production --force
echo "vercel_blob_rw_..."          | vercel env add BLOB_READ_WRITE_TOKEN production --force

# Also add to preview + development if you want Preview deploys to work:
# replace `production` with `preview` / `development` and re-run
```

---

## Recurring Deploy Flow

```bash
# 1. If you changed prisma/schema.prisma this round:
npx prisma migrate deploy        # apply to production DB FIRST

# 2. Stage specific files (NEVER git add .)
git add <specific files>
git commit -m "feat: <description>"
git push

# 3. Deploy
vercel --prod
```

### Why migrate BEFORE deploy?

`vercel.json` is frozen at `"prisma generate && next build"` — migrations are NOT run during build. Neon's advisory lock times out under Vercel's build constraints. See `gotchas.md` for the full story.

If you forget and deploy first, the new build will run against the old schema and can crash. Recover by running `npx prisma migrate deploy` and `vercel --prod` again.

---

## Verifying a Deploy

```bash
# After deploy, check:
curl -I https://flashcard-srs-theta.vercel.app            # 200 or 307
curl https://flashcard-srs-theta.vercel.app/api/decks     # 401 (unauthenticated)
```

Then log in via the UI, create a deck, add a card, review it. Smoke test.

---

## Rollback

Vercel retains previous deploys. To roll back:

```bash
vercel rollback               # interactive — picks previous deploy
# or
vercel promote <deployment-url>
```

**Database rollback is manual.** If a migration broke production, you must write a new migration that reverts the change — do not `prisma migrate reset` against production.

---

## Local Development

```bash
# One-time
cp .env.example .env
# Fill in DATABASE_URL (point to dev DB, NOT prod)
# Fill in AUTH_SECRET
npm install
npx prisma migrate deploy      # apply existing migrations to dev DB

# Daily
npm run dev
```

Dev DB and E2E tests share the same database — tests will add data. Use a Neon branch for dev, separate from prod.

---

## Git Remote (Personal Account)

This project pushes to a personal GitHub account via a dedicated SSH host alias:

```bash
git remote -v
# origin  git@github-personal:vuongvgc/flashcard-srs.git
```

If cloning fresh elsewhere, confirm `~/.ssh/config` has the `github-personal` host entry pointing at the personal SSH key. See `gotchas.md` for the config block.

---

## Troubleshooting

| Symptom                               | Likely cause                                   | Fix                                                               |
| ------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------- |
| `vercel --prod` hangs on migrate step | You re-added `prisma migrate deploy` to build  | Revert `vercel.json` to `"prisma generate && next build"`         |
| `DATABASE_URL` parse error in prod    | Value was stored with surrounding quotes       | Re-add env without quotes: `echo "<url>" \| vercel env add …`     |
| `useSearchParams` build error         | Missing `<Suspense>` wrapper                   | Wrap the component reading params in `<Suspense>`                 |
| TTS always uses Web Speech            | `ELEVENLABS_API_KEY` missing or rate-limited   | Check Vercel env; inspect `/api/tts` response in browser devtools |
| "Blob URL expired" errors             | Code returning raw Blob URL instead of proxy   | Ensure `/api/tts/audio/[hash]` proxy is used                      |
| Prisma "adapter required" error       | Code constructed `new PrismaClient()` directly | Import the singleton from `@/lib/prisma`                          |
