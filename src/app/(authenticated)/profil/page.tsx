'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { app } from '@/lib/firebase/client';
import { LogOut, Key, CheckCircle2, XCircle, Shield } from 'lucide-react';
import { useState } from 'react';

export default function ProfilPage() {
  const { user, userData, logout } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleResetPassword = async () => {
    if (!user?.email) return;
    setLoading(true);
    setMessage(null);
    try {
      const auth = getAuth(app);
      await sendPasswordResetEmail(auth, user.email);
      setMessage({ type: 'success', text: 'Email reset password telah dikirim!' });
    } catch (error: any) {
      console.error(error);
      setMessage({ type: 'error', text: 'Gagal mengirim email reset password.' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  if (!user || !userData) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const initials = userData.name ? userData.name.substring(0, 2).toUpperCase() : '??';

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* === HERO HEADER === */}
      <div
        className="relative bg-secondary overflow-hidden"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 20px)', paddingBottom: '32px' }}
      >
        {/* Decorative */}
        <div className="absolute -top-10 -right-10 w-44 h-44 bg-white/8 rounded-full pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full pointer-events-none" />

        <div className="flex flex-col items-center relative z-10">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-3xl bg-white/20 border-2 border-white/25 flex items-center justify-center text-[#f7f7f7] text-3xl font-bold mb-3">
            {initials}
          </div>
          {/* Nama */}
          <h1 className="text-[#f7f7f7] text-xl font-bold">{userData.name}</h1>
          <p className="text-[#f7f7f7]/50 text-sm mt-0.5">{user.email}</p>
          {/* Badge role */}
          <span className={`mt-3 text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 ${
            userData.role === 'admin'
              ? 'bg-white/20 text-[#f7f7f7] border border-white/20'
              : 'bg-primary/20 text-primary border border-primary/20'
          }`}>
            <Shield className="w-3.5 h-3.5" />
            {userData.role === 'admin' ? 'Admin' : 'Petugas'}
          </span>
        </div>
      </div>

      {/* === CONTENT === */}
      <div className="px-4 pt-4">
        {/* Info cards */}
        <div className="space-y-2 mb-5">
          <div className="bg-white rounded-2xl px-4 py-3.5 border border-black/5 flex items-center justify-between">
            <span className="text-sm font-medium text-foreground/60">Status Akun</span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
              userData.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
            }`}>
              {userData.isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              {userData.isActive ? 'Aktif' : 'Nonaktif'}
            </span>
          </div>
          <div className="bg-white rounded-2xl px-4 py-3.5 border border-black/5 flex items-center justify-between">
            <span className="text-sm font-medium text-foreground/60">Status Email</span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
              user.emailVerified ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {user.emailVerified ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              {user.emailVerified ? 'Terverifikasi' : 'Belum Verifikasi'}
            </span>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-3.5 rounded-xl text-sm font-medium text-center mb-4 ${
            message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* Aksi */}
        <div className="space-y-2">
          <button
            onClick={handleResetPassword}
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-white border border-black/8 text-foreground font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            {loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-foreground" /> : <><Key className="w-4 h-4" /> Reset Password</>}
          </button>
          <button
            onClick={handleLogout}
            className="w-full py-3.5 rounded-xl bg-secondary text-[#f7f7f7] font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <LogOut className="w-5 h-5" /> Keluar
          </button>
        </div>
      </div>
    </div>
  );
}
