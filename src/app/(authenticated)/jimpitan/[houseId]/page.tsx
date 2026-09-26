'use client';

import { ArrowLeft, CheckCircle2, AlertCircle, Circle, Home, Check } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  collection, doc, getDocs, getDoc, getFirestore,
  orderBy, query, serverTimestamp, where, writeBatch
} from 'firebase/firestore';
import { app } from '@/lib/firebase/client';
import type { House, Period, Payment } from '@/types/jimpitan';

export default function HouseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const houseId = params.houseId as string;
  const { user } = useAuth();

  const [house, setHouse] = useState<House | null>(null);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedPeriodIds, setSelectedPeriodIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState<{show: boolean, payment: Payment | null, period: Period | null}>({show: false, payment: null, period: null});
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!houseId) return;
      setIsLoading(true);
      try {
        const db = getFirestore(app);
        
        // 1. Ambil data rumah
        const houseDoc = await getDoc(doc(db, 'houses', houseId));
        if (houseDoc.exists()) {
          setHouse({ id: houseDoc.id, ...houseDoc.data() } as House);
        }

        // 2. Ambil semua periods, diurutkan dari terlama ke terbaru
        const periodsQ = query(collection(db, 'periods'), orderBy('startDate', 'asc'));
        const periodsSnap = await getDocs(periodsQ);
        setPeriods(periodsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Period)));

        // 3. Ambil semua payments untuk rumah ini yang berstatus paid
        const paymentsQ = query(collection(db, 'payments'), where('houseId', '==', houseId), where('status', '==', 'paid'));
        const paymentsSnap = await getDocs(paymentsQ);
        setPayments(paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
        
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [houseId]);

  const isPaymentDone = (periodId: string) =>
    payments.some(p => p.periodId === periodId && p.status === 'paid');

  const isArrear = (period: Period) =>
    period.status === 'archived' && !isPaymentDone(period.id);

  const arrearPeriods = periods.filter(p => isArrear(p));
  const totalArrearAmount = arrearPeriods.length * 3500;

  const formatPeriod = (period: Period) => {
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    const start = period.startDate.toDate().toLocaleDateString('id-ID', opts);
    const end = period.endDate.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${start} \u2013 ${end}`;
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID').format(amount);
  };

  const togglePeriod = (period: Period) => {
    if (isPaymentDone(period.id)) {
      const payment = payments.find(p => p.periodId === period.id);
      if (payment) {
        setShowCancelModal({ show: true, payment, period });
      }
      return;
    }
    setSelectedPeriodIds(prev =>
      prev.includes(period.id)
        ? prev.filter(id => id !== period.id)
        : [...prev, period.id]
    );
  };

  const handlePayment = async () => {
    if (!house || !user || selectedPeriodIds.length === 0) return;
    setIsPaying(true);
    try {
      const db = getFirestore(app);
      const batch = writeBatch(db);
      const amountPerPeriod = 3500;
      
      for (const periodId of selectedPeriodIds) {
        const existQ = query(
          collection(db, 'payments'),
          where('houseId', '==', house.id),
          where('periodId', '==', periodId)
        );
        const existSnap = await getDocs(existQ);
        if (!existSnap.empty) continue;
        
        const paymentRef = doc(collection(db, 'payments'));
        batch.set(paymentRef, {
          houseId: house.id,
          periodId,
          paidBy: user.uid,
          paidAt: serverTimestamp(),
          status: 'paid',
          createdAt: serverTimestamp(),
        });
        
        const txRef = doc(collection(db, 'financial_transactions'));
        batch.set(txRef, {
          type: 'income',
          category: 'payment',
          amount: amountPerPeriod,
          description: 'Pembayaran jimpitan rutin',
          houseId: house.id,
          paymentId: paymentRef.id,
          takenBy: null,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
        });
      }
      
      await batch.commit();
      
      const updatedQ = query(
        collection(db, 'payments'),
        where('houseId', '==', house.id),
        where('status', '==', 'paid')
      );
      const updatedSnap = await getDocs(updatedQ);
      setPayments(updatedSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Payment));
      setSelectedPeriodIds([]);
      setShowPaymentModal(false);
    } catch (err) {
      console.error(err);
      alert('Gagal mencatat pembayaran');
    } finally {
      setIsPaying(false);
    }
  };

  const handleCancel = async () => {
    if (!showCancelModal.payment || !user) return;
    setIsCancelling(true);
    try {
      const db = getFirestore(app);
      const batch = writeBatch(db);
      
      const paymentRef = doc(db, 'payments', showCancelModal.payment.id);
      batch.update(paymentRef, {
        status: 'cancelled',
        cancelledAt: serverTimestamp(),
        cancelledBy: user.uid,
      });
      
      const reversalRef = doc(collection(db, 'financial_transactions'));
      batch.set(reversalRef, {
        type: 'expense',
        category: 'cancellation',
        amount: 3500,
        description: 'Pembatalan pembayaran jimpitan',
        houseId: house?.id || null,
        paymentId: showCancelModal.payment.id,
        takenBy: null,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });
      
      await batch.commit();
      
      const updatedQ = query(
        collection(db, 'payments'),
        where('houseId', '==', house?.id || ''),
        where('status', '==', 'paid')
      );
      const updatedSnap = await getDocs(updatedQ);
      setPayments(updatedSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Payment));
      setShowCancelModal({ show: false, payment: null, period: null });
    } catch (err) {
      console.error(err);
      alert('Gagal membatalkan pembayaran');
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary"></div>
      </div>
    );
  }

  if (!house) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-background p-4 text-center">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Data Rumah Tidak Ditemukan</h2>
        <button onClick={() => router.back()} className="text-secondary font-medium">Kembali</button>
      </div>
    );
  }

  const selectedAmount = selectedPeriodIds.length * 3500;

  return (
    <div className="max-w-lg mx-auto px-4 pb-32 bg-background min-h-screen pt-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-white border border-black/8 flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Detail Rumah</h1>
      </div>

      <div className="space-y-4">
        {/* Card Info Rumah */}
        <div className="bg-white rounded-2xl border border-black/5 p-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center flex-shrink-0">
              <Home className="w-7 h-7 text-secondary" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-foreground">{house.headOfFamily}</h2>
              <p className="text-sm font-semibold text-foreground/50">Rumah {house.houseNumber}</p>
              {house.address && <p className="text-xs font-medium text-foreground/40 mt-0.5">{house.address}</p>}
            </div>
          </div>
          
          {arrearPeriods.length > 0 && (
            <div className="mt-4 flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-xl px-3.5 py-2.5">
              <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <p className="text-xs font-bold text-orange-700">
                {arrearPeriods.length} Periode Tunggakan &bull; Rp {formatRupiah(totalArrearAmount)}
              </p>
            </div>
          )}
        </div>

        {/* Daftar Periode Jimpitan */}
        <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
          <div className="px-4 py-3.5 border-b border-black/5 bg-black/[0.02]">
            <h3 className="font-semibold text-sm text-foreground">Riwayat Periode</h3>
          </div>
          <div className="divide-y divide-black/[0.04]">
            {periods.map(period => {
              const paid = isPaymentDone(period.id);
              const arrear = isArrear(period);
              const active = period.status === 'active';
              const selected = selectedPeriodIds.includes(period.id);

              return (
                <button 
                  key={period.id} 
                  onClick={() => togglePeriod(period)} 
                  className="w-full px-4 py-3.5 flex items-center gap-3 text-left active:bg-black/5 transition-colors"
                >
                  {/* Status indicator */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    paid ? 'bg-green-100' :
                    arrear ? 'bg-orange-100' :
                    active ? 'bg-primary/20' :
                    'bg-black/5'
                  }`}>
                    {paid
                      ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                      : arrear
                      ? <AlertCircle className="w-5 h-5 text-orange-500" />
                      : active
                      ? <Circle className="w-5 h-5 text-primary" fill="currentColor" />
                      : <Circle className="w-5 h-5 text-foreground/20" />
                    }
                  </div>
                  
                  {/* Info periode */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{formatPeriod(period)}</p>
                    <p className={`text-[10px] font-bold mt-0.5 uppercase tracking-wide ${
                      paid ? 'text-green-600' :
                      arrear ? 'text-orange-500' :
                      active ? 'text-primary' :
                      'text-foreground/30'
                    }`}>
                      {paid ? 'Lunas' : arrear ? 'Tunggakan' : active ? 'Periode Berjalan' : 'Selesai'}
                    </p>
                  </div>
                  
                  {/* Nominal & checkbox */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-foreground">Rp 3.500</span>
                    {!paid && (
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                        selected ? 'bg-primary border-primary' : 'border-black/20'
                      }`}>
                        {selected && <Check className="w-3.5 h-3.5 text-[#000000]" strokeWidth={3} />}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sticky Bottom Bar untuk Pembayaran */}
      {selectedPeriodIds.length > 0 && (
        <div className="fixed bottom-[72px] left-0 right-0 z-30 px-4 py-3 bg-white border-t border-black/8 shadow-[0_-8px_20px_rgba(0,0,0,0.08)]">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-foreground/50">{selectedPeriodIds.length} periode dipilih</p>
              <p className="text-base font-bold text-foreground">Rp {formatRupiah(selectedAmount)}</p>
            </div>
            <button 
              onClick={() => setShowPaymentModal(true)}
              className="bg-primary text-[#000000] px-6 py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform"
            >
              Bayar Sekarang
            </button>
          </div>
        </div>
      )}

      {/* Modal Pembayaran */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center backdrop-blur-sm">
          <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 pb-10 shadow-2xl animate-in slide-in-from-bottom-full duration-300">
            <h3 className="text-xl font-bold text-foreground text-center mb-1">Konfirmasi Pembayaran</h3>
            <p className="text-foreground/50 font-medium text-center text-sm mb-6">
              Pastikan Anda telah menerima uang tunai dari warga.
            </p>
            
            <div className="bg-black/5 rounded-2xl p-5 mb-6 border border-black/5">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-semibold text-foreground/70">Jumlah Periode</span>
                <span className="font-bold text-foreground text-base">{selectedPeriodIds.length}x</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-foreground/70">Total Bayar</span>
                <span className="font-bold text-2xl text-primary drop-shadow-sm">Rp {formatRupiah(selectedAmount)}</span>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setShowPaymentModal(false)}
                disabled={isPaying}
                className="flex-1 py-3.5 px-4 bg-black/5 text-foreground font-bold rounded-xl text-sm"
              >
                Batal
              </button>
              <button 
                onClick={handlePayment}
                disabled={isPaying}
                className="flex-1 py-3.5 px-4 bg-primary text-[#000000] font-bold rounded-xl shadow-sm text-sm flex items-center justify-center"
              >
                {isPaying ? (
                  <div className="w-5 h-5 border-2 border-[#000000] border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Konfirmasi'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Batal Pembayaran */}
      {showCancelModal.show && showCancelModal.period && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center backdrop-blur-sm">
          <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 pb-10 shadow-2xl animate-in slide-in-from-bottom-full duration-300">
            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-foreground text-center mb-2">Batalkan Pembayaran?</h3>
            
            <div className="bg-red-50 text-red-800 border border-red-200 rounded-xl p-3 text-xs font-medium text-center mb-6">
              Tindakan ini akan membuat transaksi <b>pengeluaran (reversal)</b> di kas sebesar Rp 3.500.
            </div>
            
            <div className="mb-6 text-center space-y-1">
              <p className="text-foreground/60 text-sm font-semibold">Periode</p>
              <p className="font-bold text-foreground text-base">{formatPeriod(showCancelModal.period)}</p>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setShowCancelModal({show: false, payment: null, period: null})}
                disabled={isCancelling}
                className="flex-1 py-3.5 px-4 bg-black/5 text-foreground font-bold rounded-xl text-sm"
              >
                Kembali
              </button>
              <button 
                onClick={handleCancel}
                disabled={isCancelling}
                className="flex-1 py-3.5 px-4 bg-red-600 text-white font-bold rounded-xl shadow-sm text-sm flex items-center justify-center"
              >
                {isCancelling ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Ya, Batalkan'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
