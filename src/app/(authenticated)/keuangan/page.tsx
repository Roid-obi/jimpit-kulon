'use client';

import { collection, getDocs, getFirestore, orderBy, query } from 'firebase/firestore';
import { app } from '@/lib/firebase/client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TrendingUp, TrendingDown, Plus, Minus } from 'lucide-react';

const db = getFirestore(app);

type Transaction = {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  createdAt: any;
};

export default function KeuanganPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');

  useEffect(() => {
    async function fetchTransactions() {
      try {
        const q = query(
          collection(db, 'financial_transactions'),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Transaction[];
        setTransactions(data);
      } catch (err: any) {
        console.error(err);
        setError('Gagal memuat data transaksi');
      } finally {
        setLoading(false);
      }
    }
    fetchTransactions();
  }, []);

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
  const balance = totalIncome - totalExpense;

  const filteredTransactions = transactions.filter(t => {
    if (filter === 'all') return true;
    return t.type === filter;
  });

  const formatRupiah = (amount: number) => `Rp ${amount.toLocaleString('id-ID')}`;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* === HERO HEADER === */}
      <div
        className="relative bg-secondary overflow-hidden px-5"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 20px)', paddingBottom: '28px' }}
      >
        {/* Decorative */}
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/8 rounded-full pointer-events-none" />
        <div className="absolute -bottom-6 -left-10 w-32 h-32 bg-white/5 rounded-full pointer-events-none" />

        <h1 className="text-[#f7f7f7] text-2xl font-bold mb-0.5 relative z-10">Keuangan</h1>
        <p className="text-[#f7f7f7]/50 text-sm mb-5 relative z-10">Dana Jimpitan RT</p>

        {/* 3 Stats */}
        {loading ? (
          <div className="grid grid-cols-3 gap-2">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-white/10 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 relative z-10">
            <div className="bg-white/15 rounded-xl p-3 border border-white/10">
              <p className="text-[#f7f7f7]/50 text-[10px] font-medium mb-1">Saldo</p>
              <p className="text-[#f7f7f7] text-sm font-bold leading-tight">{formatRupiah(balance)}</p>
            </div>
            <div className="bg-white/15 rounded-xl p-3 border border-white/10">
              <p className="text-green-300 text-[10px] font-medium mb-1">Masuk</p>
              <p className="text-green-200 text-sm font-bold leading-tight">{formatRupiah(totalIncome)}</p>
            </div>
            <div className="bg-white/15 rounded-xl p-3 border border-white/10">
              <p className="text-red-300 text-[10px] font-medium mb-1">Keluar</p>
              <p className="text-red-200 text-sm font-bold leading-tight">{formatRupiah(totalExpense)}</p>
            </div>
          </div>
        )}
      </div>

      {/* === CONTENT === */}
      <div className="px-4 pt-4 flex-1">
        {/* Tombol Aksi */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <Link href="/keuangan/pemasukan" className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-green-50 text-green-700 text-sm font-semibold border border-green-100 active:scale-[0.98]">
            <Plus className="w-4 h-4" /> Pemasukan
          </Link>
          <Link href="/keuangan/pengeluaran" className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-red-50 text-red-600 text-sm font-semibold border border-red-100 active:scale-[0.98]">
            <Minus className="w-4 h-4" /> Pengeluaran
          </Link>
        </div>

        {/* Filter */}
        <div className="flex gap-1 p-1 bg-black/5 rounded-xl mb-4">
          {(['all', 'income', 'expense'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold ${
                filter === f ? 'bg-white text-foreground shadow-sm' : 'text-foreground/50'
              }`}>
              {f === 'all' ? 'Semua' : f === 'income' ? 'Pemasukan' : 'Pengeluaran'}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-white rounded-2xl animate-pulse" />)}
          </div>
        ) : error ? (
          <p className="text-center py-8 text-sm text-red-500">{error}</p>
        ) : (
          <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
            {filteredTransactions.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-foreground/40">Belum ada transaksi</p>
              </div>
            ) : (
              <ul>
                {filteredTransactions.map((t, i) => (
                  <li key={t.id} className={`px-4 py-3.5 flex items-center justify-between ${
                    i < filteredTransactions.length - 1 ? 'border-b border-black/[0.04]' : ''
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        t.type === 'income' ? 'bg-green-50' : 'bg-red-50'
                      }`}>
                        {t.type === 'income'
                          ? <TrendingUp className="w-4 h-4 text-green-600" />
                          : <TrendingDown className="w-4 h-4 text-red-500" />
                        }
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground text-sm truncate">{t.description || t.category}</p>
                        <p className="text-xs text-foreground/40 mt-0.5">
                          {t.createdAt?.toDate ? t.createdAt.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                        </p>
                      </div>
                    </div>
                    <p className={`font-bold text-sm ml-2 flex-shrink-0 ${
                      t.type === 'income' ? 'text-green-600' : 'text-red-500'
                    }`}>
                      {t.type === 'income' ? '+' : '-'}{formatRupiah(t.amount)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
