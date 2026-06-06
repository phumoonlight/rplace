import "server-only";
import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const ADMIN_APP_NAME = "rplace-admin";

const buildCredentials = () => {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const rawKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !rawKey) {
    throw new Error(
      "Firebase Admin SDK env vars missing. Required: FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY.",
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
