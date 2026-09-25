import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  orderBy,
  query,
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
  // Check if payment already exists for this house and period
  const existingQuery = query(
    collection(db, "payments"),
    where("houseId", "==", input.houseId),
    where("periodId", "==", input.periodId),
  );

  const existingDocs = await getDocs(existingQuery);
  if (!existingDocs.empty) {
    throw new Error("Payment already recorded for this period.");
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

export interface MultiPeriodPaymentInput {
  houseId: string;
  periodIds: string[];  // bisa 1 atau lebih periode
  paidBy: string;       // user UID
  standardAmountPerPeriod: number; // nominal per periode
  extraAmount?: number; // kelebihan bayar (donasi)
}

export async function recordMultiPeriodPayment(input: MultiPeriodPaymentInput): Promise<void> {
  const batch = writeBatch(db);
  
  for (const periodId of input.periodIds) {
    const existingQuery = query(
      collection(db, "payments"),
      where("houseId", "==", input.houseId),
      where("periodId", "==", periodId),
      where("status", "==", "paid")
    );
    const existingDocs = await getDocs(existingQuery);
    if (!existingDocs.empty) {
      throw new Error(`Payment already recorded for period ${periodId}.`);
    }

    const paymentRef = doc(collection(db, "payments"));
    batch.set(paymentRef, {
      houseId: input.houseId,
      periodId: periodId,
      paidBy: input.paidBy,
      paidAt: serverTimestamp(),
      status: "paid",
      createdAt: serverTimestamp(),
    });

    const standardTxRef = doc(collection(db, "financial_transactions"));
    batch.set(standardTxRef, {
      type: "income",
      category: "payment",
      amount: input.standardAmountPerPeriod,
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
  const paymentSnap = await getDoc(paymentRef);

  if (!paymentSnap.exists()) {
    throw new Error("Payment not found");
  }

  const paymentData = paymentSnap.data() as Payment;
  if (paymentData.status === "cancelled") {
    throw new Error("Payment already cancelled");
  }
  
  const txQuery = query(
    collection(db, "financial_transactions"),
    where("paymentId", "==", paymentId),
    where("type", "==", "income")
  );
  const txSnap = await getDocs(txQuery);
  let totalAmount = 0;
  txSnap.forEach(txDoc => {
    totalAmount += txDoc.data().amount;
  });

  const batch = writeBatch(db);

  batch.update(paymentRef, {
    status: "cancelled",
    cancelledAt: serverTimestamp(),
    cancelledBy: cancelledBy,
  });

  const cancelTxRef = doc(collection(db, "financial_transactions"));
  batch.set(cancelTxRef, {
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

  await batch.commit();
}
