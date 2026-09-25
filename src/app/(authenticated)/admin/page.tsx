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
      const snap = await getDocs(query(collection(db, 'houses'), orderBy('houseNumber', 'asc')));
      setHouses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error(err);
      setError('Gagal memuat data rumah');
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
    <div className="flex flex-col p-4 max-w-4xl mx-auto w-full gap-6">
      <h1 className="text-2xl font-bold text-foreground">Panel Admin</h1>

      {/* Tabs Navigation */}
      <div className="flex overflow-x-auto gap-2 p-1 bg-foreground/10 rounded-lg">
        {[
          { id: 'periode', label: 'Periode', icon: Calendar },
          { id: 'rumah', label: 'Rumah', icon: Home },
          { id: 'pengguna', label: 'Pengguna', icon: Users },
          { id: 'pengaturan', label: 'Pengaturan', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id ? 'bg-background shadow text-foreground' : 'text-foreground/60 hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex justify-between items-center">
          {error}
          <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* TAB PERIODE */}
      {activeTab === 'periode' && (
        <div className="bg-background rounded-xl shadow-sm border border-foreground/10 overflow-hidden">
          <div className="p-4 border-b border-foreground/10 bg-foreground/5 flex justify-between items-center">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Calendar className="w-5 h-5 text-foreground/50" /> Daftar Periode
            </h2>
            <button
              onClick={handleCreatePeriod}
              disabled={isCreatingPeriod}
              className="flex items-center gap-2 bg-primary text-[#000000] px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{isCreatingPeriod ? 'Membuat...' : 'Buat Periode'}</span>
            </button>
          </div>
          {loading ? (
            <div className="p-8 text-center text-foreground/50">Memuat...</div>
          ) : (
            <ul className="divide-y divide-foreground/10">
              {periods.map(period => (
                <li key={period.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {formatDateRange(period.startDate, period.endDate)}
                    </p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-2 inline-block ${
                      period.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {period.status === 'active' ? 'Aktif' : 'Arsip'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="font-semibold text-foreground">Rp {period.amount?.toLocaleString('id-ID')}</p>
                    {period.status === 'active' && (
                      <button
                        onClick={() => handleArchivePeriod(period.id)}
                        className="text-foreground/50 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors"
                        title="Arsipkan"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
              {periods.length === 0 && <div className="p-8 text-center text-foreground/50">Belum ada periode.</div>}
            </ul>
          )}
        </div>
      )}

      {/* TAB RUMAH */}
      {activeTab === 'rumah' && (
        <div className="bg-background rounded-xl shadow-sm border border-foreground/10 overflow-hidden">
          <div className="p-4 border-b border-foreground/10 bg-foreground/5 flex justify-between items-center">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Home className="w-5 h-5 text-foreground/50" /> Daftar Rumah
            </h2>
            <button
              onClick={() => setShowHouseForm(!showHouseForm)}
              className="flex items-center gap-2 bg-primary text-[#000000] px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              {showHouseForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span className="hidden sm:inline">{showHouseForm ? 'Batal' : 'Tambah Rumah'}</span>
            </button>
          </div>

          {showHouseForm && (
            <div className="p-4 border-b border-foreground/10 bg-foreground/5">
              <form onSubmit={handleAddHouse} className="flex flex-col gap-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground/80">Nomor Rumah</label>
                  <input required value={newHouse.houseNumber} onChange={e => setNewHouse({...newHouse, houseNumber: e.target.value})} className="w-full p-2 border border-foreground/20 rounded-md bg-background text-foreground" placeholder="Contoh: A-1" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground/80">Kepala Keluarga</label>
                  <input required value={newHouse.headOfFamily} onChange={e => setNewHouse({...newHouse, headOfFamily: e.target.value})} className="w-full p-2 border border-foreground/20 rounded-md bg-background text-foreground" placeholder="Nama lengkap" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground/80">Alamat Lengkap</label>
                  <textarea required value={newHouse.address} onChange={e => setNewHouse({...newHouse, address: e.target.value})} className="w-full p-2 border border-foreground/20 rounded-md bg-background text-foreground" rows={2} />
                </div>
                <button type="submit" className="bg-secondary text-[#f7f7f7] py-2 rounded-md font-medium hover:opacity-90">Simpan Rumah</button>
              </form>
            </div>
          )}

          {loading ? (
            <div className="p-8 text-center text-foreground/50">Memuat...</div>
          ) : (
            <ul className="divide-y divide-foreground/10">
              {houses.map(house => (
                <li key={house.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">{house.houseNumber}</p>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${house.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {house.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/70">{house.headOfFamily}</p>
                    <p className="text-xs text-foreground/50 mt-1 font-mono">QR: {house.id}</p>
                  </div>
                  <button
                    onClick={() => handleToggleHouseActive(house.id, house.isActive)}
                    className="text-sm px-3 py-1 rounded-md border border-foreground/20 hover:bg-foreground/5"
                  >
                    Set {house.isActive ? 'Nonaktif' : 'Aktif'}
                  </button>
                </li>
              ))}
              {houses.length === 0 && <div className="p-8 text-center text-foreground/50">Belum ada data rumah.</div>}
            </ul>
          )}
        </div>
      )}

      {/* TAB PENGGUNA */}
      {activeTab === 'pengguna' && (
        <div className="bg-background rounded-xl shadow-sm border border-foreground/10 overflow-hidden">
          <div className="p-4 border-b border-foreground/10 bg-foreground/5">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-foreground/50" /> Manajemen Pengguna
            </h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-foreground/50">Memuat...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-foreground/5 border-b border-foreground/10">
                  <tr>
                    <th className="p-4 font-medium text-foreground/70">Nama / Email</th>
                    <th className="p-4 font-medium text-foreground/70">Role</th>
                    <th className="p-4 font-medium text-foreground/70">Status</th>
                    <th className="p-4 font-medium text-foreground/70 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/10">
                  {users.map(u => (
                    <tr key={u.id}>
                      <td className="p-4">
                        <p className="font-medium text-foreground">{u.name}</p>
                        <p className="text-foreground/50 text-xs">{u.email}</p>
                      </td>
                      <td className="p-4">
                        <select
                          value={u.role || 'warga'}
                          onChange={(e) => handleChangeUserRole(u.id, e.target.value)}
                          className="p-1 text-sm border border-foreground/20 rounded-md bg-background"
                          disabled={u.id === user?.uid}
                        >
                          <option value="admin">Admin</option>
                          <option value="petugas">Petugas</option>
                          <option value="warga">Warga</option>
                        </select>
                      </td>
                      <td className="p-4">
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {u.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleToggleUserActive(u.id, !!u.isActive)}
                          disabled={u.id === user?.uid}
                          className="text-xs px-2 py-1 rounded-md border border-foreground/20 hover:bg-foreground/5 disabled:opacity-50"
                        >
                          {u.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-foreground/50">Tidak ada pengguna.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB PENGATURAN */}
      {activeTab === 'pengaturan' && (
        <div className="bg-background rounded-xl shadow-sm border border-foreground/10 overflow-hidden">
          <div className="p-4 border-b border-foreground/10 bg-foreground/5">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Settings className="w-5 h-5 text-foreground/50" /> Pengaturan Sistem
            </h2>
          </div>
          <div className="p-6 flex flex-col gap-4">
            <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
              <h3 className="font-medium text-foreground mb-2">Informasi Pembayaran Jimpitan</h3>
              <ul className="text-sm text-foreground/80 space-y-2">
                <li className="flex justify-between border-b border-foreground/10 pb-1">
                  <span>Nominal Harian:</span> <span className="font-bold">Rp 500</span>
                </li>
                <li className="flex justify-between border-b border-foreground/10 pb-1">
                  <span>Nominal per Periode (7 hari):</span> <span className="font-bold">Rp 3.500</span>
                </li>
                <li className="flex justify-between border-b border-foreground/10 pb-1">
                  <span>Hari Penarikan:</span> <span className="font-bold">Sabtu</span>
                </li>
              </ul>
              <p className="text-xs text-foreground/60 mt-4 italic">
                * Catatan: Perubahan nominal akan memengaruhi periode yang dibuat setelahnya.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
