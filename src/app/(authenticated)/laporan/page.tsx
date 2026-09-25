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

      const housesSnap = await getDocs(query(collection(db, 'houses'), where('isActive', '==', true), orderBy('houseNumber', 'asc')));
      setHouses(housesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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
      
      const txSnap = await getDocs(query(
        collection(db, 'financial_transactions'),
        where('createdAt', '>=', Timestamp.fromDate(startOfMonth)),
        where('createdAt', '<=', Timestamp.fromDate(endOfMonth)),
        orderBy('createdAt', 'desc')
      ));
      
      const txData = txSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
    <div className="p-4 max-w-4xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-foreground mb-6">Laporan</h1>

      <div className="flex gap-2 p-1 bg-foreground/10 rounded-lg mb-6">
        <button
          onClick={() => setActiveTab('jimpitan')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'jimpitan' ? 'bg-background shadow text-foreground' : 'text-foreground/60'
          }`}
        >
          Laporan Jimpitan
        </button>
        <button
          onClick={() => setActiveTab('keuangan')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'keuangan' ? 'bg-background shadow text-foreground' : 'text-foreground/60'
          }`}
        >
          Laporan Keuangan
        </button>
      </div>

      {activeTab === 'jimpitan' && (
        <div className="flex flex-col gap-4">
          <div className="bg-background p-4 rounded-xl shadow-sm border border-foreground/10">
            <label className="block text-sm font-medium text-foreground/80 mb-2">Pilih Periode</label>
            <select
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="w-full p-2 border border-foreground/20 rounded-md bg-background text-foreground"
            >
              {periods.map(p => (
                <option key={p.id} value={p.id}>
                  {formatDateRange(p.startDate, p.endDate)}
                </option>
              ))}
            </select>
            
            <div className="mt-4 p-3 bg-primary/10 rounded-lg">
              <p className="text-sm font-medium text-foreground">
                Progress Pembayaran: <span className="font-bold text-primary">{paidCount} dari {totalHouses} rumah lunas</span>
              </p>
            </div>
          </div>

          <div className="bg-background rounded-xl shadow-sm border border-foreground/10 overflow-hidden">
            <ul className="divide-y divide-foreground/10">
              {houses.map(house => {
                const isPaid = payments.some(p => p.houseId === house.id);
                return (
                  <li key={house.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{house.houseNumber}</p>
                      <p className="text-sm text-foreground/70">{house.headOfFamily}</p>
                    </div>
                    <div>
                      {isPaid ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Lunas
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Belum
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            {houses.length === 0 && !loading && (
              <div className="p-8 text-center text-foreground/60">Belum ada data rumah aktif.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'keuangan' && (
        <div className="flex flex-col gap-4">
          <div className="bg-background p-4 rounded-xl shadow-sm border border-foreground/10">
            <label className="block text-sm font-medium text-foreground/80 mb-2">Pilih Bulan</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full p-2 border border-foreground/20 rounded-md bg-background text-foreground"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-background p-4 rounded-xl shadow-sm border border-foreground/10">
              <p className="text-sm text-foreground/70 mb-1">Total Pemasukan</p>
              <p className="text-xl font-bold text-green-600">Rp {financialSummary.income.toLocaleString('id-ID')}</p>
            </div>
            <div className="bg-background p-4 rounded-xl shadow-sm border border-foreground/10">
              <p className="text-sm text-foreground/70 mb-1">Total Pengeluaran</p>
              <p className="text-xl font-bold text-red-600">Rp {financialSummary.expense.toLocaleString('id-ID')}</p>
            </div>
            <div className="bg-primary p-4 rounded-xl shadow-sm">
              <p className="text-sm text-[#000000]/70 mb-1">Saldo Bulan Ini</p>
              <p className="text-xl font-bold text-[#000000]">Rp {financialSummary.balance.toLocaleString('id-ID')}</p>
            </div>
          </div>

          <div className="bg-background rounded-xl shadow-sm border border-foreground/10 overflow-hidden">
            <div className="p-4 border-b border-foreground/10 bg-foreground/5">
              <h2 className="font-semibold text-foreground">Daftar Transaksi</h2>
            </div>
            <ul className="divide-y divide-foreground/10">
              {transactions.map(tx => (
                <li key={tx.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{tx.description || tx.category || 'Transaksi'}</p>
                    <p className="text-xs text-foreground/60">{tx.createdAt?.toDate().toLocaleDateString('id-ID')}</p>
                  </div>
                  <div className={`font-semibold ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.type === 'income' ? '+' : '-'} Rp {tx.amount.toLocaleString('id-ID')}
                  </div>
                </li>
              ))}
            </ul>
            {transactions.length === 0 && !loading && (
              <div className="p-8 text-center text-foreground/60">Belum ada transaksi di bulan ini.</div>
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
