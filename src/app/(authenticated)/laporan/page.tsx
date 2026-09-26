'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, orderBy, getDocs, where, Timestamp, getFirestore } from 'firebase/firestore';
import { app } from '@/lib/firebase/client';

const db = getFirestore(app);

export default function LaporanPage() {
  const [activeTab, setActiveTab] = useState<'jimpitan' | 'keuangan'>('jimpitan');
  const [loading, setLoading] = useState(false);

  // Tab Jimpitan State
  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [houses, setHouses] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  // Tab Keuangan State
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [financialSummary, setFinancialSummary] = useState({ income: 0, expense: 0, balance: 0 });

  useEffect(() => {
    fetchPeriodsAndHouses();
  }, []);

  useEffect(() => {
    if (selectedPeriodId && activeTab === 'jimpitan') {
      fetchPayments(selectedPeriodId);
    }
  }, [selectedPeriodId, activeTab]);

  useEffect(() => {
    if (activeTab === 'keuangan') {
      fetchTransactions(selectedMonth);
    }
  }, [selectedMonth, activeTab]);

  const fetchPeriodsAndHouses = async () => {
    setLoading(true);
    try {
      const periodsSnap = await getDocs(query(collection(db, 'periods'), orderBy('startDate', 'desc')));
      const periodsData = periodsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPeriods(periodsData);
      
      if (periodsData.length > 0 && !selectedPeriodId) {
        setSelectedPeriodId(periodsData[0].id);
      }

      const housesSnap = await getDocs(query(collection(db, 'houses'), where('isActive', '==', true)));
      const housesData = housesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort client-side untuk menghindari composite index (where + orderBy)
      housesData.sort((a: any, b: any) => a.houseNumber.localeCompare(b.houseNumber, undefined, { numeric: true }));
      setHouses(housesData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async (periodId: string) => {
    setLoading(true);
    try {
      const paymentsSnap = await getDocs(query(
        collection(db, 'payments'),
        where('periodId', '==', periodId),
        where('status', '==', 'paid')
      ));
      setPayments(paymentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (monthString: string) => {
    setLoading(true);
    try {
      const [year, month] = monthString.split('-').map(Number);
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59);
      
      // Fetch semua transaksi, filter by date range client-side
      // untuk menghindari composite index (range where + orderBy pada field yang sama seharusnya OK,
      // tapi untuk keamanan kita filter client-side)
      const txSnap = await getDocs(query(
        collection(db, 'financial_transactions'),
        orderBy('createdAt', 'desc')
      ));
      
      const txData = txSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((tx: any) => {
          const ts = tx.createdAt?.toDate?.();
          return ts && ts >= startOfMonth && ts <= endOfMonth;
        });
      setTransactions(txData);
      
      let income = 0;
      let expense = 0;
      txData.forEach((tx: any) => {
        if (tx.type === 'income') income += tx.amount;
        if (tx.type === 'expense') expense += tx.amount;
      });
      setFinancialSummary({ income, expense, balance: income - expense });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDateRange = (start: any, end: any) => {
    if (!start || !end) return '';
    const startDate = start.toDate().toLocaleDateString('id-ID');
    const endDate = end.toDate().toLocaleDateString('id-ID');
    return `${startDate} - ${endDate}`;
  };

  const paidCount = payments.length;
  const totalHouses = houses.length;

  return (
    <div className="max-w-lg mx-auto px-4 pb-24 bg-background min-h-screen pt-4">
      <h1 className="text-xl font-bold text-foreground mb-6">Laporan</h1>

      <div className="flex gap-1 p-1 bg-black/5 rounded-xl mb-6">
        <button
          onClick={() => setActiveTab('jimpitan')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'jimpitan' ? 'bg-white shadow-sm text-foreground' : 'text-foreground/50'
          }`}
        >
          Laporan Jimpitan
        </button>
        <button
          onClick={() => setActiveTab('keuangan')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'keuangan' ? 'bg-white shadow-sm text-foreground' : 'text-foreground/50'
          }`}
        >
          Laporan Keuangan
        </button>
      </div>

      {activeTab === 'jimpitan' && (
        <div className="flex flex-col gap-4">
          <div className="bg-white p-5 rounded-2xl border border-black/5">
            <label className="block text-sm font-semibold text-foreground mb-2">Pilih Periode</label>
            <select
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="w-full rounded-xl border border-black/8 bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
            >
              {periods.map(p => (
                <option key={p.id} value={p.id}>
                  {formatDateRange(p.startDate, p.endDate)}
                </option>
              ))}
            </select>
            
            <div className="mt-4 p-4 bg-green-50/50 border border-green-100 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-green-700">Progress Pembayaran</p>
                <p className="text-sm font-bold text-green-800 mt-0.5">{paidCount} dari {totalHouses} rumah lunas</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center font-bold text-green-700 text-sm">
                {totalHouses > 0 ? Math.round((paidCount/totalHouses)*100) : 0}%
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
            <ul className="divide-y divide-black/[0.04]">
              {houses.map(house => {
                const isPaid = payments.some(p => p.houseId === house.id);
                return (
                  <li key={house.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                        {house.houseNumber}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{house.headOfFamily}</p>
                        <p className="text-xs text-foreground/50 mt-0.5">Rumah {house.houseNumber}</p>
                      </div>
                    </div>
                    <div>
                      {isPaid ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
                          LUNAS
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-600">
                          BELUM
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            {houses.length === 0 && !loading && (
              <div className="p-8 text-center text-sm text-foreground/50">Belum ada data rumah aktif.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'keuangan' && (
        <div className="flex flex-col gap-4">
          <div className="bg-white p-5 rounded-2xl border border-black/5">
            <label className="block text-sm font-semibold text-foreground mb-2">Pilih Bulan</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full rounded-xl border border-black/8 bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
              <p className="text-[10px] text-green-700/80 mb-1 font-semibold">Total Pemasukan</p>
              <p className="text-sm font-bold text-green-700 truncate w-full">Rp {financialSummary.income.toLocaleString('id-ID')}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
              <p className="text-[10px] text-red-600/80 mb-1 font-semibold">Total Pengeluaran</p>
              <p className="text-sm font-bold text-red-600 truncate w-full">Rp {financialSummary.expense.toLocaleString('id-ID')}</p>
            </div>
            <div className="bg-primary p-4 rounded-2xl col-span-2 shadow-sm mt-2">
              <p className="text-xs text-[#000000]/70 mb-1 font-semibold">Saldo Bulan Ini</p>
              <p className="text-xl font-bold text-[#000000]">Rp {financialSummary.balance.toLocaleString('id-ID')}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
            <div className="p-4 border-b border-black/5 bg-black/[0.02]">
              <h2 className="font-semibold text-sm text-foreground">Daftar Transaksi</h2>
            </div>
            <ul className="divide-y divide-black/[0.04]">
              {transactions.map(tx => (
                <li key={tx.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm text-foreground">{tx.description || tx.category || 'Transaksi'}</p>
                    <p className="text-xs text-foreground/50 mt-0.5">{tx.createdAt?.toDate().toLocaleDateString('id-ID')}</p>
                  </div>
                  <div className={`font-bold text-sm ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.type === 'income' ? '+' : '-'} Rp {tx.amount.toLocaleString('id-ID')}
                  </div>
                </li>
              ))}
            </ul>
            {transactions.length === 0 && !loading && (
              <div className="p-8 text-center text-sm text-foreground/50">Belum ada transaksi di bulan ini.</div>
            )}
          </div>
        </div>
      )}
      
      {loading && (
        <div className="flex justify-center p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      )}
    </div>
  );
}
