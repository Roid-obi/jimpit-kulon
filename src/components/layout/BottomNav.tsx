"use client";
import { Home, List, QrCode, DollarSign, Settings, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export function BottomNav() {
  const pathname = usePathname();
  const { userData } = useAuth();

  const isActive = (path: string) => pathname?.startsWith(path);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-foreground/10 flex justify-around items-end p-3 pb-safe z-10">
      {/* Beranda */}
      <Link href="/dashboard" className={`flex flex-col items-center gap-1 ${isActive('/dashboard') ? 'text-primary' : 'text-foreground/40'}`}>
        <Home className="w-6 h-6" />
        <span className="text-xs">Beranda</span>
      </Link>
      {/* Jimpitan/Rumah */}
      <Link href="/jimpitan" className={`flex flex-col items-center gap-1 ${isActive('/jimpitan') && !isActive('/jimpitan/scan') ? 'text-primary' : 'text-foreground/40'}`}>
        <List className="w-6 h-6" />
        <span className="text-xs">Jimpitan</span>
      </Link>
      {/* Scan QR - tombol center */}
      <Link href="/jimpitan/scan" className="flex flex-col items-center">
        <div className="bg-primary text-[#000000] rounded-full p-3 -mt-6 shadow-lg">
          <QrCode className="w-6 h-6" />
        </div>
        <span className="text-xs text-foreground/40 mt-1">Scan</span>
      </Link>
      {/* Keuangan */}
      <Link href="/keuangan" className={`flex flex-col items-center gap-1 ${isActive('/keuangan') ? 'text-primary' : 'text-foreground/40'}`}>
        <DollarSign className="w-6 h-6" />
        <span className="text-xs">Keuangan</span>
      </Link>
      {/* Profil atau Admin */}
      {userData?.role === 'admin' ? (
        <Link href="/admin" className={`flex flex-col items-center gap-1 ${isActive('/admin') ? 'text-primary' : 'text-foreground/40'}`}>
          <Settings className="w-6 h-6" />
          <span className="text-xs">Admin</span>
        </Link>
      ) : (
        <Link href="/profil" className={`flex flex-col items-center gap-1 ${isActive('/profil') ? 'text-primary' : 'text-foreground/40'}`}>
          <User className="w-6 h-6" />
          <span className="text-xs">Profil</span>
        </Link>
      )}
    </div>
  );
}
