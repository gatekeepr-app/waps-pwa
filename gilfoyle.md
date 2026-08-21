# Gilfoyle Code Review: Waps

I'd say this codebase is impressive, but I'd be lying, and I don't do that. I'm a Satanist — we're philosophically committed to honesty, even when it hurts. And this hurts me to look at.

Let me walk you through the archaeological layers of technical debt you've uncovered here.

---

## convex/schema.ts — The God Table

Your bookmarks table has **21 optional fields**. At what point did you stop and ask yourself: "Am I building a bookmark manager or a relational database dump from 2007?" You have isRead, isPinned, isBroken, isPublic, isTrashed, textContent, screenshotUrl, remindAt, publicId... You're storing a Boolean graveyard. Every one of those is* fields is a signal that you haven't designed your schema — you've just kept bolting things onto one table like Frankenstein's monster's resume.

You have categories and collections as separate tables, but they're functionally identical: { userId, name, order }. You're maintaining two tables for the same concept. This is what happens when you don't design your data model upfront and instead just add tables reactively.

The by_public index is particularly amusing. You're indexing a Boolean. You realize that every public bookmark is in the same handful of index pages, right? That index is as useful as a screen door on a submarine.

---

## convex/authManual.ts — Cryptographic Amateur Hour

Lines 4-12: **SHA-256 for password hashing.** Not bcrypt. Not argon2. Not scrypt. SHA-256. You're one md5 away from a literal NGINX tutorial. SHA-256 is a hash function, not a password hashing function. It lacks salting, key stretching, and any of the memory-hard properties that make modern password hashing actually secure. You might as well be storing passwords in plaintext with a fancy hat on.

Line 43: You're comparing hashes with !==. This is vulnerable to timing attacks. You're doing constant-time authentication using variable-time comparison. Congratulations, you've reintroduced an attack vector from 2002.

Line 75: (account as any).secret — the entire point of your authAccounts table is to store secrets, and your type system doesn't even know the field exists? You're casting to any to access the only field that matters. This is like locking your front door but leaving the key taped to the frame.

Line 159: await ctx.db.patch(account._id, { secret: passwordHash } as any) — same as any abuse, same fundamental problem: you don't trust your own schema.

The resetTokens table has no rate limiting. A user can spam createResetToken and flood their own email. There's also no cleanup mechanism. Expired tokens just sit there until the heat death of the universe.

---

## convex/bookmarks.ts — A Masterclass in Doing Everything Wrong

**The list query (lines 6-62)** is the crown jewel of incompetence. You accept sessionToken and userId as query arguments — meaning the client can request any user's bookmarks by passing a userId directly. Your authentication is optional and client-controlled. This isn't a bookmark manager; it's an open API to everyone's data.

Line 27-28: if (!userId && args.userId) { userId = args.userId; } — you have an authentication bypass built directly into your main query. A malicious client just passes userId and reads anyone's bookmarks. This is a critical vulnerability. I'm genuinely impressed by how confidently wrong this is.

Line 33: const all = await q.order("desc").collect() — you're loading the entire user's bookmark collection into memory, then filtering it client-side in JavaScript. You have indexes on categoryId, tags, and isTrashed, but you use none of them for filtering. You're doing N+1 on steroids — it's more like O(n*m) where m is every category lookup.

Lines 35-43: You're N+1'ing the category lookup for every bookmark. Promise.all with ctx.db.get inside a map — this is the textbook example of what Convex is designed to prevent. You could do a single batch lookup.

Lines 47-58: Client-side filtering by categoryId, tag, isRead, and a full-text search across title, URL, description, and textContent. All in JavaScript, on the full dataset. You could at least push categoryId filtering to the index. But no, you've chosen brute force, like a caveman with a supercomputer.

Line 60: Final sort for pin priority — done after the full client-side filter chain. Peak inefficiency.

**listByUser (line 397)**: You expose a query that takes an arbitrary userId from the client and returns their top 10 bookmarks. No authentication whatsoever. "Here's everyone's data, enjoy."

**setTags (line 167)**: No auth check. A client can overwrite anyone's tags by passing their bookmarkId. Same with updateMetadata (line 222) — no auth, no ownership check. You could be a vector for data corruption on any user's bookmarks.

**updateCollection (line 174)**: Authenticated, but no ownership check. User A could move User B's bookmark to a different collection.

**addByHttp (line 413)**: Takes userId from the client. No authentication. This is the API endpoint, and it's wide open.

**importAll (line 207)**: Synchronous N+1 insert with scheduler.runAfter for metadata fetching. If someone imports 10,000 bookmarks, you're doing 10,000 sequential inserts. No batching, no progress feedback, no error handling for partial failures.

**renameTag (line 342)**: Scans the entire user's bookmark collection, patches every matching bookmark individually. This could be a single database-level operation. Instead, it's O(n) reads + O(n) writes, and the user's browser pays the latency cost.

**emptyTrash (line 303)** and **purgeOldTrash (line 357)**: Query all trashed bookmarks globally, then filter by userId in JavaScript. Your by_trashed index returns every user's trashed items. You need a compound index, not a global scan.

**listTrash (line 315)**: Same problem — queries all trashed bookmarks globally. You're returning other users' trashed bookmarks to authenticated users. Congrats, your trash is a shared experience.

---

## src/app/(tabs)/bookmarks/page.tsx — The localStorage Authentication Cathedral

Lines 16-31: You're reading waps:user from localStorage and using the id field as your authentication state. This is a client-side suggestion, not authentication. Any user can open DevTools, type localStorage.setItem('waps:user', '{"id":"someOtherUsersId"}'), and impersonate anyone.

You pass this userId to api.bookmarks.list, which — as we established — happily accepts it without verification. This is not authentication. This is wishful thinking with extra steps.

Line 148: new URL(b.url).hostname — if any bookmark has a malformed URL (which your add function can produce with certain edge cases), this will crash the entire render. No try-catch. One bad URL poisons the entire bookmark list.

Line 33: useQuery(api.bookmarks.list, userId ? { userId } : 'skip') — you're passing the client-supplied userId as the filter. This is the mechanism by which the authentication bypass is consumed. You've built a complete data exfiltration pipeline.

---

## src/app/add/page.tsx — Clipboard Heist

Lines 40-48: You silently read from the clipboard on mount. While this is a nice UX feature in theory, you're not showing any UI indication. A user opens your app and their clipboard contents are silently extracted and populated into a form field. In many jurisdictions, this requires explicit consent. More importantly, it's creepy.

Line 74: categoryId: (categoryId as any) || undefined — another as any cast. You're using as as a band-aid for type mismatches rather than fixing the types. This is the codebase's version of "I'll fix it later."

---

## src/app/(tabs)/profile/page.tsx — The Battery-Operated Authentication

Same localStorage pattern. Same authentication theater. Line 47: localStorage.removeItem('waps:user') — your "sign out" is deleting a client-side value. The server-side session is still alive and valid. A user who signed out can continue making authenticated requests until the session expires in 30 days. Your sign-out is a placebo.

---

## src/app/api/manual-auth/signin/route.ts — The Convex HTTP Client Singleton

Lines 9-12: A lazy-initialized singleton HTTP client to Convex. In a serverless environment like Vercel, every request can execute in a different instance, so this singleton is instantiated per-request anyway. You've added complexity for zero benefit. The function call is a no-op that exists to satisfy your sense of architecture.

Line 23: const { userId } = await client().query(api.authManual.verifyCredentials, { email, password }) — you're running verifyCredentials as a query. Queries in Convex are read-only. This means the password comparison happens in the Convex query runtime, which is fine functionally, but the fact that you're doing it from a serverless API route using the HTTP client is a waste of a round trip. The Next.js API route is doing nothing that Convex itself couldn't do with a mutation.

Lines 39-45: The session cookie is Secure only in production. Your staging/dev environments send session tokens over plaintext HTTP. This is fine if you're not deploying to staging, but you probably are.

---

## src/app/api/manual-auth/signup/route.ts — Duplicated Code, Duplicated Mistakes

This is literally the signin route copy-pasted with verifyCredentials swapped for signup. Same singleton client pattern, same cookie configuration, same structure. The only unique line is await client().mutation(api.categories.ensureDefaults, { userId }) — which could've been a post-signup hook. Instead, you've got two files maintaining identical code that will diverge silently when one gets updated and the other doesn't.

---

## src/lib/auth-api.ts — The Wrapper That Wraps Nothing

Line 6: You set credentials: 'include' — you're using cookie-based auth but still making fetch calls through an API layer. This is fine, but lines 10-11 are where it gets interesting:

const text = await res.text()
const data = text ? JSON.parse(text) : {}

You're parsing an empty string as {}. If the server returns an empty 200 response, you silently treat it as {}. If it returns a non-JSON error page (say, a 502 from Cloudflare), JSON.parse throws an uncaught exception. You don't check Content-Type before parsing. This is fragile in ways that will haunt you on a Friday night.

---

## src/app/ConvexClientProvider.tsx — The Ten-Line File That Exists

This file exists solely to instantiate a ConvexReactClient and wrap children. You could've done this inline in your layout. But I suppose every project needs at least one file that justifies a PR review.

---

## Summary

You've built a bookmark manager with:

- **No actual authentication** — client-supplied userId is the entire auth model
- **SHA-256 password hashing** — appropriate for checksums, not for protecting user credentials
- **Timing-vulnerable comparisons** — because constant-time is too mainstream
- **N+1 queries everywhere** — because why batch when you can iterate
- **Client-side filtering on server-fetched data** — the server does nothing the client couldn't do
- **Global index scans masquerading as user-scoped queries** — your trash and public queries return every user's data
- **localStorage as the source of truth for authentication** — DevTools is your new admin panel
- **Sign-out that doesn't actually invalidate sessions** — the session is immortal
- **as any casts as a design pattern** — your types are aspirational at best

This is what happens when you move fast and don't think about what you're building. You've shipped a functional bookmark manager that anyone can read anyone else's bookmarks on, with passwords protected by what amounts to a slightly rotated Caesar cipher.

I'd refactor this, but I'm busy maintaining systems that actually work. Consider this review my gift to your technical debt ledger.
