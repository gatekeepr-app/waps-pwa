# Waps — In-Progress Tasks

Source: [Waps Product Backlog](https://app.notion.com/p/4737502f426b49d8bfb0aafd220be7c0) (Notion database)
Fetched: 2026-10-20 · originally 9 items with Status = `In progress`

| #   | Task                                  | Status      | Notes                                                       |
| --- | ------------------------------------- | ----------- | ----------------------------------------------------------- |
| 1   | Authentication security hardening     | In progress | IP limiter added; token bridge + deploy verification remain |
| 2   | Metadata fetch SSRF/resource controls | Done        | allowlist + IPv4-mapped fix; rebinding documented           |
| 3   | Link health monitoring                | Done        | HEAD→GET fallback, `/broken` page                           |
| 4   | Duplicate merge workflow              | Done        | `/duplicates` page, merge into keeper                       |
| 5   | Multi-source bookmark imports         | Done        | HTML / CSV / JSON parsers                                   |
| 6   | AI tag and summary suggestions        | Done        | already implemented (Ollama, optional)                      |
| 7   | PWA installation                      | Done        | already implemented                                         |
| 8   | Public collections                    | Done        | collection CRUD + `/c/<slug>`                               |
| 9   | Usage analytics                       | Done        | Insights card on Profile                                    |

Verification: `npx tsc --noEmit` clean, `npx vitest run` 8 files / 28 tests passing.

---

## 1. Authentication security hardening

- **Status:** In progress
- **Backlog page:** https://app.notion.com/p/3fde684b187681bcb461d5cb1d6c1188

Existing: canonical email normalization, DB-backed 10-attempt/15-minute account lockout, generic credential errors, security headers, forgot-password logs redacted, sign-in route status codes split from signup policy.

Added 2026-10-20: opt-in per-IP sign-in limiter. `ipIdentifier()` in `convex/authSecurity.ts`, `verifyCredentials` accepts an optional `ip` and tracks an `ip:<addr>` bucket, `trustedClientIp()` in `src/lib/client-ip.ts` reads only the header named by `TRUSTED_IP_HEADER`, and `/api/manual-auth/signin` passes it. Tests in `tests/auth-security.test.ts` (5/5).

Still open before Done:

- Replace the browser-readable `/api/manual-auth/token` bridge with a server-side/session-aware Convex transport.
- Set `TRUSTED_IP_HEADER` in the deployment and confirm a valid-credential browser sign-in against the deployed build.

## 2. Metadata fetch SSRF/resource controls

- **Status:** Done
- **Backlog page:** https://app.notion.com/p/3fde684b187681cdab7dc46e69c09238

Existing: DNS resolution per request and per redirect, private/reserved/multicast rejection, manual redirect validation, 10s timeout, 1 MB body cap, internal-only action.

Added 2026-10-20: `SCREENSHOT_ALLOWED_ORIGINS` allowlist enforced by `isAllowedScreenshotUrl()` for both the provider request and the returned screenshot URL; fixed an IPv4-mapped IPv6 bypass (`::ffff:7f00:1`); `shortcut:` comment records the remaining DNS rebinding race (close with address pinning or a filtering proxy). Tests: 7/7 in `tests/search-and-metadata.test.ts`.

## 3. Link health monitoring

- **Status:** Done
- **Backlog page:** https://app.notion.com/p/3fde684b187681179b3cf52dde535880

`checkDeadLink` retries with GET when HEAD returns 403/405/501 and cancels the body. Only 404, 410, and 5xx count as broken; 401/403/405/429 are treated as bot protection. Added `bookmarks.listBroken`, `bookmarks.recheckLink`, and a `/broken` page (Check again / Re-check all / Trash) linked from Profile.

## 4. Duplicate merge workflow

- **Status:** Done
- **Backlog page:** https://app.notion.com/p/3fde684b1876814c893edd614a7aa339

`bookmarks.findDuplicateGroups` groups live bookmarks by normalized URL (scheme, `www.`, trailing slash, tracking params collapse) with the oldest row as keeper. `bookmarks.mergeDuplicates` unions tags and fills missing title/description/category/text/image/favicon, rebuilds `searchText`, then trashes the duplicates with `removalReason: "merged"`. `/duplicates` page linked from Profile. Guards: owner + live + same-URL checks.

## 5. Multi-source bookmark imports

- **Status:** Done
- **Backlog page:** https://app.notion.com/p/3fde684b1876814c92c3e1dc8aaabd4a

`src/lib/import-parsers.ts` parses Netscape HTML (Chrome/Edge/Firefox/Safari), CSV (Pocket/Raindrop/generic), and JSON (Raindrop/generic). `parseBookmarkFile` picks by extension and falls back to content sniffing. CSV handles quoted fields, escaped quotes, embedded commas/newlines, CRLF. Rows are deduped; rows without a URL are dropped. Import page accepts `.html/.htm/.csv/.json`; server-side `importAll` still validates. Tests: 5/5.

## 6. AI tag and summary suggestions

- **Status:** Done (already implemented)
- **Backlog page:** https://app.notion.com/p/3fde684b1876819583c8c9952edc40f2

`metadata.fetchMetadata` calls `suggestTags` after storing metadata; it prompts Ollama, validates/normalizes the JSON tags, and only fills a description when the user has not written one. Optional: silently skipped without `OLLAMA_API_KEY`; model via `OLLAMA_MODEL`; 64 KB cap and 10s abort. Both variables added to `.env.example`. No code change needed.

## 7. PWA installation

- **Status:** Done (already implemented)
- **Backlog page:** https://app.notion.com/p/3fde684b18768186b3d8e2fa2e0f7b6d

`/manifest.json` (standalone, maskable icons, share target to `/add`), Apple metadata in the root layout, Serwist service worker with precache + runtime caching, network-only handling for `/login` and `/api/manual-auth/*`, and an offline save queue. No code change needed.

## 8. Public collections

- **Status:** Done
- **Backlog page:** https://app.notion.com/p/3fde684b187681258ff7e245423409c1

Added `publicId` + `by_publicId` index to the `collections` table. New functions: `listCollections`, `createCollection`, `renameCollection`, `removeCollection` (unassigns its bookmarks), `toggleCollectionPublic`, `getPublicCollection`. Profile Collections card (create/share/unshare/remove, copies the link), collection picker on the wap detail page, and a server-rendered `/c/<slug>` page. The public page returns only bookmarks in that collection that are not trashed.

## 9. Usage analytics

- **Status:** Done
- **Backlog page:** https://app.notion.com/p/3fde684b18768196be7bc31e6a086220

Insights card on Profile computed in one `useMemo` from the already-loaded bookmark list: total saved, last 30 days, read completion %, top three domains, top three categories. No new query or table.
