import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
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
  createdAt?: any;
  updatedAt?: any;
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

export async function addUser(
  data: Omit<AppUser, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const newDocRef = doc(usersCol);
  await setDoc(newDocRef, {
    ...data,
    emailVerified: data.emailVerified ?? true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return newDocRef.id;
}

export async function updateUser(
  id: string,
  data: Partial<Omit<AppUser, "id" | "createdAt" | "updatedAt">>
): Promise<void> {
  const docRef = doc(db, "users", id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteUser(id: string): Promise<void> {
  const docRef = doc(db, "users", id);
  await deleteDoc(docRef);
}
