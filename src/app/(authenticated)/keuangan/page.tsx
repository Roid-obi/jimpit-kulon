'use client';

import { collection, getDocs, getFirestore, orderBy, query } from 'firebase/firestore';
import { app } from '@/lib/firebase/client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

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
    <div className="flex flex-col p-4 bg-background min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Ringkasan Keuangan</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-primary text-[#000000] p-4 rounded-xl shadow">
          <p className="text-sm opacity-80">Saldo Dana Jimpitan</p>
          <p className="text-2xl font-bold">{formatRupiah(balance)}</p>
        </div>
        <div className="bg-white text-foreground p-4 rounded-xl shadow border">
          <p className="text-sm opacity-60">Total Pemasukan</p>
          <p className="text-xl font-bold text-green-600">{formatRupiah(totalIncome)}</p>
        </div>
        <div className="bg-white text-foreground p-4 rounded-xl shadow border">
          <p className="text-sm opacity-60">Total Pengeluaran</p>
          <p className="text-xl font-bold text-red-600">{formatRupiah(totalExpense)}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <Link href="/keuangan/pemasukan" className="flex-1 bg-secondary text-[#f7f7f7] text-center py-2 rounded-lg font-medium">
          + Tambah Pemasukan
        </Link>
        <Link href="/keuangan/pengeluaran" className="flex-1 bg-secondary text-[#f7f7f7] text-center py-2 rounded-lg font-medium">
          + Tambah Pengeluaran
        </Link>
      </div>

      <div className="flex gap-2 mb-4">
        {(['all', 'income', 'expense'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === f ? 'bg-primary text-[#000000]' : 'bg-gray-200 text-gray-700'}`}
          >
            {f === 'all' ? 'Semua' : f === 'income' ? 'Pemasukan' : 'Pengeluaran'}
          </button>
        ))}
      </div>

      {loading && <p className="text-center py-4 text-foreground">Memuat data...</p>}
      {error && <p className="text-center py-4 text-red-500">{error}</p>}
      
      {!loading && !error && (
        <div className="flex flex-col gap-3">
          {filteredTransactions.map(t => (
            <div key={t.id} className="bg-white p-4 rounded-xl shadow-sm border flex justify-between items-center">
              <div>
                <p className="font-medium text-foreground">{t.description || t.category}</p>
                <p className="text-xs text-gray-500">
                  {t.createdAt?.toDate ? t.createdAt.toDate().toLocaleDateString('id-ID') : 'Tanggal tidak tersedia'}
                </p>
              </div>
              <p className={`font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                {t.type === 'income' ? '+' : '-'} {formatRupiah(t.amount)}
              </p>
            </div>
          ))}
          {filteredTransactions.length === 0 && (
            <p className="text-center text-gray-500 py-4">Belum ada transaksi</p>
          )}
        </div>
      )}
    </div>
  );
}
