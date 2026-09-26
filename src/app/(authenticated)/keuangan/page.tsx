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
    <div className="max-w-lg mx-auto px-4 pb-24 bg-background min-h-screen pt-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-foreground">Ringkasan Keuangan</h1>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-6">
        <div className="bg-secondary text-[#f7f7f7] p-3 rounded-2xl flex flex-col justify-center">
          <p className="text-xs opacity-80 mb-1">Saldo</p>
          <p className="text-base font-bold">{formatRupiah(balance)}</p>
        </div>
        <div className="bg-green-50 text-green-700 p-3 rounded-2xl flex flex-col items-center justify-center text-center border border-green-100">
          <TrendingUp className="w-5 h-5 mb-1" />
          <p className="text-[10px] opacity-80 mb-0.5">Pemasukan</p>
          <p className="text-xs font-bold truncate w-full">{formatRupiah(totalIncome)}</p>
        </div>
        <div className="bg-red-50 text-red-600 p-3 rounded-2xl flex flex-col items-center justify-center text-center border border-red-100">
          <TrendingDown className="w-5 h-5 mb-1" />
          <p className="text-[10px] opacity-80 mb-0.5">Pengeluaran</p>
          <p className="text-xs font-bold truncate w-full">{formatRupiah(totalExpense)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <Link href="/keuangan/pemasukan" className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-50 text-green-700 text-sm font-semibold border border-green-100">
          <Plus className="w-4 h-4" /> Pemasukan
        </Link>
        <Link href="/keuangan/pengeluaran" className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-50 text-red-600 text-sm font-semibold border border-red-100">
          <Minus className="w-4 h-4" /> Pengeluaran
        </Link>
      </div>

      <div className="flex gap-1 p-1 bg-black/5 rounded-xl mb-4">
        {(['all', 'income', 'expense'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
              filter === f
                ? 'bg-white text-foreground shadow-sm'
                : 'text-foreground/50'
            }`}
          >
            {f === 'all' ? 'Semua' : f === 'income' ? 'Pemasukan' : 'Pengeluaran'}
          </button>
        ))}
      </div>

      {loading && <p className="text-center py-4 text-sm text-foreground/50">Memuat data...</p>}
      {error && <p className="text-center py-4 text-sm text-red-500">{error}</p>}
      
      {!loading && !error && (
        <div className="flex flex-col gap-2">
          {filteredTransactions.map(t => (
            <div key={t.id} className="bg-white px-4 py-3.5 rounded-2xl border border-black/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  t.type === 'income' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {t.type === 'income' ? <TrendingUp className="w-5 h-5 text-green-600" /> : <TrendingDown className="w-5 h-5 text-red-600" />}
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{t.description || t.category}</p>
                  <p className="text-xs text-foreground/50 mt-0.5">
                    {t.createdAt?.toDate ? t.createdAt.toDate().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'}) : 'Tanggal tidak tersedia'}
                  </p>
                </div>
              </div>
              <p className={`font-bold text-sm ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                {t.type === 'income' ? '+' : '-'} {formatRupiah(t.amount)}
              </p>
            </div>
          ))}
          {filteredTransactions.length === 0 && (
            <p className="text-center text-foreground/50 text-sm py-8">Belum ada transaksi</p>
          )}
        </div>
      )}
    </div>
  );
}
