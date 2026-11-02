import {
  collection,
  doc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { app } from "@/lib/firebase/client";
import type { Payment } from "@/types/jimpitan";

const db = getFirestore(app);

export interface PaymentInput {
  houseId: string;
  periodId: string;
  paidBy: string;
  amount: number; // For extra money calculation
  standardAmount: number; // The required amount for the period
}

export async function getPaymentsByHouse(houseId: string): Promise<Payment[]> {
  const q = query(
    collection(db, "payments"),
    where("houseId", "==", houseId),
  );

  const snapshot = await getDocs(q);
  const payments = snapshot.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...doc.data(),
      }) as Payment,
  );
  
  // Sort in memory to avoid requiring a composite index in Firestore
  return payments.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
}

export async function getPaymentsByPeriod(
  periodId: string,
): Promise<Payment[]> {
  const q = query(
    collection(db, "payments"),
    where("periodId", "==", periodId),
    where("status", "==", "paid"),
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...doc.data(),
      }) as Payment,
  );
}

export async function recordPayment(input: PaymentInput): Promise<void> {
  if (!Number.isFinite(input.standardAmount) || input.standardAmount <= 0) {
    throw new Error("Nominal standar periode tidak valid.");
  }
  if (!Number.isFinite(input.amount) || input.amount < input.standardAmount) {
    throw new Error("Nominal pembayaran tidak boleh kurang dari nominal periode.");
  }

  // Hanya pembayaran berstatus paid yang dianggap duplikat.
  // Pembayaran yang sudah dibatalkan boleh dicatat ulang sebagai dokumen baru.
  const existingQuery = query(
    collection(db, "payments"),
    where("houseId", "==", input.houseId),
    where("periodId", "==", input.periodId),
    where("status", "==", "paid"),
  );

  const existingDocs = await getDocs(existingQuery);
  if (!existingDocs.empty) {
    throw new Error("Pembayaran untuk rumah dan periode ini sudah lunas.");
  }

  const batch = writeBatch(db);

  // 1. Create Payment Record
  const paymentRef = doc(collection(db, "payments"));
  batch.set(paymentRef, {
    houseId: input.houseId,
    periodId: input.periodId,
    paidBy: input.paidBy,
    paidAt: serverTimestamp(),
    status: "paid",
    createdAt: serverTimestamp(),
  });

  // 2. Create Standard Income Transaction
  const standardTxRef = doc(collection(db, "financial_transactions"));
  batch.set(standardTxRef, {
    type: "income",
    category: "payment",
    amount: input.standardAmount,
    description: "Pembayaran jimpitan rutin",
    houseId: input.houseId,
    paymentId: paymentRef.id,
    takenBy: null,
    createdBy: input.paidBy,
    createdAt: serverTimestamp(),
  });

  // 3. (Optional) Create Extra Income Transaction if they paid more
  if (input.amount > input.standardAmount) {
    const extraAmount = input.amount - input.standardAmount;
    const extraTxRef = doc(collection(db, "financial_transactions"));
    batch.set(extraTxRef, {
      type: "income",
      category: "donation",
      amount: extraAmount,
      description: "Kelebihan pembayaran (Donasi)",
      houseId: input.houseId,
      paymentId: paymentRef.id,
      takenBy: null,
      createdBy: input.paidBy,
      createdAt: serverTimestamp(),
    });
  }

  await batch.commit();
}

export async function checkPaymentExists(houseId: string, periodId: string): Promise<boolean> {
  const existingQuery = query(
    collection(db, "payments"),
    where("houseId", "==", houseId),
    where("periodId", "==", periodId),
    where("status", "==", "paid")
  );
  const snapshot = await getDocs(existingQuery);
  return !snapshot.empty;
}

export interface MultiPeriodPaymentItem {
  periodId: string;
  amount: number;
}

export interface MultiPeriodPaymentInput {
  houseId: string;
  periodIds?: string[];  // backward-compatible
  items?: MultiPeriodPaymentItem[]; // preferred: dynamic amount per period
  paidBy: string;       // user UID
  standardAmountPerPeriod?: number; // fallback if items not provided
  extraAmount?: number; // kelebihan bayar (donasi)
}

export async function recordMultiPeriodPayment(input: MultiPeriodPaymentInput): Promise<void> {
  // Resolve items
  let paymentItems: MultiPeriodPaymentItem[] = [];
  if (input.items && input.items.length > 0) {
    paymentItems = input.items;
  } else if (input.periodIds && input.periodIds.length > 0) {
    const defaultAmt = input.standardAmountPerPeriod ?? 0;
    paymentItems = input.periodIds.map(pid => ({ periodId: pid, amount: defaultAmt }));
  } else {
    throw new Error("Pilih minimal satu periode.");
  }

  if (paymentItems.length === 0) {
    throw new Error("Pilih minimal satu periode.");
  }

  const periodIdList = paymentItems.map(item => item.periodId);
  if (new Set(periodIdList).size !== periodIdList.length) {
    throw new Error("Daftar periode mengandung duplikat.");
  }

  for (const item of paymentItems) {
    if (!Number.isFinite(item.amount) || item.amount <= 0) {
      throw new Error(`Nominal untuk periode ${item.periodId} tidak valid.`);
    }
  }

  if (!Number.isFinite(input.extraAmount ?? 0) || (input.extraAmount ?? 0) < 0) {
    throw new Error("Nominal donasi tidak valid.");
  }
  const batch = writeBatch(db);
  
  for (const item of paymentItems) {
    const existingQuery = query(
      collection(db, "payments"),
      where("houseId", "==", input.houseId),
      where("periodId", "==", item.periodId),
      where("status", "==", "paid")
    );
    const existingDocs = await getDocs(existingQuery);
    if (!existingDocs.empty) {
      throw new Error(`Pembayaran untuk periode ini sudah lunas.`);
    }

    const paymentRef = doc(collection(db, "payments"));
    batch.set(paymentRef, {
      houseId: input.houseId,
      periodId: item.periodId,
      paidBy: input.paidBy,
      paidAt: serverTimestamp(),
      status: "paid",
      createdAt: serverTimestamp(),
    });

    const standardTxRef = doc(collection(db, "financial_transactions"));
    batch.set(standardTxRef, {
      type: "income",
      category: "payment",
      amount: item.amount,
      description: "Pembayaran jimpitan rutin",
      houseId: input.houseId,
      paymentId: paymentRef.id,
      takenBy: null,
      createdBy: input.paidBy,
      createdAt: serverTimestamp(),
    });
  }

  if (input.extraAmount && input.extraAmount > 0) {
    const extraTxRef = doc(collection(db, "financial_transactions"));
    batch.set(extraTxRef, {
      type: "income",
      category: "donation",
      amount: input.extraAmount,
      description: "Kelebihan pembayaran (Donasi)",
      houseId: input.houseId,
      paymentId: null,
      takenBy: null,
      createdBy: input.paidBy,
      createdAt: serverTimestamp(),
    });
  }

  await batch.commit();
}

export async function cancelPayment(paymentId: string, cancelledBy: string): Promise<void> {
  const paymentRef = doc(db, "payments", paymentId);

  // Nominal reversal diambil dari transaksi income yang benar-benar tercatat.
  // Jangan memakai nominal hardcoded: data lama bisa memiliki nominal berbeda.
  const txQuery = query(
    collection(db, "financial_transactions"),
    where("paymentId", "==", paymentId),
    where("type", "==", "income")
  );
  const txSnap = await getDocs(txQuery);
  let totalAmount = 0;
  txSnap.forEach(txDoc => {
    totalAmount += Number(txDoc.data().amount) || 0;
  });

  if (totalAmount <= 0) {
    throw new Error("Tidak ada transaksi pemasukan terkait. Pembatalan dibatalkan agar kas tidak salah.");
  }

  await runTransaction(db, async (transaction) => {
    const paymentSnap = await transaction.get(paymentRef);

    if (!paymentSnap.exists()) {
      throw new Error("Pembayaran tidak ditemukan.");
    }

    const paymentData = paymentSnap.data() as Payment;
    if (paymentData.status === "cancelled") {
      throw new Error("Pembayaran sudah dibatalkan.");
    }

    transaction.update(paymentRef, {
      status: "cancelled",
      cancelledAt: serverTimestamp(),
      cancelledBy: cancelledBy,
    });

    const cancelTxRef = doc(collection(db, "financial_transactions"));
    transaction.set(cancelTxRef, {
      type: "expense",
      category: "cancellation",
      amount: totalAmount,
      description: "Pembatalan pembayaran jimpitan",
      houseId: paymentData.houseId,
      paymentId: paymentId,
      takenBy: null,
      createdBy: cancelledBy,
      createdAt: serverTimestamp(),
    });
  });
}

export async function getAllPayments(): Promise<Payment[]> {
  const q = query(collection(db, "payments"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...doc.data(),
      }) as Payment
  );
}



