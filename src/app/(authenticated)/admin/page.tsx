'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  collection, doc, getDocs, getFirestore,
  orderBy, query, serverTimestamp, Timestamp,
  updateDoc, addDoc, deleteDoc, writeBatch, setDoc
} from 'firebase/firestore';
import { app } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import QRCode from 'react-qr-code';
import {
  LayoutDashboard, Home, Calendar, CreditCard, Wallet, Users, Settings,
  Plus, Edit, Trash2, Check, X, Archive, QrCode, Download, Search,
  RefreshCw, Menu, LogOut, ArrowRight, Shield, AlertTriangle,
  ChevronRight, Database, CheckCircle2
} from 'lucide-react';
import type { House, Period, Payment, FinancialTransaction } from '@/types/jimpitan';
import type { AppUser } from '@/lib/services/users';
import { createAdminUser, updateAdminUser, deleteAdminUser } from '@/lib/services/users';
import { cancelPayment, recordPayment } from '@/lib/services/payments';

const db = getFirestore(app);

type AdminSection = 'overview' | 'houses' | 'periods' | 'payments' | 'transactions' | 'users' | 'settings';

export default function AdminPage() {
  const { user, userData, logout } = useAuth();
  const router = useRouter();

  // Navigation State
  const [currentSection, setCurrentSection] = useState<AdminSection>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Global State
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Entities Data State
  const [houses, setHouses] = useState<House[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);

  // Search & Filter States
  const [houseSearch, setHouseSearch] = useState('');
  const [houseFilter, setHouseFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [periodSearch, setPeriodSearch] = useState('');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'active' | 'archived'>('all');

  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'cancelled'>('all');

  const [txSearch, setTxSearch] = useState('');
  const [txFilterType, setTxFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [txFilterCategory, setTxFilterCategory] = useState<string>('all');

  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'admin' | 'petugas' | 'warga'>('all');

  // Modals State
  // 1. House Modals
  const [houseModalMode, setHouseModalMode] = useState<'create' | 'edit' | null>(null);
  const [activeHouse, setActiveHouse] = useState<Partial<House> | null>(null);
  const [selectedHouseForQR, setSelectedHouseForQR] = useState<House | null>(null);

  // 2. Period Modals
  const [periodModalMode, setPeriodModalMode] = useState<'create' | 'edit' | null>(null);
  const [activePeriod, setActivePeriod] = useState<any | null>(null);
  const [isBatchCreatingPeriods, setIsBatchCreatingPeriods] = useState(false);

  // 3. Payment Modals
  const [paymentModalMode, setPaymentModalMode] = useState<'create' | null>(null);
  const [activePayment, setActivePayment] = useState<any | null>(null);

  // 4. Transaction Modals
  const [txModalMode, setTxModalMode] = useState<'create' | null>(null);
  const [activeTx, setActiveTx] = useState<any | null>(null);

  // 5. User Modals
  const [userModalMode, setUserModalMode] = useState<'create' | 'edit' | null>(null);
  const [activeUser, setActiveUser] = useState<Partial<AppUser> | null>(null);
  const [userPassword, setUserPassword] = useState('');
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  // 6. Delete Confirmation Modal
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: async () => {},
  });

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Initial Data Fetching
  const fetchAllData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      // 1. Fetch Houses
      const houseSnap = await getDocs(collection(db, 'houses'));
      const houseList = houseSnap.docs.map(d => ({ id: d.id, ...d.data() })) as House[];
      houseList.sort((a, b) => (a.houseNumber || '').localeCompare(b.houseNumber || '', undefined, { numeric: true }));
      setHouses(houseList);

      // 2. Fetch Periods
      const periodSnap = await getDocs(query(collection(db, 'periods'), orderBy('startDate', 'desc')));
      const periodList = periodSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Period[];
      setPeriods(periodList);

      // 3. Fetch Payments
      const paymentSnap = await getDocs(query(collection(db, 'payments'), orderBy('createdAt', 'desc')));
      const paymentList = paymentSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Payment[];
      setPayments(paymentList);

      // 4. Fetch Transactions
      const txSnap = await getDocs(query(collection(db, 'financial_transactions'), orderBy('createdAt', 'desc')));
      const txList = txSnap.docs.map(d => ({ id: d.id, ...d.data() })) as FinancialTransaction[];
      setTransactions(txList);

      // 5. Fetch Users
      const userSnap = await getDocs(query(collection(db, 'users'), orderBy('name', 'asc')));
      const userList = userSnap.docs.map(d => ({ id: d.id, ...d.data() })) as AppUser[];
      setUsers(userList);

      if (isManual) showNotification('Data berhasil diperbarui!', 'success');
    } catch (err: any) {
      console.error('Error fetching admin data:', err);
      showNotification(`Gagal memuat data: ${err.message}`, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (userData?.role === 'admin') {
      fetchAllData();
    }
  }, [userData]);

  // Derived Financial Summary
  const financialSummary = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of transactions) {
      if (tx.type === 'income') income += tx.amount || 0;
      else if (tx.type === 'expense') expense += tx.amount || 0;
    }
    return {
      totalIncome: income,
      totalExpense: expense,
      balance: income - expense,
    };
  }, [transactions]);

  // Lookup Maps
  const houseMap = useMemo(() => {
    const map = new Map<string, House>();
    for (const h of houses) map.set(h.id, h);
    return map;
  }, [houses]);

  const periodMap = useMemo(() => {
    const map = new Map<string, Period>();
    for (const p of periods) map.set(p.id, p);
    return map;
  }, [periods]);

  const userMap = useMemo(() => {
    const map = new Map<string, AppUser>();
    for (const u of users) map.set(u.id, u);
    return map;
  }, [users]);

  // Formatting Helpers
  const formatDateRange = (start: any, end: any) => {
    if (!start || !end) return '-';
    try {
      const s = start?.toDate ? start.toDate() : new Date(start);
      const e = end?.toDate ? end.toDate() : new Date(end);
      return `${s.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} – ${e.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    } catch {
      return '-';
    }
  };

  const formatDateTime = (ts: any) => {
    if (!ts) return '-';
    try {
      const d = ts?.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '-';
    }
  };

  const startOfLocalDay = (date: Date) => {
    const next = new Date(date);
    next.setHours(0, 0, 0, 0);
    return next;
  };

  const addDays = (date: Date, days: number) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  };

  const toDateInput = (date: Date) => {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  };

  const parseDateInput = (value: string) => {
    const parts = value.split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    return Number.isNaN(date.getTime()) ? null : startOfLocalDay(date);
  };

  const calendarDayDiff = (start: Date, end: Date) => {
    const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
    const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
    return Math.round((endUtc - startUtc) / 86400000);
  };

  const rangesOverlap = (startA: Date, endA: Date, startB: Date, endB: Date) => {
    return startA.getTime() <= endB.getTime() && startB.getTime() <= endA.getTime();
  };

  const getNextPeriodStart = () => {
    if (periods.length === 0) return startOfLocalDay(new Date());
    const latestEnd = periods.reduce((max, period) => {
      const end = period.endDate?.toDate ? period.endDate.toDate() : null;
      return end && end.getTime() > max.getTime() ? end : max;
    }, new Date(0));
    return latestEnd.getTime() > 0 ? addDays(startOfLocalDay(latestEnd), 1) : startOfLocalDay(new Date());
  };

  const getLatestPeriodAmount = () => {
    if (periods.length === 0) return 3500;
    return periods.reduce((prev, curr) => (prev.periodNumber > curr.periodNumber ? prev : curr)).amount || 3500;
  };

  // QR Code PNG Downloader
  const downloadQRCode = () => {
    if (!selectedHouseForQR) return;
    const svg = document.getElementById('AdminQRCodeImage');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new window.Image();
    img.onload = () => {
      const qrSize = 220;
      const padding = 24;
      canvas.width = qrSize + padding * 2;
      canvas.height = qrSize + padding * 2 + 50;

      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, padding, padding, qrSize, qrSize);

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 15px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`No. ${selectedHouseForQR.houseNumber} - ${selectedHouseForQR.headOfFamily}`, canvas.width / 2, qrSize + padding + 26);
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#854836';
        ctx.fillText('Jimpit Kulon Dusun', canvas.width / 2, qrSize + padding + 42);
      }

      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `QR_Rumah_${selectedHouseForQR.houseNumber}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  // -------------------------------------------------------------
  // CRUD ACTIONS: RUMAH (HOUSES)
  // -------------------------------------------------------------
  const handleSaveHouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeHouse) return;

    const houseNumber = activeHouse.houseNumber?.trim() || '';
    const headOfFamily = activeHouse.headOfFamily?.trim() || '';
    const address = activeHouse.address?.trim() || '';

    if (!houseNumber || !headOfFamily || !address) {
      showNotification('Nomor rumah, kepala keluarga, dan alamat wajib diisi.', 'error');
      return;
    }

    const duplicate = houses.some(
      house => house.id !== activeHouse.id &&
        house.houseNumber.trim().toLowerCase() === houseNumber.toLowerCase()
    );
    if (duplicate) {
      showNotification(`Nomor rumah ${houseNumber} sudah dipakai.`, 'error');
      return;
    }

    try {
      if (houseModalMode === 'create') {
        const docRef = await addDoc(collection(db, 'houses'), {
          houseNumber,
          headOfFamily,
          address,
          notes: activeHouse.notes?.trim() || null,
          isActive: activeHouse.isActive ?? true,
          qrCode: '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        const qrValue = `RUMAH-${houseNumber || docRef.id}`;
        await updateDoc(doc(db, 'houses', docRef.id), { qrCode: qrValue });
        showNotification(`Rumah ${houseNumber} berhasil ditambahkan!`);
      } else if (houseModalMode === 'edit' && activeHouse.id) {
        await updateDoc(doc(db, 'houses', activeHouse.id), {
          houseNumber,
          headOfFamily,
          address,
          notes: activeHouse.notes?.trim() || null,
          isActive: activeHouse.isActive ?? true,
          updatedAt: serverTimestamp(),
        });
        showNotification(`Rumah ${houseNumber} berhasil diperbarui!`);
      }
      setHouseModalMode(null);
      setActiveHouse(null);
      await fetchAllData();
    } catch (err: any) {
      showNotification(`Gagal menyimpan rumah: ${err.message}`, 'error');
    }
  };

  const handleToggleHouseActive = async (id: string, current: boolean) => {
    try {
      await updateDoc(doc(db, 'houses', id), {
        isActive: !current,
        updatedAt: serverTimestamp(),
      });
      showNotification('Status rumah diperbarui!');
      await fetchAllData();
    } catch (err: any) {
      showNotification(`Gagal mengubah status: ${err.message}`, 'error');
    }
  };

  // -------------------------------------------------------------
  // CRUD ACTIONS: PERIODE (PERIODS)
  // -------------------------------------------------------------
  const handleSavePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePeriod) return;

    const periodNumber = Number(activePeriod.periodNumber);
    const amount = Number(activePeriod.amount);
    const startDateObj = parseDateInput(activePeriod.startDateStr || '');
    const endDateObj = parseDateInput(activePeriod.endDateStr || '');

    if (!startDateObj || !endDateObj) {
      showNotification('Format tanggal tidak valid.', 'error');
      return;
    }
    if (!Number.isInteger(periodNumber) || periodNumber <= 0) {
      showNotification('Nomor periode harus bilangan bulat positif.', 'error');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      showNotification('Nominal periode harus lebih dari 0.', 'error');
      return;
    }
    if (calendarDayDiff(startDateObj, endDateObj) !== 6) {
      showNotification('Satu periode harus tepat 7 hari inklusif (selisih 6 hari).', 'error');
      return;
    }

    const existingPeriod = activePeriod.id ? periodMap.get(activePeriod.id) : undefined;
    const hasPayments = activePeriod.id
      ? payments.some(payment => payment.periodId === activePeriod.id)
      : false;
    const existingStart = existingPeriod?.startDate?.toDate?.();
    const existingEnd = existingPeriod?.endDate?.toDate?.();
    const unchanged = Boolean(
      existingPeriod &&
      existingStart &&
      existingEnd &&
      existingPeriod.periodNumber === periodNumber &&
      Number(existingPeriod.amount) === amount &&
      existingStart.getTime() === startDateObj.getTime() &&
      existingEnd.getTime() === endDateObj.getTime()
    );

    if (hasPayments && !unchanged) {
      showNotification('Periode ini sudah memiliki pembayaran. Hanya status arsip yang dapat diubah.', 'error');
      return;
    }

    if (!hasPayments) {
      const duplicateNumber = periods.some(
        period => period.id !== activePeriod.id && period.periodNumber === periodNumber
      );
      if (duplicateNumber) {
        showNotification(`Nomor periode #${periodNumber} sudah dipakai.`, 'error');
        return;
      }

      const overlappingPeriod = periods.find(period => {
        if (period.id === activePeriod.id) return false;
        const start = period.startDate?.toDate?.();
        const end = period.endDate?.toDate?.();
        return Boolean(start && end && rangesOverlap(startDateObj, endDateObj, start, end));
      });
      if (overlappingPeriod) {
        showNotification(
          `Rentang bertabrakan dengan Periode #${overlappingPeriod.periodNumber}.`,
          'error'
        );
        return;
      }
    }

    const status = activePeriod.status === 'archived' ? 'archived' : 'active';

    try {
      if (periodModalMode === 'create') {
        await addDoc(collection(db, 'periods'), {
          periodNumber,
          startDate: Timestamp.fromDate(startDateObj),
          endDate: Timestamp.fromDate(endDateObj),
          amount,
          status,
          createdAt: serverTimestamp(),
        });
        showNotification(`Periode #${periodNumber} berhasil dibuat!`);
      } else if (periodModalMode === 'edit' && activePeriod.id) {
        await updateDoc(doc(db, 'periods', activePeriod.id), {
          periodNumber,
          startDate: Timestamp.fromDate(startDateObj),
          endDate: Timestamp.fromDate(endDateObj),
          amount,
          status,
        });
        showNotification(`Periode #${periodNumber} berhasil diperbarui!`);
      }

      setPeriodModalMode(null);
      setActivePeriod(null);
      await fetchAllData();
    } catch (err: any) {
      showNotification(`Gagal menyimpan periode: ${err.message}`, 'error');
    }
  };

  const handleToggleArchivePeriod = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'archived' : 'active';
    try {
      await updateDoc(doc(db, 'periods', id), { status: nextStatus });
      showNotification(`Periode diubah menjadi ${nextStatus === 'active' ? 'Aktif' : 'Arsip'}.`);
      await fetchAllData();
    } catch (err: any) {
      showNotification(`Gagal update periode: ${err.message}`, 'error');
    }
  };

  const handleCreate24Periods = async () => {
    if (!window.confirm('Buat 24 periode berurutan, masing-masing 7 hari inklusif?')) return;
    setIsBatchCreatingPeriods(true);
    try {
      let nextPeriodNumber = periods.length > 0
        ? Math.max(...periods.map(period => period.periodNumber || 0)) + 1
        : 1;
      const amount = getLatestPeriodAmount();
      let cursor = getNextPeriodStart();
      const batch = writeBatch(db);

      for (let i = 0; i < 24; i++) {
        const startDate = new Date(cursor);
        const endDate = addDays(startDate, 6);
        const periodRef = doc(collection(db, 'periods'));
        batch.set(periodRef, {
          periodNumber: nextPeriodNumber,
          startDate: Timestamp.fromDate(startDate),
          endDate: Timestamp.fromDate(endDate),
          amount,
          status: 'active',
          createdAt: serverTimestamp(),
        });

        cursor = addDays(startDate, 7);
        nextPeriodNumber++;
      }

      await batch.commit();
      showNotification('24 periode baru berhasil dibuat!');
      await fetchAllData();
    } catch (err: any) {
      showNotification(`Gagal membuat batch periode: ${err.message}`, 'error');
    } finally {
      setIsBatchCreatingPeriods(false);
    }
  };

  // -------------------------------------------------------------
  // CRUD ACTIONS: PEMBAYARAN (PAYMENTS)
  // -------------------------------------------------------------
  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePayment) return;

    const targetHouse = houseMap.get(activePayment.houseId);
    const targetPeriod = periodMap.get(activePayment.periodId);

    if (!targetHouse || !targetPeriod) {
      showNotification('Rumah dan periode wajib dipilih.', 'error');
      return;
    }
    if (!targetHouse.isActive) {
      showNotification('Rumah nonaktif tidak dapat dicatat pembayarannya.', 'error');
      return;
    }
    if (targetPeriod.status !== 'active') {
      showNotification('Periode arsip tidak dapat dicatat pembayarannya.', 'error');
      return;
    }
    if (!user?.uid) {
      showNotification('Sesi admin tidak ditemukan. Silakan login ulang.', 'error');
      return;
    }

    const standardAmt = Number(targetPeriod.amount);
    const extraAmt = Number(activePayment.extraAmount) || 0;
    if (!Number.isFinite(standardAmt) || standardAmt <= 0) {
      showNotification('Nominal periode tidak valid.', 'error');
      return;
    }
    if (!Number.isFinite(extraAmt) || extraAmt < 0) {
      showNotification('Nominal donasi tidak valid.', 'error');
      return;
    }

    try {
      await recordPayment({
        houseId: targetHouse.id,
        periodId: targetPeriod.id,
        paidBy: user.uid,
        standardAmount: standardAmt,
        amount: standardAmt + extraAmt,
      });
      showNotification('Pembayaran berhasil dicatat & masuk kas!');
      setPaymentModalMode(null);
      setActivePayment(null);
      await fetchAllData();
    } catch (err: unknown) {
      showNotification(`Gagal simpan pembayaran: ${err instanceof Error ? err.message : 'Terjadi kesalahan.'}`, 'error');
    }
  };

  const handleCancelPayment = (payment: Payment) => {
    setDeleteDialog({
      isOpen: true,
      title: 'Batalkan Pembayaran Ini?',
      description: 'Pembayaran akan ditandai dibatalkan dan dibuatkan transaksi pengeluaran reversal pada kas. Tindakan ini tidak menghapus histori.',
      confirmLabel: 'Ya, Batalkan',
      onConfirm: async () => {
        if (!user?.uid) {
          showNotification('Sesi admin tidak ditemukan. Silakan login ulang.', 'error');
          return;
        }
        try {
          await cancelPayment(payment.id, user.uid);
          showNotification('Pembayaran dibatalkan & reversal dicatat!');
          setDeleteDialog(prev => ({ ...prev, isOpen: false }));
          await fetchAllData();
        } catch (err: unknown) {
          showNotification(`Gagal membatalkan: ${err instanceof Error ? err.message : 'Terjadi kesalahan.'}`, 'error');
        }
      },
    });
  };

  // -------------------------------------------------------------
  // CRUD ACTIONS: TRANSAKSI KEUANGAN (TRANSACTIONS)
  // -------------------------------------------------------------
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTx) return;

    const amount = Number(activeTx.amount);
    const type = activeTx.type === 'expense' ? 'expense' : 'income';
    const category = activeTx.category || 'other';
    const description = activeTx.description?.trim() || '';
    const takenBy = activeTx.takenBy?.trim() || '';
    const allowedCategories = type === 'income'
      ? ['donation', 'other']
      : ['operational', 'social', 'maintenance', 'other'];

    if (!Number.isFinite(amount) || amount <= 0) {
      showNotification('Nominal harus lebih dari 0.', 'error');
      return;
    }
    if (!description) {
      showNotification('Keterangan transaksi wajib diisi.', 'error');
      return;
    }
    if (!allowedCategories.includes(category)) {
      showNotification('Kategori transaksi manual tidak valid.', 'error');
      return;
    }
    if (type === 'expense' && !takenBy) {
      showNotification('Penerima dana wajib diisi untuk pengeluaran.', 'error');
      return;
    }
    if (!user?.uid) {
      showNotification('Sesi admin tidak ditemukan. Silakan login ulang.', 'error');
      return;
    }

    try {
      await addDoc(collection(db, 'financial_transactions'), {
        type,
        category,
        amount,
        description,
        takenBy: type === 'expense' ? takenBy : null,
        houseId: null,
        paymentId: null,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });
      showNotification('Transaksi kas berhasil dicatat!');
      setTxModalMode(null);
      setActiveTx(null);
      await fetchAllData();
    } catch (err: unknown) {
      showNotification(`Gagal menyimpan transaksi: ${err instanceof Error ? err.message : 'Terjadi kesalahan.'}`, 'error');
    }
  };

  // -------------------------------------------------------------
  // CRUD ACTIONS: PENGGUNA (USERS)
  // -------------------------------------------------------------
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUser || !user) return;

    setIsSubmittingUser(true);
    try {
      const getIdToken = () => user.getIdToken();

      if (userModalMode === 'create') {
        await createAdminUser(getIdToken, {
          name: activeUser.name?.trim() || '',
          email: activeUser.email?.trim().toLowerCase() || '',
          password: userPassword.trim(),
          role: activeUser.role || 'petugas',
          isActive: activeUser.isActive ?? true,
        });
        showNotification(`Pengguna ${activeUser.name} berhasil dibuat!`);
      } else if (userModalMode === 'edit' && activeUser.id) {
        await updateAdminUser(getIdToken, {
          targetUserId: activeUser.id,
          name: activeUser.name?.trim() || '',
          role: activeUser.role || 'petugas',
          isActive: activeUser.isActive ?? true,
          password: userPassword.trim() ? userPassword.trim() : undefined,
        });
        showNotification(`Data pengguna ${activeUser.name} diperbarui!`);
      }

      setUserModalMode(null);
      setActiveUser(null);
      setUserPassword('');
      await fetchAllData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan.';
      showNotification(`Gagal menyimpan pengguna: ${message}`, 'error');
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const handleToggleUserActive = async (targetUser: AppUser) => {
    if (!user) return;
    if (targetUser.id === user.uid) {
      showNotification('Pencegahan keamanan: Tidak dapat menonaktifkan akun sendiri!', 'error');
      return;
    }
    try {
      const getIdToken = () => user.getIdToken();
      await updateAdminUser(getIdToken, {
        targetUserId: targetUser.id,
        isActive: !targetUser.isActive,
      });
      showNotification(`Status pengguna ${targetUser.name} diperbarui.`);
      await fetchAllData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan.';
      showNotification(`Gagal update status: ${message}`, 'error');
    }
  };

  const handleChangeUserRole = async (targetUserId: string, newRole: 'admin' | 'petugas' | 'warga') => {
    if (!user) return;
    if (targetUserId === user.uid) {
      showNotification('Pencegahan keamanan: Tidak dapat mengubah role akun sendiri!', 'error');
      return;
    }
    try {
      const getIdToken = () => user.getIdToken();
      await updateAdminUser(getIdToken, {
        targetUserId,
        role: newRole,
      });
      showNotification('Role pengguna berhasil diubah!');
      await fetchAllData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan.';
      showNotification(`Gagal mengubah role: ${message}`, 'error');
    }
  };

  const handleDeleteUser = (targetUser: AppUser) => {
    if (!user) return;
    if (targetUser.id === user.uid) {
      showNotification('Pencegahan keamanan: Tidak dapat menghapus akun sendiri!', 'error');
      return;
    }
    setDeleteDialog({
      isOpen: true,
      title: `Hapus Akun ${targetUser.name}?`,
      description: `Akun (${targetUser.email}) akan dihapus permanen dari Firebase Auth dan database Firestore.`,
      confirmLabel: 'Ya, Hapus Pengguna',
      onConfirm: async () => {
        try {
          const getIdToken = () => user.getIdToken();
          await deleteAdminUser(getIdToken, targetUser.id);
          showNotification(`Pengguna ${targetUser.name} berhasil dihapus.`);
          setDeleteDialog(prev => ({ ...prev, isOpen: false }));
          await fetchAllData();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Terjadi kesalahan.';
          showNotification(`Gagal menghapus pengguna: ${message}`, 'error');
        }
      },
    });
  };

  // -------------------------------------------------------------
  // DEVELOPER TOOLS: EXPORT DATABASE JSON
  // -------------------------------------------------------------
  const handleExportFullDatabaseJSON = () => {
    try {
      const fullBackup = {
        meta: {
          app: 'Jimpit Kulon Dusun',
          exportedAt: new Date().toISOString(),
          exportedBy: {
            uid: user?.uid,
            name: userData?.name,
            email: user?.email,
          },
          counts: {
            houses: houses.length,
            periods: periods.length,
            payments: payments.length,
            transactions: transactions.length,
            users: users.length,
          },
        },
        data: {
          houses,
          periods,
          payments,
          transactions,
          users,
        },
      };

      const jsonStr = JSON.stringify(fullBackup, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-jimpit-kulon-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showNotification('Backup data JSON berhasil diunduh!');
    } catch (err: any) {
      showNotification(`Gagal export JSON: ${err.message}`, 'error');
    }
  };

  // -------------------------------------------------------------
  // FILTERED DATA
  // -------------------------------------------------------------
  const filteredHouses = useMemo(() => {
    return houses.filter(h => {
      const matchSearch = (h.houseNumber || '').toLowerCase().includes(houseSearch.toLowerCase()) ||
        (h.headOfFamily || '').toLowerCase().includes(houseSearch.toLowerCase()) ||
        (h.address || '').toLowerCase().includes(houseSearch.toLowerCase());
      const matchStatus = houseFilter === 'all' ? true : houseFilter === 'active' ? h.isActive : !h.isActive;
      return matchSearch && matchStatus;
    });
  }, [houses, houseSearch, houseFilter]);

  const filteredPeriods = useMemo(() => {
    return periods.filter(p => {
      const matchSearch = String(p.periodNumber || '').includes(periodSearch) ||
        formatDateRange(p.startDate, p.endDate).toLowerCase().includes(periodSearch.toLowerCase());
      const matchStatus = periodFilter === 'all' ? true : p.status === periodFilter;
      return matchSearch && matchStatus;
    });
  }, [periods, periodSearch, periodFilter]);

  const editingPeriodHasPayments = Boolean(
    activePeriod?.id && payments.some(payment => payment.periodId === activePeriod.id)
  );

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const h = houseMap.get(p.houseId);
      const matchSearch = (h?.houseNumber || '').toLowerCase().includes(paymentSearch.toLowerCase()) ||
        (h?.headOfFamily || '').toLowerCase().includes(paymentSearch.toLowerCase()) ||
        p.id.toLowerCase().includes(paymentSearch.toLowerCase());
      const matchStatus = paymentFilter === 'all' ? true : p.status === paymentFilter;
      return matchSearch && matchStatus;
    });
  }, [payments, houseMap, paymentSearch, paymentFilter]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchSearch = (t.description || '').toLowerCase().includes(txSearch.toLowerCase()) ||
        (t.takenBy || '').toLowerCase().includes(txSearch.toLowerCase()) ||
        (t.category || '').toLowerCase().includes(txSearch.toLowerCase());
      const matchType = txFilterType === 'all' ? true : t.type === txFilterType;
      const matchCategory = txFilterCategory === 'all' ? true : t.category === txFilterCategory;
      return matchSearch && matchType && matchCategory;
    });
  }, [transactions, txSearch, txFilterType, txFilterCategory]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchSearch = (u.name || '').toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(userSearch.toLowerCase());
      const matchRole = userRoleFilter === 'all' ? true : u.role === userRoleFilter;
      return matchSearch && matchRole;
    });
  }, [users, userSearch, userRoleFilter]);

  // Authorization Check
  if (userData?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="bg-white p-8 rounded-2xl border border-black/8 shadow-sm max-w-sm text-center">
          <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-1.5">Akses Ditolak</h1>
          <p className="text-xs text-foreground/60 mb-5">
            Hanya Administrator atau Developer yang dapat mengakses dashboard data ini.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center w-full py-3 rounded-xl bg-primary text-[#000000] font-bold text-sm shadow-xs active:scale-[0.98]"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* ------------------------------------------------------------- */}
      {/* SIDEBAR NAVIGATION (DESKTOP & MOBILE DRAWER) */}
      {/* ------------------------------------------------------------- */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 w-64 sm:w-68 bg-white border-r border-black/8 z-50 flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } shadow-lg md:shadow-none`}
      >
        {/* Brand Header */}
        <div className="relative p-4 border-b border-black/8 flex items-center justify-center">
          <Image
            src="/jimpit-kulon-logo.png"
            alt="Jimpit Kulon"
            width={130}
            height={42}
            className="object-contain"
            priority
          />
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute right-3 top-1/2 -translate-y-1/2 md:hidden p-1.5 rounded-lg text-foreground/50 hover:bg-black/5"
            aria-label="Tutup sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Developer Profile Card */}
        <div className="p-3 mx-3 my-3 rounded-xl bg-black/[0.025] border border-black/5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-secondary text-[#f7f7f7] font-bold text-xs flex items-center justify-center shrink-0">
              {userData?.name ? userData.name.substring(0, 2).toUpperCase() : 'DV'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-foreground truncate">{userData?.name || 'Developer Admin'}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                <span className="text-[10px] font-semibold text-foreground/50">Akun Developer</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-1 space-y-1 overflow-y-auto">
          {[
            { id: 'overview', label: 'Ringkasan', icon: LayoutDashboard, badge: null },
            { id: 'houses', label: 'Data Rumah', icon: Home, badge: houses.length },
            { id: 'periods', label: 'Data Periode', icon: Calendar, badge: periods.length },
            { id: 'payments', label: 'Data Pembayaran', icon: CreditCard, badge: payments.length },
            { id: 'transactions', label: 'Data Kas Keuangan', icon: Wallet, badge: transactions.length },
            { id: 'users', label: 'Data Pengguna', icon: Users, badge: users.length },
            { id: 'settings', label: 'Pengaturan & Backup', icon: Settings, badge: null },
          ].map(item => {
            const Icon = item.icon;
            const isActive = currentSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentSection(item.id as AdminSection);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-colors ${
                  isActive
                    ? 'bg-primary text-[#000000] font-bold shadow-xs'
                    : 'text-foreground/70 hover:text-foreground hover:bg-black/[0.03] font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge !== null && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isActive ? 'bg-black/15 text-[#000000]' : 'bg-black/5 text-foreground/60'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-black/8 space-y-2">
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl border border-black/8 bg-white hover:bg-black/[0.02] text-foreground text-xs font-semibold transition-colors active:scale-[0.98]"
          >
            <span>Kembali ke Beranda</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={async () => {
              if (window.confirm('Yakin ingin keluar dari akun?')) {
                await logout();
                router.push('/login');
              }
            }}
            className="flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar Akun</span>
          </button>
        </div>
      </aside>

      {/* ------------------------------------------------------------- */}
      {/* MAIN CONTENT AREA */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 md:pl-64 lg:pl-68 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-black/8 px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 -ml-2 rounded-xl text-foreground/70 hover:bg-black/5"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-foreground/45">
                <span>Panel Admin</span>
                <ChevronRight className="w-3 h-3" />
                <span className="text-foreground font-semibold">
                  {currentSection === 'overview' && 'Ringkasan'}
                  {currentSection === 'houses' && 'Data Rumah'}
                  {currentSection === 'periods' && 'Data Periode'}
                  {currentSection === 'payments' && 'Data Pembayaran'}
                  {currentSection === 'transactions' && 'Data Kas Keuangan'}
                  {currentSection === 'users' && 'Data Pengguna'}
                  {currentSection === 'settings' && 'Pengaturan & Backup'}
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                {currentSection === 'overview' && 'Dashboard Data Jimpit Kulon'}
                {currentSection === 'houses' && 'Manajemen Data Rumah'}
                {currentSection === 'periods' && 'Manajemen Periode Jimpitan'}
                {currentSection === 'payments' && 'Manajemen Pembayaran Warga'}
                {currentSection === 'transactions' && 'Buku Kas & Transaksi Keuangan'}
                {currentSection === 'users' && 'Manajemen Pengguna & Petugas'}
                {currentSection === 'settings' && 'Pengaturan Sistem & Export Database'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchAllData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-black/8 bg-white hover:bg-black/[0.03] text-foreground text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-primary' : ''}`} />
              <span className="hidden sm:inline">{refreshing ? 'Memuat...' : 'Segarkan'}</span>
            </button>

            <Link
              href="/dashboard"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-secondary text-[#f7f7f7] hover:bg-secondary/90 text-xs font-bold transition-colors"
            >
              <span>Aplikasi Warga</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </header>

        {/* Global Notification Toast */}
        {notification && (
          <div className="fixed top-16 right-4 sm:right-6 z-50 max-w-sm animate-in slide-in-from-top-2 duration-150">
            <div
              className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl shadow-md text-xs font-semibold border ${
                notification.type === 'error'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-green-50 text-green-800 border-green-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {notification.type === 'error' ? (
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                )}
                <span>{notification.message}</span>
              </div>
              <button onClick={() => setNotification(null)} className="p-1 hover:opacity-70">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Page Content Body */}
        <main className="p-4 sm:p-6 flex-1 space-y-5">
          {/* ========================================================= */}
          {/* SECTION 1: OVERVIEW / DASHBOARD */}
          {/* ========================================================= */}
          {currentSection === 'overview' && (
            <div className="space-y-5">
              {/* Authentic Jimpit-Kulon Hero Header */}
              <div className="relative bg-secondary text-[#f7f7f7] rounded-2xl p-5 sm:p-6 overflow-hidden">
                <div className="absolute -top-10 -right-10 w-44 h-44 bg-white/5 rounded-full pointer-events-none" />
                <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full pointer-events-none" />

                <div className="relative z-10">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 border border-white/20 text-[#f7f7f7] mb-3">
                    <Shield className="w-3.5 h-3.5" /> Mode Developer Aktif
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold">
                    Halo, {userData?.name || 'Admin'} 👋
                  </h2>
                  <p className="text-xs sm:text-sm text-[#f7f7f7]/70 mt-1 max-w-xl leading-relaxed">
                    Selamat datang di konsol administrasi Jimpit Kulon. Anda memiliki wewenang penuh untuk
                    menambah, mengedit, melihat, dan menghapus seluruh entitas data sistem.
                  </p>
                </div>
              </div>

              {/* KPI Cards Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Saldo Kas */}
                <div className="col-span-2 sm:col-span-1 bg-white p-4 sm:p-5 rounded-2xl border border-black/8 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-medium text-foreground/50">Saldo Kas Jimpitan</span>
                    <p className="text-xl sm:text-2xl font-bold text-foreground mt-1.5">
                      Rp {financialSummary.balance.toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-black/5 flex items-center justify-between text-[11px] text-foreground/50">
                    <span className="text-green-600 font-semibold">Masuk: Rp {financialSummary.totalIncome.toLocaleString('id-ID')}</span>
                    <span className="text-red-600 font-semibold">Keluar: Rp {financialSummary.totalExpense.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                {/* Total Rumah */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-black/8 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-medium text-foreground/50">Total Rumah</span>
                    <p className="text-xl sm:text-2xl font-bold text-foreground mt-1.5">{houses.length}</p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-black/5 flex items-center justify-between text-[11px] text-foreground/50">
                    <span className="text-green-600 font-semibold">{houses.filter(h => h.isActive).length} Aktif</span>
                    <span className="text-foreground/40">{houses.filter(h => !h.isActive).length} Nonaktif</span>
                  </div>
                </div>

                {/* Total Periode */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-black/8 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-medium text-foreground/50">Total Periode</span>
                    <p className="text-xl sm:text-2xl font-bold text-foreground mt-1.5">{periods.length}</p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-black/5 flex items-center justify-between text-[11px] text-foreground/50">
                    <span className="text-primary font-bold">{periods.filter(p => p.status === 'active').length} Aktif</span>
                    <span className="text-foreground/40">{periods.filter(p => p.status === 'archived').length} Arsip</span>
                  </div>
                </div>

                {/* Total Pembayaran */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-black/8 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-medium text-foreground/50">Pembayaran Tercatat</span>
                    <p className="text-xl sm:text-2xl font-bold text-foreground mt-1.5">{payments.length}</p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-black/5 flex items-center justify-between text-[11px] text-foreground/50">
                    <span className="text-green-600 font-semibold">{payments.filter(p => p.status === 'paid').length} Lunas</span>
                    <span className="text-foreground/40">{users.length} Akun User</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div className="bg-white p-5 rounded-2xl border border-black/8">
                <h3 className="text-xs font-bold text-foreground/70 uppercase tracking-wider mb-3">
                  Aksi Cepat Pengembang
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                  <button
                    onClick={() => {
                      setActiveHouse({ houseNumber: '', headOfFamily: '', address: '', notes: '', isActive: true });
                      setHouseModalMode('create');
                    }}
                    className="p-3 rounded-xl border border-black/8 bg-background hover:bg-black/[0.04] flex flex-col items-center text-center gap-1.5 transition-colors active:scale-[0.98]"
                  >
                    <Home className="w-4 h-4 text-secondary" />
                    <span className="text-xs font-semibold text-foreground">+ Tambah Rumah</span>
                  </button>

                  <button
                    onClick={() => {
                      const nextNum = periods.length > 0 ? Math.max(...periods.map(p => p.periodNumber || 0)) + 1 : 1;
                      const start = getNextPeriodStart();
                      const end = addDays(start, 6);
                      setActivePeriod({
                        periodNumber: nextNum,
                        startDateStr: toDateInput(start),
                        endDateStr: toDateInput(end),
                        amount: getLatestPeriodAmount(),
                        status: 'active',
                      });
                      setPeriodModalMode('create');
                    }}
                    className="p-3 rounded-xl border border-black/8 bg-background hover:bg-black/[0.04] flex flex-col items-center text-center gap-1.5 transition-colors active:scale-[0.98]"
                  >
                    <Calendar className="w-4 h-4 text-secondary" />
                    <span className="text-xs font-semibold text-foreground">+ Tambah Periode</span>
                  </button>

                  <button
                    onClick={() => {
                      setActivePayment({
                        houseId: houses.find(h => h.isActive)?.id || '',
                        periodId: periods.find(p => p.status === 'active')?.id || '',
                        extraAmount: 0,
                      });
                      setPaymentModalMode('create');
                    }}
                    className="p-3 rounded-xl border border-black/8 bg-background hover:bg-black/[0.04] flex flex-col items-center text-center gap-1.5 transition-colors active:scale-[0.98]"
                  >
                    <CreditCard className="w-4 h-4 text-secondary" />
                    <span className="text-xs font-semibold text-foreground">+ Catat Bayar</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTx({
                        type: 'income',
                        category: 'donation',
                        amount: 5000,
                        description: '',
                        takenBy: '',
                      });
                      setTxModalMode('create');
                    }}
                    className="p-3 rounded-xl border border-black/8 bg-background hover:bg-black/[0.04] flex flex-col items-center text-center gap-1.5 transition-colors active:scale-[0.98]"
                  >
                    <Wallet className="w-4 h-4 text-secondary" />
                    <span className="text-xs font-semibold text-foreground">+ Catat Kas</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveUser({ name: '', email: '', role: 'petugas', isActive: true });
                      setUserModalMode('create');
                    }}
                    className="p-3 rounded-xl border border-black/8 bg-background hover:bg-black/[0.04] flex flex-col items-center text-center gap-1.5 transition-colors active:scale-[0.98]"
                  >
                    <Users className="w-4 h-4 text-secondary" />
                    <span className="text-xs font-semibold text-foreground">+ Tambah Petugas</span>
                  </button>
                </div>
              </div>

              {/* Two Column Preview Tables */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 5 Transaksi Keuangan Terakhir */}
                <div className="bg-white rounded-2xl border border-black/8 overflow-hidden">
                  <div className="px-4 py-3 border-b border-black/8 bg-black/[0.015] flex items-center justify-between">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-secondary" /> Transaksi Kas Terkini
                    </h4>
                    <button
                      onClick={() => setCurrentSection('transactions')}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Lihat Semua
                    </button>
                  </div>
                  <div className="divide-y divide-black/5">
                    {transactions.slice(0, 5).map(tx => (
                      <div key={tx.id} className="px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-foreground">{tx.description || tx.category}</p>
                          <p className="text-[10px] text-foreground/40 mt-0.5">{formatDateTime(tx.createdAt)}</p>
                        </div>
                        <span
                          className={`text-xs font-bold ${
                            tx.type === 'income' ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {tx.type === 'income' ? '+' : '-'} Rp {(tx.amount || 0).toLocaleString('id-ID')}
                        </span>
                      </div>
                    ))}
                    {transactions.length === 0 && (
                      <p className="py-8 text-center text-xs text-foreground/40">Belum ada transaksi kas.</p>
                    )}
                  </div>
                </div>

                {/* 5 Pembayaran Terakhir */}
                <div className="bg-white rounded-2xl border border-black/8 overflow-hidden">
                  <div className="px-4 py-3 border-b border-black/8 bg-black/[0.015] flex items-center justify-between">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-secondary" /> Pembayaran Jimpitan Terkini
                    </h4>
                    <button
                      onClick={() => setCurrentSection('payments')}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Lihat Semua
                    </button>
                  </div>
                  <div className="divide-y divide-black/5">
                    {payments.slice(0, 5).map(p => {
                      const h = houseMap.get(p.houseId);
                      const pr = periodMap.get(p.periodId);
                      return (
                        <div key={p.id} className="px-4 py-3 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold text-foreground">
                              Rumah {h?.houseNumber || '-'} ({h?.headOfFamily || 'Warga'})
                            </p>
                            <p className="text-[10px] text-foreground/40 mt-0.5">
                              Periode #{pr?.periodNumber || '-'} • {formatDateTime(p.paidAt || p.createdAt)}
                            </p>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              p.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                            }`}
                          >
                            {p.status === 'paid' ? 'Lunas' : 'Dibatalkan'}
                          </span>
                        </div>
                      );
                    })}
                    {payments.length === 0 && (
                      <p className="py-8 text-center text-xs text-foreground/40">Belum ada pembayaran dicatat.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* SECTION 2: DATA RUMAH (FULL CRUD) */}
          {/* ========================================================= */}
          {currentSection === 'houses' && (
            <div className="space-y-4">
              {/* Header Controls */}
              <div className="bg-white p-4 rounded-2xl border border-black/8 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="flex flex-1 items-center gap-2">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-foreground/35 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={houseSearch}
                      onChange={e => setHouseSearch(e.target.value)}
                      placeholder="Cari no. rumah, kepala keluarga, alamat..."
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-black/8 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <select
                    value={houseFilter}
                    onChange={e => setHouseFilter(e.target.value as any)}
                    className="py-2.5 px-3 rounded-xl border border-black/8 bg-white text-xs font-medium text-foreground focus:outline-none"
                  >
                    <option value="all">Semua Status ({houses.length})</option>
                    <option value="active">Aktif Saja</option>
                    <option value="inactive">Nonaktif Saja</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setActiveHouse({ houseNumber: '', headOfFamily: '', address: '', notes: '', isActive: true });
                      setHouseModalMode('create');
                    }}
                    className="px-4 py-2.5 rounded-xl bg-primary text-[#000000] font-bold text-xs flex items-center gap-1.5 shadow-xs active:scale-[0.98] transition-transform"
                  >
                    <Plus className="w-4 h-4" /> Tambah Rumah
                  </button>
                </div>
              </div>

              {/* Houses Table */}
              <div className="bg-white rounded-2xl border border-black/8 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-black/[0.02] border-b border-black/8 text-foreground/60 font-semibold text-[11px] uppercase tracking-wider">
                        <th className="py-3 px-4">No. Rumah</th>
                        <th className="py-3 px-4">Kepala Keluarga</th>
                        <th className="py-3 px-4">Alamat</th>
                        <th className="py-3 px-4">Catatan</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-center">QR Code</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {filteredHouses.map(house => (
                        <tr key={house.id} className="hover:bg-black/[0.01] transition-colors">
                          <td className="py-3 px-4 font-bold text-foreground">
                            {house.houseNumber}
                          </td>
                          <td className="py-3 px-4 font-semibold text-foreground">
                            {house.headOfFamily}
                          </td>
                          <td className="py-3 px-4 text-foreground/60 max-w-xs truncate">
                            {house.address || '-'}
                          </td>
                          <td className="py-3 px-4 text-foreground/40 max-w-xs truncate">
                            {house.notes || '-'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleToggleHouseActive(house.id, house.isActive)}
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                                house.isActive
                                  ? 'bg-green-100 text-green-700 border-green-200'
                                  : 'bg-red-100 text-red-600 border-red-200'
                              }`}
                            >
                              {house.isActive ? 'Aktif' : 'Nonaktif'}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => setSelectedHouseForQR(house)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-black/8 bg-white hover:bg-black/[0.02] text-[11px] font-semibold text-foreground"
                            >
                              <QrCode className="w-3.5 h-3.5 text-secondary" /> QR
                            </button>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  setActiveHouse(house);
                                  setHouseModalMode('edit');
                                }}
                                className="p-1.5 rounded-lg border border-black/8 bg-white text-foreground/70 hover:text-foreground hover:bg-black/[0.02]"
                                title="Edit Data Rumah"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredHouses.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-10 text-center text-foreground/40">
                            Tidak ada data rumah yang sesuai.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* SECTION 3: DATA PERIODE (FULL CRUD) */}
          {/* ========================================================= */}
          {currentSection === 'periods' && (
            <div className="space-y-4">
              {/* Header Controls */}
              <div className="bg-white p-4 rounded-2xl border border-black/8 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="flex flex-1 items-center gap-2">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-foreground/35 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={periodSearch}
                      onChange={e => setPeriodSearch(e.target.value)}
                      placeholder="Cari nomor periode atau rentang tanggal..."
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-black/8 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <select
                    value={periodFilter}
                    onChange={e => setPeriodFilter(e.target.value as any)}
                    className="py-2.5 px-3 rounded-xl border border-black/8 bg-white text-xs font-medium text-foreground focus:outline-none"
                  >
                    <option value="all">Semua Status ({periods.length})</option>
                    <option value="active">Aktif Saja</option>
                    <option value="archived">Arsip Saja</option>
                  </select>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleCreate24Periods}
                    disabled={isBatchCreatingPeriods}
                    className="px-3 py-2.5 rounded-xl border border-black/8 bg-white hover:bg-black/[0.02] text-foreground text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    + Buat 24 Periode (6 Bulan)
                  </button>
                  <button
                    onClick={() => {
                      const nextNum = periods.length > 0 ? Math.max(...periods.map(p => p.periodNumber || 0)) + 1 : 1;
                      const start = getNextPeriodStart();
                      const end = addDays(start, 6);
                      setActivePeriod({
                        periodNumber: nextNum,
                        startDateStr: toDateInput(start),
                        endDateStr: toDateInput(end),
                        amount: getLatestPeriodAmount(),
                        status: 'active',
                      });
                      setPeriodModalMode('create');
                    }}
                    className="px-4 py-2.5 rounded-xl bg-primary text-[#000000] font-bold text-xs flex items-center gap-1.5 shadow-xs active:scale-[0.98] transition-transform"
                  >
                    <Plus className="w-4 h-4" /> Tambah Periode
                  </button>
                </div>
              </div>

              {/* Periods Table */}
              <div className="bg-white rounded-2xl border border-black/8 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-black/[0.02] border-b border-black/8 text-foreground/60 font-semibold text-[11px] uppercase tracking-wider">
                        <th className="py-3 px-4">No. Periode</th>
                        <th className="py-3 px-4">Rentang Tanggal (7 Hari)</th>
                        <th className="py-3 px-4">Tarif Nominal</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {filteredPeriods.map(period => (
                        <tr key={period.id} className="hover:bg-black/[0.01] transition-colors">
                          <td className="py-3 px-4 font-bold text-foreground">
                            Periode #{period.periodNumber}
                          </td>
                          <td className="py-3 px-4 font-semibold text-foreground">
                            {formatDateRange(period.startDate, period.endDate)}
                          </td>
                          <td className="py-3 px-4 font-bold text-foreground">
                            Rp {(period.amount || 3500).toLocaleString('id-ID')}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                period.status === 'active'
                                  ? 'bg-green-100 text-green-700 border-green-200'
                                  : 'bg-black/5 text-foreground/60 border-black/10'
                              }`}
                            >
                              {period.status === 'active' ? 'Aktif' : 'Arsip'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => handleToggleArchivePeriod(period.id, period.status)}
                                className="p-1.5 rounded-lg border border-black/8 bg-white text-foreground/70 hover:text-foreground hover:bg-black/[0.02]"
                                title={period.status === 'active' ? 'Arsipkan' : 'Aktifkan'}
                              >
                                <Archive className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  const s = period.startDate?.toDate ? period.startDate.toDate() : new Date();
                                  const e = period.endDate?.toDate ? period.endDate.toDate() : new Date();
                                  setActivePeriod({
                                    id: period.id,
                                    periodNumber: period.periodNumber,
                                    startDateStr: toDateInput(s),
                                    endDateStr: toDateInput(e),
                                    amount: period.amount || 0,
                                    status: period.status,
                                  });
                                  setPeriodModalMode('edit');
                                }}
                                title="Edit Periode"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredPeriods.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-10 text-center text-foreground/40">
                            Tidak ada data periode yang sesuai.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* SECTION 4: DATA PEMBAYARAN (FULL CRUD) */}
          {/* ========================================================= */}
          {currentSection === 'payments' && (
            <div className="space-y-4">
              {/* Header Controls */}
              <div className="bg-white p-4 rounded-2xl border border-black/8 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="flex flex-1 items-center gap-2">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-foreground/35 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={paymentSearch}
                      onChange={e => setPaymentSearch(e.target.value)}
                      placeholder="Cari no. rumah, nama KK, atau ID..."
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-black/8 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <select
                    value={paymentFilter}
                    onChange={e => setPaymentFilter(e.target.value as any)}
                    className="py-2.5 px-3 rounded-xl border border-black/8 bg-white text-xs font-medium text-foreground focus:outline-none"
                  >
                    <option value="all">Semua Status ({payments.length})</option>
                    <option value="paid">Lunas Saja</option>
                    <option value="cancelled">Dibatalkan Saja</option>
                  </select>
                </div>

                <button
                  onClick={() => {
                    setActivePayment({
                      houseId: houses.find(h => h.isActive)?.id || '',
                      periodId: periods.find(p => p.status === 'active')?.id || '',
                      extraAmount: 0,
                    });
                    setPaymentModalMode('create');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-primary text-[#000000] font-bold text-xs flex items-center gap-1.5 shadow-xs active:scale-[0.98] transition-transform"
                >
                  <Plus className="w-4 h-4" /> Catat Pembayaran Baru
                </button>
              </div>

              {/* Payments Table */}
              <div className="bg-white rounded-2xl border border-black/8 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-black/[0.02] border-b border-black/8 text-foreground/60 font-semibold text-[11px] uppercase tracking-wider">
                        <th className="py-3 px-4">Rumah (KK)</th>
                        <th className="py-3 px-4">Periode</th>
                        <th className="py-3 px-4">Dicatat Oleh</th>
                        <th className="py-3 px-4">Waktu Bayar</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {filteredPayments.map(p => {
                        const h = houseMap.get(p.houseId);
                        const pr = periodMap.get(p.periodId);
                        const u = userMap.get(p.paidBy);
                        return (
                          <tr key={p.id} className="hover:bg-black/[0.01] transition-colors">
                            <td className="py-3 px-4 font-bold text-foreground">
                              Rumah {h?.houseNumber || '-'}
                              <span className="block font-medium text-foreground/50 text-[11px]">
                                {h?.headOfFamily || 'Warga'}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-semibold text-foreground">
                              Periode #{pr?.periodNumber || '-'}
                              <span className="block text-[11px] text-foreground/40 font-normal">
                                {formatDateRange(pr?.startDate, pr?.endDate)}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-foreground/60">
                              {u?.name || p.paidBy || 'Petugas'}
                            </td>
                            <td className="py-3 px-4 text-foreground/50">
                              {formatDateTime(p.paidAt || p.createdAt)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                  p.status === 'paid'
                                    ? 'bg-green-100 text-green-700 border-green-200'
                                    : 'bg-red-100 text-red-600 border-red-200'
                                }`}
                              >
                                {p.status === 'paid' ? 'Lunas' : 'Dibatalkan'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                {p.status === 'paid' && (
                                  <button
                                    onClick={() => handleCancelPayment(p)}
                                    className="p-1.5 rounded-lg border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
                                    title="Batalkan (Buat Reversal Kas)"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredPayments.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-foreground/40">
                            Tidak ada data pembayaran yang sesuai.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* SECTION 5: DATA KEUANGAN / TRANSAKSI (FULL CRUD) */}
          {/* ========================================================= */}
          {currentSection === 'transactions' && (
            <div className="space-y-4">
              {/* Financial Quick Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-black/8">
                  <span className="text-[11px] font-medium text-foreground/50">Total Pemasukan</span>
                  <p className="text-lg font-bold text-green-600 mt-1">
                    Rp {financialSummary.totalIncome.toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-black/8">
                  <span className="text-[11px] font-medium text-foreground/50">Total Pengeluaran</span>
                  <p className="text-lg font-bold text-red-600 mt-1">
                    Rp {financialSummary.totalExpense.toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-black/8">
                  <span className="text-[11px] font-medium text-foreground/50">Saldo Bersih</span>
                  <p className="text-lg font-bold text-foreground mt-1">
                    Rp {financialSummary.balance.toLocaleString('id-ID')}
                  </p>
                </div>
              </div>

              {/* Header Controls */}
              <div className="bg-white p-4 rounded-2xl border border-black/8 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[180px] max-w-md">
                    <Search className="w-4 h-4 text-foreground/35 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={txSearch}
                      onChange={e => setTxSearch(e.target.value)}
                      placeholder="Cari keterangan, penerima, kategori..."
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-black/8 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <select
                    value={txFilterType}
                    onChange={e => setTxFilterType(e.target.value as any)}
                    className="py-2.5 px-3 rounded-xl border border-black/8 bg-white text-xs font-medium text-foreground focus:outline-none"
                  >
                    <option value="all">Semua Tipe</option>
                    <option value="income">Pemasukan (+)</option>
                    <option value="expense">Pengeluaran (-)</option>
                  </select>
                  <select
                    value={txFilterCategory}
                    onChange={e => setTxFilterCategory(e.target.value)}
                    className="py-2.5 px-3 rounded-xl border border-black/8 bg-white text-xs font-medium text-foreground focus:outline-none"
                  >
                    <option value="all">Semua Kategori</option>
                    <option value="payment">Jimpitan Rutin</option>
                    <option value="donation">Donasi / Kelebihan</option>
                    <option value="operational">Operasional</option>
                    <option value="social">Sosial Warga</option>
                    <option value="maintenance">Perawatan Fasilitas</option>
                    <option value="cancellation">Pembatalan (Reversal)</option>
                    <option value="other">Lainnya</option>
                  </select>
                </div>

                <button
                  onClick={() => {
                    setActiveTx({
                      type: 'income',
                      category: 'donation',
                      amount: 5000,
                      description: '',
                      takenBy: '',
                    });
                    setTxModalMode('create');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-primary text-[#000000] font-bold text-xs flex items-center gap-1.5 shadow-xs active:scale-[0.98] transition-transform"
                >
                  <Plus className="w-4 h-4" /> Catat Kas Baru
                </button>
              </div>

              {/* Transactions Table */}
              <div className="bg-white rounded-2xl border border-black/8 overflow-hidden">
                <p className="px-4 pt-3 text-[11px] text-foreground/50">
                  Transaksi historis tidak dapat diedit atau dihapus. Koreksi dilakukan dengan transaksi lawan yang tercatat.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-black/[0.02] border-b border-black/8 text-foreground/60 font-semibold text-[11px] uppercase tracking-wider">
                        <th className="py-3 px-4">Waktu</th>
                        <th className="py-3 px-4">Tipe & Kategori</th>
                        <th className="py-3 px-4">Keterangan</th>
                        <th className="py-3 px-4 text-right">Nominal (Rp)</th>
                        <th className="py-3 px-4">Penerima / Petugas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {filteredTransactions.map(tx => (
                        <tr key={tx.id} className="hover:bg-black/[0.01] transition-colors">
                          <td className="py-3 px-4 text-foreground/50 whitespace-nowrap">
                            {formatDateTime(tx.createdAt)}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border mb-0.5 ${
                                tx.type === 'income'
                                  ? 'bg-green-100 text-green-700 border-green-200'
                                  : 'bg-red-100 text-red-600 border-red-200'
                              }`}
                            >
                              {tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                            </span>
                            <span className="block text-[11px] text-foreground/50 capitalize font-medium">
                              {tx.category || 'other'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-foreground max-w-sm truncate">
                            {tx.description || '-'}
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-bold ${
                              tx.type === 'income' ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {tx.type === 'income' ? '+' : '-'} Rp {(tx.amount || 0).toLocaleString('id-ID')}
                          </td>
                          <td className="py-3 px-4 text-foreground/60">
                            {tx.takenBy ? `Penerima: ${tx.takenBy}` : userMap.get(tx.createdBy)?.name || tx.createdBy || '-'}
                          </td>
                        </tr>
                      ))}
                      {filteredTransactions.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-10 text-center text-foreground/40">
                            Tidak ada transaksi kas yang sesuai.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* SECTION 6: DATA PENGGUNA (FULL CRUD) */}
          {/* ========================================================= */}
          {currentSection === 'users' && (
            <div className="space-y-4">
              {/* Header Controls */}
              <div className="bg-white p-4 rounded-2xl border border-black/8 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="flex flex-1 items-center gap-2">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-foreground/35 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      placeholder="Cari nama atau email pengguna..."
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-black/8 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <select
                    value={userRoleFilter}
                    onChange={e => setUserRoleFilter(e.target.value as any)}
                    className="py-2.5 px-3 rounded-xl border border-black/8 bg-white text-xs font-medium text-foreground focus:outline-none"
                  >
                    <option value="all">Semua Role ({users.length})</option>
                    <option value="admin">Admin Saja</option>
                    <option value="petugas">Petugas Saja</option>
                    <option value="warga">Warga Saja</option>
                  </select>
                </div>

                <button
                  onClick={() => {
                    setActiveUser({ name: '', email: '', role: 'petugas', isActive: true });
                    setUserModalMode('create');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-primary text-[#000000] font-bold text-xs flex items-center gap-1.5 shadow-xs active:scale-[0.98] transition-transform"
                >
                  <Plus className="w-4 h-4" /> Tambah Pengguna Baru
                </button>
              </div>

              {/* Users Table */}
              <div className="bg-white rounded-2xl border border-black/8 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-black/[0.02] border-b border-black/8 text-foreground/60 font-semibold text-[11px] uppercase tracking-wider">
                        <th className="py-3 px-4">Nama Lengkap</th>
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Role Akses</th>
                        <th className="py-3 px-4 text-center">Status Akun</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {filteredUsers.map(u => (
                        <tr key={u.id} className="hover:bg-black/[0.01] transition-colors">
                          <td className="py-3 px-4 font-bold text-foreground">
                            {u.name}
                            {u.id === user?.uid && (
                              <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-primary/25 text-[#000000] font-bold border border-primary/30">
                                Anda
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-foreground/50">
                            {u.email}
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={u.role || 'petugas'}
                              disabled={u.id === user?.uid}
                              onChange={e => handleChangeUserRole(u.id, e.target.value as 'admin' | 'petugas' | 'warga')}
                              className="py-1 px-2.5 rounded-lg border border-black/8 bg-white text-xs font-semibold text-foreground disabled:opacity-60 focus:outline-none"
                            >
                              <option value="admin">Admin</option>
                              <option value="petugas">Petugas</option>
                              <option value="warga">Warga</option>
                            </select>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleToggleUserActive(u)}
                              disabled={u.id === user?.uid}
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors disabled:opacity-50 ${
                                u.isActive
                                  ? 'bg-green-100 text-green-700 border-green-200'
                                  : 'bg-red-100 text-red-600 border-red-200'
                              }`}
                            >
                              {u.isActive ? 'Aktif' : 'Nonaktif'}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  setActiveUser(u);
                                  setUserModalMode('edit');
                                }}
                                className="p-1.5 rounded-lg border border-black/8 bg-white text-foreground/70 hover:text-foreground hover:bg-black/[0.02]"
                                title="Edit Pengguna"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u)}
                                disabled={u.id === user?.uid}
                                className="p-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-30 disabled:hover:bg-red-50"
                                title="Hapus Pengguna"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredUsers.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-10 text-center text-foreground/40">
                            Tidak ada data pengguna yang sesuai.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* SECTION 7: PENGATURAN & DEVELOPER TOOLS */}
          {/* ========================================================= */}
          {currentSection === 'settings' && (
            <div className="space-y-4 max-w-4xl">
              {/* Rules & Scope Info */}
              <div className="bg-white rounded-2xl border border-black/8 p-5 sm:p-6">
                <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <Database className="w-4 h-4 text-secondary" /> Ketentuan Jimpitan Dusun
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="p-3.5 rounded-xl border border-black/8 bg-black/[0.02]">
                    <span className="text-[11px] font-medium text-foreground/50">Nominal Harian</span>
                    <p className="text-base font-bold text-foreground mt-1">Rp 500 / hari</p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-black/8 bg-black/[0.02]">
                    <span className="text-[11px] font-medium text-foreground/50">Nominal per Periode</span>
                    <p className="text-base font-bold text-foreground mt-1">Rp 3.500 (7 Hari)</p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-black/8 bg-black/[0.02]">
                    <span className="text-[11px] font-medium text-foreground/50">Hari Penarikan</span>
                    <p className="text-base font-bold text-foreground mt-1">Setiap Hari Sabtu</p>
                  </div>
                </div>
                <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/10 text-foreground text-xs space-y-1 leading-relaxed">
                  <p className="font-bold">Pedoman Utama:</p>
                  <p>• Periode penarikan jimpitan tidak terikat pada awal/akhir bulan kalender.</p>
                  <p>• Jangan memakai penamaan &quot;Minggu 1, Minggu 2&quot;, selalu gunakan istilah &quot;Periode Jimpitan&quot;.</p>
                  <p>• Kelebihan uang dari warga wajib dicatat terpisah sebagai kategori donasi/pemasukan lain.</p>
                </div>
              </div>

              {/* Developer Database Export & Backup */}
              <div className="bg-white rounded-2xl border border-black/8 p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Download className="w-4 h-4 text-secondary" /> Ekspor Seluruh Database (JSON Backup)
                    </h3>
                    <p className="text-xs text-foreground/50 mt-1">
                      Unduh arsip lengkap seluruh koleksi Firestore (Rumah, Periode, Pembayaran, Kas, dan Pengguna).
                    </p>
                  </div>
                  <button
                    onClick={handleExportFullDatabaseJSON}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary text-[#f7f7f7] hover:bg-secondary/90 font-bold text-xs shadow-xs active:scale-[0.98] transition-transform shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" /> Download JSON Backup
                  </button>
                </div>
              </div>

              {/* Active Developer Session Metadata */}
              <div className="bg-white rounded-2xl border border-black/8 p-5 sm:p-6">
                <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-secondary" /> Informasi Kredensial Pengembang
                </h3>
                <div className="divide-y divide-black/5 text-xs">
                  <div className="flex justify-between py-2">
                    <span className="text-foreground/50">UID Pengguna</span>
                    <span className="font-mono font-bold text-foreground">{user?.uid}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-foreground/50">Email Pengguna</span>
                    <span className="font-bold text-foreground">{user?.email}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-foreground/50">Role Akses</span>
                    <span className="font-bold text-secondary">{userData?.role} (Developer / Admin)</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-foreground/50">Total Dokumen Dalam Memori</span>
                    <span className="font-bold text-foreground">
                      {houses.length + periods.length + payments.length + transactions.length + users.length} Dokumen
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: FORM RUMAH (CREATE / EDIT) */}
      {/* ========================================================= */}
      {houseModalMode && activeHouse && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 sm:p-6 w-full max-w-md border border-black/10 shadow-xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                {houseModalMode === 'create' ? 'Tambah Data Rumah Baru' : `Edit Rumah No. ${activeHouse.houseNumber}`}
              </h3>
              <button
                onClick={() => { setHouseModalMode(null); setActiveHouse(null); }}
                className="p-1.5 rounded-lg text-foreground/40 hover:text-foreground hover:bg-black/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveHouse} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1">Nomor Rumah</label>
                <input
                  required
                  type="text"
                  value={activeHouse.houseNumber || ''}
                  onChange={e => setActiveHouse({ ...activeHouse, houseNumber: e.target.value })}
                  placeholder="Contoh: 001 atau A-05"
                  className="w-full px-3 py-2.5 rounded-xl border border-black/8 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1">Kepala Keluarga</label>
                <input
                  required
                  type="text"
                  value={activeHouse.headOfFamily || ''}
                  onChange={e => setActiveHouse({ ...activeHouse, headOfFamily: e.target.value })}
                  placeholder="Nama lengkap kepala keluarga"
                  className="w-full px-3 py-2.5 rounded-xl border border-black/8 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1">Alamat Lengkap</label>
                <textarea
                  required
                  rows={2}
                  value={activeHouse.address || ''}
                  onChange={e => setActiveHouse({ ...activeHouse, address: e.target.value })}
                  placeholder="RT 05 / RW 02, Dusun Jimpit Kulon..."
                  className="w-full px-3 py-2.5 rounded-xl border border-black/8 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1">Catatan Tambahan (Opsional)</label>
                <input
                  type="text"
                  value={activeHouse.notes || ''}
                  onChange={e => setActiveHouse({ ...activeHouse, notes: e.target.value })}
                  placeholder="Catatan khusus lokasi atau keterangan warga"
                  className="w-full px-3 py-2.5 rounded-xl border border-black/8 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="houseActiveCheck"
                  checked={activeHouse.isActive ?? true}
                  onChange={e => setActiveHouse({ ...activeHouse, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-black/20 text-primary focus:ring-primary/40"
                />
                <label htmlFor="houseActiveCheck" className="text-xs font-semibold text-foreground/80 cursor-pointer">
                  Status Rumah Aktif
                </label>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => { setHouseModalMode(null); setActiveHouse(null); }}
                  className="flex-1 py-2.5 rounded-xl border border-black/8 bg-white hover:bg-black/[0.02] text-foreground text-xs font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-primary text-[#000000] text-xs font-bold shadow-xs hover:bg-primary/90 active:scale-[0.98] transition-transform"
                >
                  Simpan Rumah
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: FORM PERIODE (CREATE / EDIT) */}
      {/* ========================================================= */}
      {periodModalMode && activePeriod && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 sm:p-6 w-full max-w-md border border-black/10 shadow-xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                {periodModalMode === 'create' ? 'Tambah Periode Jimpitan' : `Edit Periode #${activePeriod.periodNumber}`}
              </h3>
              <button
                onClick={() => { setPeriodModalMode(null); setActivePeriod(null); }}
                className="p-1.5 rounded-lg text-foreground/40 hover:text-foreground hover:bg-black/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePeriod} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1">Nomor Periode</label>
                <input
                  required
                  disabled={editingPeriodHasPayments}
                  type="number"
                  min="1"
                  value={activePeriod.periodNumber || ''}
                  onChange={e => setActivePeriod({ ...activePeriod, periodNumber: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-black/8 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:bg-black/[0.02] disabled:text-foreground/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-foreground/80 mb-1">Tanggal Mulai</label>
                  <input
                    required
                    disabled={editingPeriodHasPayments}
                    type="date"
                    value={activePeriod.startDateStr || ''}
                    onChange={e => {
                      const start = parseDateInput(e.target.value);
                      setActivePeriod({
                        ...activePeriod,
                        startDateStr: e.target.value,
                        endDateStr: start ? toDateInput(addDays(start, 6)) : activePeriod.endDateStr,
                      });
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border border-black/8 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:bg-black/[0.02] disabled:text-foreground/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground/80 mb-1">Tanggal Selesai</label>
                  <input
                    required
                    disabled={editingPeriodHasPayments}
                    type="date"
                    value={activePeriod.endDateStr || ''}
                    onChange={e => setActivePeriod({ ...activePeriod, endDateStr: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-black/8 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:bg-black/[0.02] disabled:text-foreground/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1">Nominal Tarif (Rp)</label>
                <input
                  required
                  disabled={editingPeriodHasPayments}
                  type="number"
                  min="1"
                  step="500"
                  value={activePeriod.amount || ''}
                  onChange={e => setActivePeriod({ ...activePeriod, amount: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-black/8 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:bg-black/[0.02] disabled:text-foreground/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1">Status Periode</label>
                <select
                  value={activePeriod.status || 'active'}
                  onChange={e => setActivePeriod({ ...activePeriod, status: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-black/8 bg-white text-xs font-semibold focus:outline-none"
                >
                  <option value="active">Aktif (Sedang Berjalan)</option>
                  <option value="archived">Arsip</option>
                </select>
              </div>
              {editingPeriodHasPayments && (
                <p className="text-[11px] text-orange-700 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2">
                  Periode ini sudah memiliki pembayaran. Nomor, tanggal, dan nominal dikunci; hanya status arsip yang dapat diubah.
                </p>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => { setPeriodModalMode(null); setActivePeriod(null); }}
                  className="flex-1 py-2.5 rounded-xl border border-black/8 bg-white hover:bg-black/[0.02] text-foreground text-xs font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-primary text-[#000000] text-xs font-bold shadow-xs hover:bg-primary/90 active:scale-[0.98] transition-transform"
                >
                  Simpan Periode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: FORM PEMBAYARAN (CREATE / EDIT) */}
      {/* ========================================================= */}
      {paymentModalMode && activePayment && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 sm:p-6 w-full max-w-md border border-black/10 shadow-xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                Catat Pembayaran Jimpitan
              </h3>
              <button
                onClick={() => { setPaymentModalMode(null); setActivePayment(null); }}
                className="p-1.5 rounded-lg text-foreground/40 hover:text-foreground hover:bg-black/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1">Pilih Rumah</label>
                <select
                  required
                  value={activePayment.houseId || ''}
                  onChange={e => setActivePayment({ ...activePayment, houseId: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-black/8 bg-white text-xs font-medium focus:outline-none"
                >
                  <option value="">-- Pilih Rumah --</option>
                  {houses.filter(h => h.isActive).map(h => (
                    <option key={h.id} value={h.id}>
                      No. {h.houseNumber} - {h.headOfFamily}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1">Pilih Periode</label>
                <select
                  required
                  value={activePayment.periodId || ''}
                  onChange={e => setActivePayment({ ...activePayment, periodId: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-black/8 bg-white text-xs font-medium focus:outline-none"
                >
                  <option value="">-- Pilih Periode --</option>
                  {periods.filter(pr => pr.status === 'active').map(pr => (
                    <option key={pr.id} value={pr.id}>
                      Periode #{pr.periodNumber} ({formatDateRange(pr.startDate, pr.endDate)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-foreground/80 mb-1">Nominal Pokok (Rp)</label>
                  <div className="w-full px-3 py-2.5 rounded-xl border border-black/8 bg-black/[0.02] text-xs font-semibold text-foreground">
                    {(Number(periodMap.get(activePayment.periodId)?.amount) || 0).toLocaleString('id-ID')}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground/80 mb-1">Donasi/Lebihan (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    value={activePayment.extraAmount || 0}
                    onChange={e => setActivePayment({ ...activePayment, extraAmount: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-black/8 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>
              <p className="text-[11px] text-foreground/50">
                Nominal pokok mengikuti periode yang dipilih. Pembayaran yang sudah tercatat dibatalkan lewat tombol batal, bukan diedit.
              </p>
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => { setPaymentModalMode(null); setActivePayment(null); }}
                  className="flex-1 py-2.5 rounded-xl border border-black/8 bg-white hover:bg-black/[0.02] text-foreground text-xs font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-primary text-[#000000] text-xs font-bold shadow-xs hover:bg-primary/90 active:scale-[0.98] transition-transform"
                >
                  Simpan Pembayaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: FORM TRANSAKSI KEUANGAN (CREATE / EDIT) */}
      {/* ========================================================= */}
      {txModalMode && activeTx && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 sm:p-6 w-full max-w-md border border-black/10 shadow-xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                Catat Transaksi Kas Baru
              </h3>
              <button
                onClick={() => { setTxModalMode(null); setActiveTx(null); }}
                className="p-1.5 rounded-lg text-foreground/40 hover:text-foreground hover:bg-black/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-foreground/80 mb-1">Tipe Transaksi</label>
                  <select
                    value={activeTx.type || 'income'}
                    onChange={e => setActiveTx({
                      ...activeTx,
                      type: e.target.value,
                      category: e.target.value === 'income' ? 'donation' : 'operational',
                    })}
                    className="w-full px-3 py-2.5 rounded-xl border border-black/8 bg-white text-xs font-semibold focus:outline-none"
                  >
                    <option value="income">Pemasukan (+)</option>
                    <option value="expense">Pengeluaran (-)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground/80 mb-1">Kategori</label>
                  <select
                    value={activeTx.category || 'other'}
                    onChange={e => setActiveTx({ ...activeTx, category: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-black/8 bg-white text-xs font-semibold focus:outline-none"
                  >
                    {activeTx.type === 'income' ? (
                      <>
                        <option value="donation">Donasi / Kelebihan</option>
                        <option value="other">Pemasukan Lainnya</option>
                      </>
                    ) : (
                      <>
                        <option value="operational">Operasional</option>
                        <option value="social">Sosial Warga</option>
                        <option value="maintenance">Perawatan Fasilitas</option>
                        <option value="other">Pengeluaran Lainnya</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1">Nominal (Rp)</label>
                <input
                  required
                  type="number"
                  min="100"
                  step="100"
                  value={activeTx.amount || ''}
                  onChange={e => setActiveTx({ ...activeTx, amount: e.target.value })}
                  placeholder="Contoh: 50000"
                  className="w-full px-3 py-2.5 rounded-xl border border-black/8 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1">Keterangan / Deskripsi</label>
                <textarea
                  required
                  rows={2}
                  value={activeTx.description || ''}
                  onChange={e => setActiveTx({ ...activeTx, description: e.target.value })}
                  placeholder="Contoh: Pembelian buku administrasi"
                  className="w-full px-3 py-2.5 rounded-xl border border-black/8 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {activeTx.type === 'expense' && (
                <div>
                  <label className="block text-xs font-semibold text-foreground/80 mb-1">Penerima Dana (wajib)</label>
                  <input
                    required
                    type="text"
                    value={activeTx.takenBy || ''}
                    onChange={e => setActiveTx({ ...activeTx, takenBy: e.target.value })}
                    placeholder="Nama orang yang mengambil/menerima uang kas"
                    className="w-full px-3 py-2.5 rounded-xl border border-black/8 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              )}
              <p className="text-[11px] text-foreground/50">
                Transaksi historis tidak dapat diedit atau dihapus. Koreksi dilakukan dengan transaksi lawan yang tercatat.
              </p>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => { setTxModalMode(null); setActiveTx(null); }}
                  className="flex-1 py-2.5 rounded-xl border border-black/8 bg-white hover:bg-black/[0.02] text-foreground text-xs font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-primary text-[#000000] text-xs font-bold shadow-xs hover:bg-primary/90 active:scale-[0.98] transition-transform"
                >
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5: FORM PENGGUNA (CREATE / EDIT) */}
      {/* ========================================================= */}
      {userModalMode && activeUser && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 sm:p-6 w-full max-w-md border border-black/10 shadow-xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                {userModalMode === 'create' ? 'Tambah Pengguna / Petugas Baru' : `Edit Akun ${activeUser.name}`}
              </h3>
              <button
                onClick={() => { setUserModalMode(null); setActiveUser(null); setUserPassword(''); }}
                className="p-1.5 rounded-lg text-foreground/40 hover:text-foreground hover:bg-black/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1">Nama Lengkap</label>
                <input
                  required
                  type="text"
                  value={activeUser.name || ''}
                  onChange={e => setActiveUser({ ...activeUser, name: e.target.value })}
                  placeholder="Nama petugas / admin"
                  className="w-full px-3 py-2.5 rounded-xl border border-black/8 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {userModalMode === 'create' && (
                <div>
                  <label className="block text-xs font-semibold text-foreground/80 mb-1">Email</label>
                  <input
                    required
                    type="email"
                    value={activeUser.email || ''}
                    onChange={e => setActiveUser({ ...activeUser, email: e.target.value })}
                    placeholder="nama@jimpitkulon.id"
                    className="w-full px-3 py-2.5 rounded-xl border border-black/8 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1">
                  {userModalMode === 'create' ? 'Password Akun (Minimal 6 karakter)' : 'Ubah Password (Kosongkan jika tidak diubah)'}
                </label>
                <input
                  required={userModalMode === 'create'}
                  type="password"
                  value={userPassword}
                  onChange={e => setUserPassword(e.target.value)}
                  placeholder={userModalMode === 'create' ? 'Minimal 6 karakter' : 'Password baru (opsional)'}
                  minLength={6}
                  className="w-full px-3 py-2.5 rounded-xl border border-black/8 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1">Role Akun</label>
                <select
                  value={activeUser.role || 'petugas'}
                  disabled={activeUser.id === user?.uid}
                  onChange={e => setActiveUser({ ...activeUser, role: e.target.value as 'admin' | 'petugas' | 'warga' })}
                  className="w-full px-3 py-2.5 rounded-xl border border-black/8 bg-white text-xs font-semibold focus:outline-none disabled:opacity-60"
                >
                  <option value="admin">Admin (Akses Developer & Panel)</option>
                  <option value="petugas">Petugas (Penarikan Jimpitan)</option>
                  <option value="warga">Warga</option>
                </select>
                {activeUser.id === user?.uid && (
                  <p className="text-[10px] text-amber-600 mt-1">Anda tidak dapat menurunkan role akun sendiri.</p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="userActiveCheck"
                  disabled={activeUser.id === user?.uid}
                  checked={activeUser.isActive ?? true}
                  onChange={e => setActiveUser({ ...activeUser, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-black/20 text-primary focus:ring-primary/40 disabled:opacity-50"
                />
                <label htmlFor="userActiveCheck" className="text-xs font-semibold text-foreground/80 cursor-pointer">
                  Status Akun Aktif
                </label>
              </div>
              {activeUser.id === user?.uid && (
                <p className="text-[10px] text-amber-600">Anda tidak dapat menonaktifkan akun sendiri.</p>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  disabled={isSubmittingUser}
                  onClick={() => { setUserModalMode(null); setActiveUser(null); setUserPassword(''); }}
                  className="flex-1 py-2.5 rounded-xl border border-black/8 bg-white hover:bg-black/[0.02] text-foreground text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUser}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-[#000000] text-xs font-bold shadow-xs hover:bg-primary/90 active:scale-[0.98] transition-transform disabled:opacity-50"
                >
                  {isSubmittingUser ? 'Menyimpan...' : 'Simpan Pengguna'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 6: QR CODE PREVIEW & DOWNLOAD */}
      {/* ========================================================= */}
      {selectedHouseForQR && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 sm:p-6 w-full max-w-sm flex flex-col items-center border border-black/10 shadow-xl animate-in zoom-in-95 duration-150">
            <div className="w-full flex justify-between items-center mb-4">
              <div>
                <h3 className="font-bold text-sm sm:text-base text-foreground">QR Code Rumah</h3>
                <p className="text-xs text-foreground/50">ID: {selectedHouseForQR.qrCode}</p>
              </div>
              <button
                onClick={() => setSelectedHouseForQR(null)}
                className="p-1.5 rounded-lg text-foreground/40 hover:text-foreground hover:bg-black/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-white p-4 rounded-xl border border-black/10 shadow-xs mb-4">
              <QRCode
                id="AdminQRCodeImage"
                value={selectedHouseForQR.qrCode}
                size={190}
                level="H"
              />
            </div>

            <div className="text-center mb-5">
              <p className="font-bold text-base text-foreground">{selectedHouseForQR.headOfFamily}</p>
              <p className="text-xs text-foreground/60 font-medium">Nomor Rumah: {selectedHouseForQR.houseNumber}</p>
              <p className="text-xs text-foreground/40 mt-0.5">{selectedHouseForQR.address}</p>
            </div>

            <button
              onClick={downloadQRCode}
              className="w-full flex items-center justify-center gap-2 bg-primary text-[#000000] py-2.5 rounded-xl font-bold text-xs shadow-xs hover:bg-primary/90 active:scale-[0.98] transition-transform"
            >
              <Download className="w-3.5 h-3.5" /> Download QR Code (PNG)
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 7: DELETE CONFIRMATION DIALOG */}
      {/* ========================================================= */}
      {deleteDialog.isOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 sm:p-6 w-full max-w-md border border-black/10 shadow-xl animate-in zoom-in-95 duration-150">
            <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-3.5 border border-red-100">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm sm:text-base text-foreground mb-1.5">{deleteDialog.title}</h3>
            <p className="text-xs text-foreground/65 leading-relaxed mb-5">{deleteDialog.description}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteDialog(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 py-2.5 rounded-xl border border-black/8 bg-white hover:bg-black/[0.02] text-foreground text-xs font-semibold transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={deleteDialog.onConfirm}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs active:scale-[0.98] transition-transform"
              >
                {deleteDialog.confirmLabel || 'Ya, Hapus Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
