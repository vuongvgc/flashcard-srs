# FlashCard SRS

Web app tự học tiếng Anh thông qua flashcard, sử dụng **Spaced Repetition (FSRS)** + **Shadowing** với TTS chất lượng cao. Mobile-first, deploy trên Vercel.

## Tech Stack

| Layer         | Technology                                |
| ------------- | ----------------------------------------- |
| Framework     | Next.js 15 (App Router)                   |
| UI            | shadcn/ui + Tailwind CSS v4 + Dark mode   |
| Animation     | Framer Motion (swipe gestures, card flip) |
| Database      | PostgreSQL on Neon                        |
| ORM           | Prisma 7                                  |
| Auth          | NextAuth.js v5 (Credentials + JWT)        |
| SRS           | ts-fsrs (FSRS algorithm)                  |
| TTS           | ElevenLabs API → Web Speech API fallback  |
| Audio Storage | Vercel Blob                               |
| Deploy        | Vercel                                    |

## Features

- **Flashcard Review** — Flip card, swipe left/right (Framer Motion), rate Again/Hard/Good/Easy
- **FSRS Algorithm** — ts-fsrs tính due date, tự động schedule review
- **TTS** — ElevenLabs đọc phát âm, cache audio vào Vercel Blob (chỉ tốn credit 1 lần/từ). Fallback sang Web Speech API khi hết credit hoặc API lỗi
- **Shadowing** — Nghe audio gốc → ghi âm giọng mình (MediaRecorder) → nghe lại so sánh → tự đánh giá
- **CSV Import** — Upload CSV (front, back, example, tags, audio_url) → tạo cards
- **Streak Tracking** — Đếm ngày học liên tục, longest streak
- **Dark Mode** — Theo system preference hoặc toggle thủ công
- **Mobile-first** — Responsive, touch-optimized, bottom navigation

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database ([Neon](https://neon.tech) free tier recommended)
- (Optional) [ElevenLabs](https://elevenlabs.io) API key for high-quality TTS
- (Optional) [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) token for audio caching

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd flashcard-srs
npm install
```

### 2. Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

```env
# Required
DATABASE_URL="postgresql://user:password@host:5432/flashcard_srs"
AUTH_SECRET="run: npx auth secret"

# Optional - TTS (without these, TTS falls back to browser Web Speech API)
ELEVENLABS_API_KEY="your_elevenlabs_api_key"
BLOB_READ_WRITE_TOKEN="your_vercel_blob_token"
```

**Generate `AUTH_SECRET`:**

```bash
npx auth secret
```

**Database — chọn 1 trong 2:**

| Option                 | Cách setup                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| **Neon (recommended)** | Tạo project tại [neon.tech](https://neon.tech) → copy connection string vào `DATABASE_URL` |
| **Local PostgreSQL**   | `createdb flashcard_srs` → `DATABASE_URL="postgresql://localhost:5432/flashcard_srs"`      |

**TTS Audio Caching (optional):**

Vercel Blob dùng để cache audio từ ElevenLabs. Nếu không có `BLOB_READ_WRITE_TOKEN`, TTS sẽ fallback sang browser Web Speech API (miễn phí, chất lượng thấp hơn).

Để lấy token cho local dev:

1. Install Vercel CLI: `npm i -g vercel`
2. Link project: `vercel link`
3. Tạo Blob store: `vercel blob add-store`
4. Pull env vars: `vercel env pull .env.local`

Hoặc bỏ qua bước này — app vẫn hoạt động đầy đủ với Web Speech API.

### 3. Database Setup

```bash
npx prisma migrate dev --name init
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to the login page.

### 5. Create an Account

Register at `/register` with email + password, then start creating decks and importing cards.

## Project Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx          # Login form
│   │   └── register/page.tsx       # Registration form
│   ├── (main)/
│   │   ├── dashboard/page.tsx      # Streak, due cards, deck overview
│   │   ├── decks/
│   │   │   ├── page.tsx            # Deck list, create, import CSV
│   │   │   └── [id]/page.tsx       # Card list within deck
│   │   ├── review/page.tsx         # Review session (flip + swipe + shadow)
│   │   └── settings/page.tsx       # Dark mode, account, sign out
│   └── api/
│       ├── auth/                   # NextAuth + registration
│       ├── decks/                  # CRUD decks + cards + CSV import
│       ├── review/                 # FSRS review + streak update
│       └── tts/                    # ElevenLabs + caching
├── components/
│   ├── ui/                         # shadcn/ui components
│   ├── bottom-nav.tsx              # Mobile bottom navigation
│   ├── dark-mode-toggle.tsx        # Theme switcher
│   ├── shadow-panel.tsx            # Shadowing record/playback UI
│   └── theme-provider.tsx          # next-themes wrapper
├── lib/
│   ├── auth.ts                     # NextAuth config
│   ├── prisma.ts                   # Prisma client singleton
│   ├── api-auth.ts                 # API route auth helper
│   ├── use-tts.ts                  # TTS hook with fallback
│   └── use-recorder.ts            # MediaRecorder hook
└── prisma/
    └── schema.prisma               # Database schema
```

## CSV Import Format

| Column    | Required | Description              |
| --------- | -------- | ------------------------ |
| front     | Yes      | Word or phrase           |
| back      | Yes      | Translation / definition |
| example   | No       | Example sentence         |
| tags      | No       | Comma-separated tags     |
| audio_url | No       | External audio URL       |

Example:

```csv
front,back,example,tags
pronunciation,phát âm,"Her pronunciation is very clear",speaking
vocabulary,từ vựng,"Build your vocabulary daily",general
```

## Deploy on Vercel

1. Push to GitHub
2. Import project on [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Vercel auto-detects Next.js and deploys

Required env vars for production:

- `DATABASE_URL` — Neon connection string
- `AUTH_SECRET` — generated secret
- `ELEVENLABS_API_KEY` — (optional) for TTS
- `BLOB_READ_WRITE_TOKEN` — (optional) auto-provided by Vercel Blob

## License

MIT
