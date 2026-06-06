"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import {
  CANVAS_DIMENSIONS,
  CHUNK_SIZE,
  PALETTE,
  type Orientation,
} from "@/lib/canvas/constants";
import { EMPTY_CHUNK_HEX, localIndex } from "@/lib/canvas/chunks";
import {
  chunkKey,
  isPixelInBounds,
  parseChunkKey,
  pixelToChunk,
} from "@/lib/canvas/coords";
import type { UserProfile } from "@/lib/user/user-profile";

export type PaintResponse = {
  profile: UserProfile;
  chunkVersion: number;
  leveledUp: boolean;
};

type PixelCanvasProps = {
  orientation: Orientation;
  selectedColor: number | null;
  canPaint: boolean;
  getIdToken?: () => Promise<string | null>;
  onPaintSuccess?: (response: PaintResponse) => void;
};

const MIN_SCALE_FACTOR = 0.5;
const MAX_SCALE = 32;
const ZOOM_STEP = 1.15;
const CLICK_MOVE_THRESHOLD_PX = 4;
const TOAST_TIMEOUT_MS = 2500;

const nibbleToIndex = (hex: string, i: number): number => {
  const ch = hex.charCodeAt(i);
  const idx = ch >= 97 ? ch - 87 : ch - 48;
  return idx >= 0 && idx < PALETTE.length ? idx : 0;
};

const PIXELS_PER_CHUNK = CHUNK_SIZE * CHUNK_SIZE;

const blitChunk = (
  ctx: CanvasRenderingContext2D,
  hex: string | undefined,
  cx: number,
  cy: number,
) => {
  const imageData = ctx.createImageData(CHUNK_SIZE, CHUNK_SIZE);
  const { data } = imageData;
  for (let i = 0; i < PIXELS_PER_CHUNK; i++) {
    const idx = hex ? nibbleToIndex(hex, i) : 0;
    const [r, g, b] = PALETTE[idx].rgb;
    const di = i * 4;
    data[di] = r;
    data[di + 1] = g;
    data[di + 2] = b;
    data[di + 3] = 255;
  }
  ctx.putImageData(imageData, cx * CHUNK_SIZE, cy * CHUNK_SIZE);
};

export const PixelCanvas = ({
  orientation,
  selectedColor,
  canPaint,
  getIdToken,
  onPaintSuccess,
}: PixelCanvasProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chunksRef = useRef<Map<string, string>>(new Map());
  const chunkVersionsRef = useRef<Map<string, number>>(new Map());
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "info" | "error"; text: string } | null>(null);

  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(MIN_SCALE_FACTOR);

  // Mirror transform state in refs so non-React handlers (wheel) can read
  // the latest values without stale closures, and so we never have to nest
  // setState updaters (which StrictMode double-invokes, causing zoom drift).
  const txRef = useRef(tx);
  const tyRef = useRef(ty);
  const scaleRef = useRef(scale);
  txRef.current = tx;
  tyRef.current = ty;
  scaleRef.current = scale;

  const dims = CANVAS_DIMENSIONS[orientation];

  const showToast = useCallback((kind: "info" | "error", text: string) => {
    setToast({ kind, text });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), TOAST_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, [toast]);

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const fit = () => {
      const { clientWidth, clientHeight } = wrapper;
      if (clientWidth === 0 || clientHeight === 0) return;
      const s = Math.min(clientWidth / dims.width, clientHeight / dims.height);
      const fittedScale = Math.max(s, MIN_SCALE_FACTOR);
      setMinScale(s);
      setScale(fittedScale);
      setTx((clientWidth - dims.width * fittedScale) / 2);
      setTy((clientHeight - dims.height * fittedScale) / 2);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [dims.width, dims.height]);

  useEffect(() => {
    let cancelled = false;
    let firstSnapshot = true;
    setStatus("loading");
    setErrorMsg(null);
    chunksRef.current = new Map();
    chunkVersionsRef.current = new Map();

    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = dims.width;
    canvas.height = dims.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Background = palette[0] for every cell; missing chunks just stay this color.
    ctx.fillStyle = PALETTE[0].hex;
    ctx.fillRect(0, 0, dims.width, dims.height);

    let unsubscribe: (() => void) | null = null;
    try {
      const db = getFirebaseDb();
      unsubscribe = onSnapshot(
        collection(db, "canvas", orientation, "chunks"),
        (snap) => {
          if (cancelled) return;
          snap.docChanges().forEach((change) => {
            if (change.type === "removed") return;
            const data = change.doc.data() as { hex?: unknown; v?: unknown };
            const hex = typeof data.hex === "string" ? data.hex : undefined;
            if (!hex) return;
            const v = typeof data.v === "number" ? data.v : 0;
            const key = change.doc.id;
            // Dedupe: skip stale snapshots and echoes of our own optimistic writes
            // (submitPaint records the new v on success).
            const prevV = chunkVersionsRef.current.get(key) ?? -1;
            if (v <= prevV) return;
            chunkVersionsRef.current.set(key, v);
            chunksRef.current.set(key, hex);
            const { cx, cy } = parseChunkKey(key);
            blitChunk(ctx, hex, cx, cy);
          });
          if (firstSnapshot) {
            firstSnapshot = false;
            setStatus("ready");
          }
        },
        (err) => {
          if (cancelled) return;
          setStatus("error");
          setErrorMsg(err.message);
        },
      );
    } catch (e) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [orientation, dims.width, dims.height]);

  const paintPixelLocal = useCallback((x: number, y: number, colorIndex: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const color = PALETTE[colorIndex];
    ctx.fillStyle = color.hex;
    ctx.fillRect(x, y, 1, 1);
    const { cx, cy, lx, ly } = pixelToChunk(x, y);
    const key = chunkKey(cy, cx);
    const prev = chunksRef.current.get(key) ?? EMPTY_CHUNK_HEX;
    const idx = localIndex(lx, ly);
    const nibble = colorIndex.toString(16);
    chunksRef.current.set(key, prev.slice(0, idx) + nibble + prev.slice(idx + 1));
  }, []);

  const getPreviousColorAt = useCallback((x: number, y: number): number => {
    const { cx, cy, lx, ly } = pixelToChunk(x, y);
    const hex = chunksRef.current.get(chunkKey(cy, cx));
    if (!hex) return 0;
    return nibbleToIndex(hex, localIndex(lx, ly));
  }, []);

  const submitPaint = useCallback(
    async (x: number, y: number, colorIndex: number) => {
      if (!getIdToken) return;
      const previous = getPreviousColorAt(x, y);
      paintPixelLocal(x, y, colorIndex);

      try {
        const token = await getIdToken();
        if (!token) throw new Error("Not signed in");
        const res = await fetch("/api/paint", {
          method: "POST",
          headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ orientation, x, y, color: colorIndex }),
        });
        if (res.status === 429) {
          paintPixelLocal(x, y, previous);
          showToast("error", "Out of quota — wait for the next tick.");
          return;
        }
        if (!res.ok) {
          paintPixelLocal(x, y, previous);
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          showToast("error", data.error ?? `Paint failed (${res.status})`);
          return;
        }
        const data = (await res.json()) as PaintResponse;
        const { cx, cy } = pixelToChunk(x, y);
        chunkVersionsRef.current.set(chunkKey(cy, cx), data.chunkVersion);
        onPaintSuccess?.(data);
        if (data.leveledUp) {
          showToast("info", `Level up! → Lv ${data.profile.level}`);
        }
      } catch (e) {
        paintPixelLocal(x, y, previous);
        showToast("error", e instanceof Error ? e.message : "Paint failed");
      }
    },
    [getIdToken, orientation, getPreviousColorAt, paintPixelLocal, onPaintSuccess, showToast],
  );

  const panStateRef = useRef<{
    id: number;
    startX: number;
    startY: number;
    startTx: number;
    startTy: number;
    moved: number;
  } | null>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    panStateRef.current = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startTx: tx,
      startTy: ty,
      moved: 0,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = panStateRef.current;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    s.moved = Math.max(s.moved, Math.hypot(dx, dy));
    setTx(s.startTx + dx);
    setTy(s.startTy + dy);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = panStateRef.current;
    if (!s || s.id !== e.pointerId) return;
    const wasClick = s.moved < CLICK_MOVE_THRESHOLD_PX;
    panStateRef.current = null;
    (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);

    if (!wasClick) return;
    if (selectedColor === null) return;
    if (!canPaint) {
      showToast("error", "Sign in to paint.");
      return;
    }
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    const localX = (e.clientX - rect.left - tx) / scale;
    const localY = (e.clientY - rect.top - ty) / scale;
    const px = Math.floor(localX);
    const py = Math.floor(localY);
    if (!isPixelInBounds(orientation, px, py)) return;
    void submitPaint(px, py, selectedColor);
  };

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = wrapper.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      const prev = scaleRef.current;
      const next = Math.min(Math.max(prev * factor, minScale), MAX_SCALE);
      if (next === prev) return;
      const ratio = next / prev;
      setScale(next);
      setTx(mx - (mx - txRef.current) * ratio);
      setTy(my - (my - tyRef.current) * ratio);
    };
    wrapper.addEventListener("wheel", onWheel, { passive: false });
    return () => wrapper.removeEventListener("wheel", onWheel);
  }, [minScale]);

  const cursor = selectedColor !== null && canPaint ? "crosshair" : "grab";

  return (
    <div className="relative h-full w-full overflow-hidden rounded-md border border-neutral-800 bg-neutral-950">
      <div
        className="relative h-full w-full touch-none active:cursor-grabbing"
        ref={wrapperRef}
        style={{ cursor }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <canvas
          className="absolute left-0 top-0 origin-top-left select-none"
          ref={canvasRef}
          style={{
            imageRendering: "pixelated",
            transform: `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`,
          }}
          width={dims.width}
          height={dims.height}
        />
      </div>
      {status === "loading" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-neutral-400">
          Loading canvas…
        </div>
      )}
      {status === "error" && (
        <div className="pointer-events-none absolute bottom-2 left-2 right-2 rounded bg-red-950/80 px-3 py-2 text-xs text-red-200">
          Canvas unavailable ({errorMsg ?? "Firestore not configured"}). Showing empty canvas.
        </div>
      )}
      {toast && (
        <div
          className={[
            "pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 rounded px-3 py-1.5 text-xs shadow-lg",
            toast.kind === "error"
              ? "bg-red-950/90 text-red-100"
              : "bg-emerald-950/90 text-emerald-100",
          ].join(" ")}
          role="status"
        >
          {toast.text}
        </div>
      )}
    </div>
  );
};
