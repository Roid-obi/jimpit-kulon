import { Home, List, PlusCircle, Settings } from "lucide-react";
import Link from "next/link";

export function BottomNav() {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-3 pb-safe z-10">
      <Link
        href="/dashboard"
        className="flex flex-col items-center text-gray-500 hover:text-blue-600"
      >
        <Home className="w-6 h-6" />
        <span className="text-xs mt-1">Beranda</span>
      </Link>
      <Link
        href="/jimpitan"
        className="flex flex-col items-center text-gray-500 hover:text-blue-600"
      >
        <List className="w-6 h-6" />
        <span className="text-xs mt-1">Rumah</span>
      </Link>
      <Link
        href="/jimpitan/scan"
        className="flex flex-col items-center text-gray-500 hover:text-blue-600"
      >
        <div className="bg-blue-600 text-white rounded-full p-3 -mt-6 shadow-lg">
          <PlusCircle className="w-6 h-6" />
        </div>
        <span className="text-xs mt-1">Scan</span>
      </Link>
      <Link
        href="/keuangan"
        className="flex flex-col items-center text-gray-500 hover:text-blue-600"
      >
        <span className="text-xs mt-7 font-semibold">Rp</span>
        <span className="text-xs">Keuangan</span>
      </Link>
      <Link
        href="/admin"
        className="flex flex-col items-center text-gray-500 hover:text-blue-600"
      >
        <Settings className="w-6 h-6" />
        <span className="text-xs mt-1">Admin</span>
      </Link>
    </div>
  );
}
