export const INITIAL_LEVEL = 1;
export const INITIAL_MAX_QUOTA = 10;
export const MAX_QUOTA_CAP = 100;
export const QUOTA_RESTORE_INTERVAL_MS = 60_000;
export const EXP_PER_PAINT = 1;

export const expForLevel = (level: number): number => 50 * level * (level + 1);

export const levelForExp = (exp: number): number => {
  if (exp <= 0) return INITIAL_LEVEL;
  let level = INITIAL_LEVEL;
  while (exp >= expForLevel(level)) {
    level += 1;
  }
  return level;
};

export const maxQuotaForLevel = (level: number): number =>
  Math.min(INITIAL_MAX_QUOTA + 2 * (level - INITIAL_LEVEL), MAX_QUOTA_CAP);

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
}): PaintProgress => {
  const exp = input.exp + EXP_PER_PAINT;
  const decremented = input.currentQuota - 1;
  const nextLevel = levelForExp(exp);
  const leveledUp = nextLevel > input.level;
  const maxQuota = leveledUp ? maxQuotaForLevel(nextLevel) : input.maxQuota;
  const currentQuota = leveledUp ? maxQuota : decremented;
  return { exp, level: nextLevel, maxQuota, currentQuota, leveledUp };
};
