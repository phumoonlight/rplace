# r/place Clone — Implementation Plan

> Living document. Update when scope or design decisions change.
> Companion file: [PROGRESS.md](./PROGRESS.md)

---

## 1. Goal

Build a Reddit r/place style collaborative pixel canvas as a Next.js fullstack
app, backed by Firebase. Authenticated users (Google sign-in) spend a
restoring quota to paint pixels and gain experience that raises their level,
which in turn raises their max paint quota.

Two canvases are available simultaneously:
- **Landscape** (default) — wide canvas
- **Portrait** — tall canvas

The same user account, stats, and quota apply across both canvases.

---

## 2. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 15 (App Router) + TypeScript | Fullstack FE+BE in one project (user requirement) |
| Styling | Tailwind CSS | Fast, conventional |
| Auth | Firebase Auth (Google provider) | User requirement |
| User data | Firestore | Document-shaped user profile, queries, security rules |
| Canvas pixels | Firestore (chunk docs) | Single backend keeps the stack simple and lets paint be one cross-doc transaction |
| Server SDK | firebase-admin | Server-side auth verification, privileged writes |
| Rendering | HTML5 `<canvas>` + React | Direct pixel access, zoom/pan, GPU-friendly |
| Hosting | Vercel (recommended) or Firebase Hosting | Next.js native target |

### Why Firestore-only
- One backend, one set of rules, one set of env vars — simpler than the
  earlier Firestore + RTDB split.
- Paint can update **both** `users/{uid}` and the affected chunk doc in a
  single Firestore transaction → no cross-DB rollback problem.
- Cost trade-off: Firestore charges per doc write (~$0.18/100k). Paints
  cost two writes each (user + chunk). At v1 traffic this is acceptable;
  see §5 for batching options if the firehose grows.
- Latency trade-off: Firestore `onSnapshot` is slower than RTDB
  (~hundreds of ms vs tens). Acceptable for a casual pixel canvas; if it
  ever feels sluggish, reintroducing RTDB is an isolated change behind
  the chunk read/write helpers.

---

## 3. Canvas Design

### Dimensions
- **Landscape**: 800 × 400 pixels (320,000 cells)
- **Portrait**: 400 × 800 pixels (320,000 cells)

Identical pixel count keeps storage cost symmetric. Final sizes can be tuned;
keep them as named constants from day one.

### Palette
Fixed 16-color palette (4 bits per pixel). Stored as a `Color` enum/array on
both client and server. Using a small palette keeps each pixel to a single
nibble and lets us pack chunk storage cheaply.

Initial palette (r/place 2017 classic, trimmed):
```
white, lightGray, darkGray, black,
pink, red, orange, brown,
yellow, lightGreen, green, cyan,
lightBlue, blue, magenta, purple
```

### Chunking
- Each canvas is split into **chunks of 50 × 50 pixels**.
  - Landscape = 16 × 8 = 128 chunks.
  - Portrait = 8 × 16 = 128 chunks.
- One Firestore doc per chunk:
  `canvas/{orientation}/chunks/{chunkY}_{chunkX}` with shape
  `{ hex: string, v: number, updatedAt: Timestamp }`.
- `hex` is a 2500-character hex string (one hex digit per pixel = 4 bits
  per pixel). String diffs are cheap and human-debuggable.
- `v` is a monotonically incremented version (`FieldValue.increment(1)`)
  used by the client to dedupe re-applies during a tab focus race.

### Live updates
Clients subscribe with `onSnapshot` to the per-orientation chunks
collection (or to only the chunks that are currently visible — see
viewport optimization below). Each remote paint mutates exactly one
chunk doc, which fires the snapshot listener on subscribers; they decode
the new `hex` and blit it into the offscreen buffer.

There is no separate "recent events" log — the chunk docs themselves are
the live channel. If a per-pixel ticker UI is ever needed, derive it by
diffing old vs new `hex` in the snapshot callback.

### Rendering pipeline (client)
1. On canvas mount: bulk-read all chunk docs once (`getDocs` on the
   `canvas/{orientation}/chunks` collection).
2. Decode each chunk hex string into a `Uint8ClampedArray` and `putImageData`
   it onto an offscreen `ImageData`.
3. Subscribe via `onSnapshot` to the chunks collection (or the visible
   subset); on each doc change, decode the new `hex` and blit it onto the
   offscreen buffer.
4. Render offscreen buffer to a visible `<canvas>` scaled with CSS
   `image-rendering: pixelated`. Support pan/zoom via CSS transform.

### Viewport optimization (post-v1)
Subscribing to all 128 chunk docs is fine at low concurrency but every
listener charges 1 read per change. Once usage grows, narrow the
listener to the currently-visible chunks (recompute on pan/zoom).
Out of scope for v1.

---

## 4. User Model

Firestore document `users/{uid}`:

```ts
{
  uid: string,
  displayName: string,
  photoURL: string | null,
  createdAt: Timestamp,

  pixelsPainted: number,    // lifetime
  exp: number,              // total exp
  level: number,            // derived but stored for cheap reads

  maxQuota: number,         // ceiling for currentQuota
  currentQuota: number,     // available paints right now
  lastQuotaRestoreAt: Timestamp, // anchor for lazy restore math
}
```

### Quota
- Default restore rate: **1 quota per 60 seconds**.
- Restore is **lazy**: computed inside the paint server action by
  `floor((now - lastQuotaRestoreAt) / 60s)`, clamped to `maxQuota`.
- No cron job needed — the client may display a live countdown by reading
  `lastQuotaRestoreAt` and computing locally.

### Leveling
- 1 pixel painted = 1 exp.
- `exp` on the user doc is **exp within the current level** and resets to
  the overflow (`exp - cost`) on level-up — not a cumulative total. This
  keeps the UI exp bar trivial (`exp / expCostForLevel(level)`) and avoids
  storing a number that grows forever.
- Per-level cost: `expCostForLevel(n) = 5 * (n + 1)` (level 1→2: 10, 2→3:
  15, 3→4: 20, +5 each level). Pure function shared client/server.
- `maxQuota(level)` = `10 + 2 * (level - 1)` (start at 10, +2 per level,
  uncapped — grows with level).
- No level cap.
- On level-up: bump `maxQuota` and top up `currentQuota` to the new
  `maxQuota`.

### Default new user
- `level = 1`, `exp = 0`, `maxQuota = 10`, `currentQuota = 10`,
  `pixelsPainted = 0`, `lastQuotaRestoreAt = now`.

---

## 5. API Surface

All backend lives in Next.js Route Handlers (`app/api/...`) and Server
Actions. Auth is checked via the Firebase Admin SDK using an ID token
forwarded from the client.

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/me` | GET | Current user stats (creates the user doc on first call) |
| `/api/paint` | POST | `{ orientation, x, y, color }` — paint one pixel |
| `/api/canvas/:orientation/snapshot` | GET | Serve current chunk strings (optional; client can read Firestore directly) |

### `/api/paint` atomic flow
Wrapped in a single Firestore transaction spanning **two** docs —
`users/{uid}` and `canvas/{orientation}/chunks/{key}`:

1. `tx.get(userRef)` and `tx.get(chunkRef)` (Firestore txns require all
   reads before writes).
2. Lazy-restore quota on the user doc (`currentQuota` capped at
   `maxQuota`).
3. If `currentQuota <= 0` → throw; route returns `429`.
4. Compute the new chunk `hex` by replacing the target nibble.
5. `tx.update(userRef, …)` — decrement quota, `pixelsPainted += 1`,
   `exp += 1`, recompute `level`/`maxQuota`/top-up if level changed.
6. `tx.update(chunkRef, { hex, v: FieldValue.increment(1), updatedAt: serverTimestamp() })`.

Because both writes commit atomically, there is no cross-DB
inconsistency window — either the user is debited and the pixel lands,
or neither happens.

### Cost note
Each successful paint = 2 reads + 2 writes in Firestore. At Spark-plan
free-tier limits (50k reads, 20k writes / day) this gives ~10k paints/day
before hitting write quota. If the firehose exceeds that, options are:
buffer chunk writes server-side (debounce 100–200ms then flush) at the
cost of weaker atomicity, or revisit RTDB for the canvas only.

### Validation
- `orientation ∈ {landscape, portrait}`
- `0 <= x < width(orientation)`, `0 <= y < height(orientation)`
- `color` ∈ palette index 0..15

---

## 6. Security Rules

### Firestore
```
match /users/{uid} {
  allow read: if request.auth.uid == uid;
  allow write: if false; // server (Admin SDK) only
}

match /canvas/{orientation}/chunks/{chunkId} {
  allow read: if true;   // canvas is public
  allow write: if false; // server (Admin SDK) only
}
```
All user and chunk writes go through the server so quota/exp can't be
forged and the canvas can't be defaced bypassing the paint route.

---

## 7. UI

### Routes
- `/` — landing + canvas (defaults to landscape). Orientation toggle in
  header switches between landscape/portrait canvases.
- `/login` — Google sign-in (or modal popup on `/`).
- `/me` — user stats page (level progress bar, lifetime pixels, etc.).

### Canvas page chrome
- Top-right: avatar, displayName, current/max quota, level + exp progress.
- Bottom: color palette strip (16 swatches). Selected color highlighted.
- Click on canvas with a selected color → POST `/api/paint`.
- Optimistic update: paint locally immediately, roll back on error.
- Pan: drag with mouse / touch. Zoom: wheel / pinch. Min zoom = fit, max
  zoom = 32×.

### Empty state
Before sign-in: canvas is fully viewable, palette is disabled with a
"Sign in to paint" CTA.

---

## 8. Project Layout

```
rplace/
├── docs/
│   ├── PLAN.md            (this file)
│   └── PROGRESS.md
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx              (landing + canvas)
│   │   ├── me/page.tsx
│   │   ├── api/
│   │   │   ├── me/route.ts
│   │   │   └── paint/route.ts
│   │   └── (auth)/...
│   ├── components/
│   │   ├── Canvas/
│   │   ├── Palette/
│   │   ├── UserBadge/
│   │   └── OrientationToggle/
│   ├── lib/
│   │   ├── firebase/
│   │   │   ├── client.ts          (initializeApp for browser)
│   │   │   └── admin.ts           (Admin SDK singleton)
│   │   ├── auth/
│   │   │   └── verifyIdToken.ts
│   │   ├── canvas/
│   │   │   ├── constants.ts       (dimensions, palette, chunking)
│   │   │   ├── chunks.ts          (encode/decode chunk strings)
│   │   │   └── coords.ts          (pixel ↔ chunk math)
│   │   └── leveling.ts            (expForLevel, maxQuota, etc.)
│   └── types/
│       └── index.ts
├── public/
├── .env.local                     (Firebase keys — gitignored)
├── firestore.rules                (Firestore rules — users + canvas chunks)
├── next.config.ts
├── tsconfig.json
├── package.json
└── tailwind.config.ts
```

---

## 9. Environment Variables

Client (must be `NEXT_PUBLIC_*`):
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

Server only:
```
FIREBASE_ADMIN_PROJECT_ID
FIREBASE_ADMIN_CLIENT_EMAIL
FIREBASE_ADMIN_PRIVATE_KEY      (newlines escaped as \n)
```

(No `FIREBASE_DATABASE_URL` — RTDB was dropped, Firestore is the only
data store and uses the project ID directly.)

A `.env.example` will document these without values.

---

## 10. Phased Roadmap

Phases are deliberately ordered so each phase ends in a working, testable
slice. Mark each item done in [PROGRESS.md](./PROGRESS.md).

### Phase 0 — Scaffolding
- `create-next-app` with TS + Tailwind + App Router.
- Add `firebase`, `firebase-admin`.
- Set up `.env.example`, `.gitignore`, `eslint`, `prettier`.
- Empty landing page renders.

### Phase 1 — Firebase wiring
- Create Firebase project (manual step, document in PROGRESS.md).
- Implement [src/lib/firebase/client.ts](../src/lib/firebase/client.ts) and
  [src/lib/firebase/admin.ts](../src/lib/firebase/admin.ts).
- Enable Google sign-in provider in Firebase console.
- Implement sign-in flow with a "Sign in with Google" button.

### Phase 2 — User profile
- `/api/me` route handler: verify ID token, lazily create
  `users/{uid}` doc.
- `<UserBadge />` shows displayName, level, currentQuota/maxQuota.
- `/me` page renders stats.

### Phase 3 — Static canvas
- Implement constants & chunking math in [src/lib/canvas](../src/lib/canvas).
- `<Canvas orientation="landscape" />` reads chunk docs from Firestore
  once (`getDocs`) and renders. Landscape canvas appears on `/`.
- Pan + zoom interactions.
- Orientation toggle adds portrait route/view.

### Phase 4 — Paint flow
- Palette UI.
- `/api/paint` route + Firestore transaction spanning `users/{uid}` and
  the target chunk doc (quota/exp/level + chunk hex update in one atomic
  commit).
- Optimistic client paint with rollback on server error.
- Quota & exp UI updates after success.

### Phase 5 — Live updates
- Client subscribes to the `canvas/{orientation}/chunks` collection via
  `onSnapshot`; on each chunk change, decode the new `hex` and blit into
  the offscreen buffer.
- No separate event log — chunk-doc snapshots are the live channel.

### Phase 6 — Leveling + quota restore
- Implement [src/lib/leveling.ts](../src/lib/leveling.ts) (shared).
- Quota restoration logic inside paint txn (lazy).
- Client renders a live countdown until next quota tick.
- Level-up toast.

### Phase 7 — Polish
- Mobile touch (pinch zoom, drag).
- Cooldown indicator at 0 quota.
- Color picker keyboard shortcuts (1–9, 0, q-y).
- Accessibility pass on palette + buttons.
- Error toasts (network, auth expired, 429).

### Phase 8 — Hardening & deploy
- Firestore security rules deployed (`firestore.rules` covers users +
  canvas chunks).
- Rate limit `/api/paint` per IP as a defense-in-depth (e.g. Upstash or
  in-memory token bucket per uid).
- Lighthouse pass.
- Deploy to Vercel; set production env vars; verify auth domain.

---

## 11. Open Questions / Future Ideas

Tracked here so they don't block phase work:

- **Heatmap / replay** — store an append-only log of paints for a future
  timelapse feature. Out of scope for v1.
- **Cooldown vs quota** — current design is per-user quota. Original r/place
  was a global per-user cooldown. Stick with quota since user asked for it.
- **Anti-griefing** — reCAPTCHA Enterprise hook on `/api/paint` is a
  reasonable v2 if abuse appears.
- **Internationalization** — defer.
- **Custom palettes per event** — defer.

