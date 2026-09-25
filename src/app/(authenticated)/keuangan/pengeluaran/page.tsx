'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, query, where, orderBy, getDocs, getFirestore } from 'firebase/firestore';
import { app } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

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
        where('type', '==', 'expense'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Expense[];
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
    <div className="flex flex-col p-4 bg-background min-h-screen">
      <button onClick={() => router.back()} className="text-sm text-gray-600 mb-4 flex items-center">
        &larr; Kembali
      </button>
      
      <h1 className="text-2xl font-bold text-foreground mb-6">Tambah Pengeluaran</h1>

      <form onSubmit={handleSubmit} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-8 flex flex-col gap-4">
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
          <label className="block text-sm font-medium text-foreground mb-1">Keperluan</label>
          <input 
            type="text" 
            value={description} 
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 border rounded-lg"
            placeholder="Deskripsi pengeluaran..."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Diambil oleh</label>
          <input 
            type="text" 
            value={takenBy} 
            onChange={(e) => setTakenBy(e.target.value)}
            className="w-full p-2 border rounded-lg"
            placeholder="Nama pengambil dana..."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Catatan (Opsional)</label>
          <textarea 
            value={note} 
            onChange={(e) => setNote(e.target.value)}
            className="w-full p-2 border rounded-lg"
            rows={2}
            placeholder="Catatan tambahan..."
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
          {submitting ? 'Menyimpan...' : 'Simpan Pengeluaran'}
        </button>
      </form>

      <h2 className="text-lg font-bold text-foreground mb-4">Daftar Pengeluaran</h2>
      
      {loading ? (
        <p className="text-center text-gray-500 py-4">Memuat data...</p>
      ) : expenses.length === 0 ? (
        <p className="text-center text-gray-500 py-4">Belum ada pengeluaran</p>
      ) : (
        <div className="flex flex-col gap-3">
          {expenses.map(exp => (
            <div key={exp.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
              <div>
                <p className="font-medium text-foreground">{exp.description}</p>
                <p className="text-sm text-gray-600">Oleh: {exp.takenBy}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {exp.createdAt?.toDate ? exp.createdAt.toDate().toLocaleDateString('id-ID') : 'Tanggal tidak tersedia'}
                </p>
              </div>
              <p className="font-bold text-red-600">-{formatRupiah(exp.amount)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
