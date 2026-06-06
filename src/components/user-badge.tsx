"use client";

import { useAuth } from "@/lib/auth/auth-context";
import { expCostForLevel } from "@/lib/leveling";
import { formatMmSs } from "@/lib/user/use-quota-countdown";
import type { UserProfile } from "@/lib/user/user-profile";

type UserBadgeProps = {
  profile: UserProfile | null;
  loading?: boolean;
  error?: string | null;
  msUntilNextQuota?: number | null;
  onClick?: () => void;
};

export const UserBadge = ({
  profile,
  loading = false,
  error = null,
  msUntilNextQuota = null,
  onClick,
}: UserBadgeProps) => {
  const { user } = useAuth();

  if (!user) return null;

  const displayName = profile?.displayName ?? user.displayName ?? "Anonymous";
  const photoURL = profile?.photoURL ?? user.photoURL ?? null;

  return (
    <button
      className="flex flex-col border-2 border-black bg-neutral-900 text-left text-sm shadow-[3px_3px_0_0_#000] transition-colors hover:bg-neutral-800"
      type="button"
      onClick={onClick}
      aria-label="Open profile"
    >
      {profile && <BadgeExpBar level={profile.level} exp={profile.exp} />}
      <div className="flex items-center gap-3 px-3 py-2">
        {photoURL && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="h-8 w-8 border-2 border-black"
            src={photoURL}
            alt={displayName}
          />
        )}
        <div className="flex flex-col leading-tight">
          <span className="font-medium">{displayName}</span>
          {profile ? (
            <span className="text-xs text-neutral-400">
              Lv {profile.level} · {profile.currentQuota}/{profile.maxQuota}
            </span>
          ) : loading ? (
            <span className="text-xs text-neutral-500">Loading stats…</span>
          ) : error ? (
            <span className="text-xs text-red-400">Stats unavailable</span>
          ) : (
            <span className="text-xs text-neutral-400">{user.email}</span>
          )}
          {profile && msUntilNextQuota !== null && (
            <span className="text-[11px] tabular-nums text-neutral-500" aria-live="polite">
              +1 in {formatMmSs(msUntilNextQuota)}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

const BadgeExpBar = ({ level, exp }: { level: number; exp: number }) => {
  const needed = Math.max(1, expCostForLevel(level));
  const pct = Math.min(100, Math.max(0, (exp / needed) * 100));
  return (
    <div
      className="h-1.5 w-full border-b-2 border-black bg-neutral-800"
      aria-label={`Lv ${level} exp: ${exp} / ${needed}`}
    >
      <div
        className="h-full bg-emerald-500 transition-[width] duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
};
