'use client';

import { collection, getDocs, getFirestore, orderBy, query } from 'firebase/firestore';
import { app } from '@/lib/firebase/client';
import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ChevronLeft, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';

const db = getFirestore(app);

type Transaction = {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  createdAt: any;
};

export default function LaporanBulananPage({ params }: { params: Promise<{ month: string }> }) {
  const router = useRouter();
  const { month: encodedMonth } = use(params);
  const targetMonth = decodeURIComponent(encodedMonth);

  const [loading, setLoading] = useState(true);
  const [totalBalance, setTotalBalance] = useState(0);
  
  // Stats for the specific month
  const [jimpitanNet, setJimpitanNet] = useState(0);
  const [donations, setDonations] = useState(0);
  const [expenses, setExpenses] = useState<Transaction[]>([]);
  const [netMonth, setNetMonth] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        const q = query(
          collection(db, 'financial_transactions'),
          orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[];

        // 1. Calculate overall balance
        let incomeAll = 0, expenseAll = 0;
        data.forEach(t => {
          if (t.type === 'income') incomeAll += t.amount;
          else if (t.type === 'expense') expenseAll += t.amount;
        });
        setTotalBalance(incomeAll - expenseAll);

        // 2. Filter for this month
        const monthTxs = data.filter(t => {
          if (!t.createdAt?.toDate) return false;
          const date = t.createdAt.toDate();
          const monthYear = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
          const now = new Date();
          let dateStr = monthYear;
          if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
            dateStr = 'Bulan Ini';
          }
          return dateStr === targetMonth;
        });

        // 3. Process monthTxs
        let jimpitanIncome = 0;
        let cancellations = 0;
        let donationIncome = 0;
        let monthExpenses: Transaction[] = [];
        let monthTotalIncome = 0;
        let monthTotalExpense = 0;

        monthTxs.forEach(t => {
          const isJimpitan = t.category.toLowerCase().includes('jimpitan') || t.category.toLowerCase() === 'payment';
          const isDonation = t.category.toLowerCase() === 'donation' || (t.description && t.description.toLowerCase().includes('donasi'));
          const isCancellation = t.category.toLowerCase() === 'cancellation';

          if (t.type === 'income') {
            monthTotalIncome += t.amount;
            if (isDonation) {
              donationIncome += t.amount;
            } else if (isJimpitan) {
              jimpitanIncome += t.amount;
            } else {
              donationIncome += t.amount; 
            }
          } else if (t.type === 'expense') {
            monthTotalExpense += t.amount;
            if (isCancellation) {
              cancellations += t.amount;
            } else {
              monthExpenses.push(t);
            }
          }
        });

        setJimpitanNet(jimpitanIncome - cancellations);
        setDonations(donationIncome);
        setExpenses(monthExpenses);
        setNetMonth(monthTotalIncome - monthTotalExpense);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [targetMonth]);

  const formatRupiah = (amount: number) => `Rp ${Math.abs(amount).toLocaleString('id-ID')}`;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* HEADER */}
      <div className="bg-white border-b border-black/5 sticky top-0 z-20" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)' }}>
        <div className="flex items-center px-4 h-14 mb-2">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-black/5 text-foreground/70 active:scale-95 transition-all">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-foreground ml-2">Laporan {targetMonth}</h1>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-4">
        {/* Total Keseluruhan */}
        <div className="bg-primary/10 rounded-2xl p-5 border border-primary/20 relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-primary/10 rounded-full blur-xl" />
          <p className="text-primary/80 text-xs font-semibold mb-1 relative z-10">Total Dana Jimpitan Saat Ini</p>
          <p className="text-3xl font-bold text-primary relative z-10">{formatRupiah(totalBalance)}</p>
        </div>

        {/* Overall Bulan Ini */}
        <div className="bg-white rounded-2xl p-5 border border-black/5 shadow-sm">
          <p className="text-foreground/60 text-xs font-semibold mb-2">Overall Keuangan Bulan Ini</p>
          <div className="flex items-center gap-2">
            <p className={`text-2xl font-bold ${netMonth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {netMonth >= 0 ? '+' : '-'}{formatRupiah(netMonth)}
            </p>
            {netMonth >= 0 ? (
              <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-red-600" />
              </div>
            )}
          </div>
        </div>

        {/* Rincian Pemasukan */}
        <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
          <div className="p-4 bg-black/[0.02] border-b border-black/5">
            <h2 className="font-bold text-sm text-foreground">Rincian Pemasukan</h2>
          </div>
          <div className="p-4 flex flex-col gap-5">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold text-sm text-foreground">Total Pemasukan Jimpitan</p>
                <p className="text-[10px] text-foreground/50 mt-0.5">Sudah dikurangi pembatalan</p>
              </div>
              <p className="font-bold text-base text-green-600">+{formatRupiah(jimpitanNet)}</p>
            </div>
            <div className="h-px bg-black/5" />
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold text-sm text-foreground">Dana Jimpitan Lain-lain</p>
                <p className="text-[10px] text-foreground/50 mt-0.5">Donasi & kelebihan bayar</p>
              </div>
              <p className="font-bold text-base text-green-600">+{formatRupiah(donations)}</p>
            </div>
          </div>
        </div>

        {/* Rincian Pengeluaran */}
        <div className="bg-white rounded-2xl border border-black/5 overflow-hidden mb-8">
          <div className="p-4 bg-black/[0.02] border-b border-black/5">
            <h2 className="font-bold text-sm text-foreground">Rincian Pengeluaran</h2>
          </div>
          {expenses.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-foreground/40">Tidak ada pengeluaran di bulan ini</p>
            </div>
          ) : (
            <ul className="divide-y divide-black/[0.04]">
              {expenses.map(exp => (
                <li key={exp.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{exp.description || exp.category}</p>
                      <p className="text-[10px] text-foreground/40 mt-0.5">
                        {exp.createdAt?.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <p className="font-bold text-sm text-red-600 flex-shrink-0">
                    -{formatRupiah(exp.amount)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  );
}
