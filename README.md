# Waps — Your Bookmarking Buddy

A Play-Store-like directory for the web. Save websites into boards, share one publicly, explore others' boards without duplicates, and get smart descriptions via Scan.

Built with **Next.js 14**, **Convex**, **Tailwind CSS**, and **Serwist** (PWAs).

## Features

- **Add websites** — Paste a URL, Waps scans it for title/description/category, then save to any board
- **Boards** — Create public or private boards. Reorder, rename, delete them
- **Discover** — Browse the public feed of websites saved by everyone, grouped by category
- **Import bookmarks** — Upload an HTML bookmark export from Chrome/Firefox/Safari/Edge, or use the browser share sheet
- **Notes** — Add personal notes to any saved website, inline on cards or on the detail page
- **Offline support** — Service worker caches key pages with a custom offline page
- **PWA** — Installable on mobile/desktop with a manifest and service worker
- **Auth** — Custom email/password auth with password reset flow
- **Rate limited** — Signin (5/min), signup (3/hour) rate limiting to prevent abuse

## Tech Stack

| Layer              | Technology                                   |
| ------------------ | -------------------------------------------- |
| Framework          | Next.js 14 (App Router)                      |
| Backend / Database | Convex                                       |
| Auth               | Custom (bcryptjs + Convex + cookie sessions) |
| Styling            | Tailwind CSS + shadcn/ui                     |
| PWA                | Serwist (service worker + manifest)          |
| Email              | Resend                                       |
| Icons              | Lucide React                                 |
| Animation          | Framer Motion                                |
| Rate Limiting      | lru-cache (in-memory)                        |

## Getting Started

### Prerequisites

- Node.js >= 20
- npm

### Installation

```sh
git clone https://github.com/mmohsin18/waps.git
cd waps
npm install
```

### Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```sh
cp .env.example .env.local
```

| Variable                      | Required              | Description                                       |
| ----------------------------- | --------------------- | ------------------------------------------------- |
| `NEXT_PUBLIC_CONVEX_URL`      | Yes                   | Your Convex deployment URL                        |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | Yes                   | Your Convex site URL                              |
| `RESEND_API_KEY`              | No (contact/waitlist) | Resend API key for email                          |
| `CONTACT_TO`                  | No                    | Email address to receive contact form submissions |
| `CONTACT_FROM`                | No                    | Sender email for outgoing emails                  |

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
│   ├── add/              # Add a website page (Scan + Save)
│   ├── auth/             # Sign in / Sign up page
│   ├── contact/          # Contact form
│   ├── explore/          # Public discover feed + detail pages
│   ├── forgot-password/  # Password reset request
│   ├── import/           # Bookmark import (HTML upload + browser share)
│   ├── privacy/          # Privacy policy
│   ├── profile/          # Board management
│   ├── reset-password/   # Password reset with token
│   ├── terms/            # Terms of service
│   ├── waps/             # Your saved websites
│   ├── ~offline/         # Offline page
│   ├── layout.tsx        # Root layout with BottomNav
│   ├── page.tsx          # Landing / marketing page
│   ├── sw.ts             # Service worker
│   ├── robots.ts         # robots.txt
│   └── sitemap.ts        # sitemap.xml
├── components/
│   ├── Elements/         # Reusable UI elements
│   ├── Features/         # Feature-specific (WaitlistForm)
│   ├── Layout/           # Page layout components (BottomNav, WapCard, etc.)
│   └── ui/               # shadcn/ui components
└── lib/
    ├── auth-api.ts       # Auth API helpers (signIn, signUp, fetchMe)
    └── request-dedup.ts  # Async dedup + rate limiting utilities

convex/
├── authManual.ts         # Custom auth mutations (register, login, reset password)
├── boardItems.ts         # Board membership operations
├── boards.ts             # Board CRUD (create, rename, delete, setPublic)
├── waps.ts               # Wap-level operations (search, detail, bulk import, etc.)
├── websites.ts           # Website lookup + explore feed
├── schema.ts             # Database schema
└── actions/websites.ts   # Website scanning action
```

## Scripts

| Script              | Description                 |
| ------------------- | --------------------------- |
| `npm run dev`       | Start dev server            |
| `npm run build`     | Build for production        |
| `npm start`         | Start production server     |
| `npm run lint`      | Lint with ESLint            |
| `npx convex dev`    | Start Convex dev backend    |
| `npx convex deploy` | Deploy Convex to production |

## Deployment

1. Deploy Convex: `npx convex deploy`
2. Set `NEXT_PUBLIC_CONVEX_URL` to your Convex production URL
3. Build: `npm run build`
4. Deploy the Next.js app to Vercel, Railway, or any Node.js host

## License

MIT
