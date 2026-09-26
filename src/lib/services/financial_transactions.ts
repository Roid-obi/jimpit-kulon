import {
  addDoc,
  collection,
  getDocs,
  getFirestore,
  orderBy,
  query,
  serverTimestamp,
  where,
  Timestamp,
} from "firebase/firestore";
import { app } from "@/lib/firebase/client";
import type { FinancialTransaction } from "@/types/jimpitan";

const db = getFirestore(app);

// Interface untuk summary keuangan
export interface FinancialSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

// Interface untuk input pemasukan manual
export interface IncomeInput {
  category: "payment" | "donation" | "other";
  amount: number;
  description: string;
  houseId?: string | null;
  createdBy: string;
}

// Interface untuk input pengeluaran
export interface ExpenseInput {
  category: string;
  amount: number;
  description: string;
  takenBy: string;
  notes?: string;
  createdBy: string;
}

// Ambil semua transaksi (dengan filter opsional)
export async function getTransactions(
  filter?: "income" | "expense"
): Promise<FinancialTransaction[]> {
  const transactionsCol = collection(db, "financial_transactions");
  // Fetch semua transaksi sorted by createdAt, filter type client-side
  // untuk menghindari composite index requirement (where+orderBy pada field berbeda)
  const q = query(transactionsCol, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  const all = snapshot.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...doc.data(),
      }) as FinancialTransaction
  );

  if (filter) {
    return all.filter((tx) => tx.type === filter);
  }
  return all;
}

// Hitung ringkasan keuangan
export async function getFinancialSummary(): Promise<FinancialSummary> {
  // We can fetch all transactions to calculate summary
  // In a real app with large data, this should be done with aggregations or cloud functions
  const transactions = await getTransactions();
  
  let totalIncome = 0;
  let totalExpense = 0;

  for (const tx of transactions) {
    if (tx.type === "income") {
      totalIncome += tx.amount;
    } else if (tx.type === "expense") {
      totalExpense += tx.amount;
    }
  }

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
  };
}

// Ambil transaksi terbaru (untuk dashboard)
export async function getRecentTransactions(
  limitCount: number = 5
): Promise<FinancialTransaction[]> {
  const transactionsCol = collection(db, "financial_transactions");
  const q = query(transactionsCol, orderBy("createdAt", "desc"));
  
  // Note: Firestore doesn't have a direct limit on query if we want just the snapshot docs directly with limit()
  // But we can just use the regular query and slice, or use `limit` from firestore.
  // We should import limit from firestore. But we can also just fetch and slice for simplicity if we didn't import limit.
  // Better to use getTransactions and slice.
  const transactions = await getTransactions();
  return transactions.slice(0, limitCount);
}

// Tambah pemasukan manual
export async function addIncome(input: IncomeInput): Promise<void> {
  const transactionsCol = collection(db, "financial_transactions");
  await addDoc(transactionsCol, {
    type: "income",
    category: input.category,
    amount: input.amount,
    description: input.description,
    houseId: input.houseId || null,
    paymentId: null,
    takenBy: null,
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
  });
}

// Tambah pengeluaran
export async function addExpense(input: ExpenseInput): Promise<void> {
  const transactionsCol = collection(db, "financial_transactions");
  await addDoc(transactionsCol, {
    type: "expense",
    category: input.category,
    amount: input.amount,
    description: input.description,
    houseId: null,
    paymentId: null,
    takenBy: input.takenBy,
    notes: input.notes || null,
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
  });
}
