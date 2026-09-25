"use client";
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

  return (
    <nav className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-background border-b border-foreground/10">
      <div className="font-bold text-lg text-primary">Jimpit Kulon</div>
      <div className="flex items-center gap-3">
        {userData && (
          <div className="text-right">
            <p className="text-sm font-medium text-foreground leading-none">{userData.name}</p>
            <span className="text-xs text-foreground/50 capitalize">{userData.role}</span>
          </div>
        )}
        <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-foreground/10 text-foreground/60 transition-colors" aria-label="Logout">
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </nav>
  );
}
