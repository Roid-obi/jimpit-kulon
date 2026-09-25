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
    <div className="p-4 max-w-md mx-auto w-full flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-foreground">Profil Saya</h1>

      <div className="bg-background rounded-xl shadow-sm border border-foreground/10 p-6 flex flex-col items-center text-center">
        <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center mb-4 text-[#000000] text-3xl font-bold">
          {initials}
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-1">{userData.name}</h2>
        <p className="text-foreground/70 mb-4">{user.email}</p>

        <div className="flex gap-2 flex-wrap justify-center mb-4">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-primary/20 text-foreground">
            <Shield className="w-4 h-4" />
            {userData.role === 'admin' ? 'Administrator' : userData.role === 'petugas' ? 'Petugas' : 'Warga'}
          </span>
          {userData.isActive ? (
             <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
             <CheckCircle2 className="w-4 h-4" />
             Aktif
           </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
             <XCircle className="w-4 h-4" />
             Nonaktif
           </span>
          )}
          {user.emailVerified ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
              <CheckCircle2 className="w-4 h-4" />
              Email Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700">
              <XCircle className="w-4 h-4" />
              Email Unverified
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {message && (
          <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message.text}
          </div>
        )}
        
        <button
          onClick={handleResetPassword}
          disabled={loading}
          className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg bg-foreground/5 text-foreground hover:bg-foreground/10 transition-colors font-medium"
        >
          {loading ? (
             <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-foreground"></div>
          ) : (
            <>
              <Key className="w-5 h-5" />
              Kirim Email Reset Password
            </>
          )}
        </button>

        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg bg-secondary text-[#f7f7f7] hover:opacity-90 transition-opacity font-medium mt-4"
        >
          <LogOut className="w-5 h-5" />
          Keluar
        </button>
      </div>
    </div>
  );
}
