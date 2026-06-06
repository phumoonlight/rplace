import 'server-only'

const CAPACITY = 20
const REFILL_PER_MS = 1 / 1000
const MAX_ENTRIES = 10_000

type Bucket = { tokens: number; lastRefillMs: number }

const buckets = new Map<string, Bucket>()

const evictIfNeeded = () => {
  if (buckets.size <= MAX_ENTRIES) return
  const overflow = buckets.size - MAX_ENTRIES
  let i = 0
  for (const key of buckets.keys()) {
    if (i++ >= overflow) break
    buckets.delete(key)
  }
}

export type RateLimitResult = { ok: true } | { ok: false; retryAfterMs: number }

export const consumePaintToken = (uid: string, cost = 1): RateLimitResult => {
  const now = Date.now()
  const existing = buckets.get(uid)
  const bucket: Bucket = existing ?? { tokens: CAPACITY, lastRefillMs: now }

  const refill = (now - bucket.lastRefillMs) * REFILL_PER_MS
  bucket.tokens = Math.min(CAPACITY, bucket.tokens + refill)
  bucket.lastRefillMs = now

  if (bucket.tokens < cost) {
    const retryAfterMs = Math.ceil((cost - bucket.tokens) / REFILL_PER_MS)
    if (existing) {
      buckets.delete(uid)
      buckets.set(uid, bucket)
    } else {
      buckets.set(uid, bucket)
      evictIfNeeded()
    }
    return { ok: false, retryAfterMs }
  }

  bucket.tokens -= cost
  if (existing) {
    buckets.delete(uid)
    buckets.set(uid, bucket)
  } else {
    buckets.set(uid, bucket)
    evictIfNeeded()
  }
  return { ok: true }
}
