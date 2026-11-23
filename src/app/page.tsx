"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/client";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import {
  Coins,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Search,
  QrCode,
  X,
  Home,
  ArrowRight,
  Users,
} from "lucide-react";

interface HouseSummary {
  id: string;
  houseNumber: string;
  headOfFamily: string;
  address?: string;
}

const formatRupiah = (amount: number) =>
  `Rp ${amount.toLocaleString("id-ID")}`;

export default function LandingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // Redirect authenticated petugas/admin ke beranda
  useEffect(() => {
    if (!loading && user) {
      router.replace("/beranda");
    }
  }, [user, loading, router]);

  // --- Keuangan State ---
  const [balance, setBalance] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [isLoadingFinance, setIsLoadingFinance] = useState(true);

  // --- Cari Rumah State ---
  const [searchQuery, setSearchQuery] = useState("");
  const [houses, setHouses] = useState<HouseSummary[]>([]);
  const [filteredHouses, setFilteredHouses] = useState<HouseSummary[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Fetch data landing page langsung dari Firestore Client SDK
  useEffect(() => {
    let isMounted = true;

    const fetchLandingData = async () => {
      try {
        setIsLoadingFinance(true);

        const [txSnap, housesSnap] = await Promise.all([
          getDocs(
            query(
              collection(db, "financial_transactions"),
              orderBy("createdAt", "desc"),
            ),
          ).catch(async () => {
            // Fallback jika belum ada index komposit
            return await getDocs(collection(db, "financial_transactions"));
          }),
          getDocs(
            query(collection(db, "houses"), where("isActive", "==", true)),
          ).catch(async () => {
            return await getDocs(collection(db, "houses"));
          }),
        ]);

        // 1. Data Rumah
        const housesData: HouseSummary[] = [];
        const housesMap = new Map<string, string>();

        housesSnap.docs.forEach((doc) => {
          const d = doc.data();
          if (d.isActive !== false) {
            housesData.push({
              id: doc.id,
              houseNumber: d.houseNumber || "",
              headOfFamily: d.headOfFamily || "",
              address: d.address || "",
            });
            housesMap.set(
              doc.id,
              d.headOfFamily || d.houseNumber || "Rumah Warga",
            );
          }
        });

        housesData.sort((a, b) => {
          const numA = parseInt(a.houseNumber, 10);
          const numB = parseInt(b.houseNumber, 10);
          if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB;
          }
          return a.houseNumber.localeCompare(b.houseNumber);
        });

        // 2. Transaksi & Saldo
        let income = 0;
        let expense = 0;
        const rawTx: any[] = [];

        txSnap.docs.forEach((doc) => {
          const d = doc.data();
          const amt = Number(d.amount) || 0;
          if (d.type === "income") income += amt;
          else if (d.type === "expense") expense += amt;

          const createdMillis = d.createdAt?.toMillis
            ? d.createdAt.toMillis()
            : d.createdAt?.seconds
              ? d.createdAt.seconds * 1000
              : d.createdAt?._seconds
                ? d.createdAt._seconds * 1000
                : Date.now();

          rawTx.push({
            id: doc.id,
            ...d,
            amount: amt,
            createdAtMillis: createdMillis,
          });
        });

        // Grouping transaksi jimpitan
        const jimpitanByDay: Record<
          string,
          { dateMillis: number; transactions: any[] }
        > = {};
        const groupedData: any[] = [];

        rawTx.forEach((t) => {
          const cat = (t.category || "").toLowerCase();
          const isJimpitan =
            (cat === "payment" || cat.includes("jimpitan")) &&
            t.type === "income";
          const isCancel = cat === "cancellation";

          if (isJimpitan || isCancel) {
            const dObj = new Date(t.createdAtMillis);
            const dateStr = dObj.toLocaleDateString("id-ID");
            if (!jimpitanByDay[dateStr]) {
              jimpitanByDay[dateStr] = {
                dateMillis: t.createdAtMillis,
                transactions: [],
              };
            }
            if (t.houseId && housesMap.has(t.houseId)) {
              const houseName = housesMap.get(t.houseId);
              t.description = isCancel
                ? `Pembatalan - ${houseName}`
                : houseName;
            } else if (isJimpitan) {
              t.description = "Jimpitan";
            }
            jimpitanByDay[dateStr].transactions.push(t);
          } else {
            groupedData.push(t);
          }
        });

        Object.keys(jimpitanByDay).forEach((dateStr) => {
          const group = jimpitanByDay[dateStr];
          if (!group.transactions.length) return;
          let gIncome = 0;
          let gExpense = 0;
          group.transactions.forEach((t) => {
            if (t.type === "income") gIncome += t.amount;
            if (t.type === "expense") gExpense += t.amount;
          });
          const net = gIncome - gExpense;
          groupedData.push({
            id: `jimpitan-group-${dateStr}`,
            type: net >= 0 ? "income" : "expense",
            category: "JIMPITAN",
            amount: Math.abs(net),
            description: "Setoran Jimpitan",
            createdAtMillis: group.dateMillis,
            isGrouped: true,
            subCount: group.transactions.length,
          });
        });

        groupedData.sort((a, b) => b.createdAtMillis - a.createdAtMillis);
        const top5 = groupedData.slice(0, 5);

        if (isMounted) {
          setBalance(income - expense);
          setRecentTransactions(top5);
          if (housesData.length > 0) {
            setHouses(housesData);
          }
        }
      } catch (err) {
        console.error("Gagal memuat data landing page dari Firestore:", err);
      } finally {
        if (isMounted) {
          setIsLoadingFinance(false);
        }
      }
    };

    fetchLandingData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter rumah berdasarkan pencarian
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredHouses([]);
      setShowSearchResults(false);
      return;
    }
    const q = searchQuery.toLowerCase();
    const filtered = houses.filter(
      (h) =>
        h.headOfFamily.toLowerCase().includes(q) ||
        h.houseNumber.toLowerCase().includes(q) ||
        (h.address && h.address.toLowerCase().includes(q)),
    );
    setFilteredHouses(filtered);
    setShowSearchResults(true);
  }, [searchQuery, houses]);

  // Close search on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ===== HERO HEADER ===== */}
      <div
        className="relative bg-secondary overflow-hidden px-5"
        style={{
          paddingTop: "max(env(safe-area-inset-top, 0px), 20px)",
          paddingBottom: "28px",
        }}
      >
        {/* Decorative blobs */}
        <div className="absolute -top-10 -right-10 w-52 h-52 bg-white/8 rounded-full pointer-events-none" />
        <div className="absolute top-16 -left-12 w-40 h-40 bg-white/5 rounded-full pointer-events-none" />
        <div className="absolute bottom-0 right-16 w-24 h-24 bg-primary/10 rounded-full pointer-events-none" />

        {/* Top bar: logo + tombol daftar & masuk */}
        <div className="relative z-10 flex items-center justify-between pb-5">
          <Image
            src="/jimpit-kulon-logo.png"
            alt="Jimpit Kulon"
            width={140}
            height={48}
            style={{ width: "auto", height: "auto" }}
            className="h-9 sm:h-10 w-auto object-contain brightness-0 invert opacity-95"
            priority
          />
          <div className="flex items-center gap-2">
            <Link
              href="/register"
              className="text-[#f7f7f7]/90 hover:text-white hover:bg-white/10 active:scale-95 transition-all border border-white/20 text-xs font-semibold px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl shadow-xs"
            >
              Daftar
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 active:scale-95 transition-all border border-white/20 text-white text-xs font-semibold px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl shadow-sm"
            >
              Masuk
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Hero content */}
        <div className="relative z-10 pb-6 pt-1">
          <div className="mb-1.5">
            <span className="text-primary text-xs font-bold tracking-widest uppercase">
              Pemuda Tunas Manunggal
            </span>
          </div>
          <h1 className="text-[#f7f7f7] text-2xl font-bold leading-snug mb-2">
            Jimpitan Warga
            <br />
            Dusun Ngowan RT 1 RW 2
          </h1>
          <p className="text-[#f7f7f7]/60 text-sm leading-relaxed max-w-xs">
            Transparansi dana jimpitan yang dikelola Pemuda Tunas Manunggal
            untuk kegiatan dan event dusun.
          </p>
        </div>

        {/* Saldo Card — Utuh, proporsional, dan tidak terpotong */}
        <div className="relative z-10">
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-5 border border-white/20 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0 pr-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Coins className="w-4 h-4 text-amber-300 shrink-0" />
                  <p className="text-[#f7f7f7]/70 text-xs font-semibold">
                    Saldo Dana Jimpitan
                  </p>
                </div>
                {isLoadingFinance ? (
                  <div className="h-9 w-44 bg-white/20 rounded-lg animate-pulse" />
                ) : (
                  <p className="text-[#f7f7f7] text-3xl font-bold tracking-tight">
                    {formatRupiah(balance)}
                  </p>
                )}
              </div>
              <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border border-amber-300/30 flex items-center justify-center shrink-0 shadow-inner">
                <Coins className="w-7 h-7 text-amber-300" strokeWidth={2} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pembatas Gelombang Air Halus antara Header Coklat & Body */}
      <div className="overflow-hidden leading-none -mt-px pointer-events-none select-none">
        <svg
          viewBox="0 0 1440 70"
          preserveAspectRatio="none"
          className="w-full h-7 sm:h-8 text-secondary block"
        >
          {/* Layer gelombang air tipis di belakang */}
          <path
            fill="currentColor"
            fillOpacity="0.18"
            d="M0,0 L1440,0 L1440,36 C1220,66 1000,24 760,48 C500,72 260,20 0,46 Z"
          />
          {/* Layer gelombang air utama di depan */}
          <path
            fill="currentColor"
            d="M0,0 L1440,0 L1440,20 C1180,50 960,14 720,38 C460,62 220,12 0,28 Z"
          />
        </svg>
      </div>

      {/* ===== CONTENT ===== */}
      <div className="flex-1 px-4 pt-6 pb-12 space-y-4">
        {/* Transaksi Terbaru */}
        <div className="bg-white rounded-2xl border border-black/8 shadow-sm overflow-hidden">
          <div className="px-4 py-3.5 flex items-center justify-between border-b border-black/8 bg-black/[0.015]">
            <h3 className="font-semibold text-sm text-foreground">
              Transaksi Terbaru
            </h3>
          </div>
          {isLoadingFinance ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 bg-black/5 rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : recentTransactions.length > 0 ? (
            <ul>
              {recentTransactions.map((tx, i) => (
                <li
                  key={tx.id}
                  className={`px-4 py-3.5 flex items-center justify-between ${
                    i < recentTransactions.length - 1
                      ? "border-b border-black/5"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        tx.type === "income" ? "bg-green-50" : "bg-red-50"
                      }`}
                    >
                      {tx.type === "income" ? (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate leading-tight">
                        {tx.description || tx.category}
                      </p>
                      <p className="text-xs text-foreground/40 mt-0.5">
                        {tx.isGrouped ? `${tx.subCount} transaksi • ` : ""}
                        {tx.createdAtMillis
                          ? new Date(tx.createdAtMillis).toLocaleDateString(
                              "id-ID",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              },
                            )
                          : "-"}
                      </p>
                    </div>
                  </div>
                  <p
                    className={`font-bold text-sm flex-shrink-0 ml-3 ${
                      tx.type === "income" ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    {tx.type === "income" ? "+" : "-"}
                    {formatRupiah(tx.amount)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-10 text-center">
              <p className="text-sm text-foreground/40">Belum ada transaksi</p>
            </div>
          )}
        </div>

        {/* ===== CARI / SCAN RUMAH ===== */}
        <div className="bg-white rounded-2xl border border-black/8 shadow-sm overflow-hidden">
          <div className="px-4 py-3.5 border-b border-black/8 bg-black/[0.015]">
            <h3 className="font-semibold text-sm text-foreground">
              Cek Jimpitan Rumah Anda
            </h3>
            <p className="text-xs text-foreground/50 mt-0.5">
              Cari nama / nomor rumah atau scan QR untuk melihat riwayat jimpitan
            </p>
          </div>

          <div className="p-4 space-y-3">
            {/* Tombol Scan QR */}
            <button
              type="button"
              onClick={() => router.push("/scan")}
              className="w-full flex items-center justify-between bg-secondary/8 hover:bg-secondary/15 active:scale-[0.98] transition-all rounded-xl px-4 py-3.5 border border-secondary/15"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary/15 flex items-center justify-center">
                  <QrCode className="w-5 h-5 text-secondary" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm text-foreground">
                    Scan QR Code
                  </p>
                  <p className="text-xs text-foreground/50">
                    Arahkan kamera ke QR rumah Anda
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-foreground/30 flex-shrink-0" />
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-black/8" />
              <span className="text-xs text-foreground/40 font-medium">
                atau cari
              </span>
              <div className="flex-1 h-px bg-black/8" />
            </div>

            {/* Search input */}
            <div ref={searchRef} className="relative">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/35 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (searchQuery.trim()) setShowSearchResults(true);
                  }}
                  placeholder="Nama kepala keluarga..."
                  className="w-full pl-10 pr-10 py-3.5 rounded-xl border border-black/10 bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setShowSearchResults(false);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-black/10 text-foreground/50"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Search results dropdown */}
              {showSearchResults && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl border border-black/10 shadow-lg z-30 overflow-hidden max-h-72 overflow-y-auto">
                  {filteredHouses.length > 0 ? (
                    <ul>
                      {filteredHouses.map((house, i) => (
                        <li key={house.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setShowSearchResults(false);
                              setSearchQuery("");
                              router.push(`/rumah/${house.id}`);
                            }}
                            className={`w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-black/[0.03] active:bg-black/[0.06] transition-colors ${
                              i < filteredHouses.length - 1
                                ? "border-b border-black/5"
                                : ""
                            }`}
                          >
                            <div className="w-9 h-9 rounded-xl bg-secondary/10 flex items-center justify-center flex-shrink-0">
                              <Home className="w-4 h-4 text-secondary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-sm text-foreground truncate">
                                {house.headOfFamily}
                              </p>
                              <p className="text-xs text-foreground/50">
                                Rumah {house.houseNumber}
                                {house.address && house.address !== "-"
                                  ? ` • ${house.address}`
                                  : ""}
                              </p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-foreground/25 flex-shrink-0" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="py-8 text-center">
                      <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center mx-auto mb-2">
                        <Search className="w-5 h-5 text-foreground/30" />
                      </div>
                      <p className="text-sm text-foreground/40">
                        Rumah tidak ditemukan
                      </p>
                      <p className="text-xs text-foreground/30 mt-0.5">
                        Coba nama lain atau nomor rumah
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info Organisasi */}
        <div className="bg-white rounded-2xl border border-black/8 shadow-sm p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">
                Pemuda Tunas Manunggal
              </p>
              <p className="text-xs text-foreground/55 mt-0.5 leading-relaxed">
                Jimpitan dikelola secara transparan dan mandiri oleh
                Pemuda-Pemudi Tunas Manunggal Ngowan RT 1 RW 2 untuk mendanai
                kegiatan, sosial, dan event dusun.
              </p>
            </div>
          </div>
        </div>

        {/* Link Pendaftaran Petugas Dusun */}
        <div className="text-center py-1">
          <p className="text-xs text-foreground/50">
            Petugas baru dusun?{" "}
            <Link
              href="/register"
              className="font-semibold text-secondary hover:underline"
            >
              Daftar akun di sini
            </Link>
          </p>
        </div>
      </div>

      {/* ===== FOOTER ===== */}
      <footer className="mt-auto bg-white border-t border-black/8 pt-8 pb-10 px-4 sm:px-6">
        <div className="max-w-lg mx-auto space-y-6">
          {/* Card WhatsApp Admin */}
          <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/25 p-4 sm:p-5 shadow-xs">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
                <svg
                  className="w-6 h-6 fill-current"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.698.074-1.136-.067-.34-.11-.798-.261-1.371-.508-2.416-1.041-3.998-3.524-4.12-3.684-.12-.159-.976-1.299-.976-2.478s.614-1.758.833-1.996c.22-.24.479-.299.638-.299.16 0 .319.003.458.01.147.008.344-.056.538.411.2.48.678 1.657.738 1.777.06.12.1.26.02.42-.08.159-.12.259-.24.399-.12.14-.25.312-.358.419-.12.12-.245.25-.105.49.14.24.623 1.026 1.336 1.662.918.818 1.693 1.071 1.933 1.191.24.12.38.1.52-.06.14-.16.598-.698.758-.938.16-.24.32-.2.539-.12.22.08 1.396.658 1.636.778.24.12.4.18.46.28.06.1.06.58-.084.985z" />
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2.05 21.65a.75.75 0 0 0 .918.918l4.482-1.388A9.957 9.957 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm-8.5 10c0-4.687 3.813-8.5 8.5-8.5s8.5 3.813 8.5 8.5-3.813 8.5-8.5 8.5a8.46 8.46 0 0 1-4.492-1.284.75.75 0 0 0-.547-.091l-3.322 1.028 1.028-3.322a.75.75 0 0 0-.091-.547A8.46 8.46 0 0 1 3.5 12z"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm text-foreground">
                  Kontak WhatsApp Admin
                </h4>
                <p className="text-xs text-foreground/60 mt-0.5 leading-relaxed">
                  Ada kendala, pertanyaan seputar jimpitan, atau konfirmasi
                  setoran? Hubungi pengurus langsung.
                </p>
                <div className="mt-3">
                  <a
                    href="https://api.whatsapp.com/send?phone=62859131332583&text=Halo%20Mas%20Admin%20%F0%9F%91%8B"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold text-xs transition-all shadow-sm"
                  >
                    <span>Hubungi via WhatsApp</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Social Media Links */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground/45 mb-2.5">
              Media Sosial & Dokumentasi
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Instagram */}
              <a
                href="https://www.instagram.com/tunas.manunggal01/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-2xl bg-black/[0.02] hover:bg-black/[0.05] border border-black/8 transition-all group active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <svg
                    className="w-5 h-5 fill-none stroke-current"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-xs text-foreground group-hover:text-secondary transition-colors">
                    Instagram
                  </p>
                  <p className="text-[11px] text-foreground/50 truncate">
                    @tunas.manunggal01
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-foreground/30 group-hover:translate-x-0.5 transition-transform" />
              </a>

              {/* TikTok */}
              <a
                href="https://www.tiktok.com/@kartar_tunasmanunggal_01"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-2xl bg-black/[0.02] hover:bg-black/[0.05] border border-black/8 transition-all group active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center shrink-0 shadow-xs">
                  <svg
                    className="w-5 h-5 fill-current"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743 2.9 2.9 0 0 1 2.313-4.643c.307 0 .603.048.881.137V9.404a6.29 6.29 0 0 0-.881-.063A6.34 6.34 0 0 0 3.14 15.68a6.34 6.34 0 0 0 6.346 6.34 6.34 6.34 0 0 0 6.34-6.34V8.58a8.18 8.18 0 0 0 4.787 1.543V6.686h-.024z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-xs text-foreground group-hover:text-secondary transition-colors">
                    TikTok
                  </p>
                  <p className="text-[11px] text-foreground/50 truncate">
                    @kartar_tunasmanunggal_01
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-foreground/30 group-hover:translate-x-0.5 transition-transform" />
              </a>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-black/8 w-full" />

          {/* Copyright & Dusun Identity */}
          <div className="text-center space-y-1">
            <p className="font-bold text-xs text-secondary tracking-wide">
              Jimpit Kulon &bull; Dusun Ngowan RT 1 RW 2
            </p>
            <p className="text-[11px] text-foreground/45">
              Dikelola oleh Pemuda-Pemudi Tunas Manunggal
            </p>
            <p className="text-[10px] text-foreground/35 pt-1">
              &copy; {new Date().getFullYear()} Jimpit Kulon. Guyub Rukun
              Membangun Dusun.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}