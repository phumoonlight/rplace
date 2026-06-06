import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { authedUserFromRequest } from "@/lib/auth/verify-id-token";
import {
  CANVAS_DIMENSIONS,
  MAX_PIXELS_PER_REQUEST,
  ORIENTATIONS,
  PALETTE_SIZE,
  type Orientation,
} from "@/lib/canvas/constants";
import { chunkKey, pixelToChunk } from "@/lib/canvas/coords";
import { EMPTY_CHUNK_HEX, localIndex } from "@/lib/canvas/chunks";
import { applyBulkPaintProgress, restoreQuota } from "@/lib/leveling";
import { consumePaintToken } from "@/lib/rate-limit/paint-rate-limit";
import type { UserProfile } from "@/lib/user/user-profile";

type RawPixel = { x?: unknown; y?: unknown; color?: unknown };

type PaintRequestBody = {
  orientation?: unknown;
  pixels?: unknown;
};

type PixelInput = { x: number; y: number; color: number };

type ParsedBody = { orientation: Orientation; pixels: PixelInput[] };

const parseBody = (body: PaintRequestBody): ParsedBody | { error: string } => {
  const { orientation, pixels } = body;
  if (typeof orientation !== "string" || !ORIENTATIONS.includes(orientation as Orientation)) {
    return { error: "Invalid orientation" };
  }
  if (!Array.isArray(pixels) || pixels.length === 0) {
    return { error: "Invalid pixels" };
  }
  if (pixels.length > MAX_PIXELS_PER_REQUEST) {
    return { error: `Too many pixels (max ${MAX_PIXELS_PER_REQUEST})` };
  }
  const o = orientation as Orientation;
  const { width, height } = CANVAS_DIMENSIONS[o];

  const seen = new Set<string>();
  const parsed: PixelInput[] = [];
  for (const raw of pixels as RawPixel[]) {
    if (raw == null || typeof raw !== "object") return { error: "Invalid pixel" };
    const { x, y, color } = raw;
    if (typeof x !== "number" || !Number.isInteger(x) || x < 0 || x >= width) {
      return { error: "Invalid x" };
    }
    if (typeof y !== "number" || !Number.isInteger(y) || y < 0 || y >= height) {
      return { error: "Invalid y" };
    }
    if (typeof color !== "number" || !Number.isInteger(color) || color < 0 || color >= PALETTE_SIZE) {
      return { error: "Invalid color" };
    }
    const key = `${x},${y}`;
    if (seen.has(key)) return { error: "Duplicate pixel" };
    seen.add(key);
    parsed.push({ x, y, color });
  }
  return { orientation: o, pixels: parsed };
};

const replaceNibble = (hex: string, index: number, color: number): string => {
  const nibble = color.toString(16);
  return hex.slice(0, index) + nibble + hex.slice(index + 1);
};

const tsToMs = (value: unknown): number => {
  if (value instanceof Timestamp) return value.toMillis();
  return Date.now();
};

class OutOfQuotaError extends Error {
  constructor() {
    super("Out of quota");
    this.name = "OutOfQuotaError";
  }
}

type PaintResult = {
  profile: UserProfile;
  chunkVersions: Record<string, number>;
  leveledUp: boolean;
  painted: number;
};

const POST = async (request: Request) => {
  const authed = await authedUserFromRequest(request);
  if (!authed) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: PaintRequestBody;
  try {
    body = (await request.json()) as PaintRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseBody(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { orientation, pixels } = parsed;

  const rate = consumePaintToken(authed.uid);
  if (!rate.ok) {
    const retryAfterSec = Math.max(1, Math.ceil(rate.retryAfterMs / 1000));
    return NextResponse.json(
      { error: "rate_limited", retryAfterMs: rate.retryAfterMs },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
    );
  }

  // Group pixels by chunk so we touch each chunk doc only once.
  const byChunk = new Map<string, Array<PixelInput & { lx: number; ly: number }>>();
  for (const p of pixels) {
    const { cx, cy, lx, ly } = pixelToChunk(p.x, p.y);
    const key = chunkKey(cy, cx);
    const bucket = byChunk.get(key);
    const entry = { ...p, lx, ly };
    if (bucket) bucket.push(entry);
    else byChunk.set(key, [entry]);
  }

  const db = getAdminDb();
  const userRef = db.collection("users").doc(authed.uid);
  const chunkRefs = new Map(
    Array.from(byChunk.keys()).map((key) => [
      key,
      db.collection("canvas").doc(orientation).collection("chunks").doc(key),
    ]),
  );

  try {
    const result = await db.runTransaction<PaintResult>(async (tx) => {
      const userSnapPromise = tx.get(userRef);
      const chunkSnapPromises = Array.from(chunkRefs.entries()).map(async ([key, ref]) => {
        const snap = await tx.get(ref);
        return [key, snap] as const;
      });
      const [userSnap, ...chunkSnapEntries] = await Promise.all([
        userSnapPromise,
        ...chunkSnapPromises,
      ]);
      const chunkSnaps = new Map(chunkSnapEntries);

      if (!userSnap.exists) {
        throw new Error("User profile missing — call /api/me first");
      }

      const userData = userSnap.data() as {
        uid: string;
        displayName: string;
        photoURL: string | null;
        createdAt?: unknown;
        pixelsPainted: number;
        exp: number;
        level: number;
        maxQuota: number;
        currentQuota: number;
        lastQuotaRestoreAt?: unknown;
      };

      const nowMs = Date.now();
      const restored = restoreQuota({
        currentQuota: userData.currentQuota,
        maxQuota: userData.maxQuota,
        lastQuotaRestoreAtMs: tsToMs(userData.lastQuotaRestoreAt),
        nowMs,
      });

      if (restored.currentQuota < pixels.length) {
        throw new OutOfQuotaError();
      }

      const progress = applyBulkPaintProgress({
        exp: userData.exp,
        level: userData.level,
        maxQuota: userData.maxQuota,
        currentQuota: restored.currentQuota,
        count: pixels.length,
      });

      const lastQuotaRestoreAtTs = Timestamp.fromMillis(restored.lastQuotaRestoreAtMs);

      tx.update(userRef, {
        pixelsPainted: FieldValue.increment(pixels.length),
        exp: progress.exp,
        level: progress.level,
        maxQuota: progress.maxQuota,
        currentQuota: progress.currentQuota,
        lastQuotaRestoreAt: lastQuotaRestoreAtTs,
      });

      const chunkVersions: Record<string, number> = {};
      for (const [key, edits] of byChunk.entries()) {
        const ref = chunkRefs.get(key)!;
        const snap = chunkSnaps.get(key)!;
        const oldHex = snap.exists ? (snap.data() as { hex?: unknown }).hex : null;
        let hex = typeof oldHex === "string" && oldHex.length === EMPTY_CHUNK_HEX.length
          ? oldHex
          : EMPTY_CHUNK_HEX;
        for (const edit of edits) {
          hex = replaceNibble(hex, localIndex(edit.lx, edit.ly), edit.color);
        }
        if (snap.exists) {
          tx.update(ref, {
            hex,
            v: FieldValue.increment(1),
            updatedAt: FieldValue.serverTimestamp(),
          });
          chunkVersions[key] = ((snap.data() as { v?: number }).v ?? 0) + 1;
        } else {
          tx.set(ref, {
            hex,
            v: 1,
            updatedAt: FieldValue.serverTimestamp(),
          });
          chunkVersions[key] = 1;
        }
      }

      const profile: UserProfile = {
        uid: authed.uid,
        displayName: userData.displayName,
        photoURL: userData.photoURL ?? null,
        createdAt: tsToMs(userData.createdAt),
        pixelsPainted: userData.pixelsPainted + pixels.length,
        exp: progress.exp,
        level: progress.level,
        maxQuota: progress.maxQuota,
        currentQuota: progress.currentQuota,
        lastQuotaRestoreAt: restored.lastQuotaRestoreAtMs,
      };

      return { profile, chunkVersions, leveledUp: progress.leveledUp, painted: pixels.length };
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof OutOfQuotaError) {
      return NextResponse.json({ error: "out_of_quota" }, { status: 429 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};

export { POST };
