"use client";
import Image from "next/image";
import { LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export function Navbar() {
  const { userData, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const getRoleBadge = (role?: string) => {
    if (role === 'admin') return { label: 'Admin', class: 'bg-secondary text-[#f7f7f7]' };
    return { label: 'Petugas', class: 'bg-primary/20 text-foreground' };
  };

  const badge = getRoleBadge(userData?.role);

  return (
    <nav className="sticky top-0 z-20 flex items-center justify-between px-4 py-2.5 bg-white border-b border-black/[0.06] shadow-sm">
      {/* Logo */}
      <Image
        src="/jimpit-kulon-logo.png"
        alt="Jimpit Kulon"
        height={30}
        width={110}
        className="object-contain"
        priority
      />

      {/* Right side */}
      <div className="flex items-center gap-2">
        {userData && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-[#000000] text-xs font-bold">
                {userData.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="hidden xs:block">
                <p className="text-xs font-semibold text-foreground leading-none">{userData.name}</p>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${badge.class}`}>{badge.label}</span>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="p-2 rounded-xl hover:bg-black/5 text-foreground/40 hover:text-foreground/70"
          aria-label="Logout"
        >
          <LogOut className="w-4.5 h-4.5" />
        </button>
      </div>
    </nav>
  );
}
