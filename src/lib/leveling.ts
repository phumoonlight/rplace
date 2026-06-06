export const INITIAL_LEVEL = 1;
export const INITIAL_MAX_QUOTA = 10;
export const QUOTA_RESTORE_INTERVAL_MS = 60_000;
export const EXP_PER_PAINT = 1;

// Per-level cost grows linearly: level n → n+1 needs 5·(n+1) exp.
// Cumulative threshold to reach level n+1 = sum_{k=1..n} 5(k+1) = 5n(n+3)/2.
export const expForLevel = (level: number): number => {
  if (level <= 0) return 0;
  return (5 * level * (level + 3)) / 2;
};

export const levelForExp = (exp: number): number => {
  if (exp <= 0) return INITIAL_LEVEL;
  let level = INITIAL_LEVEL;
  while (exp >= expForLevel(level)) {
    level += 1;
  }
  return level;
};

export const maxQuotaForLevel = (level: number): number =>
  INITIAL_MAX_QUOTA + 2 * (level - INITIAL_LEVEL);

export type QuotaRestoreInput = {
  currentQuota: number;
  maxQuota: number;
  lastQuotaRestoreAtMs: number;
  nowMs: number;
};

export type QuotaRestoreResult = {
  currentQuota: number;
  lastQuotaRestoreAtMs: number;
};

export const restoreQuota = ({
  currentQuota,
  maxQuota,
  lastQuotaRestoreAtMs,
  nowMs,
}: QuotaRestoreInput): QuotaRestoreResult => {
  if (currentQuota >= maxQuota) {
    return { currentQuota, lastQuotaRestoreAtMs: nowMs };
  }
  const elapsed = nowMs - lastQuotaRestoreAtMs;
  if (elapsed < QUOTA_RESTORE_INTERVAL_MS) {
    return { currentQuota, lastQuotaRestoreAtMs };
  }
  const ticks = Math.floor(elapsed / QUOTA_RESTORE_INTERVAL_MS);
  const restored = Math.min(currentQuota + ticks, maxQuota);
  const consumedMs = ticks * QUOTA_RESTORE_INTERVAL_MS;
  return {
    currentQuota: restored,
    lastQuotaRestoreAtMs: lastQuotaRestoreAtMs + consumedMs,
  };
};

export type PaintProgress = {
  exp: number;
  level: number;
  maxQuota: number;
  currentQuota: number;
  leveledUp: boolean;
};

export const applyPaintProgress = (input: {
  exp: number;
  level: number;
  maxQuota: number;
  currentQuota: number;
}): PaintProgress => applyBulkPaintProgress({ ...input, count: 1 });

export const applyBulkPaintProgress = (input: {
  exp: number;
  level: number;
  maxQuota: number;
  currentQuota: number;
  count: number;
}): PaintProgress => {
  const exp = input.exp + EXP_PER_PAINT * input.count;
  const decremented = input.currentQuota - input.count;
  const nextLevel = levelForExp(exp);
  const leveledUp = nextLevel > input.level;
  const maxQuota = leveledUp ? maxQuotaForLevel(nextLevel) : input.maxQuota;
  const currentQuota = leveledUp ? maxQuota : decremented;
  return { exp, level: nextLevel, maxQuota, currentQuota, leveledUp };
};
