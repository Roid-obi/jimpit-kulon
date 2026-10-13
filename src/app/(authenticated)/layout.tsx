"use client";

import { AuthGuard } from "@/components/guard/AuthGuard";
import { BottomNav } from "@/components/layout/BottomNav";
import { usePathname } from "next/navigation";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isScanPage = pathname === '/jimpitan/scan';
  const isAdminPage = pathname?.startsWith('/admin');
  const hideBottomNav = isScanPage || isAdminPage;

  return (
    <AuthGuard>
      <div className="flex flex-col min-h-screen bg-background">
        <main className="flex-1" style={{ paddingBottom: hideBottomNav ? 0 : 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
          {children}
        </main>
        {!hideBottomNav && <BottomNav />}
      </div>
    </AuthGuard>
  );
}
