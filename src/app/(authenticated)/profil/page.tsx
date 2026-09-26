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
    <div className="max-w-lg mx-auto px-4 pb-24 bg-background min-h-screen pt-4">
      <h1 className="text-xl font-bold text-foreground mb-2">Profil Saya</h1>

      <div className="flex flex-col items-center py-8 mb-4">
        <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center text-[#000000] text-3xl font-bold mb-3 shadow-sm">
          {initials}
        </div>
        <h2 className="text-xl font-bold text-foreground">{userData.name}</h2>
        <p className="text-sm text-foreground/50 mt-0.5">{user.email}</p>
        <span className={`mt-2 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1 ${
          userData.role === 'admin' ? 'bg-secondary text-[#f7f7f7]' : 'bg-primary/20 text-foreground'
        }`}>
          <Shield className="w-3.5 h-3.5" />
          {userData.role === 'admin' ? 'Admin' : 'Petugas'}
        </span>
      </div>

      <div className="space-y-2 mb-6">
        {/* Status akun */}
        <div className="bg-white rounded-2xl px-4 py-3.5 border border-black/5 flex items-center justify-between">
          <span className="text-sm font-medium text-foreground/60">Status Akun</span>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
            userData.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
          }`}>
            {userData.isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
            {userData.isActive ? 'Aktif' : 'Nonaktif'}
          </span>
        </div>
        {/* Email Verified */}
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

      <div className="flex flex-col gap-3">
        {message && (
          <div className={`p-3 rounded-lg text-sm font-medium text-center ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message.text}
          </div>
        )}
        
        <div className="space-y-2">
          <button
            onClick={handleResetPassword}
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-white border border-black/8 text-foreground font-semibold text-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-foreground"></div>
            ) : (
              <>
                <Key className="w-4 h-4" /> Reset Password
              </>
            )}
          </button>
          <button
            onClick={handleLogout}
            className="w-full py-3.5 rounded-xl bg-secondary text-[#f7f7f7] font-bold text-base flex items-center justify-center gap-2"
          >
            <LogOut className="w-5 h-5" /> Keluar
          </button>
        </div>
      </div>
    </div>
  );
}
