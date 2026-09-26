"use client";

import { CheckCircle2, Home, Search, XCircle, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getHouses } from "@/lib/services/houses";
import { getPaymentsByPeriod } from "@/lib/services/payments";
import { getActivePeriod } from "@/lib/services/periods";
import type { House, Payment, Period } from "@/types/jimpitan";

export default function JimpitanPage() {
  const { userData } = useAuth();
  const [houses, setHouses] = useState<House[]>([]);
  const [filteredHouses, setFilteredHouses] = useState<House[]>([]);
  const [activePeriod, setActivePeriod] = useState<Period | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredHouses(houses);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredHouses(
        houses.filter(
          (h) =>
            h.headOfFamily.toLowerCase().includes(query) ||
            h.houseNumber.toLowerCase().includes(query),
        ),
      );
    }
  }, [searchQuery, houses]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [housesData, periodData] = await Promise.all([
        getHouses(),
        getActivePeriod(),
      ]);
      setHouses(housesData);
      setActivePeriod(periodData);

      if (periodData) {
        const paymentsData = await getPaymentsByPeriod(periodData.id);
        setPayments(paymentsData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const hasPaid = (houseId: string) => {
    return payments.some((p) => p.houseId === houseId);
  };

  return (
    <div className="flex flex-col p-4 max-w-2xl mx-auto w-full pb-24">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-foreground">Daftar Rumah</h1>
        {activePeriod ? (
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
            <p className="text-xs text-foreground/50">
              Periode: {activePeriod.startDate.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} – {activePeriod.endDate.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        ) : (
          <p className="text-xs text-orange-500 mt-1">Tidak ada periode aktif</p>
        )}
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-black/8 bg-white text-sm placeholder:text-foreground/35 focus:outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="Cari nama atau nomor rumah..."
        />
      </div>

      {/* Summary bar */}
      {activePeriod && !isLoading && (
        <div className="mb-3 flex gap-2">
          <div className="flex-1 bg-green-50 rounded-xl px-3 py-2 text-center">
            <p className="text-lg font-bold text-green-700">{payments.length}</p>
            <p className="text-[10px] text-green-600 font-medium">Lunas</p>
          </div>
          <div className="flex-1 bg-orange-50 rounded-xl px-3 py-2 text-center">
            <p className="text-lg font-bold text-orange-600">{filteredHouses.filter(h => !hasPaid(h.id)).length}</p>
            <p className="text-[10px] text-orange-500 font-medium">Belum Bayar</p>
          </div>
          <div className="flex-1 bg-primary/10 rounded-xl px-3 py-2 text-center">
            <p className="text-lg font-bold text-foreground">{filteredHouses.length}</p>
            <p className="text-[10px] text-foreground/50 font-medium">Total Rumah</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
        {isLoading && houses.length === 0 ? (
          <div className="p-8 text-center text-foreground/50 text-sm">Memuat data...</div>
        ) : filteredHouses.length === 0 ? (
          <div className="p-8 text-center text-foreground/50 text-sm">
            {searchQuery
              ? "Tidak ada rumah yang cocok dengan pencarian."
              : "Belum ada data rumah."}
          </div>
        ) : (
          <ul className="flex flex-col">
            {filteredHouses.map((house, index) => {
              const paid = hasPaid(house.id);
              return (
                <li key={house.id}>
                  <Link href={`/jimpitan/${house.id}`} className="flex items-center px-4 py-3.5 gap-3 active:bg-black/5">
                    {/* Avatar nomor rumah */}
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 font-bold text-sm ${
                      paid ? 'bg-green-100 text-green-700' : 'bg-black/5 text-foreground/40'
                    }`}>
                      {house.houseNumber}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">{house.headOfFamily}</p>
                      <p className="text-xs text-foreground/40 truncate">Rumah {house.houseNumber}</p>
                    </div>
                    {/* Status */}
                    <div className="flex items-center gap-1.5">
                      {activePeriod && (
                        paid ? (
                          <span className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Lunas
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-foreground/40 bg-black/5 px-2.5 py-1 rounded-full">
                            Belum
                          </span>
                        )
                      )}
                      <ChevronRight className="w-4 h-4 text-foreground/20" />
                    </div>
                  </Link>
                  {index < filteredHouses.length - 1 && <div className="mx-4 h-px bg-black/[0.04]" />}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
