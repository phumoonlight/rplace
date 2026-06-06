"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { OrientationToggle } from "@/components/orientation-toggle";
import { Palette } from "@/components/palette";
import { PixelCanvas, type PaintResponse } from "@/components/pixel-canvas";
import { SignInButton } from "@/components/sign-in-button";
import { UserBadge } from "@/components/user-badge";
import { useAuth } from "@/lib/auth/auth-context";
import type { Orientation } from "@/lib/canvas/constants";
import { useMe } from "@/lib/user/use-me";

const Home = () => {
  const { user, loading: authLoading, getIdToken } = useAuth();
  const { profile, loading: profileLoading, error: profileError, setProfile } = useMe();
  const [orientation, setOrientation] = useState<Orientation>("landscape");
  const [selectedColor, setSelectedColor] = useState<number | null>(null);

  const canPaint = Boolean(user);

  const handlePaintSuccess = useCallback(
    (response: PaintResponse) => {
      setProfile(response.profile);
    },
    [setProfile],
  );

  return (
    <main className="flex h-screen flex-col gap-3 p-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight">r/place clone</h1>
          <OrientationToggle value={orientation} onChange={setOrientation} />
        </div>
        <div className="flex items-center gap-3">
          {authLoading ? (
            <span className="text-sm text-neutral-500">Loading…</span>
          ) : user ? (
            <>
              <UserBadge profile={profile} loading={profileLoading} error={profileError} />
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
        <PixelCanvas
          canPaint={canPaint}
          getIdToken={getIdToken}
          orientation={orientation}
          selectedColor={selectedColor}
          onPaintSuccess={handlePaintSuccess}
        />
      </div>
      <div className="flex flex-col items-center gap-2">
        <Palette disabled={!canPaint} value={selectedColor} onChange={setSelectedColor} />
        <p className="text-center text-xs text-neutral-500">
          {canPaint
            ? selectedColor === null
              ? "Pick a color, then click the canvas to paint. Drag to pan, scroll to zoom."
              : "Click the canvas to paint. Press Esc to deselect."
            : "Sign in to paint. Drag to pan, scroll to zoom."}
        </p>
      </div>
    </main>
  );
};

export default Home;
