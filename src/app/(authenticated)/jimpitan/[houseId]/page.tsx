'use client';

import { ArrowLeft, CheckCircle2, AlertCircle, Circle, Home } from 'lucide-react';
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
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="bg-primary text-[#000000] px-4 py-4 sticky top-0 z-10 shadow-sm flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1 hover:bg-black/10 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold">Detail Rumah</h1>
      </div>

      <div className="p-4 space-y-6 max-w-lg mx-auto">
        {/* Card Info Rumah */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-secondary text-[#f7f7f7] rounded-full flex items-center justify-center flex-shrink-0">
              <Home className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{house.headOfFamily}</h2>
              <p className="text-gray-500 font-medium">Rumah {house.houseNumber}</p>
              {house.address && <p className="text-sm text-gray-500 mt-1">{house.address}</p>}
            </div>
          </div>
          
          {arrearPeriods.length > 0 && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <div className="font-semibold text-sm">
                {arrearPeriods.length} Periode Tunggakan &bull; Rp {formatRupiah(totalArrearAmount)}
              </div>
            </div>
          )}
        </div>

        {/* Daftar Periode Jimpitan */}
        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-3">Daftar Periode</h3>
          <div className="space-y-3">
            {periods.map(period => {
              const isPaid = isPaymentDone(period.id);
              const isArrearPeriod = isArrear(period);
              const isActive = period.status === 'active';
              const isSelected = selectedPeriodIds.includes(period.id);

              let cardClasses = "flex items-center justify-between p-4 rounded-xl border transition-colors cursor-pointer select-none ";
              let icon = null;
              
              if (isPaid) {
                cardClasses += "bg-green-50 border-green-200 text-green-800";
                icon = <CheckCircle2 className="w-6 h-6 text-green-600" />;
              } else if (isArrearPeriod) {
                cardClasses += isSelected 
                  ? "bg-orange-50 border-orange-500 shadow-sm" 
                  : "bg-white border-orange-300";
                icon = isSelected ? (
                  <CheckCircle2 className="w-6 h-6 text-primary fill-primary text-[#000000]" />
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-orange-400" />
                );
              } else if (isActive) {
                cardClasses += isSelected 
                  ? "bg-primary/10 border-primary shadow-sm" 
                  : "bg-white border-gray-200";
                icon = isSelected ? (
                  <CheckCircle2 className="w-6 h-6 text-primary fill-primary text-[#000000]" />
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
                );
              } else {
                 cardClasses += "bg-gray-50 border-gray-200 text-gray-500 opacity-75";
                 icon = <Circle className="w-6 h-6 text-gray-300" />;
              }

              return (
                <div 
                  key={period.id} 
                  className={cardClasses}
                  onClick={() => togglePeriod(period)}
                >
                  <div>
                    <div className="font-medium">{formatPeriod(period)}</div>
                    <div className="text-sm mt-0.5 opacity-80">
                      {isPaid ? "Lunas" : isArrearPeriod ? "Tunggakan" : isActive ? "Aktif" : "Selesai"}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {!isPaid && <div className="font-semibold text-gray-900">Rp 3.500</div>}
                    {icon}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Riwayat Pembayaran Terakhir */}
        {payments.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-bold text-gray-800 mb-3">Riwayat Pembayaran</h3>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {payments.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()).slice(0, 5).map((payment, idx) => {
                const p = periods.find(per => per.id === payment.periodId);
                return (
                  <div key={payment.id} className={`p-4 flex justify-between items-center ${idx !== 0 ? 'border-t border-gray-100' : ''}`}>
                    <div>
                      <div className="font-medium text-gray-800">{p ? formatPeriod(p) : 'Periode Tidak Diketahui'}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {payment.paidAt.toDate().toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'})}
                      </div>
                    </div>
                    <div className="font-semibold text-green-600">Rp 3.500</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Bar untuk Pembayaran */}
      {selectedPeriodIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] p-4 z-20">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500 font-medium">{selectedPeriodIds.length} Periode dipilih</div>
              <div className="text-lg font-bold text-gray-900">Total: Rp {formatRupiah(selectedAmount)}</div>
            </div>
            <button 
              onClick={() => setShowPaymentModal(true)}
              className="bg-primary text-[#000000] font-bold px-6 py-3 rounded-full shadow-md active:scale-95 transition-transform"
            >
              Bayar Sekarang
            </button>
          </div>
        </div>
      )}

      {/* Modal Pembayaran */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Konfirmasi Pembayaran</h3>
              <p className="text-gray-500 text-center text-sm mb-6">
                Pastikan Anda telah menerima uang tunai dari warga.
              </p>
              
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Jumlah Periode</span>
                  <span className="font-bold text-gray-900">{selectedPeriodIds.length}x</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Bayar</span>
                  <span className="font-bold text-xl text-primary drop-shadow-sm">Rp {formatRupiah(selectedAmount)}</span>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowPaymentModal(false)}
                  disabled={isPaying}
                  className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button 
                  onClick={handlePayment}
                  disabled={isPaying}
                  className="flex-1 py-3 px-4 bg-primary text-[#000000] font-bold rounded-xl shadow-md flex items-center justify-center"
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
        </div>
      )}

      {/* Modal Batal Pembayaran */}
      {showCancelModal.show && showCancelModal.period && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Batalkan Pembayaran?</h3>
              
              <div className="bg-red-50 text-red-800 border border-red-200 rounded-lg p-3 text-sm text-center mb-6">
                Tindakan ini akan membuat transaksi <b>pengeluaran (reversal)</b> di kas sebesar Rp 3.500.
              </div>
              
              <div className="mb-6 text-center space-y-1">
                <p className="text-gray-600 text-sm">Periode</p>
                <p className="font-semibold text-gray-900">{formatPeriod(showCancelModal.period)}</p>
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowCancelModal({show: false, payment: null, period: null})}
                  disabled={isCancelling}
                  className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 font-semibold rounded-xl"
                >
                  Kembali
                </button>
                <button 
                  onClick={handleCancel}
                  disabled={isCancelling}
                  className="flex-1 py-3 px-4 bg-red-600 text-white font-bold rounded-xl shadow-md flex items-center justify-center"
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
        </div>
      )}
    </div>
  );
}
