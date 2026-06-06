import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import {
  INITIAL_LEVEL,
  INITIAL_MAX_QUOTA,
  type UserProfile,
} from "@/lib/user/user-profile";

type FirestoreUserDoc = {
  uid: string;
  displayName: string;
  photoURL: string | null;
  createdAt: Timestamp;
  pixelsPainted: number;
  exp: number;
  level: number;
  maxQuota: number;
  currentQuota: number;
  lastQuotaRestoreAt: Timestamp;
};

export const newUserDoc = (input: {
  uid: string;
  displayName: string;
  photoURL: string | null;
}) => ({
  uid: input.uid,
  displayName: input.displayName,
  photoURL: input.photoURL,
  createdAt: FieldValue.serverTimestamp(),
  pixelsPainted: 0,
  exp: 0,
  level: INITIAL_LEVEL,
  maxQuota: INITIAL_MAX_QUOTA,
  currentQuota: INITIAL_MAX_QUOTA,
  lastQuotaRestoreAt: FieldValue.serverTimestamp(),
});

const toMillis = (value: Timestamp | undefined | null): number => {
  if (!value) return Date.now();
  return value.toMillis();
};

export const serializeUserDoc = (raw: FirestoreUserDoc): UserProfile => ({
  uid: raw.uid,
  displayName: raw.displayName,
  photoURL: raw.photoURL ?? null,
  createdAt: toMillis(raw.createdAt),
  pixelsPainted: raw.pixelsPainted ?? 0,
  exp: raw.exp ?? 0,
  level: raw.level ?? INITIAL_LEVEL,
  maxQuota: raw.maxQuota ?? INITIAL_MAX_QUOTA,
  currentQuota: raw.currentQuota ?? INITIAL_MAX_QUOTA,
  lastQuotaRestoreAt: toMillis(raw.lastQuotaRestoreAt),
});
