'use client';

import { useState, useEffect } from 'react';
import {
  collection, doc, getDocs, getFirestore,
  orderBy, query, serverTimestamp, Timestamp,
  updateDoc, addDoc, where
} from 'firebase/firestore';
import { app } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, Home, Users, Settings, Plus, Check, Archive, X } from 'lucide-react';

const db = getFirestore(app);

export default function AdminPage() {
  const { user, userData } = useAuth();
  const [activeTab, setActiveTab] = useState<'periode' | 'rumah' | 'pengguna' | 'pengaturan'>('periode');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tab Periode State
  const [periods, setPeriods] = useState<any[]>([]);
  const [isCreatingPeriod, setIsCreatingPeriod] = useState(false);

  // Tab Rumah State
  const [houses, setHouses] = useState<any[]>([]);
  const [showHouseForm, setShowHouseForm] = useState(false);
  const [newHouse, setNewHouse] = useState({ houseNumber: '', headOfFamily: '', address: '' });

  // Tab Pengguna State
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    if (userData?.role === 'admin') {
      if (activeTab === 'periode') fetchPeriods();
      if (activeTab === 'rumah') fetchHouses();
      if (activeTab === 'pengguna') fetchUsers();
    }
  }, [activeTab, userData]);

  const fetchPeriods = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'periods'), orderBy('startDate', 'desc')));
      setPeriods(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error(err);
      setError('Gagal memuat periode');
    } finally {
      setLoading(false);
    }
  };

  const fetchHouses = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'houses'));
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort client-side untuk menghindari composite index
      data.sort((a: any, b: any) => a.houseNumber.localeCompare(b.houseNumber, undefined, { numeric: true }));
      setHouses(data);
    } catch (err) {
      console.error(err);
      setError('Gagal memuat data rumah');
    } finally {
      setLoading(false);
    }
  };

  // Seed data contoh untuk 10 rumah pertama
  const handleSeedHouses = async () => {
    if (!window.confirm('Ini akan menambahkan 10 data rumah contoh ke database. Lanjutkan?')) return;
    setLoading(true);
    try {
      const contohRumah = [
        { houseNumber: '001', headOfFamily: 'Bapak Suharto', address: 'RT 05 No. 1' },
        { houseNumber: '002', headOfFamily: 'Bapak Sudirman', address: 'RT 05 No. 2' },
        { houseNumber: '003', headOfFamily: 'Bapak Wahyu Santoso', address: 'RT 05 No. 3' },
        { houseNumber: '004', headOfFamily: 'Bapak Agus Purnomo', address: 'RT 05 No. 4' },
        { houseNumber: '005', headOfFamily: 'Bapak Eko Prasetyo', address: 'RT 05 No. 5' },
        { houseNumber: '006', headOfFamily: 'Ibu Siti Rahayu', address: 'RT 05 No. 6' },
        { houseNumber: '007', headOfFamily: 'Bapak Joko Widodo', address: 'RT 05 No. 7' },
        { houseNumber: '008', headOfFamily: 'Bapak Bambang Sutrisno', address: 'RT 05 No. 8' },
        { houseNumber: '009', headOfFamily: 'Ibu Dewi Lestari', address: 'RT 05 No. 9' },
        { houseNumber: '010', headOfFamily: 'Bapak Hendra Gunawan', address: 'RT 05 No. 10' },
      ];
      for (const rumah of contohRumah) {
        await addDoc(collection(db, 'houses'), {
          ...rumah,
          qrCode: `RUMAH-${rumah.houseNumber}`,
          notes: null,
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await fetchHouses();
      alert('10 data rumah contoh berhasil ditambahkan!');
    } catch (err) {
      console.error(err);
      setError('Gagal menambahkan data contoh');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'users'), orderBy('name', 'asc')));
      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error(err);
      setError('Gagal memuat data pengguna');
    } finally {
      setLoading(false);
    }
  };

  // Periode Actions
  const handleCreatePeriod = async () => {
    if (!window.confirm("Buat periode baru (7 hari ke depan)?")) return;
    setIsCreatingPeriod(true);
    try {
      const latestPeriodNum = periods.length > 0 ? Math.max(...periods.map((p) => p.periodNumber || 0)) : 0;
      const now = new Date();
      const startDate = Timestamp.fromDate(now);
      const endDateDate = new Date(now);
      endDateDate.setDate(endDateDate.getDate() + 7);
      const endDate = Timestamp.fromDate(endDateDate);

      await addDoc(collection(db, 'periods'), {
        periodNumber: latestPeriodNum + 1,
        startDate,
        endDate,
        amount: 3500,
        status: "active",
      });
      await fetchPeriods();
    } catch (err) {
      console.error(err);
      setError('Gagal membuat periode');
    } finally {
      setIsCreatingPeriod(false);
    }
  };

  const handleArchivePeriod = async (id: string) => {
    if (!window.confirm("Arsipkan periode ini?")) return;
    try {
      await updateDoc(doc(db, 'periods', id), { status: 'archived' });
      await fetchPeriods();
    } catch (err) {
      console.error(err);
      setError('Gagal mengarsipkan periode');
    }
  };

  // Rumah Actions
  const handleAddHouse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const docRef = await addDoc(collection(db, 'houses'), {
        ...newHouse,
        qrCode: '',
        notes: null,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'houses', docRef.id), { qrCode: docRef.id });
      setNewHouse({ houseNumber: '', headOfFamily: '', address: '' });
      setShowHouseForm(false);
      await fetchHouses();
    } catch (err) {
      console.error(err);
      setError('Gagal menambah rumah');
    }
  };

  const handleToggleHouseActive = async (id: string, current: boolean) => {
    try {
      await updateDoc(doc(db, 'houses', id), { isActive: !current });
      await fetchHouses();
    } catch (err) {
      console.error(err);
      setError('Gagal mengubah status rumah');
    }
  };

  // Pengguna Actions
  const handleToggleUserActive = async (uid: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', uid), { isActive: !currentStatus, updatedAt: serverTimestamp() });
      await fetchUsers();
    } catch (err) {
      console.error(err);
      setError('Gagal mengubah status pengguna');
    }
  };

  const handleChangeUserRole = async (uid: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole, updatedAt: serverTimestamp() });
      await fetchUsers();
    } catch (err) {
      console.error(err);
      setError('Gagal mengubah role pengguna');
    }
  };

  const formatDateRange = (start: any, end: any) => {
    if (!start || !end) return '';
    const startDate = start.toDate().toLocaleDateString('id-ID');
    const endDate = end.toDate().toLocaleDateString('id-ID');
    return `${startDate} - ${endDate}`;
  };

  if (userData?.role !== 'admin') {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[50vh] text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-2">Akses Ditolak</h1>
        <p className="text-foreground/70">Hanya Administrator yang dapat mengakses halaman ini.</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pb-24 bg-background min-h-screen pt-4">
      <h1 className="text-xl font-bold text-foreground mb-6">Panel Admin</h1>

      {/* Tabs Navigation */}
      <div className="flex gap-1 p-1 bg-black/5 rounded-xl mb-6 overflow-x-auto">
        {[
          { id: 'periode', emoji: '📅', label: 'Periode' },
          { id: 'rumah', emoji: '🏠', label: 'Rumah' },
          { id: 'pengguna', emoji: '👥', label: 'Pengguna' },
          { id: 'pengaturan', emoji: '⚙️', label: 'Pengaturan' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 min-w-fit py-2 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === tab.id ? 'bg-white text-foreground shadow-sm' : 'text-foreground/50'
            }`}
          >
            {tab.emoji} {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-semibold flex justify-between items-center mb-4 border border-red-100">
          {error}
          <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* TAB PERIODE */}
      {activeTab === 'periode' && (
        <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
          <div className="px-4 py-3.5 border-b border-black/5 flex justify-between items-center bg-black/[0.02]">
            <h2 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
              Daftar Periode
            </h2>
            <button
              onClick={handleCreatePeriod}
              disabled={isCreatingPeriod}
              className="flex items-center gap-1.5 bg-primary text-[#000000] px-4 py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isCreatingPeriod ? 'Membuat...' : 'Buat Periode'}</span>
            </button>
          </div>
          {loading ? (
            <div className="p-8 text-center text-sm text-foreground/50">Memuat...</div>
          ) : (
            <div className="divide-y divide-black/[0.04]">
              {periods.map(period => (
                <div key={period.id} className="px-4 py-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {formatDateRange(period.startDate, period.endDate)}
                    </p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1.5 inline-block ${
                      period.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {period.status === 'active' ? 'Aktif' : 'Arsip'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-bold text-sm text-foreground">Rp {period.amount?.toLocaleString('id-ID')}</p>
                    {period.status === 'active' && (
                      <button
                        onClick={() => handleArchivePeriod(period.id)}
                        className="text-red-500 bg-red-50 p-1.5 rounded-lg hover:bg-red-100 transition-colors"
                        title="Arsipkan"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {periods.length === 0 && <div className="p-8 text-center text-sm text-foreground/50">Belum ada periode.</div>}
            </div>
          )}
        </div>
      )}

      {/* TAB RUMAH */}
      {activeTab === 'rumah' && (
        <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
          <div className="px-4 py-3.5 border-b border-black/5 flex justify-between items-center bg-black/[0.02]">
            <h2 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
              Daftar Rumah
            </h2>
            <button
              onClick={() => setShowHouseForm(!showHouseForm)}
              className="flex items-center gap-1.5 bg-primary text-[#000000] px-4 py-2 rounded-xl text-xs font-bold transition-colors"
            >
              {showHouseForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              <span>{showHouseForm ? 'Batal' : 'Tambah'}</span>
            </button>
          </div>

          {showHouseForm && (
            <div className="p-4 border-b border-black/5 bg-gray-50/50">
              <form onSubmit={handleAddHouse} className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-foreground/80">Nomor Rumah</label>
                  <input required value={newHouse.houseNumber} onChange={e => setNewHouse({...newHouse, houseNumber: e.target.value})} className="w-full px-3 py-2 border border-black/8 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Contoh: A-1" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-foreground/80">Kepala Keluarga</label>
                  <input required value={newHouse.headOfFamily} onChange={e => setNewHouse({...newHouse, headOfFamily: e.target.value})} className="w-full px-3 py-2 border border-black/8 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Nama lengkap" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-foreground/80">Alamat Lengkap</label>
                  <textarea required value={newHouse.address} onChange={e => setNewHouse({...newHouse, address: e.target.value})} className="w-full px-3 py-2 border border-black/8 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" rows={2} />
                </div>
                <button type="submit" className="bg-secondary text-[#f7f7f7] py-2.5 mt-1 rounded-xl font-bold text-sm">Simpan Rumah</button>
              </form>
            </div>
          )}

          {loading ? (
            <div className="p-8 text-center text-sm text-foreground/50">Memuat...</div>
          ) : (
            <div className="divide-y divide-black/[0.04]">
              {houses.map(house => (
                <div key={house.id} className="px-4 py-3.5 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-foreground">{house.houseNumber}</p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${house.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {house.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-foreground/70 mt-0.5">{house.headOfFamily}</p>
                  </div>
                  <button
                    onClick={() => handleToggleHouseActive(house.id, house.isActive)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${house.isActive ? 'border-red-200 text-red-600 bg-red-50' : 'border-green-200 text-green-700 bg-green-50'}`}
                  >
                    Set {house.isActive ? 'Nonaktif' : 'Aktif'}
                  </button>
                </div>
              ))}
              {houses.length === 0 && (
                <div className="p-8 text-center">
                  <p className="text-sm text-foreground/50 mb-3">Belum ada data rumah.</p>
                  <button
                    onClick={handleSeedHouses}
                    disabled={loading}
                    className="bg-primary text-[#000000] px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
                  >
                    📋 Isi 10 Data Rumah Contoh
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB PENGGUNA */}
      {activeTab === 'pengguna' && (
        <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
          <div className="px-4 py-3.5 border-b border-black/5 bg-black/[0.02]">
            <h2 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
              Manajemen Pengguna
            </h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-sm text-foreground/50">Memuat...</div>
          ) : (
            <div className="divide-y divide-black/[0.04]">
              {users.map(u => (
                <div key={u.id} className="px-4 py-3.5 flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm text-foreground">{u.name}</p>
                      <p className="text-foreground/50 text-xs mt-0.5">{u.email}</p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-1.5 inline-block ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {u.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <select
                        value={u.role || 'warga'}
                        onChange={(e) => handleChangeUserRole(u.id, e.target.value)}
                        className="py-1 px-2 text-xs font-medium border border-black/8 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-primary/50"
                        disabled={u.id === user?.uid}
                      >
                        <option value="admin">Admin</option>
                        <option value="petugas">Petugas</option>
                        <option value="warga">Warga</option>
                      </select>
                      <button
                        onClick={() => handleToggleUserActive(u.id, !!u.isActive)}
                        disabled={u.id === user?.uid}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold border disabled:opacity-50 ${u.isActive ? 'border-red-200 text-red-600 bg-red-50' : 'border-green-200 text-green-700 bg-green-50'}`}
                      >
                        {u.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {users.length === 0 && <div className="p-8 text-center text-sm text-foreground/50">Tidak ada pengguna.</div>}
            </div>
          )}
        </div>
      )}

      {/* TAB PENGATURAN */}
      {activeTab === 'pengaturan' && (
        <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
          <div className="px-4 py-3.5 border-b border-black/5 bg-black/[0.02]">
            <h2 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
              Pengaturan Sistem
            </h2>
          </div>
          <div className="p-5 flex flex-col gap-4">
            <div className="bg-primary/10 p-4 rounded-xl border border-primary/20">
              <h3 className="font-bold text-sm text-foreground mb-3">Informasi Pembayaran Jimpitan</h3>
              <ul className="text-xs text-foreground/80 space-y-2">
                <li className="flex justify-between border-b border-black/5 pb-1.5">
                  <span className="font-medium">Nominal Harian:</span> <span className="font-bold">Rp 500</span>
                </li>
                <li className="flex justify-between border-b border-black/5 pb-1.5">
                  <span className="font-medium">Nominal per Periode (7 hari):</span> <span className="font-bold">Rp 3.500</span>
                </li>
                <li className="flex justify-between pb-0.5">
                  <span className="font-medium">Hari Penarikan:</span> <span className="font-bold">Sabtu</span>
                </li>
              </ul>
              <p className="text-[10px] font-medium text-foreground/50 mt-4 italic">
                * Catatan: Perubahan nominal akan memengaruhi periode yang dibuat setelahnya.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
