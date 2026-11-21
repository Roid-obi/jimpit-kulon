import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { app } from "@/lib/firebase/client";
import type { House } from "@/types/jimpitan";

const db = getFirestore(app);
const housesCol = collection(db, "houses");

export async function getHouses(): Promise<House[]> {
  const q = query(housesCol, orderBy("houseNumber", "asc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...doc.data(),
      }) as House,
  );
}

export async function getHouseById(id: string): Promise<House | null> {
  const docRef = doc(db, "houses", id);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) return null;

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as House;
}

export async function addHouse(
  data: Omit<House, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const docRef = await addDoc(housesCol, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function updateHouse(
  id: string,
  data: Partial<Omit<House, "id" | "createdAt" | "updatedAt">>,
): Promise<void> {
  const docRef = doc(db, "houses", id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}
