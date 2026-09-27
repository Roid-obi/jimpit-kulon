import { AuthGuard } from "@/components/guard/AuthGuard";
import { BottomNav } from "@/components/layout/BottomNav";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex flex-col min-h-screen bg-background">
        <main className="flex-1" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
          {children}
        </main>
        <BottomNav />
      </div>
    </AuthGuard>
  );
}
