import { AuthGuard } from "@/components/guard/AuthGuard";
import { BottomNav } from "@/components/layout/BottomNav";
import { Navbar } from "@/components/layout/Navbar";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex flex-col min-h-screen bg-background pb-20">
        <Navbar />
        <main className="flex-1">{children}</main>
        <BottomNav />
      </div>
    </AuthGuard>
  );
}
