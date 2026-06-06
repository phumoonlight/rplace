# r/place Clone — Progress

> Companion to [PLAN.md](./PLAN.md). Update at the end of every working
> session: tick boxes, jot a 1–3 line "Session note", and record any
> deviation from the plan under "Decisions made along the way".

---

## Status snapshot

- **Current phase**: Phase 1 — Firebase wiring. **Code complete, blocked on user.**
- **Last touched**: 2026-06-06 (Firebase SDK init, AuthProvider, sign-in UI — typecheck + lint clean)
- **Next action**: User must create the Firebase project in the console, enable Google sign-in + Firestore + RTDB, then populate `.env.local` from `.env.example`. Once that's done, sign-in is end-to-end testable. Then proceed to Phase 2 (`/api/me` + user profile doc).

---

## Phase checklist

### Phase 0 — Scaffolding
- [x] Scaffold Next.js 15 (TS, Tailwind v4, App Router, `src/` dir, ESLint flat config)
- [x] Install `firebase` and `firebase-admin`
- [x] Add `.env.example`
- [x] Update `.gitignore` for `*.serviceaccount.json` (existing template already covered `.env*`)
- [x] Landing page renders "r/place clone" placeholder (verified: `GET / → 200`)
- [ ] Initial commit *(deferred — waiting for user to review before committing)*

### Phase 1 — Firebase wiring
- [ ] Firebase project created in console (manual; record project ID below)
- [ ] Google sign-in provider enabled in console
- [ ] Realtime Database created in console (region noted)
- [ ] Firestore created in console
- [x] `src/lib/firebase/client.ts` initializes browser app (Auth + Firestore + RTDB lazy getters)
- [x] `src/lib/firebase/admin.ts` initializes Admin SDK from env (named app, throws clear error if env missing)
- [x] `src/lib/auth/verify-id-token.ts` server helper (Bearer extraction + token verify)
- [x] `src/lib/auth/auth-context.tsx` client `<AuthProvider>` + `useAuth()` hook
- [x] `<SignInButton />` and `<UserBadge />` components
- [x] Root layout wraps children in `<AuthProvider>`; landing page shows sign-in or badge
- [ ] Sign-in button works end-to-end (popup → ID token retrievable) — **needs real Firebase project**

### Phase 2 — User profile
- [ ] `verifyIdToken` helper
- [ ] `GET /api/me` returns/creates user doc
- [ ] `<UserBadge />` renders in header
- [ ] `/me` page renders stats

### Phase 3 — Static canvas
- [ ] `src/lib/canvas/constants.ts` (dimensions, palette, chunk size)
- [ ] `src/lib/canvas/chunks.ts` (hex string ↔ Uint8Array)
- [ ] `src/lib/canvas/coords.ts`
- [ ] `<Canvas />` reads all chunks once and renders landscape
- [ ] Pan + zoom (mouse + touch)
- [ ] Portrait orientation toggle works

### Phase 4 — Paint flow
- [ ] `<Palette />` UI with 16 colors, keyboard shortcuts
- [ ] `POST /api/paint` validates input
- [ ] Firestore txn deducts quota, awards exp, level-ups
- [ ] Server writes pixel to RTDB chunk
- [ ] Client optimistic paint + rollback on error
- [ ] 429 (out of quota) handled with toast

### Phase 5 — Live updates
- [ ] RTDB `recent` subscription on client
- [ ] Other users' pixels appear without refresh
- [ ] Server trims `recent` to last N

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
- [ ] Firestore rules deployed
- [ ] RTDB rules deployed
- [ ] Per-uid rate limit on `/api/paint`
- [ ] Lighthouse > 90 on mobile
- [ ] Vercel deploy live
- [ ] Production auth domain verified

---

## Session log

> Newest entry first. Each entry: date, what shipped, what's next, blockers.

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

---

## Manual setup checklist (Firebase console)

Once these are done, fill in the values to the right.

| Item | Value |
|---|---|
| Firebase project ID | _tbd_ |
| RTDB region | _tbd_ |
| Firestore region | _tbd_ |
| Google sign-in enabled | [ ] |
| Authorized domains include localhost & prod | [ ] |
| Service account JSON downloaded (admin) | [ ] |
| `.env.local` populated | [ ] |

---

## Open questions for the user

> Things Claude flagged mid-implementation that need a human answer.
> Leave blank until something comes up.

- _(none yet)_

