"use client";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function Home() {
  const [expand, setExpand] = useState(false);

  useEffect(() => {
    // Memberikan sedikit jeda sebelum animasi dimulai agar lebih terasa
    const timer = setTimeout(() => setExpand(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-center overflow-hidden relative">
      {/* Logo Awal Sebelum Transisi (Splash) */}
      <div
        className={`absolute z-0 flex flex-col items-center gap-4 transition-opacity duration-700 ${expand ? "opacity-0 delay-300" : "opacity-100"}`}
      >
        <Image
          src="/jimpit-kulon-logo.svg"
          alt="Jimpit Kulon Logo"
          width={100}
          height={100}
          priority
          className="animate-pulse"
        />
      </div>

      {/* Main Content yang membesar dari tengah */}
      <main
        className="absolute inset-0 bg-background z-10 flex flex-col items-center justify-center gap-8 p-8 text-center transition-all duration-[1200ms] ease-in-out"
        style={{
          clipPath: expand
            ? "circle(150% at 50% 50%)"
            : "circle(0% at 50% 50%)",
        }}
      >
        <Image
          src="/jimpit-kulon-logo.svg"
          alt="Jimpit Kulon Logo"
          width={140}
          height={140}
          priority
        />
        <h1 className="text-4xl md:text-5xl font-bold text-heading">
          Jimpit Kulon
        </h1>
        <p className="text-lg max-w-md text-foreground/80">
          Sistem pengelolaan jimpitan warga yang transparan, aman, dan mudah
          digunakan.
        </p>

        <div className="flex gap-4 mt-8">
          <button
            type="button"
            className="px-8 py-3 rounded-full bg-primary text-foreground font-semibold hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
          >
            Mulai Sekarang
          </button>
          <button
            type="button"
            className="px-8 py-3 rounded-full bg-secondary text-foreground font-semibold hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
          >
            Pelajari
          </button>
        </div>
      </main>
    </div>
  );
}
