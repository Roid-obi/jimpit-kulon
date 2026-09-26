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
    <div className="flex flex-col p-4 max-w-lg mx-auto w-full space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-foreground/50 mb-0.5">{todayStr}</p>
          <h1 className="text-xl font-bold text-foreground">
            Halo, {userData?.name?.split(' ')[0] || 'Petugas'} 👋
          </h1>
        </div>
      </div>

      {/* Saldo Jimpitan Card */}
      <div className="relative bg-secondary rounded-3xl p-6 overflow-hidden">
        {/* decorative circle */}
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full" />
        <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-white/5 rounded-full" />
        <p className="text-[#f7f7f7]/70 text-sm font-medium mb-1">Saldo Dana Jimpitan</p>
        <h2 className="text-[#f7f7f7] text-3xl font-bold tracking-tight relative z-10">
          {formatRupiah(balance)}
        </h2>
        <p className="text-[#f7f7f7]/50 text-xs mt-2">Diperbarui hari ini</p>
      </div>

      {/* Income / Expense Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-black/5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-green-50 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <span className="text-xs text-foreground/50 font-medium">Pemasukan</span>
          </div>
          <p className="text-base font-bold text-foreground">{formatRupiah(totalIncome)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-black/5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-red-500" />
            </div>
            <span className="text-xs text-foreground/50 font-medium">Pengeluaran</span>
          </div>
          <p className="text-base font-bold text-foreground">{formatRupiah(totalExpense)}</p>
        </div>
      </div>

      {/* Status Periode Berjalan */}
      <div className="bg-white rounded-2xl p-5 border border-black/5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground text-sm">Periode Berjalan</h3>
          {activePeriod && (
            <span className="text-xs bg-primary/20 text-foreground font-medium px-2 py-0.5 rounded-full">
              Aktif
            </span>
          )}
        </div>
        {activePeriod ? (
          <>
            <p className="text-xs text-foreground/50 mb-4">
              {formatPeriodDate(activePeriod.startDate, activePeriod.endDate)}
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-foreground/60">{housesLunas} rumah lunas</span>
                <span className="font-bold text-primary">{Math.round((housesLunas / (totalHouses || 1)) * 100)}%</span>
              </div>
              <div className="w-full h-2.5 bg-black/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-700"
                  style={{ width: `${Math.min((housesLunas / (totalHouses || 1)) * 100, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-green-600 font-medium">{housesLunas} Lunas</span>
                <span className="text-orange-500 font-medium">{totalHouses - housesLunas} Belum Bayar</span>
              </div>
            </div>
          </>
        ) : (
          <div className="py-4 text-center">
            <p className="text-sm text-foreground/40">Tidak ada periode aktif</p>
          </div>
        )}
      </div>

      {/* Transaksi Terbaru */}
      <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
        <div className="px-4 py-3.5 flex items-center justify-between border-b border-black/5">
          <h3 className="font-semibold text-foreground text-sm">Transaksi Terbaru</h3>
          <Link href="/keuangan" className="text-xs text-primary font-semibold flex items-center gap-0.5">
            Lihat Semua <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {recentTransactions.length > 0 ? (
          <ul>
            {recentTransactions.map((tx, i) => (
              <li key={tx.id} className={`px-4 py-3.5 flex items-center justify-between ${
                i < recentTransactions.length - 1 ? 'border-b border-black/[0.04]' : ''
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    tx.type === 'income' ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    {tx.type === 'income'
                      ? <TrendingUp className="w-4 h-4 text-green-600" />
                      : <TrendingDown className="w-4 h-4 text-red-500" />
                    }
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground leading-tight">{tx.description}</p>
                    <p className="text-xs text-foreground/40 mt-0.5">
                      {tx.createdAt?.toDate?.()?.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) || '-'}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-bold ${
                  tx.type === 'income' ? 'text-green-600' : 'text-red-500'
                }`}>
                  {tx.type === 'income' ? '+' : '-'}{formatRupiah(tx.amount)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="py-10 text-center">
            <p className="text-sm text-foreground/40">Belum ada transaksi</p>
          </div>
        )}
      </div>
    </div>
  );
}
