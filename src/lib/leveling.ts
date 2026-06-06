export const INITIAL_LEVEL = 1;
export const INITIAL_MAX_QUOTA = 10;
export const QUOTA_RESTORE_INTERVAL_MS = 60_000;
export const EXP_PER_PAINT = 1;

// Per-level cost grows linearly: level n → n+1 needs 5·(n+1) exp.
// `exp` on the user doc is exp within the current level — it resets on level-up.
export const expCostForLevel = (level: number): number => 5 * (level + 1);

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

export const applyBulkPaintProgress = ({
  exp,
  level,
  maxQuota,
  currentQuota,
  count,
}: {
  exp: number;
  level: number;
  maxQuota: number;
  currentQuota: number;
  count: number;
}): PaintProgress => {
  let nextExp = exp + EXP_PER_PAINT * count;
  let nextLevel = level;
  let leveledUp = false;
  let cost = expCostForLevel(nextLevel);
  while (nextExp >= cost) {
    nextExp -= cost;
    nextLevel += 1;
    leveledUp = true;
    cost = expCostForLevel(nextLevel);
  }
  const nextMaxQuota = leveledUp ? maxQuotaForLevel(nextLevel) : maxQuota;
  const nextCurrentQuota = leveledUp ? nextMaxQuota : currentQuota - count;
  return {
    exp: nextExp,
    level: nextLevel,
    maxQuota: nextMaxQuota,
    currentQuota: nextCurrentQuota,
    leveledUp,
  };
};
