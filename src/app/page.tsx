"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
        {/* Logo */}
        <div className="mb-8">
          <Image
            src="/jimpit-kulon-logo.png"
            alt="Jimpit Kulon"
            width={180}
            height={72}
            className="object-contain mx-auto"
            priority
          />
        </div>

        {/* Tagline */}
        <div className="mb-10 space-y-3">
          <h1 className="text-3xl font-bold text-foreground leading-tight">
            Kelola Jimpitan Warga
            <br />
            <span className="text-primary">Lebih Mudah & Transparan</span>
          </h1>
          <p className="text-base text-foreground/60 max-w-xs mx-auto leading-relaxed">
            Pencatatan jimpitan digital untuk RT yang lebih rapi, transparan, dan mudah diakses.
          </p>
        </div>

        {/* Fitur highlights */}
        <div className="grid grid-cols-3 gap-3 mb-12 w-full max-w-xs">
          {[
            { emoji: '📋', label: 'Catat Pembayaran' },
            { emoji: '💰', label: 'Lacak Keuangan' },
            { emoji: '📊', label: 'Lihat Laporan' },
          ].map((f) => (
            <div key={f.label} className="bg-white rounded-2xl p-3 shadow-sm border border-black/5 flex flex-col items-center gap-1">
              <span className="text-2xl">{f.emoji}</span>
              <span className="text-xs text-foreground/60 font-medium text-center leading-tight">{f.label}</span>
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="w-full max-w-xs space-y-3">
          <button
            onClick={() => router.push('/login')}
            className="w-full py-4 bg-primary text-[#000000] rounded-2xl font-bold text-base shadow-sm active:scale-[0.98]"
          >
            Masuk ke Aplikasi
          </button>
          <button
            onClick={() => router.push('/register')}
            className="w-full py-4 bg-white text-foreground rounded-2xl font-semibold text-base border border-black/10 shadow-sm active:scale-[0.98]"
          >
            Daftar Akun Baru
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="pb-8 text-center">
        <p className="text-xs text-foreground/40">Jimpit Kulon &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
