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

export const INITIAL_LEVEL = 1;
export const INITIAL_MAX_QUOTA = 10;
