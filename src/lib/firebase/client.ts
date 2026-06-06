import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const getFirebaseApp = (): FirebaseApp => {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
};

export const getFirebaseAuth = (): Auth => getAuth(getFirebaseApp());

export const getFirebaseDb = (): Firestore => getFirestore(getFirebaseApp());

export const googleProvider = new GoogleAuthProvider();
