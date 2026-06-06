"use client";

import { useEffect, useState } from "react";
import { QUOTA_RESTORE_INTERVAL_MS, restoreQuota } from "@/lib/leveling";
import type { UserProfile } from "@/lib/user/user-profile";

type UseQuotaCountdownArgs = {
  profile: UserProfile | null;
  setProfile: (next: UserProfile) => void;
};

export const useQuotaCountdown = ({
  profile,
  setProfile,
}: UseQuotaCountdownArgs): number | null => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!profile) return;
    if (profile.currentQuota >= profile.maxQuota) return;
    const result = restoreQuota({
      currentQuota: profile.currentQuota,
      maxQuota: profile.maxQuota,
      lastQuotaRestoreAtMs: profile.lastQuotaRestoreAt,
      nowMs: now,
    });
    if (
      result.currentQuota !== profile.currentQuota ||
      result.lastQuotaRestoreAtMs !== profile.lastQuotaRestoreAt
    ) {
      setProfile({
        ...profile,
        currentQuota: result.currentQuota,
        lastQuotaRestoreAt: result.lastQuotaRestoreAtMs,
      });
    }
  }, [now, profile, setProfile]);

  if (!profile) return null;
  if (profile.currentQuota >= profile.maxQuota) return null;
  const elapsed = Math.max(0, now - profile.lastQuotaRestoreAt);
  const remainder = elapsed % QUOTA_RESTORE_INTERVAL_MS;
  return QUOTA_RESTORE_INTERVAL_MS - remainder;
};

export const formatMmSs = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};
