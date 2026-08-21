# Waps — Next.js PWA Recreation Blueprint

**Objective:** Recreate the Waps bookmark manager as a Next.js 14+ PWA (App Router) that is a 1:1 feature and visual match of the existing Expo React Native app, using the same Convex backend.

---

## Decisions Made

- **Backend:** Use existing Convex deployment (`aromatic-puffin-900`) as-is. Map: `boards` → Collections, `boardItems` → Bookmarks, `websites.categories[]` → Tags
- **Features:** Skip Queue, Trash, Reminders for now. Focus on core bookmarking.
- **Auth:** Add `@convex-dev/auth` with Next.js adapter + GitHub OAuth. Keep existing manual auth as fallback.
- **Design:** Pure black minimal design with orange accent `#f97316`, uppercase labels

---

## Step 1: Design System & Global Styles

**Goal:** Replace glass morphism with pure black minimal design.

**Files to modify:**

- `tailwind.config.ts`
- `src/app/globals.css`

**Tasks:**

1. Update `tailwind.config.ts` — new color tokens:
   - `--background: #000000`, `--surface: #111111`, `--border: #1a1a1a`
   - `--primary: #f97316`, `--text-primary: #ffffff`, `--text-secondary: #555555`
   - `--text-tertiary: #333333`, `--destructive: #ef4444`
2. Replace all `waps-*` CSS classes in `globals.css` with minimal utility classes
3. Remove glass morphism, gradient backgrounds, blur effects
4. Add: `.waps-card` (bg #111, border #1a1a1a), `.waps-input`, `.waps-btn` (orange), `.waps-label` (uppercase tracking), `.waps-chip`

**Verification:** `npm run build` + `npm run lint` pass

---

## Step 2: Typography

**Goal:** Match exact typography scale from spec.

**File:** `tailwind.config.ts`

**Tasks:**

1. Add custom font sizes/weights for: heading (22px bold), section (16px bold), body (14px), card-title (14px medium), label (10px bold uppercase tracking-widest), tag (9px bold uppercase tracking-wider), tab (10px bold uppercase tracking-[1.5px])
2. Remove unused tokens (chart colors)

---

## Step 3: Convex Auth + GitHub OAuth

**Goal:** Add `@convex-dev/auth` with Next.js adapter + GitHub OAuth.

**New files:**

- `src/lib/auth.tsx` — Convex Auth provider using `@convex-dev/auth`
- `src/app/api/auth/[...convexAuth]/route.ts` — Convex Auth Next.js route handler

**Packages to install:**

- `@convex-dev/auth`
- `@auth/core` (if needed by Convex Auth)

**Tasks:**

1. Install `@convex-dev/auth` and configure with Convex backend
2. Create Convex Auth provider wrapping ConvexProvider
3. Create Next.js API route for Convex Auth
4. Configure GitHub OAuth provider (requires `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` env vars)
5. Keep existing manual auth as fallback for users without GitHub
6. Update `.env.example` with new auth env vars

**Verification:** GitHub OAuth login works, existing manual auth still works

---

## Step 4: Root Layout & Metadata

**Goal:** Update root layout for new design and PWA.

**File:** `src/app/layout.tsx`

**Tasks:**

1. Update metadata: `themeColor: '#000000'`, `apple-mobile-web-app-status-bar-style: 'black-translucent'`
2. Remove `BottomNav` from root layout (move to tabs layout)
3. Wrap children in new Convex Auth provider
4. Add PWA meta tags
5. Keep `PwaRegister` component

**Verification:** App loads with correct theme color, no errors

---

## Step 5: Route Restructuring

**Goal:** Create new route structure.

**New file structure:**

```
app/
  layout.tsx                  — Root: Convex provider, PWA meta
  page.tsx                    — Redirect logic

  (auth)/
    layout.tsx                — Centered card layout
    login/page.tsx            — Email/password + GitHub OAuth

  (tabs)/
    layout.tsx                — Bottom tab bar (4 tabs)
    bookmarks/page.tsx        — Main bookmarks list
    explore/page.tsx          — Public feed
    profile/page.tsx          — User profile + settings

  add/page.tsx                — Add bookmark form
  wap/[id]/page.tsx           — Bookmark detail
  wap/[id]/edit/page.tsx      — Edit bookmark
  reader/[id]/page.tsx        — Reader view
  tags/page.tsx               — Tag manager
  share/[publicId]/page.tsx   — Public share page
```

**Tasks:**

1. Create all new route files
2. Update root `page.tsx` — redirect to `/bookmarks` if authed, `/login` if not
3. Remove old routes after new ones are verified

**Verification:** All routes load, navigation works

---

## Step 6: Custom Geometric SVG Icons

**Goal:** Create geometric SVG icon components.

**New file:** `src/components/GeometricIcons.tsx`

**Icons to create:**

- `WapsIcon` (3 bars), `QueueIcon` (circle+dot), `ExploreIcon` (ring), `ProfileIcon` (solid circle)
- `AddIcon` (plus), `BackIcon` (arrow), `SearchIcon`, `GridIcon`, `ListIcon`
- `FilterIcon`, `DeleteIcon`, `EditIcon`, `ShareIcon`, `PinIcon`, `ReadIcon`, `UnreadIcon`

All: SVG, 24x24, stroke-based, no icon libraries

---

## Step 7: Tab Bar Component

**Goal:** Fixed bottom tab bar with 4 tabs.

**New file:** `src/components/TabBar.tsx`

**Tasks:**

1. Fixed bottom, height ~52px + safe area
2. BG: `#000000`, top border: `1px solid #1a1a1a`
3. Active: `#f97316`, Inactive: `#555555`
4. Labels: `text-[10px] font-bold uppercase tracking-[1.5px]`
5. 4 tabs: WAPS, QUEUE, EXPLORE, PROFILE
6. Use `usePathname()` for active state

---

## Step 8: Bookmarks Home Page

**Goal:** Main bookmarks list with search, filters, grid/list toggle.

**File:** `src/app/(tabs)/bookmarks/page.tsx`

**Tasks:**

1. Header: "Waps" (22px bold) + controls
2. Search bar: bg `#111`, border `#1a1a1a`
3. Collection filter pills: horizontal scroll, "All" + collections + "+ New"
4. Tag filter: horizontal scroll of tag pills
5. Grid/List toggle
6. FAB: Orange "+" button → `/add`
7. Grid cards: OG image/favicon, title (2 lines), domain, tags (2 max)
8. List cards: Favicon, title (1 line), domain, tags (3 max)
9. Empty state: "No waps yet"
10. Use `api.waps.listUserWaps` with ownerKey from localStorage

---

## Step 9: Explore Page

**Goal:** Public bookmarks feed.

**File:** `src/app/(tabs)/explore/page.tsx`

**Tasks:**

1. 2-column grid, same card layout
2. Header: "Explore" / "Publicly shared waps"
3. Use `api.websites.exploreFeed` (already exists)

---

## Step 10: Profile Page

**Goal:** User profile with settings.

**File:** `src/app/(tabs)/profile/page.tsx`

**Tasks:**

1. User initials (120px bold), name, email
2. Connect Extension link
3. Manage Tags → `/tags`
4. Export → downloads JSON
5. Import → JSON textarea modal
6. Sign Out button
7. Use Convex Auth `useConvexAuth()` for current user

---

## Step 11: Add Bookmark Page

**Goal:** Form to add bookmark.

**File:** `src/app/add/page.tsx`

**Tasks:**

1. Form: URL (required), Title (optional), Note (optional)
2. Collection picker: horizontal scroll pills
3. "Save Wap" → `api.waps.addToBoard`
4. Auto-prepends `https://`
5. Navigate to `/wap/[id]` on success

---

## Step 12: Bookmark Detail Page

**Goal:** Show bookmark details with actions.

**File:** `src/app/wap/[id]/page.tsx`

**Tasks:**

1. Hero image (200px) or placeholder
2. Back, Pin, Public/Private toggles
3. Favicon + title + URL + description
4. Collection picker
5. Tags: existing with "x" to remove; input + "Add"
6. "Open in Reader" → `/reader/[id]`
7. Share section
8. Edit + Delete buttons
9. Use `api.waps.getWebsiteDetails`

---

## Step 13: Edit Bookmark Page

**File:** `src/app/wap/[id]/edit/page.tsx`

**Tasks:**

1. Form: Title, URL, Note, Save
2. Auto-prepends `https://`
3. Use `api.boardItems.updateNotes`

---

## Step 14: Reader Page

**File:** `src/app/reader/[id]/page.tsx`

**Tasks:**

1. Clean view: Back, Pin, Share top bar
2. Centered: favicon, image, title, URL, description
3. "Open in Browser" orange button
4. Use `api.waps.getWebsiteDetails`

---

## Step 15: Tags Manager Page

**File:** `src/app/tags/page.tsx`

**Tasks:**

1. List all tags sorted by usage
2. Inline rename: click → input → blur to save
3. "Remove" per tag → confirmation
4. "Done" button
5. Extract tags from `websites.categories[]`

---

## Step 16: Public Share Page

**File:** `src/app/share/[publicId]/page.tsx`

**Tasks:**

1. Server-rendered with OG meta tags
2. Title, description, image
3. "Visit Link" CTA
4. Dark theme

---

## Step 17: Reusable Components

**New files:**

- `src/components/BookmarkCard.tsx` — grid/list variants
- `src/components/CollectionPicker.tsx` — horizontal scroll pills
- `src/components/TagPill.tsx` — tag with remove
- `src/components/SearchBar.tsx` — dark search input
- `src/components/Modal.tsx` — dark modal overlay
- `src/components/EmptyState.tsx` — empty messages

---

## Step 18: PWA Configuration

**File:** `src/app/manifest.json`

**Tasks:**

1. `theme_color: "#000000"`, `background_color: "#000000"`
2. `display: "standalone"`, `orientation: "portrait"`
3. Ensure service worker works
4. Lighthouse PWA audit

---

## Step 19: Cleanup

**Remove:**

- Old routes: `src/app/auth/`, `src/app/waps/`, `src/app/explore/`, `src/app/profile/`, `src/app/add/`, `src/app/import/`, `src/app/forgot-password/`, `src/app/reset-password/`, `src/app/contact/`
- Old components: `BottomNav.tsx`, `WapCard.tsx`, `WapCardSquare.tsx`, `ComingSoon.tsx`, `WapsButton.tsx`, `WaitlistForm.tsx`, `icons.tsx`, `site-footer.tsx`
- All shadcn/ui components
- `src/lib/request-dedup.ts`, `src/lib/mail/`, `src/config/site.ts`

---

## Verification

```bash
npm run build    # Build succeeds
npm run lint     # No lint errors
npm run dev      # Manual browser testing
# Lighthouse PWA audit
# Test all routes
# Test Convex queries/mutations
# Test GitHub OAuth
# Test browser extension pairing
```
