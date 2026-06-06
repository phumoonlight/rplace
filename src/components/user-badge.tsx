"use client";

import { useAuth } from "@/lib/auth/auth-context";
import { formatMmSs } from "@/lib/user/use-quota-countdown";
import type { UserProfile } from "@/lib/user/user-profile";

type UserBadgeProps = {
  profile: UserProfile | null;
  loading?: boolean;
  error?: string | null;
  msUntilNextQuota?: number | null;
};

export const UserBadge = ({
  profile,
  loading = false,
  error = null,
  msUntilNextQuota = null,
}: UserBadgeProps) => {
  const { user, signOut } = useAuth();

  if (!user) return null;

  const displayName = profile?.displayName ?? user.displayName ?? "Anonymous";
  const photoURL = profile?.photoURL ?? user.photoURL ?? null;

  return (
    <div className="flex items-center gap-3 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm">
      {photoURL && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="h-8 w-8 rounded-full"
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
      <button
        className="ml-2 rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-800"
        type="button"
        onClick={() => signOut()}
      >
        Sign out
      </button>
    </div>
  );
};
