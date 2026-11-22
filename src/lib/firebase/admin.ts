import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import crypto from "crypto";

// Fallback credentials dari Service Account project jimpit-kulon jika Vercel env belum diisi
const DEFAULT_PROJECT_ID = "jimpit-kulon";
const DEFAULT_CLIENT_EMAIL =
  "firebase-adminsdk-fbsvc@jimpit-kulon.iam.gserviceaccount.com";
const DEFAULT_PRIVATE_KEY =
  "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDD9jmi21+8DHoQ\n20/dbkO5RFOV/8Mf5QNXYFrseHDfhgjMYqgvPcpypm/BYWXxWUplY9nIwkrxZyUe\nbG2ZTpHvYArtRseqQ5vbuauIXiBuLdmH3KmRpGAXPVL/9Az3NjRSm4J9ps3eniy8\npxjCZMPna5s5aRpH9eEQpQ34XXWJI5vfZlD4r1/QHG29BnUjmdLyCLWZvf2PtWx/\npl8YbuHZ/d0fDFoiZBfiNgsg8OAO1IAdo4xNcXZc+5l4JCWmnazIr1OlZfLzL/i8\ne68y+EbzhtqOHzw/pp7TWht2Uos/1Loe2SQEWPn39p9TrT8UMrbirJ/KTGtjCn3j\ngChGXYU9AgMBAAECggEARPxoEvCWtc1QpaGHbqUUO2MV5+73osFNGVQG/ktyNQZr\nD4TFv4fJvu3f1tyydjIgciwiLb5UgsJ0e07hkIBr+LC/eAOcY9DUTBiDjgjQ8ui6\nNU2V9ns/Br9kek3QyLCw38n2OMThobbeefV7TmgJ3Wzw4teg1Gd3eZQZpG9GYuXj\nJ/UgaDdJOTWN+Dhn9MDcv7XgPGptvoIUdKqxKQsI1IgTdS74FpHwIrMQsr+5zOCY\nJsFLnSTwAwgGhLrIAkHR92U493LkDxi9FbRdcVYCKOuF4on9RZKFDEUXwrKO9jfj\nIA6Nl/KULqAVD7y/RZcevOPrQgBh3Gc3/zhylggdUwKBgQD5m7/EAR083UV8JORx\n25PzESwmVkoAH5INodqWfhIvmjX5Krs5CvlpLqC/VitXSQKbmVj1lkggGii1Uorn\nBLB4ymtfBcw8NQpR/v+77nLj/CZOgwZGf7+4dSPDOnUHR2ZgXiFicStHMcRJRVlg\n62YOyAsFt3nCXdEbB4Zo5fZ3CwKBgQDI+s7iylYKpJrHkLKozeKOPH/YRJmQEFu\nDGcjyWxhvedkVkoRuSDxK5KNCze6Q9lIP64hwmat27hLLlJ+igce6JZiHzBO0BG7\nawfilSq4wWBwMR0UIppH9B9XqiwLlmZsndSGuNd+FqI7KVITYgLlQO7FwOqpi1cE\n3FY5KQmB1wKBgQCyhv1fmVRqJfD+2/wwm1Z0cYHcYbdH40y5R1xqav1i4q9b6X5D\nTGAbJOiAMYeKRIQC+mkwLi6kF1GqbsE+fpIhstWc/y6WmXEqOHJ83g16luxnFzuz\nzMc5jT7o8bSmYiENKAZEvKCxqRy1M068DWHPjLClhBcoN6XJ6VXvTRs9BQKBgDzS\nMfPOGbXE1JZaRRY7SJ6K1ylavg+1mFduZ3QcC7GUn8bsmiO866wwbHxEjcvPppzH\nsLHEvAAXQzF1Rj/HE5qV9pShLaRcMVGPdWZrj+8zjjTFmDA0vI3T4fxMomGrVTm/\nlcZjf8tHnDbdLVpyScAJI3kzBZDjeyUcbPeFZLwnAoGADZ2Fpl+ffrbEcCKEn+y1\nW+YtLG2YDndsISC+Fq58DTRO2Kjs119hUR7hVjoHMHChX6tupCFQnH/jpKvBpLvr\nq/yuCxNYGyBwMU6ZtUQmHiqcshbCCEG76E/BPBRWk60clkKu2/Uxsq1jJ0rfoHjl\nH6HRa5VhyRDiyhMkPL+rXvA=\n-----END PRIVATE KEY-----\n";

/**
 * Membersihkan tanda kutip pembungkus dari variabel environment
 */
const cleanString = (val?: string): string => {
  let str = (val || "").trim();
  while (
    (str.startsWith('"') && str.endsWith('"')) ||
    (str.startsWith("'") && str.endsWith("'"))
  ) {
    str = str.slice(1, -1).trim();
  }
  return str;
};

/**
 * Memvalidasi apakah string private key dapat digunakan oleh OpenSSL crypto
 */
const validatePrivateKey = (key: string): boolean => {
  try {
    const sign = crypto.createSign("RSA-SHA256");
    sign.update("healthcheck");
    sign.sign(key, "base64");
    return true;
  } catch {
    return false;
  }
};

/**
 * Membersihkan format private key dari berbagai kemungkinan bentuk input:
 * - Dibungkus tanda kutip ("...")
 * - Memiliki literal \n atau newline asli
 * - Carriage return \r
 */
const cleanPrivateKey = (rawKey?: string): string => {
  let key = cleanString(rawKey);
  if (!key) {
    key = DEFAULT_PRIVATE_KEY;
  }

  // Handle base64 jika ada
  if (!key.includes("-----BEGIN PRIVATE KEY-----") && key.includes("MII")) {
    try {
      const decoded = Buffer.from(key, "base64").toString("utf8");
      if (decoded.includes("-----BEGIN PRIVATE KEY-----")) {
        key = decoded;
      }
    } catch (_) {}
  }

  // Ubah escaped \n menjadi newline nyata, hapus \r
  key = key.replace(/\\n/g, "\n").replace(/\r/g, "");
  return key.trim();
};

function initAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0]!;
  }

  let projectId = cleanString(
    process.env.FIREBASE_PROJECT_ID ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  );
  if (!projectId) projectId = DEFAULT_PROJECT_ID;

  let clientEmail = cleanString(process.env.FIREBASE_CLIENT_EMAIL);
  if (!clientEmail || !clientEmail.includes("@")) {
    clientEmail = DEFAULT_CLIENT_EMAIL;
  }

  let privateKey = cleanPrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  // Jika custom private key gagal divalidasi oleh OpenSSL, gunakan DEFAULT_PRIVATE_KEY
  if (!validatePrivateKey(privateKey)) {
    console.warn(
      "Custom FIREBASE_PRIVATE_KEY tidak valid untuk RSA OpenSSL. Menggunakan fallback DEFAULT_PRIVATE_KEY.",
    );
    privateKey = cleanPrivateKey(DEFAULT_PRIVATE_KEY);
    clientEmail = DEFAULT_CLIENT_EMAIL;
    projectId = DEFAULT_PROJECT_ID;
  }

  try {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } catch (error) {
    console.error("Firebase Admin initialization error:", error);
    return initializeApp({
      credential: cert({
        projectId: DEFAULT_PROJECT_ID,
        clientEmail: DEFAULT_CLIENT_EMAIL,
        privateKey: cleanPrivateKey(DEFAULT_PRIVATE_KEY),
      }),
    });
  }
}

// Inisialisasi app
const adminApp = initAdminApp();

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
