import "server-only";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getAdminAuth } from "@/lib/firebase/admin";

export type AuthedUser = {
  uid: string;
  email: string | null;
  name: string | null;
  picture: string | null;
};

export const verifyIdToken = async (token: string | null): Promise<DecodedIdToken | null> => {
  if (!token) return null;
  try {
    return await getAdminAuth().verifyIdToken(token);
  } catch {
    return null;
  }
};

export const extractBearer = (authorizationHeader: string | null): string | null => {
  if (!authorizationHeader) return null;
  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
};

export const authedUserFromRequest = async (request: Request): Promise<AuthedUser | null> => {
  const token = extractBearer(request.headers.get("authorization"));
  const decoded = await verifyIdToken(token);
  if (!decoded) return null;
  return {
    uid: decoded.uid,
    email: decoded.email ?? null,
    name: (decoded.name as string | undefined) ?? null,
    picture: (decoded.picture as string | undefined) ?? null,
  };
};
