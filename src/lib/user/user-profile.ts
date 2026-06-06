export { INITIAL_LEVEL, INITIAL_MAX_QUOTA } from "@/lib/leveling";

export type UserProfile = {
  uid: string;
  displayName: string;
  photoURL: string | null;
  createdAt: number;
  pixelsPainted: number;
  exp: number;
  level: number;
  maxQuota: number;
  currentQuota: number;
  lastQuotaRestoreAt: number;
};
