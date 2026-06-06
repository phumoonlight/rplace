"use client";

import { useAuth } from "@/lib/auth/auth-context";
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
      className="flex items-center gap-3 border-2 border-black bg-neutral-900 px-3 py-2 text-left text-sm shadow-[3px_3px_0_0_#000] transition-colors hover:bg-neutral-800"
      type="button"
      onClick={onClick}
      aria-label="Open profile"
    >
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
            Lv {profile.level} · {profile.currentQuota}/{profile.maxQuota} · {profile.exp} exp
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
    </button>
  );
};
