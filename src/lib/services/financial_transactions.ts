import {
  addDoc,
  collection,
  getDocs,
  getFirestore,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { app } from "@/lib/firebase/client";
import type { FinancialTransaction } from "@/types/jimpitan";

const db = getFirestore(app);

// Interface untuk summary keuangan dengan rincian reversal pembatalan
export interface FinancialSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  jimpitanIncome: number;
  donationIncome: number;
  cancellationExpense: number;
  operationalExpense: number;
  netJimpitan: number;
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
  const transactions = await getTransactions();
  
  let totalIncome = 0;
  let totalExpense = 0;
  let jimpitanIncome = 0;
  let donationIncome = 0;
  let cancellationExpense = 0;
  let operationalExpense = 0;

  for (const tx of transactions) {
    const category = (tx.category || "").toLowerCase();
    if (tx.type === "income") {
      totalIncome += tx.amount;
      if (category === "payment" || category.includes("jimpitan")) {
        jimpitanIncome += tx.amount;
      } else {
        donationIncome += tx.amount;
      }
    } else if (tx.type === "expense") {
      totalExpense += tx.amount;
      if (category === "cancellation") {
        cancellationExpense += tx.amount;
      } else {
        operationalExpense += tx.amount;
      }
    }
  }

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    jimpitanIncome,
    donationIncome,
    cancellationExpense,
    operationalExpense,
    netJimpitan: jimpitanIncome - cancellationExpense,
  };
}

// Ambil transaksi terbaru (untuk dashboard)
export async function getRecentTransactions(
  limitCount: number = 5
): Promise<FinancialTransaction[]> {
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



