import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { authedUserFromRequest } from "@/lib/auth/verify-id-token";
import {
  CANVAS_DIMENSIONS,
  ORIENTATIONS,
  PALETTE_SIZE,
  type Orientation,
} from "@/lib/canvas/constants";
import { chunkKey, pixelToChunk } from "@/lib/canvas/coords";
import { EMPTY_CHUNK_HEX, localIndex } from "@/lib/canvas/chunks";
import { applyPaintProgress, restoreQuota } from "@/lib/leveling";
import type { UserProfile } from "@/lib/user/user-profile";

type PaintRequestBody = {
  orientation?: unknown;
  x?: unknown;
  y?: unknown;
  color?: unknown;
};

type PaintInput = {
  orientation: Orientation;
  x: number;
  y: number;
  color: number;
};

const parseBody = (body: PaintRequestBody): PaintInput | { error: string } => {
  const { orientation, x, y, color } = body;
  if (typeof orientation !== "string" || !ORIENTATIONS.includes(orientation as Orientation)) {
    return { error: "Invalid orientation" };
  }
  const o = orientation as Orientation;
  const { width, height } = CANVAS_DIMENSIONS[o];
  if (typeof x !== "number" || !Number.isInteger(x) || x < 0 || x >= width) {
    return { error: "Invalid x" };
  }
  if (typeof y !== "number" || !Number.isInteger(y) || y < 0 || y >= height) {
    return { error: "Invalid y" };
  }
  if (typeof color !== "number" || !Number.isInteger(color) || color < 0 || color >= PALETTE_SIZE) {
    return { error: "Invalid color" };
  }
  return { orientation: o, x, y, color };
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
  chunkVersion: number;
  leveledUp: boolean;
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

  const { orientation, x, y, color } = parsed;
  const { cx, cy, lx, ly } = pixelToChunk(x, y);
  const key = chunkKey(cy, cx);

  const db = getAdminDb();
  const userRef = db.collection("users").doc(authed.uid);
  const chunkRef = db
    .collection("canvas")
    .doc(orientation)
    .collection("chunks")
    .doc(key);

  try {
    const result = await db.runTransaction<PaintResult>(async (tx) => {
      const [userSnap, chunkSnap] = await Promise.all([tx.get(userRef), tx.get(chunkRef)]);
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

      if (restored.currentQuota <= 0) {
        throw new OutOfQuotaError();
      }

      const progress = applyPaintProgress({
        exp: userData.exp,
        level: userData.level,
        maxQuota: userData.maxQuota,
        currentQuota: restored.currentQuota,
      });

      const oldHex = (chunkSnap.exists ? (chunkSnap.data() as { hex?: unknown }).hex : null);
      const baseHex = typeof oldHex === "string" && oldHex.length === EMPTY_CHUNK_HEX.length
        ? oldHex
        : EMPTY_CHUNK_HEX;
      const newHex = replaceNibble(baseHex, localIndex(lx, ly), color);

      const lastQuotaRestoreAtTs = Timestamp.fromMillis(restored.lastQuotaRestoreAtMs);

      tx.update(userRef, {
        pixelsPainted: FieldValue.increment(1),
        exp: progress.exp,
        level: progress.level,
        maxQuota: progress.maxQuota,
        currentQuota: progress.currentQuota,
        lastQuotaRestoreAt: lastQuotaRestoreAtTs,
      });

      if (chunkSnap.exists) {
        tx.update(chunkRef, {
          hex: newHex,
          v: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        tx.set(chunkRef, {
          hex: newHex,
          v: 1,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      const profile: UserProfile = {
        uid: authed.uid,
        displayName: userData.displayName,
        photoURL: userData.photoURL ?? null,
        createdAt: tsToMs(userData.createdAt),
        pixelsPainted: userData.pixelsPainted + 1,
        exp: progress.exp,
        level: progress.level,
        maxQuota: progress.maxQuota,
        currentQuota: progress.currentQuota,
        lastQuotaRestoreAt: restored.lastQuotaRestoreAtMs,
      };

      const chunkVersion = chunkSnap.exists
        ? ((chunkSnap.data() as { v?: number }).v ?? 0) + 1
        : 1;

      return { profile, chunkVersion, leveledUp: progress.leveledUp };
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
