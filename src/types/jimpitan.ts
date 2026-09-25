import type { Timestamp } from "firebase/firestore";

export interface House {
  id: string; // Document ID
  houseNumber: string;
  headOfFamily: string;
  address: string;
  qrCode: string;
  notes: string | null;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Period {
  id: string; // Document ID
  periodNumber: number;
  startDate: Timestamp;
  endDate: Timestamp;
  amount: number;
  status: "active" | "archived";
  createdAt: Timestamp;
}

export interface Payment {
  id: string; // Document ID
  houseId: string;
  periodId: string;
  paidBy: string; // Officer's UID
  paidAt: Timestamp;
  status: "paid" | "cancelled";
  cancelledAt?: Timestamp;
  cancelledBy?: string;
  createdAt: Timestamp;
}

export interface FinancialTransaction {
  id: string; // Document ID
  type: "income" | "expense";
  category: string;
  amount: number;
  description: string;
  houseId: string | null;
  paymentId: string | null;
  takenBy: string | null;
  createdBy: string; // Officer's UID
  createdAt: Timestamp;
}
