import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
  updateDoc,
} from "firebase/firestore";
import { app } from "@/lib/firebase/client";
import type { Period } from "@/types/jimpitan";

const db = getFirestore(app);
const periodsCol = collection(db, "periods");

export async function getPeriods(): Promise<Period[]> {
  const q = query(periodsCol, orderBy("startDate", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...doc.data(),
      }) as Period,
  );
}

export async function getActivePeriod(): Promise<Period | null> {
  const q = query(periodsCol, where("status", "==", "active"), orderBy("startDate", "desc"), limit(1));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  return {
    id: snapshot.docs[0].id,
    ...snapshot.docs[0].data(),
  } as Period;
}

export async function addPeriod(
  data: Omit<Period, "id" | "createdAt">,
): Promise<string> {
  const docRef = await addDoc(periodsCol, {
    ...data,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function archivePeriod(id: string): Promise<void> {
  const docRef = doc(db, "periods", id);
  await updateDoc(docRef, {
    status: "archived"
  });
}
