"use client";

import Link from "next/link";
import { SignInButton } from "@/components/sign-in-button";
import { UserBadge } from "@/components/user-badge";
import { useAuth } from "@/lib/auth/auth-context";

const Home = () => {
  const { user, loading } = useAuth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold tracking-tight">r/place clone</h1>
      <p className="text-neutral-400">
        Phase 2 — User profile. Canvas lands in Phase 3.
      </p>
      {loading ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : user ? (
        <>
          <UserBadge />
          <Link
            className="text-sm text-neutral-400 underline-offset-4 hover:text-neutral-200 hover:underline"
            href="/me"
          >
            View full profile →
          </Link>
        </>
      ) : (
        <SignInButton />
      )}
    </main>
  );
};

export default Home;
