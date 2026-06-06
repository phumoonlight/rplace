"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import {
  CANVAS_DIMENSIONS,
  CHUNK_SIZE,
  PALETTE,
  type Orientation,
} from "@/lib/canvas/constants";
import { getAllChunkKeys, parseChunkKey } from "@/lib/canvas/coords";

type PixelCanvasProps = { orientation: Orientation };

const MIN_SCALE_FACTOR = 0.5;
const MAX_SCALE = 32;
const ZOOM_STEP = 1.15;

const drawChunkOntoImageData = (
  imageData: ImageData,
  hex: string | undefined,
  cx: number,
  cy: number,
) => {
  const { data, width } = imageData;
  const startX = cx * CHUNK_SIZE;
  const startY = cy * CHUNK_SIZE;
  for (let ly = 0; ly < CHUNK_SIZE; ly++) {
    const py = startY + ly;
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const px = startX + lx;
      const ch = hex ? hex.charCodeAt(ly * CHUNK_SIZE + lx) : 48; // "0"
      let idx = ch >= 97 ? ch - 87 : ch - 48; // a-f → 10..15, 0-9 → 0..9
      if (idx < 0 || idx >= PALETTE.length) idx = 0;
      const [r, g, b] = PALETTE[idx].rgb;
      const di = (py * width + px) * 4;
      data[di] = r;
      data[di + 1] = g;
      data[di + 2] = b;
      data[di + 3] = 255;
    }
  }
};

export const PixelCanvas = ({ orientation }: PixelCanvasProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(MIN_SCALE_FACTOR);

  const dims = CANVAS_DIMENSIONS[orientation];

  // Fit-to-container on mount or orientation change.
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

  // Load chunks once per orientation.
  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setErrorMsg(null);

    const renderChunks = (chunks: Record<string, string>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = dims.width;
      canvas.height = dims.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const imageData = ctx.createImageData(dims.width, dims.height);
      for (const key of getAllChunkKeys(orientation)) {
        const { cx, cy } = parseChunkKey(key);
        drawChunkOntoImageData(imageData, chunks[key], cx, cy);
      }
      ctx.putImageData(imageData, 0, 0);
    };

    (async () => {
      try {
        const db = getFirebaseDb();
        const snap = await getDocs(collection(db, "canvas", orientation, "chunks"));
        if (cancelled) return;
        const chunks: Record<string, string> = {};
        snap.forEach((doc) => {
          const hex = (doc.data() as { hex?: unknown }).hex;
          if (typeof hex === "string") chunks[doc.id] = hex;
        });
        renderChunks(chunks);
        setStatus("ready");
      } catch (e) {
        if (cancelled) return;
        // Firestore may not be reachable yet (Phase 1 console setup pending).
        // Render an empty canvas so the UI is still usable in dev.
        renderChunks({});
        setStatus("error");
        setErrorMsg(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orientation, dims.width, dims.height]);

  // Mouse / touch panning via Pointer Events.
  const panStateRef = useRef<{ id: number; startX: number; startY: number; startTx: number; startTy: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    panStateRef.current = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startTx: tx,
      startTy: ty,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = panStateRef.current;
    if (!s || s.id !== e.pointerId) return;
    setTx(s.startTx + (e.clientX - s.startX));
    setTy(s.startTy + (e.clientY - s.startY));
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = panStateRef.current;
    if (!s || s.id !== e.pointerId) return;
    panStateRef.current = null;
    (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
  };

  // Wheel zoom around cursor.
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = wrapper.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      setScale((prev) => {
        const next = Math.min(Math.max(prev * factor, minScale), MAX_SCALE);
        if (next === prev) return prev;
        const ratio = next / prev;
        setTx((curTx) => mx - (mx - curTx) * ratio);
        setTy((curTy) => my - (my - curTy) * ratio);
        return next;
      });
    };
    wrapper.addEventListener("wheel", onWheel, { passive: false });
    return () => wrapper.removeEventListener("wheel", onWheel);
  }, [minScale]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-md border border-neutral-800 bg-neutral-950">
      <div
        ref={wrapperRef}
        className="relative h-full w-full cursor-grab touch-none active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <canvas
          ref={canvasRef}
          className="absolute left-0 top-0 origin-top-left select-none"
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
    </div>
  );
};
