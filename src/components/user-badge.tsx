"use client";

import { useAuth } from "@/lib/auth/auth-context";

export const UserBadge = () => {
  const { user, signOut } = useAuth();

  if (!user) return null;

  return (
    <div className="flex items-center gap-3 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm">
      {user.photoURL && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="h-8 w-8 rounded-full"
          src={user.photoURL}
          alt={user.displayName ?? "User"}
        />
      )}
      <div className="flex flex-col leading-tight">
        <span className="font-medium">{user.displayName ?? "Anonymous"}</span>
        <span className="text-xs text-neutral-400">{user.email}</span>
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
