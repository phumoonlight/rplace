import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const ADMIN_APP_NAME = "rplace-admin";
const KEY_FILE_RELATIVE = "keys/firebase-adminsdk.json";

type ServiceAccountFile = {
  project_id?: unknown;
  client_email?: unknown;
  private_key?: unknown;
};

// Prefer keys/firebase-adminsdk.json (the raw service-account JSON download) so
// local dev doesn't have to deal with \n-escaping the private key into env. The
// file is gitignored via /keys/*.json; production uses env vars instead.
const readServiceAccountFile = (): ServiceAccountFile | null => {
  try {
    const filePath = join(process.cwd(), KEY_FILE_RELATIVE);
    return JSON.parse(readFileSync(filePath, "utf8")) as ServiceAccountFile;
  } catch {
    return null;
  }
};

const pickString = (v: unknown): string | undefined =>
  typeof v === "string" && v.length > 0 ? v : undefined;

const buildCredentials = () => {
  const fromFile = readServiceAccountFile();
  const projectId = pickString(fromFile?.project_id) ?? process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = pickString(fromFile?.client_email) ?? process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const rawKey = pickString(fromFile?.private_key) ?? process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !rawKey) {
    throw new Error(
      `Firebase Admin SDK credentials missing. Provide ${KEY_FILE_RELATIVE} OR set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY env vars.`,
    );
  }

  return {
    projectId,
    clientEmail,
    privateKey: rawKey.replace(/\\n/g, "\n"),
  };
};

export const getAdminApp = (): App => {
  const existing = getApps().find((a) => a.name === ADMIN_APP_NAME);
  if (existing) return getApp(ADMIN_APP_NAME);

  const credentials = buildCredentials();
  return initializeApp(
    {
      credential: cert(credentials),
    },
    ADMIN_APP_NAME,
  );
};

export const getAdminAuth = (): Auth => getAuth(getAdminApp());

export const getAdminDb = (): Firestore => getFirestore(getAdminApp());
