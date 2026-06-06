"use client";

import Link from "next/link";
import { SignInButton } from "@/components/sign-in-button";
import { useAuth } from "@/lib/auth/auth-context";
import { useMe } from "@/lib/user/use-me";

const formatDate = (ms: number) => {
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return "—";
  }
};

const Stat = ({ label, value }: { label: string; value: string | number }) => (
  <div className="flex flex-col gap-1 rounded-md border border-neutral-800 bg-neutral-900 px-4 py-3">
    <span className="text-xs uppercase tracking-wide text-neutral-500">{label}</span>
    <span className="text-lg font-semibold">{value}</span>
  </div>
);

const MePage = () => {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading, error, reload } = useMe();

  if (authLoading) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <p className="text-sm text-neutral-500">Loading…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-4 p-8">
        <h1 className="text-2xl font-bold">Your profile</h1>
        <p className="text-neutral-400">Sign in to view your stats.</p>
        <SignInButton />
        <Link className="text-sm text-neutral-500 hover:text-neutral-300" href="/">
          ← Back to canvas
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your profile</h1>
        <Link className="text-sm text-neutral-400 hover:text-neutral-200" href="/">
          ← Back to canvas
        </Link>
      </div>

      {loading && !profile && (
        <p className="text-sm text-neutral-500">Loading stats…</p>
      )}

      {error && (
        <div className="flex items-center justify-between rounded-md border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-200">
          <span>Couldn’t load stats: {error}</span>
          <button
            className="rounded border border-red-700 px-2 py-1 text-xs hover:bg-red-900"
            type="button"
            onClick={() => reload()}
          >
            Retry
          </button>
        </div>
      )}

      {profile && (
        <>
          <div className="flex items-center gap-4">
            {profile.photoURL && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="h-16 w-16 rounded-full"
                src={profile.photoURL}
                alt={profile.displayName}
              />
            )}
            <div className="flex flex-col">
              <span className="text-lg font-semibold">{profile.displayName}</span>
              <span className="text-sm text-neutral-400">{user.email}</span>
              <span className="text-xs text-neutral-500">
                Joined {formatDate(profile.createdAt)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Level" value={profile.level} />
            <Stat label="Exp" value={profile.exp} />
            <Stat label="Pixels painted" value={profile.pixelsPainted} />
            <Stat
              label="Quota"
              value={`${profile.currentQuota}/${profile.maxQuota}`}
            />
          </div>

          <p className="text-xs text-neutral-500">
            Last quota tick anchor: {formatDate(profile.lastQuotaRestoreAt)}
          </p>
        </>
      )}
    </main>
  );
};

export default MePage;
