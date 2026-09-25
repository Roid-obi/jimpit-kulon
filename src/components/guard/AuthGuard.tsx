"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
      } else if (!user.emailVerified && !userData?.emailVerified) {
        router.replace("/verify-email");
      }
      // isActive check sudah ada, pertahankan
    }
  }, [user, userData, loading, router, pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || (!user.emailVerified && !userData?.emailVerified)) {
    return null; // Will redirect in useEffect
  }

  if (userData && !userData.isActive) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-2">
          Akun Dinonaktifkan
        </h1>
        <p className="text-gray-600">
          Akun Anda saat ini belum aktif atau telah dinonaktifkan oleh Admin.
          Silakan hubungi administrator untuk mengaktifkan akun Anda.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
