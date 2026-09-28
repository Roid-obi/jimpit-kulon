import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const formatPrivateKey = (key: string) => {
  return key.replace(/\\n/g, "\n");
};

if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY
          ? formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY)
          : undefined,
      }),
    });
    console.log("Firebase Admin initialized successfully.");
  } catch (error) {
    console.error("Firebase Admin initialization error", error);
  }
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();
