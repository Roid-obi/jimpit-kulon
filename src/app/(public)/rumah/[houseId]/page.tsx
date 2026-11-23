"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/client";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Circle,
  Home,
} from "lucide-react";

interface PublicPeriod {
  id: string;
  periodNumber: number;
  startDateMillis: number;
  endDateMillis: number;
  amount: number;
  status: string;
}

interface PublicPayment {
  id: string;
  periodId: string;
  status: string;
}

interface PublicHouse {
  id: string;
  houseNumber: string;
  headOfFamily: string;
  address?: string;
}

const formatRupiah = (amount: number) =>
  new Intl.NumberFormat("id-ID").format(amount);

const formatPeriod = (period: PublicPeriod) => {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const start = new Date(period.startDateMillis).toLocaleDateString(
    "id-ID",
    opts,
  );
  const end = new Date(period.endDateMillis).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${start} – ${end}`;
};

export default function PublicHouseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const houseId = params.houseId as string;

  const [house, setHouse] = useState<PublicHouse | null>(null);
  const [periods, setPeriods] = useState<PublicPeriod[]>([]);
  const [payments, setPayments] = useState<PublicPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!houseId) return;

    let isMounted = true;

    const fetchHouseData = async () => {
      setIsLoading(true);
      try {
        // 1. Coba ambil lewat endpoint API backend (Firebase Admin SDK)
        try {
          const res = await fetch(`/api/public/houses/${houseId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.success && isMounted) {
              setHouse(data.house);
              setPeriods(data.periods || []);
              setPayments(data.payments || []);
              setNotFound(false);
              setIsLoading(false);
              return;
            } else if (res.status === 404) {
              if (isMounted) setNotFound(true);
              setIsLoading(false);
              return;
            }
          }
        } catch (apiErr) {
          console.warn("API houses fetch error, fallback ke Firestore Client:", apiErr);
        }

        // 2. Fallback ke Firestore Client SDK jika API offline/gagal
        const houseSnap = await getDoc(doc(db, "houses", houseId));
        if (!houseSnap.exists()) {
          if (isMounted) setNotFound(true);
          return;
        }
        const hData = { id: houseSnap.id, ...houseSnap.data() } as PublicHouse;

        const [periodsSnap, paymentsSnap] = await Promise.all([
          getDocs(
            query(collection(db, "periods"), orderBy("startDate", "asc")),
          ).catch(async () => {
            return await getDocs(collection(db, "periods"));
          }),
          getDocs(
            query(
              collection(db, "payments"),
              where("houseId", "==", houseId),
              where("status", "==", "paid"),
            ),
          ).catch(async () => {
            return await getDocs(collection(db, "payments"));
          }),
        ]);

        const periodsData = periodsSnap.docs.map((dDoc) => {
          const d = dDoc.data();
          const startMillis = d.startDate?.toMillis
            ? d.startDate.toMillis()
            : d.startDate?.seconds
              ? d.startDate.seconds * 1000
              : d.startDate?._seconds
                ? d.startDate._seconds * 1000
                : 0;
          const endMillis = d.endDate?.toMillis
            ? d.endDate.toMillis()
            : d.endDate?.seconds
              ? d.endDate.seconds * 1000
              : d.endDate?._seconds
                ? d.endDate._seconds * 1000
                : 0;
          return {
            id: dDoc.id,
            periodNumber: d.periodNumber,
            startDateMillis: startMillis,
            endDateMillis: endMillis,
            amount: d.amount || 0,
            status: d.status || "active",
          };
        });

        const paymentsData = paymentsSnap.docs.map((dDoc) => {
          const d = dDoc.data();
          return {
            id: dDoc.id,
            periodId: d.periodId,
            status: d.status,
          };
        });

        if (isMounted) {
          setHouse(hData);
          setPeriods(periodsData);
          setPayments(paymentsData);
          setNotFound(false);
        }
      } catch (err) {
        console.error("Gagal memuat data rumah dari Firestore:", err);
        if (isMounted) setNotFound(true);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchHouseData();

    return () => {
      isMounted = false;
    };
  }, [houseId]);

  const isPaymentDone = (periodId: string) =>
    payments.some((p) => p.periodId === periodId && p.status === "paid");

  const isActivePeriod = (period: PublicPeriod) => {
    const now = Date.now();
    return period.startDateMillis <= now && period.endDateMillis >= now;
  };

  const isUpcomingPeriod = (period: PublicPeriod) =>
    period.startDateMillis > Date.now();

  const isArrear = (period: PublicPeriod) => {
    const now = Date.now();
    return period.endDateMillis < now && !isPaymentDone(period.id);
  };

  const arrearPeriods = periods.filter((p) => isArrear(p));
  const totalArrear = arrearPeriods.reduce(
    (sum, p) => sum + (p.amount || 0),
    0,
  );
  const paidCount = periods.filter((p) => isPaymentDone(p.id)).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-secondary" />
      </div>
    );
  }

  if (notFound || !house) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center mb-4">
          <Home className="w-8 h-8 text-secondary/50" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">
          Rumah Tidak Ditemukan
        </h2>
        <p className="text-sm text-foreground/50 mb-6">
          Data rumah dengan ID ini tidak ada atau sudah tidak aktif.
        </p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="bg-secondary text-white px-6 py-3 rounded-xl font-semibold text-sm active:scale-95"
        >
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-10">
      {/* Header */}
      <div
        className="relative bg-secondary overflow-hidden"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 20px)" }}
      >
        {/* Decorative blobs — diposisikan agar lengkungan lingkaran utuh dan tidak terpotong tepi bawah */}
        <div className="absolute -top-16 -right-10 w-36 h-36 bg-white/8 rounded-full pointer-events-none" />
        <div className="absolute -top-6 -left-10 w-28 h-28 bg-white/5 rounded-full pointer-events-none" />

        {/* Top bar */}
        <div className="relative z-10 flex items-center gap-3 px-5 pb-5">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center active:scale-95 flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <Image
            src="/jimpit-kulon-logo.png"
            alt="Jimpit Kulon"
            width={80}
            height={30}
            className="h-6 w-auto object-contain brightness-0 invert opacity-80"
            priority
          />
        </div>

        {/* House info */}
        <div className="relative z-10 px-5 pb-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center flex-shrink-0">
              <Home className="w-7 h-7 text-white/80" />
            </div>
            <div className="flex-1">
              <h1 className="text-[#f7f7f7] text-xl font-bold leading-tight">
                {house.headOfFamily}
              </h1>
              <p className="text-[#f7f7f7]/60 text-sm mt-0.5">
                Rumah {house.houseNumber}
                {house.address && house.address !== "-"
                  ? ` • ${house.address}`
                  : ""}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Wave divider */}
      <div className="overflow-hidden leading-none -mt-px pointer-events-none select-none bg-secondary">
        <svg
          viewBox="0 0 1440 70"
          preserveAspectRatio="none"
          className="w-full h-7 text-background block"
        >
          <path
            fill="currentColor"
            d="M0,30 C360,70 1080,-10 1440,30 L1440,70 L0,70 Z"
          />
        </svg>
      </div>

      <div className="px-4 -mt-1 space-y-4">
        {/* Ringkasan */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-3.5 border border-black/8 shadow-sm text-center">
            <p className="text-xl font-bold text-foreground">{paidCount}</p>
            <p className="text-xs text-foreground/50 mt-0.5">Lunas</p>
          </div>
          <div className="bg-white rounded-2xl p-3.5 border border-black/8 shadow-sm text-center">
            <p className="text-xl font-bold text-orange-500">
              {arrearPeriods.length}
            </p>
            <p className="text-xs text-foreground/50 mt-0.5">Tunggakan</p>
          </div>
          <div className="bg-white rounded-2xl p-3.5 border border-black/8 shadow-sm text-center">
            <p className="text-xl font-bold text-foreground">
              {periods.length}
            </p>
            <p className="text-xs text-foreground/50 mt-0.5">Total Periode</p>
          </div>
        </div>

        {/* Peringatan tunggakan */}
        {arrearPeriods.length > 0 && (
          <div className="flex items-center gap-2.5 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
            <AlertCircle className="w-4.5 h-4.5 text-orange-500 flex-shrink-0" />
            <p className="text-xs font-bold text-orange-700">
              {arrearPeriods.length} periode tunggakan &bull; Rp{" "}
              {formatRupiah(totalArrear)}
            </p>
          </div>
        )}

        {/* Daftar periode */}
        <div className="bg-white rounded-2xl border border-black/8 shadow-sm overflow-hidden">
          <div className="px-4 py-3.5 border-b border-black/8 bg-black/[0.015]">
            <h3 className="font-semibold text-sm text-foreground">
              Riwayat Periode Jimpitan
            </h3>
          </div>
          <div className="divide-y divide-black/5">
            {periods.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-foreground/40">
                  Belum ada periode jimpitan
                </p>
              </div>
            ) : (
              [...periods].reverse().map((period) => {
                const paid = isPaymentDone(period.id);
                const arrear = isArrear(period);
                const active = isActivePeriod(period);
                const upcoming = isUpcomingPeriod(period);

                return (
                  <div
                    key={period.id}
                    className={`px-4 py-3.5 flex items-center gap-3 ${
                      active ? "bg-primary/5" : ""
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 relative ${
                        paid
                          ? "bg-green-100"
                          : arrear
                            ? "bg-orange-100"
                            : active
                              ? "bg-primary/20"
                              : "bg-black/5"
                      }`}
                    >
                      {active && (
                        <div className="absolute inset-0 rounded-xl border-2 border-primary animate-ping opacity-75" />
                      )}
                      {paid ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 relative z-10" />
                      ) : arrear ? (
                        <AlertCircle className="w-5 h-5 text-orange-500 relative z-10" />
                      ) : active ? (
                        <Circle
                          className="w-5 h-5 text-primary relative z-10"
                          fill="currentColor"
                        />
                      ) : (
                        <Circle className="w-5 h-5 text-foreground/20 relative z-10" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {formatPeriod(period)}
                      </p>
                      <p
                        className={`text-[10px] font-bold mt-0.5 uppercase tracking-wide ${
                          paid
                            ? "text-green-600"
                            : arrear
                              ? "text-orange-500"
                              : active
                                ? "text-primary"
                                : "text-foreground/30"
                        }`}
                      >
                        {paid
                          ? "Lunas"
                          : arrear
                            ? "Tunggakan"
                            : active
                              ? "Periode Berjalan"
                              : upcoming
                                ? "Mendatang"
                                : "Selesai"}
                      </p>
                    </div>

                    <span className="text-sm font-bold text-foreground flex-shrink-0">
                      Rp {formatRupiah(period.amount || 0)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Catatan */}
        <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3">
          <p className="text-xs text-foreground/70 leading-relaxed">
            <span className="font-semibold">Catatan:</span> Pembayaran jimpitan
            dilakukan secara tunai kepada petugas setiap hari Sabtu (Rp 3.500 /
            periode). Data ini hanya untuk informasi transparansi warga.
          </p>
        </div>
      </div>
    </div>
  );
}
