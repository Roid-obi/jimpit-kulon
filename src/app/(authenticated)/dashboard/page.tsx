"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  getFirestore,
  orderBy,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { app } from "@/lib/firebase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TrendingUp, TrendingDown, Plus, Minus, ChevronRight, X } from "lucide-react";
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

  // Expanded Groups & Modal State
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);

  const toggleGroup = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);

        const txQ = query(
          collection(db, "financial_transactions"),
          orderBy("createdAt", "desc")
        );
        const periodQ = query(collection(db, "periods"));

        // Fetch parallel
        const [txSnapshot, housesData, periodSnapshot, usersSnapshot] = await Promise.all([
          getDocs(txQ),
          getHouses(),
          getDocs(periodQ),
          getDocs(collection(db, "users")).catch((err) => {
            console.warn("Could not fetch users list:", err);
            return { docs: [] } as any;
          }),
        ]);

        const housesMap = new Map();
        housesData.forEach((h: any) => {
          housesMap.set(h.id, h.headOfFamily || h.houseNumber || "Tidak Diketahui");
        });

        const usersMap = new Map();
        if (usersSnapshot?.docs) {
          usersSnapshot.docs.forEach((doc: any) => {
            const u = doc.data();
            usersMap.set(doc.id, u.name || u.email || "Petugas");
          });
        }

        let tIncome = 0;
        let tExpense = 0;
        const rawData: any[] = [];
        
        txSnapshot.docs.forEach((doc) => {
          const d = doc.data();
          if (d.type === "income") tIncome += d.amount;
          else if (d.type === "expense") tExpense += d.amount;
          rawData.push({
            id: doc.id,
            ...d,
            creatorName: d.createdBy ? (usersMap.get(d.createdBy) || d.createdBy) : "Sistem",
            takerName: d.takenBy ? (usersMap.get(d.takenBy) || d.takenBy) : undefined,
          });
        });

        // --- AGGREGATION LOGIC (Synced with Keuangan) ---
        const groupedData: any[] = [];
        const jimpitanByDay: Record<string, { date: any; transactions: any[] }> = {};

        rawData.forEach((t) => {
          const isJimpitanIncome =
            ((t.category && t.category.toLowerCase().includes("jimpitan")) ||
              (t.category && t.category.toLowerCase() === "payment") ||
              (t.description && t.description.toLowerCase().includes("jimpitan"))) &&
            t.type === "income";
          const isCancellation = t.category && t.category.toLowerCase() === "cancellation";

          if (isJimpitanIncome || isCancellation) {
            const dateStr = t.createdAt?.toDate
              ? t.createdAt.toDate().toLocaleDateString("id-ID")
              : "unknown";
            if (!jimpitanByDay[dateStr]) {
              jimpitanByDay[dateStr] = { date: t.createdAt, transactions: [] };
            }

            // Re-format description for jimpitan subtransactions
            if (t.houseId && housesMap.has(t.houseId)) {
              const houseName = housesMap.get(t.houseId);
              if (isCancellation) {
                t.description = `Pembatalan - Rumah ${houseName}`;
              } else {
                t.description = `Rumah ${houseName}`;
              }
            } else if (isJimpitanIncome && (!t.description || t.description === "Pembayaran jimpitan rutin")) {
              t.description = "Jimpitan";
            }

            jimpitanByDay[dateStr].transactions.push(t);
          } else {
            groupedData.push(t);
          }
        });

        Object.keys(jimpitanByDay).forEach((dateStr) => {
          const group = jimpitanByDay[dateStr];
          if (group.transactions.length === 0) return;

          let groupIncome = 0;
          let groupExpense = 0;

          group.transactions.forEach((t) => {
            if (t.type === "income") groupIncome += t.amount;
            if (t.type === "expense") groupExpense += t.amount;
          });

          const netAmount = groupIncome - groupExpense;

          // Sort subTransactions within the group by date
          group.transactions.sort(
            (a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()
          );

          groupedData.push({
            id: `jimpitan-group-${dateStr}`,
            type: netAmount >= 0 ? "income" : "expense",
            category: "JIMPITAN",
            amount: Math.abs(netAmount),
            description: `Setoran Jimpitan`,
            createdAt: group.date,
            isGrouped: true,
            subTransactions: group.transactions,
          });
        });

        groupedData.sort(
          (a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()
        );

        setTotalIncome(tIncome);
        setTotalExpense(tExpense);
        setBalance(tIncome - tExpense);
        setRecentTransactions(groupedData.slice(0, 5));

        // 2. Fetch Active Period based on real-time
        let currentPeriod: any = null;
        const now = new Date();

        periodSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          if (data.status !== "archived") {
            const start = data.startDate.toDate();
            const end = data.endDate.toDate();
            // find the one that overlaps with 'now'
            if (start <= now && end >= now) {
              currentPeriod = { id: doc.id, ...data };
            }
          }
        });

        if (currentPeriod) {
          setActivePeriod(currentPeriod);
          const paymentsQ = query(
            collection(db, "payments"),
            where("periodId", "==", currentPeriod.id)
          );
          const paymentsSnapshot = await getDocs(paymentsQ);
          const uniqueHouseIds = new Set();
          paymentsSnapshot.docs.forEach((doc) => {
            uniqueHouseIds.add(doc.data().houseId);
          });
          setHousesLunas(uniqueHouseIds.size);
        }

        setTotalHouses(housesData.length);
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
    <div className="flex flex-col min-h-screen bg-background">
      {/* === HERO HEADER — Full bleed dari atas === */}
      <div
        className="relative bg-secondary overflow-hidden px-5"
        style={{
          paddingTop: 'max(env(safe-area-inset-top, 0px), 20px)',
          paddingBottom: '32px',
        }}
      >
        {/* Decorative blobs */}
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/8 rounded-full pointer-events-none" />
        <div className="absolute top-16 -left-16 w-40 h-40 bg-white/5 rounded-full pointer-events-none" />
        <div className="absolute -bottom-8 right-8 w-24 h-24 bg-white/5 rounded-full pointer-events-none" />

        {/* Top row: tanggal + avatar user (link ke profil) */}
        <div className="flex items-center justify-between mb-5 relative z-10">
          <p className="text-[#f7f7f7]/50 text-xs">{todayStr}</p>
          <Link href="/profil">
            <div className="w-9 h-9 rounded-2xl bg-white/20 border border-white/20 flex items-center justify-center text-[#f7f7f7] font-bold text-sm active:scale-95">
              {userData?.name?.[0]?.toUpperCase() || '?'}
            </div>
          </Link>
        </div>

        {/* Greeting */}
        <div className="relative z-10 mb-5">
          <h1 className="text-[#f7f7f7] text-2xl font-bold mb-0.5">
            Halo, {userData?.name?.split(' ')[0] || 'Petugas'} 👋
          </h1>
          <p className="text-[#f7f7f7]/50 text-sm">Ringkasan keuangan jimpitan</p>
        </div>

        {/* Saldo card — glassmorphism */}
        <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 border border-white/10 relative z-10">
          <p className="text-[#f7f7f7]/60 text-xs font-medium mb-1">Saldo Dana Jimpitan</p>
          {isLoading ? (
            <div className="h-9 w-40 bg-white/20 rounded-lg animate-pulse" />
          ) : (
            <p className="text-[#f7f7f7] text-3xl font-bold tracking-tight">{formatRupiah(balance)}</p>
          )}
        </div>
      </div>

      {/* === CONTENT === */}
      <div className="px-4 pt-4 pb-8 space-y-4">
        {/* Periode Berjalan */}
        <div className="bg-white rounded-2xl p-5 border border-black/5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground text-sm">Periode Berjalan</h3>
            {activePeriod && (
              <span className="text-xs bg-primary/20 text-foreground font-semibold px-2 py-0.5 rounded-full">Aktif</span>
            )}
          </div>
          {activePeriod ? (
            <>
              <p className="text-xs text-foreground/50 mb-4">
                {formatPeriodDate(activePeriod.startDate, activePeriod.endDate)}
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-foreground/60">{housesLunas} dari {totalHouses} rumah</span>
                  <span className="font-bold text-primary">{Math.round((housesLunas / (totalHouses || 1)) * 100)}%</span>
                </div>
                <div className="w-full h-2.5 bg-black/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${Math.min((housesLunas / (totalHouses || 1)) * 100, 100)}%`, transition: 'width 700ms ease' }}
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
              {isLoading
                ? <div className="w-32 h-4 bg-black/5 rounded animate-pulse mx-auto" />
                : <p className="text-sm text-foreground/40">Tidak ada periode aktif</p>
              }
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
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-12 bg-black/5 rounded-xl animate-pulse" />)}
            </div>
          ) : recentTransactions.length > 0 ? (
            <ul>
              {recentTransactions.map((tx, i) => (
                <div key={tx.id}>
                  <li
                    onClick={(e) => {
                      if (tx.isGrouped) {
                        toggleGroup(tx.id, e);
                      } else {
                        setSelectedTransaction(tx);
                      }
                    }}
                    className={`px-4 py-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 active:bg-slate-100 transition-colors ${
                      i < recentTransactions.length - 1 && (!tx.isGrouped || !expandedGroups[tx.id])
                        ? 'border-b border-black/[0.04]'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          tx.type === 'income' ? 'bg-green-50' : 'bg-red-50'
                        }`}
                      >
                        {tx.type === 'income' ? (
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex flex-col justify-center">
                        <p className="font-semibold text-foreground text-sm truncate leading-tight">
                          {tx.description || tx.category}
                        </p>
                        {tx.isGrouped ? (
                          <p className="text-xs text-foreground/40 mt-0.5">
                            {tx.subTransactions?.length || 0} transaksi
                            {tx.createdAt?.toDate
                              ? ` • ${tx.createdAt.toDate().toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}`
                              : ''}
                          </p>
                        ) : (
                          <p className="text-xs text-foreground/40 mt-0.5">
                            {tx.createdAt?.toDate ? (
                              `${tx.createdAt.toDate().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} • ${tx.createdAt.toDate().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':')}`
                            ) : '-'}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p
                        className={`font-bold text-sm flex-shrink-0 ${
                          tx.type === 'income' ? 'text-green-600' : 'text-red-500'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : '-'}{formatRupiah(tx.amount)}
                      </p>
                      {tx.isGrouped && (
                        <ChevronRight
                          className={`w-4 h-4 text-slate-400 transition-transform ${
                            expandedGroups[tx.id] ? 'rotate-90' : ''
                          }`}
                        />
                      )}
                    </div>
                  </li>

                  {/* Sub transactions dropdown for grouped Jimpitan */}
                  {tx.isGrouped && expandedGroups[tx.id] && (
                    <ul className="bg-slate-50/50 border-y border-black/[0.04] shadow-inner mb-2">
                      {tx.subTransactions?.map((subT: any, subIdx: number) => (
                        <li
                          key={subT.id}
                          onClick={() => setSelectedTransaction(subT)}
                          className={`px-4 py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-100 active:bg-slate-200 transition-colors pl-16 ${
                            subIdx < tx.subTransactions.length - 1 ? 'border-b border-black/[0.04]' : ''
                          }`}
                        >
                          <div className="min-w-0 pr-4">
                            <p
                              className={`font-medium text-sm truncate ${
                                subT.type === 'expense' ? 'text-slate-500 line-through' : 'text-slate-700'
                              }`}
                            >
                              {subT.description || subT.category}
                            </p>
                            <p className="text-[10.5px] text-slate-400 mt-0.5 font-medium">
                              {subT.createdAt?.toDate?.().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':')} WIB
                            </p>
                          </div>
                          <p
                            className={`font-bold text-xs flex-shrink-0 ${
                              subT.type === 'income' ? 'text-green-600' : 'text-red-500'
                            }`}
                          >
                            {subT.type === 'income' ? '+' : '-'}{formatRupiah(subT.amount)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </ul>
          ) : (
            <div className="py-10 text-center">
              <p className="text-sm text-foreground/40">Belum ada transaksi</p>
            </div>
          )}
        </div>
      </div>

      {/* TRANSACTION DETAIL MODAL */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center sm:p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedTransaction(null)} />
          <div className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-sm overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
            <div className="p-4 flex justify-between items-center absolute top-0 left-0 right-0">
              <button onClick={() => setSelectedTransaction(null)} className="p-2 rounded-full bg-black/5 hover:bg-black/10 text-foreground/70 transition-colors ml-auto">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 pt-12">
              <div className="flex flex-col items-center justify-center mb-8">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-sm ${
                  selectedTransaction.type === 'income' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
                }`}>
                  {selectedTransaction.type === 'income'
                    ? <TrendingUp className="w-8 h-8" />
                    : <TrendingDown className="w-8 h-8" />
                  }
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    selectedTransaction.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {selectedTransaction.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider">
                    {selectedTransaction.category}
                  </span>
                </div>
                <p className={`text-4xl font-bold mt-2 ${
                  selectedTransaction.type === 'income' ? 'text-green-600' : 'text-red-500'
                }`}>
                  {selectedTransaction.type === 'income' ? '+' : '-'}{formatRupiah(selectedTransaction.amount)}
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 space-y-4 border border-slate-100">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Keterangan</span>
                  <span className="text-sm font-medium text-slate-900">{selectedTransaction.description || '-'}</span>
                </div>
                
                <div className="h-px bg-slate-200" />
                
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Waktu Transaksi</span>
                  <span className="text-sm font-medium text-slate-900">
                    {selectedTransaction.createdAt?.toDate ? (
                      `${selectedTransaction.createdAt.toDate().toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}, ${selectedTransaction.createdAt.toDate().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':')} WIB`
                    ) : '-'}
                  </span>
                </div>

                <div className="h-px bg-slate-200" />

                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    {selectedTransaction.category?.toLowerCase().includes('cancellation')
                      ? 'Dibatalkan Oleh'
                      : (selectedTransaction.category?.toLowerCase() === 'payment' || selectedTransaction.category?.toLowerCase().includes('jimpitan') 
                          ? 'Petugas Penarik' 
                          : 'Dicatat Oleh')}
                  </span>
                  <span className="text-sm font-medium text-slate-900">{selectedTransaction.creatorName || 'Sistem'}</span>
                </div>
                
                {selectedTransaction.takerName && selectedTransaction.takerName !== 'Sistem' && (
                  <>
                    <div className="h-px bg-slate-200" />
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Diambil Oleh / Penerima</span>
                      <span className="text-sm font-medium text-slate-900">{selectedTransaction.takerName}</span>
                    </div>
                  </>
                )}

                <div className="h-px bg-slate-200" />
                
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">ID Referensi</span>
                  <span className="text-xs font-medium text-slate-400 break-all">{selectedTransaction.id}</span>
                </div>
              </div>
              
              <div className="mt-6">
                 <button 
                   onClick={() => setSelectedTransaction(null)}
                   className="w-full py-3.5 rounded-xl font-bold text-white bg-primary active:scale-[0.98] transition-transform"
                 >
                   TUTUP
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
