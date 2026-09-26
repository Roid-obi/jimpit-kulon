'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, query, where, orderBy, getDocs, getFirestore } from 'firebase/firestore';
import { app } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { ArrowLeft, TrendingDown } from 'lucide-react';

const db = getFirestore(app);

type Expense = {
  id: string;
  amount: number;
  description: string;
  takenBy: string;
  createdAt: any;
};

export default function PengeluaranPage() {
  const { user, userData } = useAuth();
  const router = useRouter();
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [takenBy, setTakenBy] = useState('');
  const [note, setNote] = useState('');
  const [time, setTime] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'financial_transactions'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((tx: any) => tx.type === 'expense') as Expense[];
      setExpenses(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description || !takenBy || !userData) return;

    try {
      setSubmitting(true);
      const createdAt = new Date(time);
      
      await addDoc(collection(db, 'financial_transactions'), {
        type: 'expense',
        category: 'operational',
        amount: Number(amount),
        description,
        houseId: null,
        paymentId: null,
        takenBy,
        note,
        createdBy: user?.uid ?? 'unknown',
        createdAt: createdAt
      });
      
      setAmount('');
      setDescription('');
      setTakenBy('');
      setNote('');
      alert('Pengeluaran berhasil disimpan!');
      fetchExpenses();
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan pengeluaran');
    } finally {
      setSubmitting(false);
    }
  };

  const formatRupiah = (val: number) => `Rp ${val.toLocaleString('id-ID')}`;

  return (
    <div className="max-w-lg mx-auto px-4 pb-24 bg-background min-h-screen pt-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-white border border-black/8 flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Tambah Pengeluaran</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-black/5 p-5 mb-6 flex flex-col gap-4">
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">Nominal</label>
          <div className="relative">
            <span className="absolute left-4 top-3.5 text-foreground/50 text-sm font-medium">Rp</span>
            <input 
              type="number" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 pl-11 rounded-xl border border-black/8 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="0"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">Keperluan</label>
          <input 
            type="text" 
            value={description} 
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-black/8 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Deskripsi pengeluaran..."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">Diambil oleh</label>
          <input 
            type="text" 
            value={takenBy} 
            onChange={(e) => setTakenBy(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-black/8 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Nama pengambil dana..."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">Catatan (Opsional)</label>
          <textarea 
            value={note} 
            onChange={(e) => setNote(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-black/8 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            rows={2}
            placeholder="Catatan tambahan..."
          ></textarea>
        </div>

        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">Waktu</label>
          <input 
            type="datetime-local" 
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-black/8 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            required
          />
        </div>

        <button 
          type="submit" 
          disabled={submitting}
          className="bg-secondary text-[#f7f7f7] py-4 rounded-xl font-bold text-base w-full mt-2 disabled:opacity-50"
        >
          {submitting ? 'Menyimpan...' : 'Simpan Pengeluaran'}
        </button>
      </form>

      <h2 className="text-lg font-bold text-foreground mb-4">Daftar Pengeluaran</h2>
      
      {loading ? (
        <p className="text-center text-sm text-foreground/50 py-4">Memuat data...</p>
      ) : expenses.length === 0 ? (
        <p className="text-center text-sm text-foreground/50 py-4">Belum ada pengeluaran</p>
      ) : (
        <div className="flex flex-col gap-2">
          {expenses.map(exp => (
            <div key={exp.id} className="bg-white px-4 py-3.5 rounded-2xl border border-black/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-red-100">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{exp.description}</p>
                  <p className="text-xs text-foreground/50 mt-0.5">
                    Oleh: {exp.takenBy} &bull; {exp.createdAt?.toDate ? exp.createdAt.toDate().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'}) : 'Tanggal tidak tersedia'}
                  </p>
                </div>
              </div>
              <p className="font-bold text-sm text-red-600">-{formatRupiah(exp.amount)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
