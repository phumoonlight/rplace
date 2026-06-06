"use client";

import { useState } from "react";
import Link from "next/link";
import { OrientationToggle } from "@/components/orientation-toggle";
import { PixelCanvas } from "@/components/pixel-canvas";
import { SignInButton } from "@/components/sign-in-button";
import { UserBadge } from "@/components/user-badge";
import { useAuth } from "@/lib/auth/auth-context";
import type { Orientation } from "@/lib/canvas/constants";

const Home = () => {
  const { user, loading } = useAuth();
  const [orientation, setOrientation] = useState<Orientation>("landscape");

  return (
    <main className="flex h-screen flex-col gap-3 p-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight">r/place clone</h1>
          <OrientationToggle value={orientation} onChange={setOrientation} />
        </div>
        <div className="flex items-center gap-3">
          {loading ? (
            <span className="text-sm text-neutral-500">Loading…</span>
          ) : user ? (
            <>
              <UserBadge />
              <Link
                className="text-sm text-neutral-400 underline-offset-4 hover:text-neutral-200 hover:underline"
                href="/me"
              >
                Profile →
              </Link>
            </>
          ) : (
            <SignInButton />
          )}
        </div>
      </header>
      <div className="min-h-0 flex-1">
        <PixelCanvas orientation={orientation} />
      </div>
      <p className="text-center text-xs text-neutral-500">
        Phase 3 — static canvas. Drag to pan, scroll to zoom. Paint lands in Phase 4.
      </p>
    </main>
  );
};

export default Home;
