"use client";

import { CheckCircle2, Home, Search, XCircle } from "lucide-react";
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
    <div className="flex flex-col p-4 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Jimpitan Warga</h1>
          {activePeriod ? (
            <p className="text-sm text-foreground/50">
              Periode: {activePeriod.startDate.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} – {activePeriod.endDate.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          ) : (
            <p className="text-sm text-red-500">Tidak ada periode aktif</p>
          )}
        </div>
      </div>

      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary sm:text-sm shadow-sm"
          placeholder="Cari nama atau nomor rumah..."
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading && houses.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Memuat data...</div>
        ) : filteredHouses.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchQuery
              ? "Tidak ada rumah yang cocok dengan pencarian."
              : "Belum ada data rumah."}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filteredHouses.map((house) => {
              const paid = hasPaid(house.id);
              return (
                <li key={house.id}>
                  <Link
                    href={`/jimpitan/${house.id}`}
                    className="block hover:bg-gray-50 transition-colors"
                  >
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-3 rounded-full ${paid ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-500"}`}
                        >
                          <Home className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">
                            {house.headOfFamily}
                          </p>
                          <p className="text-sm text-gray-500">
                            Blok/No: {house.houseNumber}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {activePeriod &&
                          (paid ? (
                            <span className="flex items-center gap-1 text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                              <CheckCircle2 className="w-4 h-4" />
                              Lunas
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-sm font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded-full">
                              <XCircle className="w-4 h-4" />
                              Belum
                            </span>
                          ))}
                        <span className="text-gray-400 ml-2">&rsaquo;</span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
