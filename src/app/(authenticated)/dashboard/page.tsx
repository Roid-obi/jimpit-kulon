"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { app } from "@/lib/firebase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TrendingUp, TrendingDown, Plus, Minus, ChevronRight } from "lucide-react";
import Link from "next/link";
import { getHouses } from "@/lib/services/houses";

const db = getFirestore(app);

const formatRupiah = (amount: number) =>
  `Rp ${amount.toLocaleString("id-ID")}`;

const formatPeriodDate = (start: Timestamp, end: Timestamp) => {
  const opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  };
  return `${start.toDate().toLocaleDateString("id-ID", { day: "numeric", month: "short" })} – ${end.toDate().toLocaleDateString("id-ID", opts)}`;
};

export default function DashboardPage() {
  const { userData } = useAuth();
  const [balance, setBalance] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  
  const [activePeriod, setActivePeriod] = useState<any>(null);
  const [housesLunas, setHousesLunas] = useState(0);
  const [totalHouses, setTotalHouses] = useState(0);
  
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);

        // 1. Fetch balance & all transactions
        const txQ = query(
          collection(db, "financial_transactions"),
          orderBy("createdAt", "desc")
        );
        const txSnapshot = await getDocs(txQ);
        
        let tIncome = 0;
        let tExpense = 0;
        const txs: any[] = [];
        
        txSnapshot.docs.forEach((doc) => {
          const d = doc.data();
          if (d.type === "income") tIncome += d.amount;
          else if (d.type === "expense") tExpense += d.amount;
          
          if (txs.length < 5) {
            txs.push({ id: doc.id, ...d });
          }
        });
        
        setTotalIncome(tIncome);
        setTotalExpense(tExpense);
        setBalance(tIncome - tExpense);
        setRecentTransactions(txs);

        // 2. Fetch Active Period
        const periodQ = query(
          collection(db, "periods"),
          where("status", "==", "active"),
          orderBy("startDate", "desc"),
          limit(1)
        );
        const periodSnapshot = await getDocs(periodQ);
        let currentPeriod = null;
        
        if (!periodSnapshot.empty) {
          currentPeriod = { id: periodSnapshot.docs[0].id, ...periodSnapshot.docs[0].data() };
          setActivePeriod(currentPeriod);
        }

        // 3. Fetch Houses
        const housesData = await getHouses();
        setTotalHouses(housesData.length);

        // 4. Fetch Payments for active period
        if (currentPeriod) {
          const paymentsQ = query(
            collection(db, "payments"),
            where("periodId", "==", currentPeriod.id)
          );
          const paymentsSnapshot = await getDocs(paymentsQ);
          // Assuming each document in payments represents a single payment per house for this period
          // Or just unique houseIds
          const uniqueHouseIds = new Set();
          paymentsSnapshot.docs.forEach(doc => {
            uniqueHouseIds.add(doc.data().houseId);
          });
          setHousesLunas(uniqueHouseIds.size);
        }

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const todayStr = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (isLoading) {
    return (
      <div className="flex flex-col p-4 max-w-lg mx-auto w-full items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        <p className="mt-4 text-gray-500">Memuat dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-4 max-w-lg mx-auto w-full space-y-6 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Selamat datang, {userData?.name || userData?.email?.split('@')[0] || 'Warga'}!
        </h1>
        <p className="text-sm text-gray-500">{todayStr}</p>
      </div>

      {/* Saldo Jimpitan Card */}
      <div className="bg-primary rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
        <p className="text-[#000000] text-sm font-medium mb-1">Saldo Dana Jimpitan</p>
        <h2 className="text-[#000000] text-3xl font-bold tracking-tight">
          {formatRupiah(balance)}
        </h2>
      </div>

      {/* Income / Expense Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-green-100 p-2 rounded-full">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-sm text-gray-500">Pemasukan</p>
          </div>
          <p className="font-semibold text-gray-900">{formatRupiah(totalIncome)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-red-100 p-2 rounded-full">
              <TrendingDown className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-sm text-gray-500">Pengeluaran</p>
          </div>
          <p className="font-semibold text-gray-900">{formatRupiah(totalExpense)}</p>
        </div>
      </div>

      {/* Status Periode Berjalan */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-3">Periode Berjalan</h3>
        {activePeriod ? (
          <div>
            <p className="text-sm text-gray-600 mb-4 font-medium">
              {formatPeriodDate(activePeriod.startDate, activePeriod.endDate)}
            </p>
            
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-gray-600">{housesLunas} / {totalHouses} Rumah Lunas</span>
              <span className="font-medium text-primary">
                {Math.round((housesLunas / (totalHouses || 1)) * 100)}%
              </span>
            </div>
            
            <div className="w-full bg-gray-100 rounded-full h-2.5 mb-3">
              <div 
                className="bg-primary h-2.5 rounded-full" 
                style={{ width: `${Math.min((housesLunas / (totalHouses || 1)) * 100, 100)}%` }}
              ></div>
            </div>
            
            <p className="text-sm text-red-500">
              {totalHouses - housesLunas} Rumah Belum Bayar
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-500 py-2">Tidak ada periode aktif</p>
        )}
      </div>

      {/* Transaksi Terbaru */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-semibold text-gray-900">Transaksi Terbaru</h3>
          <Link href="/keuangan" className="text-sm text-primary font-medium flex items-center hover:underline">
            Lihat Semua
            <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
        
        {recentTransactions.length > 0 ? (
          <ul className="divide-y divide-gray-100">
            {recentTransactions.map((tx) => (
              <li key={tx.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${tx.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {tx.type === 'income' ? <Plus className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{tx.description}</p>
                    <p className="text-xs text-gray-500">
                      {tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : ""}
                    </p>
                  </div>
                </div>
                <span className={`font-semibold text-sm ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                  {tx.type === 'income' ? '+' : '-'}{formatRupiah(tx.amount)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-6 text-center text-gray-500 text-sm">
            Belum ada transaksi.
          </div>
        )}
      </div>
    </div>
  );
}
