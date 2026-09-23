import { Menu } from "lucide-react";

export function Navbar() {
  return (
    <nav className="flex items-center justify-between p-4 bg-white shadow-sm sticky top-0 z-10">
      <div className="font-bold text-xl text-primary">Jimpit Kulon</div>
      <button type="button" className="p-2" aria-label="Menu">
        <Menu className="w-6 h-6" />
      </button>
    </nav>
  );
}
