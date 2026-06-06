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
- **Firebase**: Auth (Google), Firestore (user profile), Realtime Database (canvas pixels).

### The dual-database split (important — non-obvious)
- **Firestore** holds `users/{uid}` (quota, exp, level, lifetime stats). Used for atomic transactions and queries. Touched once per paint.
- **RTDB** holds the canvas: `/canvas/{landscape|portrait}/chunks/{cy}_{cx}` are 50×50 chunks stored as 2500-char hex strings (4 bits per pixel, 16-color palette). `/canvas/.../recent` is a transient push-keyed list of recent pixel events for live fanout. Used for high-frequency tiny updates and broadcast.

This split is deliberate: Firestore's per-op pricing would be punitive for a pixel firehose, and RTDB's diff-based listeners are built for exactly this. Do **not** consolidate the canvas into Firestore "for simplicity."

### Paint flow (the critical path)
`POST /api/paint` → verify ID token → Firestore transaction on `users/{uid}`:
1. Lazy-restore quota from `lastQuotaRestoreAt` (1/min, capped at `maxQuota`).
2. If `currentQuota <= 0` return 429.
3. Decrement quota, increment `pixelsPainted` and `exp`, recompute `level`/`maxQuota`, top up `currentQuota` on level-up.

After the txn commits, write the pixel to its RTDB chunk and push a `recent` event via the Admin SDK. Cross-DB rollback is **not** attempted — if the RTDB write fails the user keeps the credit; log it and move on. This is documented in PLAN.md §5.

### Code layout (target — being built out phase by phase)
- [src/app/](src/app/) — App Router pages and route handlers (`api/me`, `api/paint`).
- `src/lib/firebase/client.ts` — browser Firebase init (uses `NEXT_PUBLIC_*` env vars).
- `src/lib/firebase/admin.ts` — Admin SDK singleton (server only; uses non-public env vars).
- `src/lib/canvas/` — pure helpers: dimensions, palette, chunk encode/decode, coord math. Shared client+server.
- `src/lib/leveling.ts` — pure `expForLevel(n)`, `maxQuota(level)`. Shared client+server. Source of truth.
- `src/components/` — React components (Canvas, Palette, UserBadge, OrientationToggle).

### Auth & security model
- Client signs in with Firebase Google provider; ID token is sent on every API call.
- All `users/{uid}` writes go through server routes using Admin SDK so quota/exp cannot be forged. Firestore rules: `allow write: if false`.
- RTDB canvas is publicly readable, server-only writable. Rules deployed in Phase 8.

## Environment

`.env.local` is required for any Firebase-touching code. See [.env.example](.env.example). Two distinct sets:
- `NEXT_PUBLIC_FIREBASE_*` — safe to expose, used by client SDK.
- `FIREBASE_ADMIN_*` and server `FIREBASE_DATABASE_URL` — server only. `FIREBASE_ADMIN_PRIVATE_KEY` must wrap newlines as the literal string `\n` and be quoted.

For local development, prefer the **Firebase Emulator Suite** over hitting the real project — it doesn't count against free-tier quotas and won't burn the 100-concurrent-connection RTDB cap during HMR reloads.

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
