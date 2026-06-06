# r/place Clone — Progress

> Companion to [PLAN.md](./PLAN.md). Update at the end of every working
> session: tick boxes, jot a 1–3 line "Session note", and record any
> deviation from the plan under "Decisions made along the way".

---

## Status snapshot

- **Current phase**: Phase 3 — Static canvas. **Code complete on Firestore. Blocked on user (Firebase project setup).**
- **Last touched**: 2026-06-06 (RTDB → Firestore migration: `<PixelCanvas />` reads chunk docs via `getDocs`, RTDB getters/env vars removed from client + admin SDKs — typecheck, lint, prod build all clean; First Load JS dropped 241 → 218 kB)
- **Next action**: User still owes the Phase 1 Firebase console setup + `.env.local`. Once Firestore is reachable the canvas will render real chunks; today it gracefully falls back to an all-white canvas with an error banner if the Firestore read fails. Then proceed to Phase 4 (palette UI, `POST /api/paint` with the two-doc Firestore txn over `users/{uid}` + `canvas/{orientation}/chunks/{key}`, optimistic paint).

---

## Manual tasks (outside coding)

> Things only the user can do — console clicks, deploys, commits, and
> end-to-end verifications that need real credentials. Coding tasks live
> in the phase checklist below; this section tracks the human work that
> unblocks them.

### Phase 0
- [x] Initial commit

### Phase 1 — Firebase console setup
- [ ] Firebase project created in console (record project ID in the values table below)
- [ ] Google sign-in provider enabled in console
- [ ] Firestore created in console (region noted)
- [ ] `.env.local` populated from `.env.example`
- [ ] End-to-end sign-in verified (popup → ID token retrievable) — unblocked once the three console items + `.env.local` are done

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
- [ ] `<Palette />` UI with 16 colors, keyboard shortcuts
- [ ] `POST /api/paint` validates input
- [ ] Single Firestore txn updates `users/{uid}` (quota/exp/level) AND `canvas/{orientation}/chunks/{key}` (new hex + `v` increment) atomically
- [ ] Client optimistic paint + rollback on error
- [ ] 429 (out of quota) handled with toast

### Phase 5 — Live updates
- [ ] Firestore `onSnapshot` subscription on `canvas/{orientation}/chunks` collection
- [ ] Other users' pixels appear without refresh (chunk-doc snapshot drives the offscreen blit)

### Phase 6 — Leveling + quota restore
- [ ] `src/lib/leveling.ts` shared module + unit tests
- [ ] Lazy quota restore inside paint txn
- [ ] Live countdown UI to next quota tick
- [ ] Level-up toast

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

| Item | Value |
|---|---|
| Firebase project ID | _tbd_ |
| RTDB region | _tbd_ |
| Firestore region | _tbd_ |
| Authorized domains include localhost & prod | [ ] |
| Service account JSON downloaded (admin) | [ ] |

---

## Open questions for the user

> Things Claude flagged mid-implementation that need a human answer.
> Leave blank until something comes up.

- _(none yet)_

