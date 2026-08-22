# Waps — Your Bookmarking Buddy

A mobile-first, installable bookmarking PWA. Save links ("waps") with automatic metadata scanning, organize them with categories and tags, share them publicly, discover what the community is saving, and read saved articles distraction-free.

Built with **Next.js 14**, **Convex**, **Tailwind CSS**, and **Serwist** (PWAs).

**Current stable release: v1.0.0**

## Features

- **Save waps** — Paste a URL; it's normalized automatically, checked for duplicates while you type, and scanned in the background for title/description/favicon/hero image/full text
- **Smart categorization** — Default category set out of the box, plus auto-suggestions learned from how you've categorized similar links before
- **Tags** — Tag editor with suggestions from your own library, plus a tag manager page (rename/purge across all waps)
- **Explore** — Public feed ranked by engagement with time decay (trending) or newest-first
- **Public sharing** — Make any wap public, mint a short share link (`/share/{publicId}`), see a "N people love this link" nudge while saving
- **Reader mode** — Distraction-free view built from extracted article text, also searchable
- **Library tools** — Search across title/URL/description/text, grid & list views, category filters, pin & read state
- **Trash** — Soft delete with restore, permanent delete, empty trash, and a scheduled 30-day purge
- **Browser extension** — Pair via one-time codes to save from any desktop browser (rate-limited redemption, rotating API keys)
- **Import bookmarks** — Bulk import from HTML exports with per-URL dedupe
- **PWA** — Installable on mobile/desktop, offline caching with a custom offline page
- **Auth** — Custom email/password auth (bcrypt + session tokens) with password reset emails via Resend

## Tech Stack

| Layer              | Technology                              |
| ------------------ | --------------------------------------- |
| Framework          | Next.js 14 (App Router)                 |
| Backend / Database | Convex                                  |
| Auth               | Custom (bcryptjs + Convex + sessions)   |
| Styling            | Tailwind CSS + shadcn/ui primitives     |
| PWA                | Serwist (service worker + manifest)     |
| Email              | Resend                                  |
| Icons              | Custom geometric SVG set + Lucide React |
| Notifications      | Sonner                                  |

## Getting Started

### Prerequisites

- Node.js >= 20
- npm

### Installation

```sh
git clone https://github.com/gatekeepr-app/waps-pwa.git
cd waps-pwa
npm install
```

### Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```sh
cp .env.example .env.local
```

| Variable                      | Required | Description                                |
| ----------------------------- | -------- | ------------------------------------------ |
| `NEXT_PUBLIC_CONVEX_URL`      | Yes      | Your Convex deployment URL                 |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | Yes      | Your Convex site URL                       |
| `NEXT_PUBLIC_SITE_URL`        | No       | Canonical app URL used for sitemap/robots  |
| `RESEND_API_KEY`              | No       | Resend API key for password reset emails   |
| `CONTACT_TO`                  | No       | Email address for contact form submissions |
| `CONTACT_FROM`                | No       | Verified sender email for outgoing emails  |

### Running Locally

```sh
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Convex

This project uses Convex for the backend. Start the Convex dev server:

```sh
npx convex dev
```

To deploy to production:

```sh
npx convex deploy
```

## Project Structure

```
src/
├── app/
│   ├── (auth)/            # Login / forgot-password / reset-password (+ shared layout)
│   ├── (tabs)/            # bookmarks / explore / profile (bottom tab bar)
│   ├── add/               # Add a wap (full-screen form)
│   ├── api/manual-auth/   # Session endpoints (signin/signup/signout/me/reset)
│   ├── reader/[id]/       # Reader mode
│   ├── share/[publicId]/  # Public share page
│   ├── tags/              # Tag manager
│   ├── wap/[id]/          # Wap detail + edit
│   ├── layout.tsx         # Root layout (metadata, PWA hooks, Toaster)
│   ├── manifest.json      # Web app manifest
│   ├── sitemap.ts         # sitemap.xml
│   ├── robots.ts          # robots.txt
│   └── sw.ts              # Serwist service worker
├── components/
│   ├── GeometricIcons.tsx # Custom SVG icon set
│   ├── TabBar.tsx         # Bottom navigation
│   ├── TagEditor.tsx      # Shared tag input with suggestions
│   ├── ToggleSwitch.tsx   # Accessible switch control
│   └── ui/                # shadcn/ui primitives (alert, select)
└── lib/
    ├── auth-api.ts        # Auth helpers (signIn, signUp, fetchMe)
    ├── url.ts             # URL normalization (client copy)
    └── use-session.ts     # Session hook

convex/
├── bookmarks.ts           # Core CRUD, duplicate checks, explore ranking,
│                          # similarity/recommendations, tags, trash
├── categories.ts          # Category defaults + CRUD
├── collections.ts         # Collection grouping (backend only)
├── metadata.ts            # Background metadata/text extraction action
├── pairing.ts             # Extension pairing codes + rate limiting
├── http.ts                # HTTP actions (extension save endpoint)
├── crons.ts               # Scheduled jobs (trash purge)
├── authManual.ts          # Custom auth mutations
└── schema.ts              # Database schema

browser-extension/         # Companion browser extension (MV3)
```

## Scripts

| Script              | Description                 |
| ------------------- | --------------------------- |
| `npm run dev`       | Start dev server            |
| `npm run build`     | Build for production        |
| `npm start`         | Start production server     |
| `npm run lint`      | Lint with ESLint            |
| `npm run format`    | Format with Prettier        |
| `npx convex dev`    | Start Convex dev backend    |
| `npx convex deploy` | Deploy Convex to production |

## Deployment

1. Deploy Convex: `npx convex deploy`
2. Set `NEXT_PUBLIC_CONVEX_URL` (and optionally `NEXT_PUBLIC_SITE_URL`) in your host's environment
3. Build: `npm run build`
4. Deploy the Next.js app to Vercel, Railway, or any Node.js host

## License

MIT
