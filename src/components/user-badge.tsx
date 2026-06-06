"use client";

import { useAuth } from "@/lib/auth/auth-context";
import { useMe } from "@/lib/user/use-me";

export const UserBadge = () => {
  const { user, signOut } = useAuth();
  const { profile, loading, error } = useMe();

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
