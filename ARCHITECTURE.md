# Waps architecture graph

This document is the codebase map for Waps. It describes the current implementation in `src/`, `convex/`, and `browser-extension/`; arrows represent runtime calls or data ownership, not merely folder proximity.

## System boundary

```mermaid
flowchart LR
  subgraph Clients[Client applications]
    Browser[Next.js web app / installable PWA]
    Extension[WXT browser extension]
  end

  subgraph App[Waps application]
    Routes[src/app route handlers and pages]
    Components[src/components and src/lib]
    ServiceWorker[Serwist service worker]
  end

  subgraph Backend[Convex backend]
    Functions[Queries, mutations, and actions]
    HTTP[Convex HTTP routes]
    Jobs[Scheduled jobs / crons]
    DB[(Convex database)]
  end

  External[Target websites / metadata sources]
  Email[Resend]

  Browser --> Routes
  Routes --> Components
  Components --> Functions
  Browser --> ServiceWorker
  Functions --> DB
  HTTP --> Functions
  Jobs --> Functions
  Functions --> External
  Functions --> Email
  Extension --> HTTP
```

## Main data and request flows

### Save a wap from the web app

```mermaid
sequenceDiagram
  participant U as User
  participant P as Next.js page
  participant C as Convex client
  participant B as convex/bookmarks.ts
  participant D as Convex DB
  participant M as convex/metadata.ts
  participant W as Target website

  U->>P: Submit URL
  P->>C: bookmarks.add / shareQuickAdd
  C->>B: Authenticated mutation
  B->>B: Normalize URL and check duplicate
  B->>D: Insert bookmark and update urlStats
  B-->>C: Bookmark id
  B->>M: Schedule metadata.fetchMetadata
  M->>W: Fetch page metadata/content
  M->>D: Patch title, image, favicon, text, health
  D-->>P: Reactive bookmark update
```

### Save a wap from the extension

```mermaid
sequenceDiagram
  participant E as Extension popup/context menu
  participant H as Convex HTTP API
  participant P as pairing/apiKeys
  participant B as bookmarks
  participant D as Convex DB

  E->>H: POST /api/add with apiKey and URL
  H->>P: Hash and validate API key
  P->>D: Resolve paired user
  H->>B: Create bookmark for resolved user
  B->>D: Insert and schedule enrichment
  H-->>E: Success or duplicate response
```

## Module graph

```mermaid
flowchart TB
  subgraph UI[src/app and src/components]
    AuthPages[auth pages]
    Library[bookmarks / explore / tags / trash]
    WapPages[add / wap / reader / share / import]
    Profile[profile / extension pairing]
    ManualAuthAPI[api/manual-auth/*]
    Shared[src/lib/auth-api, use-session, url]
  end

  subgraph Convex[convex]
    Auth[auth.ts, authManual.ts]
    Bookmarks[bookmarks.ts]
    Categories[categories.ts]
    Metadata[metadata.ts]
    Pairing[pairing.ts]
    ConvexHTTP[http.ts]
    Schema[schema.ts]
    Crons[crons.ts]
  end

  subgraph Extension[browser-extension]
    Popup[popup/App.tsx]
    Background[background.ts]
  end

  AuthPages --> Shared
  Library --> Bookmarks
  WapPages --> Bookmarks
  Profile --> Pairing
  ManualAuthAPI --> AuthManual[authManual.ts]
  Shared --> Auth
  Bookmarks --> Schema
  Categories --> Schema
  Pairing --> Schema
  AuthManual --> Schema
  Bookmarks --> Metadata
  Crons --> Metadata
  Crons --> Bookmarks
  ConvexHTTP --> Bookmarks
  ConvexHTTP --> Pairing
  Popup --> ConvexHTTP
  Background --> ConvexHTTP
```

## Data model

```mermaid
erDiagram
  users ||--o{ bookmarks : owns
  users ||--o{ categories : creates
  users ||--o{ collections : owns
  users ||--o{ apiKeys : has
  users ||--o{ sessions : authenticates
  bookmarks }o--o| categories : classified_by
  bookmarks }o--o| collections : grouped_in
  bookmarks }o--o| bookmarks : derived_from
  bookmarks }o--o| urlStats : contributes_to
  pairingCodes }o--|| apiKeys : issues
  pairingAttempts }o--o| pairingCodes : rate_limits

  users {
    id id PK
    email string
    name string
  }
  bookmarks {
    id id PK
    userId id FK
    url string
    title string
    isPublic boolean
    isTrashed boolean
  }
  categories {
    id id PK
    userId id FK
    name string
  }
  collections {
    id id PK
    userId id FK
    parentId id FK
    name string
  }
  apiKeys {
    id id PK
    userId id FK
    key string
  }
  sessions {
    id id PK
    userId id FK
    token string
    expiresAt number
  }
  urlStats {
    id id PK
    url string
    savers number
  }
  pairingCodes {
    id id PK
    code string
    apiKey string
    createdAt number
  }
  pairingAttempts {
    id id PK
    identifier string
    attempts number
  }
```

## Route-to-capability inventory

| Area                    | Entry points                                           | Backend capability                                                  |
| ----------------------- | ------------------------------------------------------ | ------------------------------------------------------------------- |
| Authentication          | `src/app/(auth)/*`, `src/app/api/manual-auth/*`        | `convex/auth.ts`, `convex/authManual.ts`, `sessions`, `resetTokens` |
| Personal library        | `src/app/(tabs)/bookmarks`, `add`, `wap/[id]`, `trash` | `convex/bookmarks.ts`                                               |
| Discovery and sharing   | `explore`, `share/[publicId]`, `u/[userId]`            | Public bookmark queries in `convex/bookmarks.ts`                    |
| Organization            | `tags`, category controls, collection fields           | `convex/categories.ts`, bookmark tag/collection mutations           |
| Reading and enrichment  | `reader/[id]`                                          | `convex/metadata.ts` and bookmark metadata fields                   |
| Browser extension       | `extension`, profile pairing UI, WXT popup/background  | `convex/pairing.ts`, `convex/http.ts`                               |
| Background maintenance  | Convex deployment                                      | `convex/crons.ts`                                                   |
| Offline/installable app | `manifest.json`, `sw.ts`, `pwa-register.tsx`           | Serwist service worker and browser cache                            |

## Important implementation notes

- The web app uses the Convex React client for reactive reads and writes; manual-auth API routes exist alongside Convex Auth tables and should be treated as a separate authentication surface.
- Extension traffic does not use the browser app's React client. It calls Convex HTTP endpoints with a paired API key.
- Metadata extraction is asynchronous. A bookmark can be created before title, image, favicon, article text, or link-health fields are available.
- `convex/schema.ts` is the source of truth for persisted entities and indexes. Generated files under `convex/_generated/` are build artifacts and are intentionally omitted from the graph.
- The repository README mentions `convex/collections.ts`, but no such file currently exists; collection data and mutations are presently represented through `schema.ts` and `bookmarks.ts`.

## Keeping this graph current

Update this file when adding a new client, Convex module, HTTP endpoint, persisted table, scheduled job, or external integration. Prefer adding an edge to the relevant Mermaid graph and one row to the inventory rather than duplicating implementation details.
