'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, query, where, orderBy, getDocs, getFirestore } from 'firebase/firestore';
import { app } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { ArrowLeft, TrendingUp } from 'lucide-react';

const db = getFirestore(app);

type Income = {
  id: string;
  amount: number;
  category: string;
  description: string;
  createdAt: any;
};

export default function PemasukanPage() {
  const { user, userData } = useAuth();
  const router = useRouter();
  
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [category, setCategory] = useState('donation');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [time, setTime] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });

  const fetchIncomes = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'financial_transactions'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((tx: any) => tx.type === 'income') as Income[];
      setIncomes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncomes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description || !userData) return;

    try {
      setSubmitting(true);
      const createdAt = new Date(time);
      
      await addDoc(collection(db, 'financial_transactions'), {
        type: 'income',
        category,
        amount: Number(amount),
        description,
        houseId: null,
        paymentId: null,
        takenBy: null,
        createdBy: user?.uid ?? 'unknown',
        createdAt: createdAt
      });
      
      setAmount('');
      setDescription('');
      setCategory('donation');
      alert('Pemasukan berhasil disimpan!');
      fetchIncomes();
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan pemasukan');
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryLabel = (cat: string) => {
    if (cat === 'donation') return 'Donasi';
    if (cat === 'payment') return 'Pembayaran Lain';
    return 'Lainnya';
  };

  const formatRupiah = (val: number) => `Rp ${val.toLocaleString('id-ID')}`;

  return (
    <div className="max-w-lg mx-auto px-4 pb-24 bg-background min-h-screen pt-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-white border border-black/8 flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Tambah Pemasukan</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-black/5 p-5 mb-6 flex flex-col gap-4">
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">Kategori</label>
          <select 
            value={category} 
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-black/8 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="donation">Donasi</option>
            <option value="payment">Pembayaran Lain</option>
            <option value="other">Lainnya</option>
          </select>
        </div>

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
          <label className="block text-sm font-semibold text-foreground mb-1.5">Keterangan</label>
          <textarea 
            value={description} 
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-black/8 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            rows={3}
            placeholder="Keterangan pemasukan..."
            required
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
          className="bg-primary text-[#000000] py-4 rounded-xl font-bold text-base w-full mt-2 disabled:opacity-50"
        >
          {submitting ? 'Menyimpan...' : 'Simpan Pemasukan'}
        </button>
      </form>

      <h2 className="text-lg font-bold text-foreground mb-4">Daftar Pemasukan</h2>
      
      {loading ? (
        <p className="text-center text-sm text-foreground/50 py-4">Memuat data...</p>
      ) : incomes.length === 0 ? (
        <p className="text-center text-sm text-foreground/50 py-4">Belum ada pemasukan</p>
      ) : (
        <div className="flex flex-col gap-2">
          {incomes.map(inc => (
            <div key={inc.id} className="bg-white px-4 py-3.5 rounded-2xl border border-black/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-green-100">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{inc.description}</p>
                  <p className="text-xs text-foreground/50 mt-0.5">
                    {getCategoryLabel(inc.category)} &bull; {inc.createdAt?.toDate ? inc.createdAt.toDate().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'}) : 'Tanggal tidak tersedia'}
                  </p>
                </div>
              </div>
              <p className="font-bold text-sm text-green-600">+{formatRupiah(inc.amount)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
