"use client";

import { useCallback, useRef, useState } from "react";
import { BottomHud } from "@/components/bottom-hud";
import { HelpModal } from "@/components/help-modal";
import { OrientationToggle } from "@/components/orientation-toggle";
import {
  PixelCanvas,
  type PaintResponse,
  type PixelCanvasHandle,
} from "@/components/pixel-canvas";
import { ProfileSidebar } from "@/components/profile-sidebar";
import { SignInButton } from "@/components/sign-in-button";
import { TileInfoCard } from "@/components/tile-info-card";
import { TileInspectBar } from "@/components/tile-inspect-bar";
import { UserBadge } from "@/components/user-badge";
import { useAuth } from "@/lib/auth/auth-context";
import type { Orientation } from "@/lib/canvas/constants";
import { useMe } from "@/lib/user/use-me";
import { useQuotaCountdown } from "@/lib/user/use-quota-countdown";

const Home = () => {
  const { user, loading: authLoading, getIdToken } = useAuth();
  const { profile, loading: profileLoading, error: profileError, reload, setProfile } = useMe();
  const msUntilNextQuota = useQuotaCountdown({ profile, setProfile });
  const [orientation, setOrientation] = useState<Orientation>("landscape");
  const [selectedColor, setSelectedColor] = useState<number | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [inspectedTile, setInspectedTile] = useState<{ x: number; y: number; snapshot: string | null } | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const canvasRef = useRef<PixelCanvasHandle>(null);

  const canPaint = Boolean(user);

  const handlePaintSuccess = useCallback(
    (response: PaintResponse) => {
      setProfile(response.profile);
    },
    [setProfile],
  );

  const handlePlaceClick = useCallback(() => {
    if (!paletteOpen) {
      setInspectedTile(null);
      setShareOpen(false);
      setPaletteOpen(true);
      return;
    }
    setPaletteOpen(false);
    setSelectedColor(null);
    void canvasRef.current?.commit();
  }, [paletteOpen]);

  const handleEscape = useCallback(() => {
    setPaletteOpen(false);
    setSelectedColor(null);
    canvasRef.current?.discard();
  }, []);

  const handleTileInspect = useCallback(
    (tile: { x: number; y: number }) => {
      if (paletteOpen) return;
      const snapshot = canvasRef.current?.getTileSnapshot(tile.x, tile.y) ?? null;
      setInspectedTile({ x: tile.x, y: tile.y, snapshot });
      setShareOpen(false);
    },
    [paletteOpen],
  );

  const handleCloseInspect = useCallback(() => {
    setInspectedTile(null);
    setShareOpen(false);
  }, []);

  return (
    <main className="relative h-dvh w-screen overflow-hidden bg-neutral-950 text-neutral-100">
      <PixelCanvas
        canPaint={canPaint}
        currentQuota={profile?.currentQuota ?? null}
        getIdToken={getIdToken}
        highlightedTile={inspectedTile ? { x: inspectedTile.x, y: inspectedTile.y } : null}
        orientation={orientation}
        ref={canvasRef}
        selectedColor={selectedColor}
        onPaintSuccess={handlePaintSuccess}
        onPendingCountChange={setPendingCount}
        onTileInspect={handleTileInspect}
      />

      <div className="pointer-events-none absolute top-3 left-3 z-10 flex items-center gap-2">
        <button
          className="pointer-events-auto flex h-10 w-10 items-center justify-center border-2 border-black bg-neutral-900 text-lg font-bold text-neutral-200 shadow-[3px_3px_0_0_#000] hover:bg-neutral-800"
          type="button"
          onClick={() => setHelpOpen(true)}
          aria-label="How to play"
        >
          ?
        </button>
        <div className="pointer-events-auto">
          <OrientationToggle value={orientation} onChange={setOrientation} />
        </div>
      </div>

      <div className="pointer-events-none absolute top-3 right-3 z-10 flex items-center gap-2">
        <div className="pointer-events-auto">
          {authLoading ? (
            <span className="border-2 border-black bg-neutral-900 px-3 py-2 text-sm text-neutral-500 shadow-[3px_3px_0_0_#000]">
              Loading…
            </span>
          ) : user ? (
            <UserBadge
              error={profileError}
              loading={profileLoading}
              msUntilNextQuota={msUntilNextQuota}
              profile={profile}
              onClick={() => setProfileOpen(true)}
            />
          ) : (
            <SignInButton />
          )}
        </div>
      </div>

      {inspectedTile && !paletteOpen && (
        <div className="pointer-events-none absolute inset-x-0 bottom-28 z-20 flex justify-center px-3">
          <TileInspectBar
            canPaint={canPaint}
            orientation={orientation}
            tile={{ x: inspectedTile.x, y: inspectedTile.y }}
            onClose={handleCloseInspect}
            onPlace={handlePlaceClick}
            onShare={() => setShareOpen(true)}
          />
        </div>
      )}

      {inspectedTile && shareOpen && (
        <TileInfoCard
          orientation={orientation}
          snapshot={inspectedTile.snapshot}
          tile={{ x: inspectedTile.x, y: inspectedTile.y }}
          onClose={() => setShareOpen(false)}
        />
      )}

      <BottomHud
        canPaint={canPaint}
        msUntilNextQuota={msUntilNextQuota}
        paletteOpen={paletteOpen}
        pendingCount={pendingCount}
        profile={profile}
        selectedColor={selectedColor}
        onEscape={handleEscape}
        onPlaceClick={handlePlaceClick}
        onSelectColor={setSelectedColor}
      />

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      <ProfileSidebar
        error={profileError}
        loading={profileLoading}
        msUntilNextQuota={msUntilNextQuota}
        open={profileOpen}
        profile={profile}
        reload={reload}
        onClose={() => setProfileOpen(false)}
      />
    </main>
  );
};

export default Home;
