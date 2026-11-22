import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const formatPrivateKey = (key: string) => {
  return key.replace(/\\n/g, "\n");
};

function getAdminApp(): App | null {
  if (getApps().length > 0) {
    return getApps()[0]!;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  try {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: formatPrivateKey(privateKey),
      }),
    });
  } catch (error) {
    console.error("Firebase Admin initialization error:", error);
    return null;
  }
}

export const adminAuth: Auth = new Proxy({} as Auth, {
  get(_, prop) {
    const app = getAdminApp();
    if (!app) {
      throw new Error(
        "Firebase Admin credentials belum dikonfigurasi di Environment Variables.",
      );
    }
    const auth = getAuth(app);
    const value = (auth as any)[prop];
    return typeof value === "function" ? value.bind(auth) : value;
  },
});

export const adminDb: Firestore = new Proxy({} as Firestore, {
  get(_, prop) {
    const app = getAdminApp();
    if (!app) {
      throw new Error(
        "Firebase Admin credentials belum dikonfigurasi di Environment Variables.",
      );
    }
    const db = getFirestore(app);
    const value = (db as any)[prop];
    return typeof value === "function" ? value.bind(db) : value;
  },
});
