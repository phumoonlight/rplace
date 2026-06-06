# r/place Clone — Progress

> Companion to [PLAN.md](./PLAN.md). Update at the end of every working
> session: tick boxes, jot a 1–3 line "Session note", and record any
> deviation from the plan under "Decisions made along the way".

---

## Status snapshot

- **Current phase**: Phase 6 — Leveling + quota restore. **Code complete (countdown UI shipped). Still blocked on user (Firebase project setup) for end-to-end verification.**
- **Last touched**: 2026-06-06 (Exp storage flipped from cumulative-lifetime to per-level — `exp` resets on level-up, `expCostForLevel(n) = 5·(n+1)` replaces `expForLevel`/`levelForExp`. Exp stat card dropped from the sidebar in favor of the existing exp bar.)
- **Next action**: Once `.env.local` lands, manual end-to-end: paint until quota = 0, watch countdown tick down to 0:00, confirm quota restores +1 without page reload. Then Phase 7 polish (mobile pinch zoom, at-zero-quota visual state, a11y pass, error toasts).

---

## Manual tasks (outside coding)

> Things only the user can do — console clicks, deploys, commits, and
> end-to-end verifications that need real credentials. Coding tasks live
> in the phase checklist below; this section tracks the human work that
> unblocks them.

### Phase 0

- [x] Initial commit

### Phase 1 — Firebase console setup

- [x] Firebase project created in console (record project ID in the values table below)
- [x] Google sign-in provider enabled in console
- [x] Firestore created in console (region noted)
- [x] `.env.local` populated from `.env.example`
- [x] End-to-end sign-in verified (popup → ID token retrievable) — unblocked once the three console items + `.env.local` are done

### Phase 8 — Deploy & rules

- [ ] Firestore rules deployed via Firebase console / CLI (covers `users/{uid}` and `canvas/{orientation}/chunks/{chunkId}`)
- [ ] Vercel deploy live
- [ ] Production auth domain added to Firebase authorized domains
- [ ] Lighthouse > 90 on mobile (run against the deployed URL)

---

## Phase checklist

### Phase 0 — Scaffolding

- [x] Scaffold Next.js 15 (TS, Tailwind v4, App Router, `src/` dir, ESLint flat config)
- [x] Install `firebase` and `firebase-admin`
- [x] Add `.env.example`
- [x] Update `.gitignore` for `*.serviceaccount.json` (existing template already covered `.env*`)
- [x] Landing page renders "r/place clone" placeholder (verified: `GET / → 200`)

### Phase 1 — Firebase wiring

- [x] `src/lib/firebase/client.ts` initializes browser app (Auth + Firestore + RTDB lazy getters)
- [x] `src/lib/firebase/admin.ts` initializes Admin SDK from env (named app, throws clear error if env missing)
- [x] `src/lib/auth/verify-id-token.ts` server helper (Bearer extraction + token verify)
- [x] `src/lib/auth/auth-context.tsx` client `<AuthProvider>` + `useAuth()` hook
- [x] `<SignInButton />` and `<UserBadge />` components
- [x] Root layout wraps children in `<AuthProvider>`; landing page shows sign-in or badge

### Phase 2 — User profile

- [x] `verifyIdToken` helper (landed in Phase 1)
- [x] `GET /api/me` returns/creates user doc
- [x] `<UserBadge />` renders header stats (level / quota / exp from `/api/me`)
- [x] `/me` page renders stats

### Phase 3 — Static canvas

- [x] `src/lib/canvas/constants.ts` (dimensions, palette, chunk size)
- [x] `src/lib/canvas/chunks.ts` (hex string ↔ Uint8Array)
- [x] `src/lib/canvas/coords.ts`
- [x] `<Canvas />` reads all chunks once and renders landscape (currently RTDB — needs migration ↓)
- [x] Pan + zoom (mouse + touch)
- [x] Portrait orientation toggle works
- [x] Migrated chunk read from RTDB to Firestore (`getDocs` on `canvas/{orientation}/chunks`)
- [x] Removed RTDB getter from `src/lib/firebase/client.ts` and the `NEXT_PUBLIC_FIREBASE_DATABASE_URL` env var
- [x] Removed server `FIREBASE_DATABASE_URL` from `.env.example` and admin SDK init

### Phase 4 — Paint flow

- [x] `<Palette />` UI with 16 colors, keyboard shortcuts (1-9, 0, q-y; Esc to deselect)
- [x] `POST /api/paint` validates input (orientation / x / y / color)
- [x] Single Firestore txn updates `users/{uid}` (quota/exp/level) AND `canvas/{orientation}/chunks/{key}` (new hex + `v` increment) atomically
- [x] Client optimistic paint + rollback on error
- [x] 429 (out of quota) handled with toast

### Phase 5 — Live updates

- [x] Firestore `onSnapshot` subscription on `canvas/{orientation}/chunks` collection
- [x] Other users' pixels appear without refresh (chunk-doc snapshot drives the offscreen blit)

### Phase 6 — Leveling + quota restore

- [x] `src/lib/leveling.ts` shared module (landed early as part of Phase 4 paint txn)
- [x] Lazy quota restore inside paint txn (`restoreQuota` in the txn before the quota check)
- [x] Live countdown UI to next quota tick
- [x] Level-up toast (`leveledUp` flag from `/api/paint` triggers an in-canvas toast)

### Phase 7 — Polish

- [ ] Mobile pinch zoom + drag
- [ ] At-zero-quota visual state
- [ ] Palette keyboard shortcuts
- [ ] A11y pass
- [ ] Error toasts

### Phase 8 — Hardening & deploy

- [ ] Firestore rules authored (`firestore.rules`) — covers users + canvas chunks
- [ ] Per-uid rate limit on `/api/paint`

---

## Session log

> Newest entry first. Each entry: date, what shipped, what's next, blockers.

### 2026-06-06 — Exp stored per-level (not cumulative), Exp stat card removed

- [src/lib/leveling.ts](../src/lib/leveling.ts) — changed the `exp` field semantics from "cumulative lifetime exp" to "exp within the current level, resets on level-up". Dropped `expForLevel(n)` (cumulative threshold) and `levelForExp(exp)` (level-from-cumulative) and replaced with `expCostForLevel(n) = 5·(n+1)` — the cost to go from level n → n+1. `applyBulkPaintProgress` now adds the painted count to `exp`, then loops `while (exp >= cost) { exp -= cost; level += 1 }` so it handles single-paint, bulk-paint, and the legacy cumulative-exp migration in one pass. `currentQuota` still tops up to `maxQuota` on level-up.
- [src/components/profile-sidebar.tsx](../src/components/profile-sidebar.tsx) — `<ExpBar>` math collapses to `intoLevel = exp`, `needed = expCostForLevel(level)` — no more subtracting prev/next thresholds. Removed the now-redundant `<Stat label="Exp">` from the 2×2 grid since the bar already shows current/needed (per user feedback: "user can see at exp bar instead").
- [src/components/user-badge.tsx](../src/components/user-badge.tsx) — unchanged; the inline `· {profile.exp} exp` text now reads as per-level exp (e.g. "26 exp"), consistent with the bar.
- **Migration**: existing user docs still hold cumulative `exp` (e.g. L8 / 201 exp). On the next `/api/paint`, the new while-loop will burn through stored exp and catch the level up — the L8/201 user will land at roughly L11/52. Same "acceptable pre-launch" rationale as the 2026-06-06 curve retune.
- `npx tsc --noEmit` → clean. `npm run lint` → clean.
- **Next**: same Phase 7 polish list.

### 2026-06-06 — Leveling curve retune + cap removed

- [src/lib/leveling.ts](../src/lib/leveling.ts) — replaced `expForLevel(n) = 50·n·(n+1)` with `5·n·(n+3)/2`. Per-level cost is now `5·(n+1)` (1→2: 10, 2→3: 15, 3→4: 20, +5 each level) — much faster early progression than the old curve (was 100/200/300/…).
- Dropped `MAX_QUOTA_CAP`; `maxQuotaForLevel(level) = 10 + 2·(level − 1)` is now uncapped, growing with level forever. No level cap either.
- [docs/PLAN.md](./PLAN.md) §4 updated to match the new formulas.
- Existing exp bar in [src/components/profile-sidebar.tsx](../src/components/profile-sidebar.tsx) picks up the new curve via `expForLevel` — no component change needed.
- **Compat note**: stored `level` values for existing users no longer match the new curve. On the next `/api/paint`, `applyPaintProgress` will recompute `level` from `exp` using the new thresholds, which means many users will jump several levels in one paint as the recomputation catches up. Acceptable since this is pre-launch; if it weren't, we'd need a one-shot migration over `users/{uid}`.

### 2026-06-06 — Phase 6 complete (live quota countdown)

- [src/lib/user/use-quota-countdown.ts](../src/lib/user/use-quota-countdown.ts) — new hook + `formatMmSs` helper. Owns a 1-second `setInterval` that updates an internal `now`, runs the shared `restoreQuota` from [src/lib/leveling.ts](../src/lib/leveling.ts) against the current profile, and `setProfile`s the result whenever `currentQuota` or `lastQuotaRestoreAt` change — so quota restores in the UI without an `/api/me` round-trip. Returns `msUntilNextQuota: number | null` (null at max). Returning null from the hook short-circuits the badge/footer "+1 in …" line entirely, which doubles as the at-max indicator.
- [src/components/user-badge.tsx](../src/components/user-badge.tsx) — added `msUntilNextQuota` prop; renders a third 11px tabular-nums line "+1 in m:ss" below the stats line when non-null. `aria-live="polite"` so screen readers don't spam every second but still pick up the next-tick change.
- [src/app/page.tsx](../src/app/page.tsx) — calls `useQuotaCountdown({ profile, setProfile })` (uses the existing `setProfile` from [use-me.ts](../src/lib/user/use-me.ts)) and threads `msUntilNextQuota` into `<UserBadge />`.
- [src/app/me/page.tsx](../src/app/me/page.tsx) — same hook; replaces the static "Last quota tick anchor: …" footer with "Next quota in m:ss · last tick anchor …" (or "Quota full · …" when at max), live-updating once a second.
- **Design notes**: The hook mirrors `restoreQuota` rather than duplicating its math, so the local optimistic tick is byte-for-byte the same advance the server will apply on the next paint — no drift between client display and server truth. After a paint, the server's response carries a fresh `lastQuotaRestoreAt` and the countdown resets to wherever the server placed the anchor. setInterval throttles in backgrounded tabs, but that's fine: `restoreQuota` advances by whole ticks regardless of how many intervals fired, so a tab brought back from background catches up in one cycle.
- `npx tsc --noEmit` → clean. `npm run lint` → clean. `npm run build` → clean (`/` 5.87 kB / 220 kB; `/me` 2.51 kB / 217 kB — +0.4 kB across both routes for the hook + helper, shared chunk unchanged).
- **Blocker**: same Phase 1 console + `.env.local`. To verify the local tick lines up with the server, need to actually paint and see `lastQuotaRestoreAt` come back from `/api/paint`.
- **Next**: Phase 7 polish. Open boxes: mobile pinch zoom + drag, at-zero-quota visual state (dim palette / disable paint click / show "out of quota"), error toasts (already partially in canvas, missing on `/me`/auth), and a11y pass on palette + buttons.

### 2026-06-06 — Phase 5 complete (live updates)

- [src/components/pixel-canvas.tsx](../src/components/pixel-canvas.tsx) — replaced the one-shot `getDocs(collection(db, "canvas", o, "chunks"))` with `onSnapshot` on the same collection. First snapshot delivers every chunk as an `added` docChange and flips status from "loading" → "ready"; subsequent paints (ours or anyone else's) deliver a single `modified` docChange that triggers a per-chunk blit.
- Per-chunk dedupe via new `chunkVersionsRef: Map<string, number>`: skip a snapshot if its `v <= prevV`. `submitPaint` records the server-returned `chunkVersion` after a successful POST so the snapshot echo of our own write is skipped (we already drew it optimistically; the server reply confirms the version we should now ignore).
- Rendering now uses a per-chunk `blitChunk` helper (50×50 `ImageData` + `putImageData` at `cx*50, cy*50`) instead of decoding the whole 800×400 canvas on every change. Dropped the old `drawChunkOntoImageData` + `renderChunks` whole-canvas re-build and the `getAllChunkKeys` import. Initial background is one `fillRect` in palette[0] so missing chunks read as white without a per-chunk pre-render.
- Cleanup: `onSnapshot` unsubscribe runs on unmount + on orientation change (the effect re-runs and the old subscription is torn down before the new one is created). `cancelled` flag still guards the handler against late callbacks during teardown.
- **Design notes**: Using the snapshot's `docChanges()` rather than full-collection iteration means the steady-state cost of a remote paint is one 50×50 blit (2,500 pixel writes) instead of redrawing 320,000 pixels. Tracking `v` per chunk also makes us robust to snapshot batching — if the listener fires once with two chunks at v=N and v=N+1, both apply in order; if a stale buffered fire comes in at v=N-1 for some reason, it's discarded.
- `npx tsc --noEmit` → clean. `npm run lint` → clean. `npm run build` → clean (`/` 5.46 kB / 220 kB First Load JS — identical to Phase 4; `onSnapshot` is already pulled in via the existing `firebase/firestore` import).
- **Blocker**: same Phase 1 console + `.env.local`. Two-tab live-update verification needs a real Firestore project.
- **Next**: Phase 7 polish — at-zero-quota visual state, error-toast pass, mobile pinch zoom. Phase 6's only outstanding item is the live countdown UI to the next quota tick.

### 2026-06-06 — Phase 4 complete (paint flow)

- [src/lib/leveling.ts](../src/lib/leveling.ts) — new shared pure module: `expForLevel(n) = 50 n (n+1)`, `levelForExp(exp)` (iterative — bounded since levels grow with each painted pixel), `maxQuotaForLevel(level) = min(10 + 2·(level−1), 100)`, `restoreQuota({ currentQuota, maxQuota, lastQuotaRestoreAtMs, nowMs })` advances by whole ticks (`QUOTA_RESTORE_INTERVAL_MS = 60_000`) and pushes the anchor forward by the consumed ticks (so partial seconds aren't lost), `applyPaintProgress({ exp, level, maxQuota, currentQuota })` decrements quota / adds exp / recomputes level + bumps & tops up `currentQuota` on level-up. Consolidated `INITIAL_LEVEL`/`INITIAL_MAX_QUOTA` here; [user-profile.ts](../src/lib/user/user-profile.ts) re-exports them.
- [src/components/palette.tsx](../src/components/palette.tsx) — 16-swatch toolbar driven by `PALETTE`; selected swatch gets a white border + scale; clicking the selected swatch toggles it off; `Esc` clears. Keyboard shortcuts: `1-9 0 q w e r t y` for indices 0–15 (skips when focus is in an input or modifier is held). `disabled` prop greys it out before sign-in.
- [src/app/api/paint/route.ts](../src/app/api/paint/route.ts) — `POST` route: verifies ID token, validates body against orientation dims + palette range, runs a single Firestore transaction over `users/{uid}` AND `canvas/{orientation}/chunks/{cy_cx}`. Reads both docs (Promise.all), calls `restoreQuota`, throws `OutOfQuotaError` → `429` if `currentQuota <= 0`, otherwise replaces the target nibble in `hex`, updates the user doc (`pixelsPainted++`, `exp/level/maxQuota/currentQuota` via `applyPaintProgress`, anchor `lastQuotaRestoreAt`), and writes the chunk doc (`tx.set` if the chunk doesn't exist yet, otherwise `tx.update` with `v: FieldValue.increment(1)` + `updatedAt: serverTimestamp()`). Returns `{ profile, chunkVersion, leveledUp }` so the client doesn't need to re-fetch `/api/me`.
- [src/components/pixel-canvas.tsx](../src/components/pixel-canvas.tsx) — added click-to-paint. Pan vs click distinguished by pointer-move distance (`< 4 px` = click). On click, screen coords are inverted through `(tx, ty, scale)` to pixel coords, bounds-checked, and painted optimistically via `ctx.fillRect(x, y, 1, 1)` + an in-memory `chunksRef` Map (also used to read the previous color for rollback). Then `POST /api/paint`: on `429` rolls back + shows "Out of quota" toast; on other errors rolls back with the error text; on success calls `onPaintSuccess(response)` and shows a "Level up!" toast if `leveledUp`. Auto-dismissing toast (2.5 s) sits at the top of the canvas. Cursor flips to `crosshair` when a color is selected and the user can paint.
- Lifted profile state from [user-badge.tsx](../src/components/user-badge.tsx) (now purely presentational, takes `profile / loading / error` props) up to [src/app/page.tsx](../src/app/page.tsx), which calls `useMe()` once and threads `setProfile` through `onPaintSuccess` so the badge updates instantly without an extra `/api/me` round-trip. Exposed `setProfile` from the [use-me](../src/lib/user/use-me.ts) hook for that purpose.
- **Design notes**: chose to lift `useMe` over a context provider — only the home page + `/me` page need it and `/me` keeps its own instance. Toast lives inside `<PixelCanvas />` rather than at page level because every emitter (out-of-quota, level-up, network fail) is internal to the paint flow; cleaner cohesion. `applyPaintProgress` returns `currentQuota = maxQuota` on level-up so the level-up top-up rule from PLAN.md §4 happens in one place.
- `npx tsc --noEmit` → clean. `npm run lint` → clean. `npm run build` → clean (`/` 5.41 kB / 220 kB First Load JS).
- **Blocker**: same Phase 1 console + `.env.local`. With no admin credentials, `/api/paint` will throw "Firebase Admin SDK credentials missing"; with no client config, the canvas read fails and the UI renders the empty-state banner.
- **Next**: Phase 5 — `onSnapshot` subscription on `canvas/{orientation}/chunks` so other users' pixels appear without refresh. The `v` field is already incremented per paint so a basic last-version dedupe is trivial.

### 2026-06-06 — Migrated Phase 3 from RTDB to Firestore

- [src/components/pixel-canvas.tsx](../src/components/pixel-canvas.tsx): swapped `get(ref(rtdb, "canvas/{o}/chunks"))` for `getDocs(collection(firestore, "canvas", orientation, "chunks"))`. Each chunk is now a Firestore doc whose `hex` field holds the 2500-char string (PLAN.md §3 shape: `{ hex, v, updatedAt }`). The `Record<string, string>` map fed to `renderChunks` is built from `snap.forEach((doc) => chunks[doc.id] = doc.data().hex)`, so the downstream `drawChunkOntoImageData` path is unchanged. Error banner copy updated from "RTDB not configured" → "Firestore not configured".
- [src/lib/firebase/client.ts](../src/lib/firebase/client.ts): dropped `getDatabase`/`Database` imports, `getFirebaseRtdb()`, and `databaseURL` from the client config.
- [src/lib/firebase/admin.ts](../src/lib/firebase/admin.ts): dropped `getDatabase`/`Database` imports, `getAdminRtdb()`, and `databaseURL` from the admin app init.
- The `firebase` and `firebase-admin` packages stay installed (Firestore submodules); we just stopped importing their `database` submodules. No `package.json` change needed.
- `npx tsc --noEmit` → clean. `npm run lint` → clean. `npm run build` → clean. **First Load JS on `/` dropped from 241 kB → 218 kB** (~23 kB win from no longer pulling `firebase/database` into the client bundle).
- **Next**: Phase 4 — `<Palette />`, `POST /api/paint` with the single two-doc Firestore transaction.

### 2026-06-06 — Plan change: dropped RTDB, Firestore-only

- User decided to consolidate onto a single backend. Trade-off accepted: slightly higher per-paint cost (2 Firestore writes) and slightly slower live updates (`onSnapshot` ~hundreds of ms vs RTDB tens), in exchange for one set of rules, one set of env vars, and an atomic two-doc paint transaction (no cross-DB rollback problem).
- [PLAN.md](./PLAN.md) rewritten: §2 tech-stack row + "Why Firestore-only" rationale; §3 chunks become Firestore docs `{ hex, v, updatedAt }`, `recent` event log removed (chunk-doc snapshots are the live channel), added "viewport optimization (post-v1)" note; §5 paint flow is now a single Firestore txn over `users/{uid}` + chunk doc with read-then-write ordering, added cost note; §6 Firestore rules now also cover `canvas/{orientation}/chunks/{chunkId}`, RTDB rules block deleted; §8 project layout drops `database.rules.json`; §9 drops both `NEXT_PUBLIC_FIREBASE_DATABASE_URL` and server `FIREBASE_DATABASE_URL`; §10 Phase 3/5/8 reworded.
- Phase 3 checklist gained three follow-up boxes: migrate `<PixelCanvas />` from RTDB to Firestore `getDocs`, remove RTDB getter from [src/lib/firebase/client.ts](../src/lib/firebase/client.ts) + the public env var, drop the server `FIREBASE_DATABASE_URL`.
- [CLAUDE.md](../CLAUDE.md) and [.env.example](../.env.example) also need to be brought into line — flagging here for the next code session rather than touching them with the doc edits.
- **Next**: do the RTDB → Firestore migration (Phase 3 follow-up boxes), then Phase 4 paint flow using the new two-doc txn.

- Canvas math modules — pure, shared client/server:
  - [src/lib/canvas/constants.ts](../src/lib/canvas/constants.ts): `Orientation` union, `ORIENTATIONS`, `CANVAS_DIMENSIONS` (landscape 800×400, portrait 400×800), `CHUNK_SIZE = 50`, and the 16-color `PALETTE` with precomputed RGB tuples (single source of truth for both `imageData` writes and the upcoming `<Palette />`).
  - [src/lib/canvas/chunks.ts](../src/lib/canvas/chunks.ts): `decodeChunkHex`, `encodeChunkHex`, `getPixelInChunk`, `setPixelInChunk`, `EMPTY_CHUNK_HEX = "0".repeat(2500)`.
  - [src/lib/canvas/coords.ts](../src/lib/canvas/coords.ts): `chunkKey(cy, cx) → "cy_cx"` (matches PLAN §3), `parseChunkKey`, `pixelToChunk`, `getAllChunkKeys`, `getChunkGrid`, `isPixelInBounds`.
- UI: [src/components/pixel-canvas.tsx](../src/components/pixel-canvas.tsx) — bulk-reads `/canvas/{orientation}/chunks` via the modular RTDB SDK, decodes each chunk into a full-resolution `ImageData` (`charCodeAt` for speed, fallback to white on bad nibbles), and `putImageData`s it onto a `<canvas width=W height=H>`. CSS `transform: translate3d + scale` drives pan/zoom; `image-rendering: pixelated` keeps the upscale crisp. Pan via Pointer Events with `setPointerCapture` (works for mouse and touch). Wheel zooms around the cursor, clamped to `[fitScale, 32x]`. ResizeObserver re-fits on container resize. If the RTDB read throws (env not configured yet), we still render an empty canvas and surface the error in a non-blocking banner — so the UI is usable before Phase 1 console setup lands.
- [src/components/orientation-toggle.tsx](../src/components/orientation-toggle.tsx): segmented control bound to `orientation` state in [src/app/page.tsx](../src/app/page.tsx). Landing page now hosts the canvas as the primary surface with a header (title, toggle, badge/sign-in/profile link) and footer hint.
- **Design notes**: Chose `transform`-based pan/zoom over `ctx.setTransform` so React state drives both pan and zoom and the same logic works for mouse + touch via Pointer Events. Defer pinch zoom + onscreen zoom controls to Phase 7 polish. Chunk rendering uses `charCodeAt` instead of `parseInt` per nibble to keep the cold-load tight (320k pixels × 128 chunks).
- `npx tsc --noEmit` → clean. `npm run lint` → clean. `npm run build` → clean (`/` 3.83 kB / 241 kB First Load JS, still static prerender).
- **Blocker**: same Phase 1 setup. With no RTDB URL the canvas shows the empty-state banner; once `.env.local` is populated the same code will read real chunks unmodified.
- **Next**: Phase 4 — `<Palette />`, `POST /api/paint` (Firestore txn for quota/exp/level + RTDB chunk + recent event), optimistic client paint with rollback.

### 2026-06-06 — Phase 2 code complete (still blocked on Firebase project)

- New shared types: [src/lib/user/user-profile.ts](../src/lib/user/user-profile.ts) (`UserProfile` + initial-user constants — client-safe, no `server-only`).
- Server doc helpers: [src/lib/user/user-doc.ts](../src/lib/user/user-doc.ts) (`newUserDoc` returns a Firestore write payload using `FieldValue.serverTimestamp()`; `serializeUserDoc` converts `Timestamp` → `number` ms for the wire).
- Route: [src/app/api/me/route.ts](../src/app/api/me/route.ts) verifies the Bearer ID token, gets/creates `users/{uid}`, returns the serialized profile. 401 on missing/invalid token.
- Client: [src/lib/user/use-me.ts](../src/lib/user/use-me.ts) hook fetches `/api/me` with a fresh ID token on auth change and exposes `{ profile, loading, error, reload }`.
- UI: [src/components/user-badge.tsx](../src/components/user-badge.tsx) now shows `Lv X · curr/max · exp`. [src/app/me/page.tsx](../src/app/me/page.tsx) renders the full stats grid (level, exp, lifetime pixels, quota, join date) with a retry button. Landing page links to `/me`.
- **Design notes**: Split user types across two modules because `server-only` propagates to consumers. Keeping `UserProfile` in a plain module lets the client import it for typing without pulling Admin SDK.
- `npx tsc --noEmit` → clean. `npm run lint` → clean. `npm run build` → clean (routes: `/`, `/me` static; `/api/me` dynamic).
- **Blocker**: still the Phase 1 console setup — without `.env.local` no real ID token can be verified. Code is otherwise ready.
- **Next**: Phase 3 — canvas constants + chunk math + static `<Canvas />` render.

### 2026-06-06 — Phase 1 code complete (blocked on Firebase project)

- Wrote [src/lib/firebase/client.ts](../src/lib/firebase/client.ts) (lazy getters for `Auth`, `Firestore`, `Database`) and [src/lib/firebase/admin.ts](../src/lib/firebase/admin.ts) (Admin SDK singleton under a named app, throws if env vars missing; handles `\n`-escaped private keys).
- Wrote [src/lib/auth/verify-id-token.ts](../src/lib/auth/verify-id-token.ts) (`verifyIdToken`, `extractBearer`, `authedUserFromRequest`) and [src/lib/auth/auth-context.tsx](../src/lib/auth/auth-context.tsx) (`<AuthProvider>` + `useAuth()` exposing `signInWithGoogle`, `signOut`, `getIdToken`).
- Wrote [src/components/sign-in-button.tsx](../src/components/sign-in-button.tsx) and [src/components/user-badge.tsx](../src/components/user-badge.tsx).
- Wired into [src/app/layout.tsx](../src/app/layout.tsx) and [src/app/page.tsx](../src/app/page.tsx).
- Added [src/types/globals.d.ts](../src/types/globals.d.ts) with `declare module "*.css"` to silence an IDE diagnostic on side-effect CSS imports (the runtime + `tsc --noEmit` were already fine; this just satisfies the editor's TS service).
- `npx tsc --noEmit` → clean. `npm run lint` → no warnings or errors.
- **Blocker**: end-to-end sign-in test requires a real Firebase project. User needs to create it and populate `.env.local`.
- **Next**: Phase 2 — `GET /api/me` route handler that lazy-creates `users/{uid}` in Firestore and returns stats.

### 2026-06-06 — Phase 0 complete

- Scaffolded Next.js 15.5.19 manually (didn't use `create-next-app` because the repo already had LICENSE/README/docs and the auto-mode classifier blocked moving them aside). Hand-wrote `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `src/app/{layout,page}.tsx`, `src/app/globals.css`, `.env.example`.
- Installed deps (514 packages, including `firebase` 11 and `firebase-admin` 13).
- Smoke test: `npm run dev` → `Ready in 5.2s`, `GET / → 200` in ~4s compile.
- **Next**: Phase 1 — create Firebase project in console, populate `.env.local`, build `src/lib/firebase/{client,admin}.ts`, wire Google sign-in.

### 2026-06-06 — Plan authored

- Wrote [PLAN.md](./PLAN.md) and this progress doc.
- No code yet. Repo contains only LICENSE and README.
- **Next**: Phase 0 scaffolding.

---

## Decisions made along the way

> Record any choice that deviates from PLAN.md, with one-line reason.
> Update PLAN.md too if the deviation is permanent.

- **2026-06-06** — Scaffolded Next.js by hand instead of `create-next-app`. Repo had pre-existing files; manual scaffolding produced an equivalent (TS, Tailwind v4, App Router, src dir, ESLint flat config) without disturbing them.
- **2026-06-06** — Pinned Tailwind to v4 (uses `@import "tailwindcss"` in CSS, no JS `tailwind.config.ts` needed). PLAN.md's project layout still mentions `tailwind.config.ts`; left as-is since the file is optional in v4 and may be added later for theme tokens.
- **2026-06-06** — File naming switched to **kebab-case** per CLAUDE.md style guide. PLAN.md's project layout still shows old camelCase names (`verifyIdToken.ts`, etc.); the actual paths follow kebab-case (`verify-id-token.ts`, `auth-context.tsx`, `sign-in-button.tsx`, `user-badge.tsx`). Treat kebab-case as authoritative.
- **2026-06-06** — Admin SDK initializes under a **named app** (`"rplace-admin"`) instead of the default app. Reason: keeps the client and admin SDKs from accidentally aliasing each other in any environment that loads both (e.g. tests). Doesn't change behavior in normal request/response flows.
- **2026-06-06** — **Dropped RTDB; Firestore is the only data store.** Trades a bit of latency (~hundreds of ms vs tens) and Firestore write cost (2 writes per paint) for a single-backend stack and atomic two-doc paint transactions (`users/{uid}` + chunk doc in one txn — no cross-DB rollback problem). PLAN.md §2/§3/§5/§6/§8/§9/§10 rewritten. Phase 3 code still reads RTDB and needs migration before Phase 4 starts.

---

## Manual setup values

> Checkboxes for these live in "Manual tasks (outside coding)" above —
> this table just records the values once the console work is done.

| Item                                        | Value |
| ------------------------------------------- | ----- |
| Firebase project ID                         | _tbd_ |
| RTDB region                                 | _tbd_ |
| Firestore region                            | _tbd_ |
| Authorized domains include localhost & prod | [ ]   |
| Service account JSON downloaded (admin)     | [ ]   |

---

## Open questions for the user

> Things Claude flagged mid-implementation that need a human answer.
> Leave blank until something comes up.

- _(none yet)_
