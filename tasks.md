# High-Severity Tasks

Exported from the **Waps Product Backlog** Notion data source on 2026-10-19.

This file includes every backlog record currently marked with `Severity: high`, including completed and in-progress work.

## Summary

| #   | Task                                                                                              | Status | Category          | Last updated |
| --- | ------------------------------------------------------------------------------------------------- | ------ | ----------------- | ------------ |
| 1   | [Bookmark creation and editing](https://app.notion.com/p/3fde684b18768196bf4cc343904bbcb9)        | Done   | Bookmarks         | 2026-10-19   |
| 2   | [Browser extension pairing](https://app.notion.com/p/3fde684b1876818fbde5d2f3e4b47b41)            | Done   | Browser extension | 2026-10-19   |
| 3   | [Manual email/password authentication](https://app.notion.com/p/3fde684b187681ff8308de5317ef3109) | Done   | Authentication    | 2026-10-19   |
| 4   | [Password reset flow](https://app.notion.com/p/3fde684b1876812aa898dbc0e1967387)                  | Done   | Authentication    | 2026-10-19   |
| 5   | [API-key and HTTP integration](https://app.notion.com/p/3fde684b187681fabcfed3df98848867)         | Done   | Security          | 2026-10-19   |
| 6   | [Device and session management](https://app.notion.com/p/3fde684b1876811188a6e113dc6b4710)        | Done   | Security          | 2026-10-19   |
| 7   | [Full-text search](https://app.notion.com/p/3fde684b187681a490f9fce67ac392f5)                     | Done   | Search            | 2026-10-19   |
| 8   | [Metadata fetching](https://app.notion.com/p/3fde684b187681dbaf0bd470713fc141)                    | Done   | AI and metadata   | 2026-10-19   |

## 1. Bookmark creation and editing

- **Notion page:** [Open in Notion](https://app.notion.com/p/3fde684b18768196bf4cc343904bbcb9)
- **Status:** Done
- **Last updated:** 2026-10-19
- **Severity:** high
- **Category:** Bookmarks
- **Details:** Users can add, edit, normalize, categorize, tag, publish, and update saved links.

### Implementation notes

Users can add, edit, normalize, categorize, tag, publish, and update saved links.

## 2. Browser extension pairing

- **Notion page:** [Open in Notion](https://app.notion.com/p/3fde684b1876818fbde5d2f3e4b47b41)
- **Status:** Done
- **Last updated:** 2026-10-19
- **Severity:** high
- **Category:** Browser extension
- **Details:** The Chrome extension can pair through a one-time code and save links through the HTTP API.

### Implementation notes

The Chrome extension can pair through a one-time code and save links through the HTTP API.

## 3. Manual email/password authentication

- **Notion page:** [Open in Notion](https://app.notion.com/p/3fde684b187681ff8308de5317ef3109)
- **Status:** Done
- **Last updated:** 2026-10-19
- **Severity:** high
- **Category:** Authentication
- **Details:** Signup, sign-in, session cookies, and protected app access are implemented for the manual auth flow.

### Implementation notes

Signup, sign-in, session cookies, and protected app access are implemented for the manual auth flow.

## 4. Password reset flow

- **Notion page:** [Open in Notion](https://app.notion.com/p/3fde684b1876812aa898dbc0e1967387)
- **Status:** Done
- **Last updated:** 2026-10-19
- **Severity:** high
- **Category:** Authentication
- **Details:** Forgot-password, reset-token validation, password update, and session revocation are implemented.

### Implementation notes

Forgot-password, reset-token validation, password update, and session revocation are implemented.

## 5. API-key and HTTP integration

- **Notion page:** [Open in Notion](https://app.notion.com/p/3fde684b187681fabcfed3df98848867)
- **Status:** Done
- **Last updated:** 2026-10-19
- **Severity:** high
- **Category:** Security
- **Details:** HTTP routes now require bearer/API-key headers, validate keys only through internal Convex functions, enforce input size limits, prevent API-key body transport, and support explicit key revocation/rotation hardening.

### Implementation notes

API-key validation is internal-only; extension and widget callers use headers; input sizes are bounded; rotation refreshes timestamps; and authenticated users can revoke the current key. Legacy plaintext rows remain temporarily accepted until rotation or re-pairing.

## 6. Device and session management

- **Notion page:** [Open in Notion](https://app.notion.com/p/3fde684b1876811188a6e113dc6b4710)
- **Status:** Done
- **Last updated:** 2026-10-19
- **Severity:** high
- **Category:** Security
- **Details:** Users can now view active sessions, see device user-agent and sign-in time, revoke individual sessions, or sign out all sessions.

### Implementation notes

Sessions record bounded user-agent metadata, expose an authenticated token-free session list, and support ownership-checked individual and all-session revocation through the Profile UI.

## 7. Full-text search

- **Notion page:** [Open in Notion](https://app.notion.com/p/3fde684b187681a490f9fce67ac392f5)
- **Status:** Done
- **Last updated:** 2026-10-19
- **Severity:** high
- **Category:** Search
- **Details:** Bookmarks now use a Convex full-text search index across titles, URLs, descriptions, extracted page text, and tags, with saved searches and ownership checks.

### Implementation notes

Search uses a per-bookmark indexed projection with a legacy fallback, includes tags, sends queries to the backend, and supports per-user saved-search create, apply, duplicate prevention, and delete behavior.

## 8. Metadata fetching

- **Notion page:** [Open in Notion](https://app.notion.com/p/3fde684b187681dbaf0bd470713fc141)
- **Status:** Done
- **Last updated:** 2026-10-19
- **Severity:** high
- **Category:** AI and metadata
- **Details:** Metadata jobs now enforce safer response handling, size/time limits, bounded and validated AI output, and configured screenshot endpoint validation while preserving title, description, favicon, image, text, tags, and dead-link processing.

### Implementation notes

Metadata fetches accept successful HTML/XHTML only, retain response and timeout controls, safely handle AI enrichment, validate screenshot endpoints, and refresh search projections. DNS-rebinding mitigation still requires an egress proxy or socket-level IP pinning for high-risk deployments.
