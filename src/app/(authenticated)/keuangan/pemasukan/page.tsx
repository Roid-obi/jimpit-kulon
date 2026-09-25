'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, query, where, orderBy, getDocs, getFirestore } from 'firebase/firestore';
import { app } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

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
        where('type', '==', 'income'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Income[];
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
    <div className="flex flex-col p-4 bg-background min-h-screen">
      <button onClick={() => router.back()} className="text-sm text-gray-600 mb-4 flex items-center">
        &larr; Kembali
      </button>
      
      <h1 className="text-2xl font-bold text-foreground mb-6">Tambah Pemasukan</h1>

      <form onSubmit={handleSubmit} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-8 flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Kategori</label>
          <select 
            value={category} 
            onChange={(e) => setCategory(e.target.value)}
            className="w-full p-2 border rounded-lg"
          >
            <option value="donation">Donasi</option>
            <option value="payment">Pembayaran Lain</option>
            <option value="other">Lainnya</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Nominal</label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-gray-500">Rp</span>
            <input 
              type="number" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)}
              className="w-full p-2 pl-10 border rounded-lg"
              placeholder="0"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Keterangan</label>
          <textarea 
            value={description} 
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 border rounded-lg"
            rows={3}
            placeholder="Keterangan pemasukan..."
            required
          ></textarea>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Waktu</label>
          <input 
            type="datetime-local" 
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full p-2 border rounded-lg"
            required
          />
        </div>

        <button 
          type="submit" 
          disabled={submitting}
          className="w-full bg-secondary text-[#f7f7f7] py-3 rounded-lg font-medium mt-2 disabled:opacity-50"
        >
          {submitting ? 'Menyimpan...' : 'Simpan Pemasukan'}
        </button>
      </form>

      <h2 className="text-lg font-bold text-foreground mb-4">Daftar Pemasukan</h2>
      
      {loading ? (
        <p className="text-center text-gray-500 py-4">Memuat data...</p>
      ) : incomes.length === 0 ? (
        <p className="text-center text-gray-500 py-4">Belum ada pemasukan</p>
      ) : (
        <div className="flex flex-col gap-3">
          {incomes.map(inc => (
            <div key={inc.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
              <div>
                <p className="font-medium text-foreground">{inc.description}</p>
                <div className="flex gap-2 items-center mt-1">
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                    {getCategoryLabel(inc.category)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {inc.createdAt?.toDate ? inc.createdAt.toDate().toLocaleDateString('id-ID') : 'Tanggal tidak tersedia'}
                  </span>
                </div>
              </div>
              <p className="font-bold text-green-600">+{formatRupiah(inc.amount)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
