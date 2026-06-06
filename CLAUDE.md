# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Read first

Before doing anything, read [docs/PROGRESS.md](docs/PROGRESS.md) to find the current phase and last session's notes, then [docs/PLAN.md](docs/PLAN.md) for the overall design. The project is being built phase-by-phase across multiple sessions; PROGRESS.md is the authoritative "where we are" and PLAN.md is the authoritative "where we're going." Update PROGRESS.md (checklist + a session log entry) at the end of every working session, and update PLAN.md when a design decision changes.

## Commands

```bash
npm run dev        # next dev (default port 3000)
npm run build      # production build
npm run start      # serve prod build
npm run lint       # next lint (flat config in eslint.config.mjs)
npm run typecheck  # tsc --noEmit
```

No test runner is wired up yet. When [src/lib/leveling.ts](src/lib/leveling.ts) lands in Phase 6, add Vitest and write unit tests for the level/quota math (it's pure and shared client/server, so it's the highest-value thing to test).

## Architecture

### What this app is
A Reddit r/place style collaborative pixel canvas. Two canvases — **landscape** (800×400, default) and **portrait** (400×800) — share the same authenticated user, the same per-user paint quota, and the same exp/level progression.

### Stack
- **Next.js 15 App Router** + React 19 + TypeScript strict. Fullstack (FE and BE) in this single repo.
- **Tailwind v4** with CSS-only config (`@import "tailwindcss"` in [src/app/globals.css](src/app/globals.css)). No `tailwind.config.ts` — add one only if theme tokens are needed.
- **Firebase**: Auth (Google), Firestore (everything — user profile **and** canvas pixels).

### Single-database model (was dual-DB; changed 2026-06-06)
- **Firestore** is the only data store. RTDB was dropped to simplify the stack and to make paint atomic across user + canvas state.
- `users/{uid}` holds quota, exp, level, lifetime stats.
- `canvas/{orientation}/chunks/{cy}_{cx}` docs hold the canvas — each doc is `{ hex: string (2500 chars, 4-bit palette), v: number, updatedAt: Timestamp }`. 16 × 8 = 128 chunks per orientation.
- Live updates: clients use `onSnapshot` on the chunks collection — each remote paint mutates one chunk doc which fires the listener. There is **no** separate `recent` event log.
- Trade-offs accepted: ~2 Firestore writes per paint (vs cheap RTDB writes) and `onSnapshot` latency in the hundreds of ms (vs RTDB tens). See PLAN.md §2 "Why Firestore-only" and §5 cost note. If the firehose ever outgrows this, isolate behind the chunk read/write helpers and revisit.

### Paint flow (the critical path)
`POST /api/paint` → verify ID token → **single Firestore transaction** over `users/{uid}` **and** `canvas/{orientation}/chunks/{key}`:
1. `tx.get` both docs (Firestore txns require all reads before writes).
2. Lazy-restore quota from `lastQuotaRestoreAt` (1/min, capped at `maxQuota`).
3. If `currentQuota <= 0` return 429.
4. `tx.update(userRef, …)` — decrement quota, increment `pixelsPainted` and `exp`, recompute `level`/`maxQuota`, top up `currentQuota` on level-up.
5. `tx.update(chunkRef, { hex: newHex, v: FieldValue.increment(1), updatedAt: serverTimestamp() })`.

Both writes commit atomically — no cross-DB rollback problem. Documented in PLAN.md §5.

### Code layout (target — being built out phase by phase)
- [src/app/](src/app/) — App Router pages and route handlers (`api/me`, `api/paint`).
- `src/lib/firebase/client.ts` — browser Firebase init (uses `NEXT_PUBLIC_*` env vars).
- `src/lib/firebase/admin.ts` — Admin SDK singleton (server only; uses non-public env vars).
- `src/lib/canvas/` — pure helpers: dimensions, palette, chunk encode/decode, coord math. Shared client+server.
- `src/lib/leveling.ts` — pure `expForLevel(n)`, `maxQuota(level)`. Shared client+server. Source of truth.
- `src/components/` — React components (Canvas, Palette, UserBadge, OrientationToggle).

### Auth & security model
- Client signs in with Firebase Google provider; ID token is sent on every API call.
- All `users/{uid}` and `canvas/{orientation}/chunks/{key}` writes go through server routes using Admin SDK so quota/exp can't be forged and the canvas can't be defaced bypassing the paint route. Firestore rules: `users/{uid}` is owner-read, server-write; chunks are public-read, server-write.

## Environment

`.env.local` is required for any Firebase-touching code. See [.env.example](.env.example). Two distinct sets:
- `NEXT_PUBLIC_FIREBASE_*` — safe to expose, used by client SDK.
- `FIREBASE_ADMIN_*` — server only. `FIREBASE_ADMIN_PRIVATE_KEY` must wrap newlines as the literal string `\n` and be quoted.

No `FIREBASE_DATABASE_URL` is needed — RTDB was dropped and Firestore uses the project ID directly.

For local development, prefer the **Firebase Emulator Suite** over hitting the real project — it doesn't count against free-tier quotas.

## Conventions

- Pixel data on the wire and at rest is **hex string per chunk**, not JSON. Decode/encode in [src/lib/canvas/chunks.ts](src/lib/canvas/chunks.ts) (once created).
- Palette indices are 0–15 (single hex nibble). The palette array is the single source of truth — never hardcode hex colors anywhere else.
- Level/quota math lives in [src/lib/leveling.ts](src/lib/leveling.ts) and is called from both the paint route handler and the client UI. Do not duplicate the formulas.
- Canvas dimensions, chunk size, and palette are named constants in [src/lib/canvas/constants.ts](src/lib/canvas/constants.ts) — never inline.

## Code Style

- Use **arrow functions** for all functions (components, handlers, helpers).
- Use **`type`** instead of `interface` for TypeScript type definitions.
- Use **named exports** (`export const` / `export function`) instead of default exports.
- Use **kebab-case** for all new file and directory names (e.g. `my-component.tsx`, `use-items.ts`).
- When rendering a React component or HTML tag, put **`className` first** among props/attributes whenever possible (e.g. `<button className="..." type="button" onClick={...}>`, `<div className="..." id="...">`).

**Default-export exception:** Next.js convention files require a `default` export — `app/**/page.tsx`, `layout.tsx`, `route.ts`, `error.tsx`, `loading.tsx`, `not-found.tsx`, `template.tsx`, plus root `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`. Define the value as a named `const` arrow function, then `export default` it on a separate line:

```tsx
const Page = () => { /* ... */ };
export default Page;
```
