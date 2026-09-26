"use client";
import { Home, ClipboardList, QrCode, Wallet, Settings, UserCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export function BottomNav() {
  const pathname = usePathname();
  const { userData } = useAuth();

  const isActive = (path: string, exact = false) =>
    exact ? pathname === path : pathname?.startsWith(path);

  const navItems = [
    { href: '/dashboard', icon: Home, label: 'Beranda', exact: true },
    { href: '/jimpitan', icon: ClipboardList, label: 'Jimpitan', exact: false, excludeStart: '/jimpitan/scan' },
  ];

  const rightItems = [
    { href: '/keuangan', icon: Wallet, label: 'Keuangan' },
    userData?.role === 'admin'
      ? { href: '/admin', icon: Settings, label: 'Admin' }
      : { href: '/profil', icon: UserCircle, label: 'Profil' },
  ];

  const isJimpitanActive = pathname?.startsWith('/jimpitan') && !pathname?.startsWith('/jimpitan/scan');

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/[0.06] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] z-20">
      <div className="flex justify-around items-end px-2 pt-2 pb-4 max-w-lg mx-auto">
        {/* Beranda */}
        <Link href="/dashboard" className={`flex flex-col items-center gap-0.5 min-w-[52px] ${
          isActive('/dashboard', true) ? 'text-primary' : 'text-foreground/35'
        }`}>
          <Home className="w-6 h-6" strokeWidth={isActive('/dashboard', true) ? 2.5 : 1.8} />
          <span className="text-[10px] font-medium">Beranda</span>
        </Link>

        {/* Jimpitan */}
        <Link href="/jimpitan" className={`flex flex-col items-center gap-0.5 min-w-[52px] ${
          isJimpitanActive ? 'text-primary' : 'text-foreground/35'
        }`}>
          <ClipboardList className="w-6 h-6" strokeWidth={isJimpitanActive ? 2.5 : 1.8} />
          <span className="text-[10px] font-medium">Jimpitan</span>
        </Link>

        {/* Scan QR — Center FAB */}
        <Link href="/jimpitan/scan" className="flex flex-col items-center gap-0.5 min-w-[52px]">
          <div className={`w-14 h-14 -mt-7 rounded-2xl flex items-center justify-center shadow-[0_8px_24px_rgba(245,181,83,0.45)] ${
            isActive('/jimpitan/scan') ? 'bg-secondary' : 'bg-primary'
          }`}>
            <QrCode className="w-6 h-6 text-[#000000]" strokeWidth={2} />
          </div>
          <span className={`text-[10px] font-medium ${
            isActive('/jimpitan/scan') ? 'text-primary' : 'text-foreground/35'
          }`}>Scan</span>
        </Link>

        {/* Keuangan */}
        <Link href="/keuangan" className={`flex flex-col items-center gap-0.5 min-w-[52px] ${
          isActive('/keuangan') ? 'text-primary' : 'text-foreground/35'
        }`}>
          <Wallet className="w-6 h-6" strokeWidth={isActive('/keuangan') ? 2.5 : 1.8} />
          <span className="text-[10px] font-medium">Keuangan</span>
        </Link>

        {/* Admin / Profil */}
        {userData?.role === 'admin' ? (
          <Link href="/admin" className={`flex flex-col items-center gap-0.5 min-w-[52px] ${
            isActive('/admin') ? 'text-primary' : 'text-foreground/35'
          }`}>
            <Settings className="w-6 h-6" strokeWidth={isActive('/admin') ? 2.5 : 1.8} />
            <span className="text-[10px] font-medium">Admin</span>
          </Link>
        ) : (
          <Link href="/profil" className={`flex flex-col items-center gap-0.5 min-w-[52px] ${
            isActive('/profil') ? 'text-primary' : 'text-foreground/35'
          }`}>
            <UserCircle className="w-6 h-6" strokeWidth={isActive('/profil') ? 2.5 : 1.8} />
            <span className="text-[10px] font-medium">Profil</span>
          </Link>
        )}
      </div>
    </div>
  );
}
