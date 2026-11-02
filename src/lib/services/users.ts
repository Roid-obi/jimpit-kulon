import {
  collection,
  getDocs,
  getFirestore,
  orderBy,
  query,
} from "firebase/firestore";
import { app } from "@/lib/firebase/client";

const db = getFirestore(app);
const usersCol = collection(db, "users");

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "petugas" | "warga";
  isActive: boolean;
  emailVerified?: boolean;
  createdAt?: { toDate?: () => Date } | null;
  updatedAt?: { toDate?: () => Date } | null;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: "admin" | "petugas" | "warga";
  isActive?: boolean;
}

export interface UpdateUserInput {
  targetUserId: string;
  name?: string;
  role?: "admin" | "petugas" | "warga";
  isActive?: boolean;
  password?: string;
}

export async function getUsers(): Promise<AppUser[]> {
  const q = query(usersCol, orderBy("name", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...doc.data(),
      }) as AppUser
  );
}

// Client helper for Admin API calls with Firebase ID Token
async function requestAdminApi(
  getIdToken: () => Promise<string>,
  method: "POST" | "PATCH" | "DELETE",
  bodyOrParams?: Record<string, unknown> | string
) {
  const token = await getIdToken();
  if (!token) {
    throw new Error("Token autentikasi tidak tersedia. Silakan login kembali.");
  }

  let url = "/api/admin/users";
  const init: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };

  if (method === "DELETE" && typeof bodyOrParams === "string") {
    url += `?targetUserId=${encodeURIComponent(bodyOrParams)}`;
  } else if (bodyOrParams && typeof bodyOrParams === "object") {
    init.body = JSON.stringify(bodyOrParams);
  }

  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Permintaan gagal dengan status ${res.status}`);
  }

  return data;
}

export async function createAdminUser(
  getIdToken: () => Promise<string>,
  input: CreateUserInput
): Promise<void> {
  await requestAdminApi(getIdToken, "POST", input as unknown as Record<string, unknown>);
}

export async function updateAdminUser(
  getIdToken: () => Promise<string>,
  input: UpdateUserInput
): Promise<void> {
  await requestAdminApi(getIdToken, "PATCH", input as unknown as Record<string, unknown>);
}

export async function deleteAdminUser(
  getIdToken: () => Promise<string>,
  targetUserId: string
): Promise<void> {
  await requestAdminApi(getIdToken, "DELETE", targetUserId);
}
