'use client';

import { collection, getDocs, getFirestore, orderBy, query } from 'firebase/firestore';
import { app } from '@/lib/firebase/client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import html2canvas from 'html2canvas';
import { TrendingUp, TrendingDown, Plus, Minus, Download, Search, SlidersHorizontal, X, ChevronRight } from 'lucide-react';

const db = getFirestore(app);

type Transaction = {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  createdAt: any;
  houseId?: string | null;
  isGrouped?: boolean;
  subTransactions?: Transaction[];
};

export default function KeuanganPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterDate, setFilterDate] = useState<'all' | 'this_month' | 'last_month' | 'last_3_months'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  
  // Modals
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Expanded Groups State
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    async function fetchTransactions() {
      try {
        const q = query(
          collection(db, 'financial_transactions'),
          orderBy('createdAt', 'desc')
        );
        const [querySnapshot, housesSnapshot] = await Promise.all([
          getDocs(q),
          getDocs(collection(db, 'houses'))
        ]);

        const housesMap = new Map();
        housesSnapshot.docs.forEach(doc => {
          const houseData = doc.data();
          housesMap.set(doc.id, houseData.headOfFamily || houseData.houseNumber || 'Tidak Diketahui');
        });

        const data = querySnapshot.docs.map(doc => {
          const d = doc.data();
          return {
            id: doc.id,
            ...d,
          } as Transaction;
        });

        // --- AGGREGATION LOGIC ---
        const groupedData: Transaction[] = [];
        const jimpitanByDay: Record<string, { date: any, transactions: Transaction[] }> = {};

        data.forEach(t => {
          const isJimpitanIncome = (t.category.toLowerCase().includes('jimpitan') || t.category.toLowerCase() === 'payment' || (t.description && t.description.toLowerCase().includes('jimpitan'))) && t.type === 'income';
          const isCancellation = t.category.toLowerCase() === 'cancellation';
          
          if (isJimpitanIncome || isCancellation) {
            const dateStr = t.createdAt?.toDate ? t.createdAt.toDate().toLocaleDateString('id-ID') : 'unknown';
            if (!jimpitanByDay[dateStr]) {
              jimpitanByDay[dateStr] = { date: t.createdAt, transactions: [] };
            }
            
            // Re-format description for jimpitan subtransactions
            if (t.houseId && housesMap.has(t.houseId)) {
              const houseName = housesMap.get(t.houseId);
              if (isCancellation) {
                t.description = `Pembatalan - Rumah ${houseName}`;
              } else {
                t.description = `Rumah ${houseName}`;
              }
            } else if (isJimpitanIncome && (!t.description || t.description === 'Pembayaran jimpitan rutin')) {
              t.description = 'Jimpitan';
            }

            jimpitanByDay[dateStr].transactions.push(t);
          } else {
            groupedData.push(t);
          }
        });

        Object.keys(jimpitanByDay).forEach(dateStr => {
          const group = jimpitanByDay[dateStr];
          if (group.transactions.length === 0) return;
          
          let totalIncome = 0;
          let totalExpense = 0;
          
          group.transactions.forEach(t => {
            if (t.type === 'income') totalIncome += t.amount;
            if (t.type === 'expense') totalExpense += t.amount;
          });
          
          const netAmount = totalIncome - totalExpense;
          
          // Sort subTransactions within the group by date
          group.transactions.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
          
          groupedData.push({
            id: `jimpitan-group-${dateStr}`,
            type: netAmount >= 0 ? 'income' : 'expense',
            category: 'JIMPITAN',
            amount: Math.abs(netAmount),
            description: `Setoran Jimpitan`,
            createdAt: group.date,
            isGrouped: true,
            subTransactions: group.transactions
          });
        });

        groupedData.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

        setTransactions(groupedData);
      } catch (err: any) {
        console.error(err);
        setError('Gagal memuat data transaksi');
      } finally {
        setLoading(false);
      }
    }
    fetchTransactions();
  }, []);

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
  const balance = totalIncome - totalExpense;

  const filteredTransactions = transactions.filter(t => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      let match = false;
      
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchCat = t.category?.toLowerCase().includes(q);
      
      if (matchDesc || matchCat) {
        match = true;
      }
      
      // Also search in subtransactions if it's a group
      if (!match && t.isGrouped && t.subTransactions) {
        if (t.subTransactions.some(subT => 
          subT.description?.toLowerCase().includes(q) || 
          subT.category?.toLowerCase().includes(q)
        )) {
          match = true;
        }
      }
      
      if (!match) return false;
    }
    
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (filterCategory !== 'all' && t.category !== filterCategory) return false;
    
    if (filterDate !== 'all' && t.createdAt?.toDate) {
      const date = t.createdAt.toDate();
      const now = new Date();
      if (filterDate === 'this_month') {
        if (date.getMonth() !== now.getMonth() || date.getFullYear() !== now.getFullYear()) return false;
      } else if (filterDate === 'last_month') {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        if (date.getMonth() !== lastMonth.getMonth() || date.getFullYear() !== lastMonth.getFullYear()) return false;
      } else if (filterDate === 'last_3_months') {
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        if (date < threeMonthsAgo) return false;
      }
    }
    return true;
  });

  const availableMonths = Array.from(new Set(transactions.map(t => {
    if (!t.createdAt?.toDate) return null;
    return t.createdAt.toDate().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  }).filter(Boolean))) as string[];

  const availableCategories = Array.from(new Set(transactions.map(t => t.category).filter(Boolean))).sort() as string[];

  const formatRupiah = (amount: number) => `Rp ${amount.toLocaleString('id-ID')}`;

  const [downloadingMonth, setDownloadingMonth] = useState<string | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const handleDownload = (monthStr: string) => {
    setDownloadingMonth(monthStr);
    setTimeout(async () => {
      if (receiptRef.current) {
        try {
          const canvas = await html2canvas(receiptRef.current, { scale: 2, backgroundColor: '#ffffff' });
          const image = canvas.toDataURL("image/png");
          const link = document.createElement("a");
          link.href = image;
          link.download = `Laporan_Keuangan_${monthStr.replace(' ', '_')}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } catch (err) {
          console.error("Failed to generate image", err);
        } finally {
          setDownloadingMonth(null);
        }
      }
    }, 300);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background relative">
      {/* HEADER */}
      <div
        className="relative bg-secondary overflow-hidden px-5 shrink-0"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 20px)', paddingBottom: '28px' }}
      >
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/8 rounded-full pointer-events-none" />
        <div className="absolute -bottom-6 -left-10 w-32 h-32 bg-white/5 rounded-full pointer-events-none" />

        <div className="flex justify-between items-center relative z-10 mb-0.5">
          <h1 className="text-[#f7f7f7] text-2xl font-bold">Keuangan</h1>
          <button onClick={() => setShowDownloadModal(true)} className="p-2 -mr-2 text-white/80 hover:text-white active:scale-95 transition-all">
            <Download className="w-6 h-6" />
          </button>
        </div>
        <p className="text-[#f7f7f7]/50 text-sm mb-5 relative z-10">Dana Jimpitan RT</p>

        {loading ? (
          <div className="h-20 bg-white/10 rounded-2xl animate-pulse" />
        ) : (
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 border border-white/10 relative z-10">
            <p className="text-[#f7f7f7]/60 text-xs font-medium mb-1">Saldo Dana Jimpitan</p>
            <p className="text-[#f7f7f7] text-3xl font-bold tracking-tight leading-tight">{formatRupiah(balance)}</p>
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div className="px-4 pt-4 flex-1 flex flex-col">
        {/* Tombol Aksi */}
        <div className="grid grid-cols-2 gap-2 mb-4 shrink-0">
          <Link href="/keuangan/pemasukan" className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-green-50 text-green-700 text-sm font-semibold border border-green-100 active:scale-[0.98]">
            <Plus className="w-4 h-4" /> Pemasukan
          </Link>
          <Link href="/keuangan/pengeluaran" className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-red-50 text-red-600 text-sm font-semibold border border-red-100 active:scale-[0.98]">
            <Minus className="w-4 h-4" /> Pengeluaran
          </Link>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex gap-2 mb-4 shrink-0">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
            <input 
              type="text" 
              placeholder="Cari aktivitas..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-black/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <button 
            onClick={() => setShowFilterModal(true)}
            className="w-11 flex-shrink-0 bg-black/5 rounded-xl flex items-center justify-center text-foreground/70 active:scale-95 transition-transform relative"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {(filterType !== 'all' || filterDate !== 'all' || filterCategory !== 'all') && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-white" />
            )}
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-white rounded-2xl animate-pulse" />)}
          </div>
        ) : error ? (
          <p className="text-center py-8 text-sm text-red-500">{error}</p>
        ) : (
          <div className="bg-white rounded-2xl border border-black/5 overflow-hidden pb-4 mb-8">
            {filteredTransactions.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-foreground/40">Tidak ada transaksi ditemukan</p>
              </div>
            ) : (
              <div>
                {filteredTransactions.reduce((acc, t) => {
                  let dateStr = 'Lainnya';
                  if (t.createdAt?.toDate) {
                    const date = t.createdAt.toDate();
                    const monthYear = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
                    const now = new Date();
                    if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
                      dateStr = 'Bulan Ini';
                    } else {
                      dateStr = monthYear;
                    }
                  }
                  let group = acc.find(g => g.title === dateStr);
                  if (!group) {
                    group = { title: dateStr, items: [] };
                    acc.push(group);
                  }
                  group.items.push(t);
                  return acc;
                }, [] as { title: string, items: typeof filteredTransactions }[]).map((group, groupIdx) => {
                  const groupIncome = group.items.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
                  const groupExpense = group.items.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
                  const netAmount = groupIncome - groupExpense;
                  
                  return (
                  <div key={group.title}>
                    <Link href={`/keuangan/laporan/${encodeURIComponent(group.title)}`} className="px-4 py-3 bg-slate-50/90 backdrop-blur-sm flex justify-between items-center sticky top-0 z-10 border-y border-slate-100 group mt-4 first:mt-0">
                      <h2 className="text-[15px] font-bold text-slate-700">{group.title}</h2>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-primary">
                          {netAmount >= 0 ? '+' : '-'}{formatRupiah(Math.abs(netAmount))}
                        </p>
                        <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shadow-sm active:scale-95 transition-transform">
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </Link>
                    <ul>
                      {group.items.map((t, i) => (
                        <div key={t.id}>
                          <li 
                            onClick={(e) => {
                              if (t.isGrouped) {
                                toggleGroup(t.id, e);
                              } else {
                                setSelectedTransaction(t);
                              }
                            }}
                            className={`px-4 py-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 active:bg-slate-100 transition-colors ${
                              i < group.items.length - 1 && (!t.isGrouped || !expandedGroups[t.id]) ? 'border-b border-black/[0.04]' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                t.type === 'income' ? 'bg-green-50' : 'bg-red-50'
                              }`}>
                                {t.type === 'income'
                                  ? <TrendingUp className="w-4 h-4 text-green-600" />
                                  : <TrendingDown className="w-4 h-4 text-red-500" />
                                }
                              </div>
                              <div className="min-w-0 flex flex-col justify-center">
                                <p className="font-semibold text-foreground text-sm truncate">{t.description || t.category}</p>
                                {t.isGrouped ? (
                                  <p className="text-xs text-foreground/40 mt-0.5">
                                    {t.subTransactions?.length || 0} transaksi
                                    {t.createdAt?.toDate ? ` • ${t.createdAt.toDate().toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}` : ''}
                                  </p>
                                ) : (
                                  <p className="text-xs text-foreground/40 mt-0.5">
                                    {t.createdAt?.toDate ? (
                                      `${t.createdAt.toDate().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} • ${t.createdAt.toDate().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':')}`
                                    ) : '-'}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className={`font-bold text-sm flex-shrink-0 ${
                                t.type === 'income' ? 'text-green-600' : 'text-red-500'
                              }`}>
                                {t.type === 'income' ? '+' : '-'}{formatRupiah(t.amount)}
                              </p>
                              {t.isGrouped && (
                                <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${expandedGroups[t.id] ? 'rotate-90' : ''}`} />
                              )}
                            </div>
                          </li>

                          {/* Sub transactions dropdown for grouped Jimpitan */}
                          {t.isGrouped && expandedGroups[t.id] && (
                            <ul className="bg-slate-50/50 border-y border-black/[0.04] shadow-inner mb-2">
                              {t.subTransactions?.map((subT, subIdx) => (
                                <li
                                  key={subT.id}
                                  onClick={() => setSelectedTransaction(subT)}
                                  className={`px-4 py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-100 active:bg-slate-200 transition-colors pl-16 ${
                                     subIdx < t.subTransactions!.length - 1 ? 'border-b border-black/[0.04]' : ''
                                  }`}
                                >
                                  <div className="min-w-0 pr-4">
                                    <p className={`font-medium text-sm truncate ${subT.type === 'expense' ? 'text-slate-500 line-through' : 'text-slate-700'}`}>
                                      {subT.description || subT.category}
                                    </p>
                                    <p className="text-[10.5px] text-slate-400 mt-0.5 font-medium">
                                      {subT.createdAt?.toDate?.().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':')} WIB
                                    </p>
                                  </div>
                                  <p className={`font-bold text-xs flex-shrink-0 ${
                                    subT.type === 'income' ? 'text-green-600' : 'text-red-500'
                                  }`}>
                                    {subT.type === 'income' ? '+' : '-'}{formatRupiah(subT.amount)}
                                  </p>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </ul>
                  </div>
                );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* HIDDEN RECEIPT FOR HTML2CANVAS */}
      {downloadingMonth && (() => {
        const downloadedTxs = transactions.filter(t => t.createdAt?.toDate?.().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) === downloadingMonth || (downloadingMonth === 'Bulan Ini' && t.createdAt?.toDate?.().getMonth() === new Date().getMonth() && t.createdAt?.toDate?.().getFullYear() === new Date().getFullYear()));
        let jimpitanNet = 0;
        let donations = 0;
        let expensesList: Transaction[] = [];
        let monthIncome = 0;
        let monthExpense = 0;

        downloadedTxs.forEach(t => {
          if (t.type === 'income') {
            monthIncome += t.amount;
            if (t.category === 'JIMPITAN') {
              jimpitanNet += t.amount;
            } else {
              donations += t.amount;
            }
          } else {
            monthExpense += t.amount;
            if (t.category === 'JIMPITAN') {
              jimpitanNet -= t.amount;
            } else {
              expensesList.push(t);
            }
          }
        });

        const netMonth = monthIncome - monthExpense;

        return (
          <div className="absolute top-0 left-[-9999px]">
            <div 
              ref={receiptRef} 
              className="bg-[#ffffff] text-[#000000]"
              style={{ padding: '40px', width: '800px', fontFamily: 'sans-serif' }}
            >
              <div className="text-center mb-8 border-b-2 border-[#000000] pb-6">
                <h1 className="text-4xl font-black mb-2 uppercase tracking-wide">DANA JIMPITAN RT</h1>
                <p className="text-xl text-[#4b5563] font-medium">Laporan Keuangan: {downloadingMonth}</p>
              </div>
              
              <div className="flex gap-4 mb-8">
                <div className="flex-1 bg-[#f0fdf4] p-5 rounded-xl border border-[#bbf7d0]">
                  <p className="text-[#166534] text-sm font-bold uppercase tracking-wider mb-2">Total Dana Jimpitan Saat Ini</p>
                  <p className="text-[#16a34a] text-3xl font-bold">
                    {formatRupiah(balance)}
                  </p>
                </div>
                <div className="flex-1 bg-[#f3f4f6] p-5 rounded-xl border border-[#e5e7eb]">
                  <p className="text-[#6b7280] text-sm font-bold uppercase tracking-wider mb-2">Overall Keuangan ({downloadingMonth})</p>
                  <p className={`text-3xl font-bold ${netMonth >= 0 ? 'text-[#16a34a]' : 'text-[#dc2626]'}`}>
                    {netMonth >= 0 ? '+' : '-'}{formatRupiah(Math.abs(netMonth))}
                  </p>
                </div>
              </div>

              <div className="mb-8 border border-[#e5e7eb] rounded-xl overflow-hidden">
                <div className="p-4 bg-[#f9fafb] border-b border-[#e5e7eb]">
                  <h2 className="font-bold text-lg text-[#111827]">Rincian Pemasukan</h2>
                </div>
                <div className="p-5 flex flex-col gap-4 bg-[#ffffff]">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-bold text-lg text-[#111827]">Total Pemasukan Jimpitan</p>
                      <p className="text-sm text-[#6b7280] mt-1">Sudah dikurangi pembatalan</p>
                    </div>
                    <p className="font-bold text-xl text-[#16a34a]">+{formatRupiah(jimpitanNet)}</p>
                  </div>
                  <div className="h-px bg-[#e5e7eb]" />
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-bold text-lg text-[#111827]">Dana Jimpitan Lain-lain</p>
                      <p className="text-sm text-[#6b7280] mt-1">Donasi & kelebihan bayar</p>
                    </div>
                    <p className="font-bold text-xl text-[#16a34a]">+{formatRupiah(donations)}</p>
                  </div>
                </div>
              </div>

              <div className="mb-8 border border-[#e5e7eb] rounded-xl overflow-hidden">
                <div className="p-4 bg-[#f9fafb] border-b border-[#e5e7eb]">
                  <h2 className="font-bold text-lg text-[#111827]">Rincian Pengeluaran</h2>
                </div>
                <div className="bg-[#ffffff]">
                  {expensesList.length === 0 ? (
                    <div className="p-6 text-center">
                      <p className="text-lg text-[#9ca3af]">Tidak ada pengeluaran di bulan ini</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-[#e5e7eb]">
                      {expensesList.map(exp => (
                        <li key={exp.id} className="p-5 flex items-center justify-between">
                          <div>
                            <p className="font-bold text-lg text-[#111827]">{exp.description || exp.category}</p>
                            <p className="text-sm text-[#6b7280] mt-1">
                              {exp.createdAt?.toDate().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })} • {exp.createdAt?.toDate().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':')}
                            </p>
                          </div>
                          <p className="font-bold text-xl text-[#dc2626]">
                            -{formatRupiah(exp.amount)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              
              <div className="mt-12 pt-6 border-t-2 border-[#000000] text-center">
                <p className="text-[#6b7280] text-base font-medium">Dicetak secara otomatis pada: {new Date().toLocaleString('id-ID')}</p>
                <p className="text-[#9ca3af] text-sm mt-1">Sistem Keuangan Jimpit Kulon</p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODALS */}
      {showFilterModal && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowFilterModal(false)} />
          <div className="relative bg-white rounded-t-3xl p-5 pb-8 animate-in slide-in-from-bottom-full duration-300 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-white z-10 py-2">
              <h3 className="font-bold text-lg text-foreground">Filter Aktivitas</h3>
              <button onClick={() => setShowFilterModal(false)} className="p-1 rounded-full bg-black/5 text-foreground/60">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <p className="text-sm font-semibold text-foreground mb-3">Tipe</p>
                <div className="flex flex-wrap gap-2">
                  {(['all', 'income', 'expense'] as const).map(type => (
                    <button 
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                        filterType === type 
                          ? 'bg-primary border-primary text-primary-foreground' 
                          : 'bg-white border-black/10 text-foreground/70 hover:border-black/20'
                      }`}
                    >
                      {type === 'all' ? 'Semua' : type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <p className="text-sm font-semibold text-foreground mb-3">Waktu</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { val: 'all', label: 'Semua' },
                    { val: 'this_month', label: 'Bulan Ini' },
                    { val: 'last_month', label: 'Bulan Lalu' },
                    { val: 'last_3_months', label: '3 Bulan Terakhir' }
                  ].map(dt => (
                    <button 
                      key={dt.val}
                      onClick={() => setFilterDate(dt.val as any)}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                        filterDate === dt.val 
                          ? 'bg-primary border-primary text-primary-foreground' 
                          : 'bg-white border-black/10 text-foreground/70 hover:border-black/20'
                      }`}
                    >
                      {dt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-foreground mb-3">Kategori</p>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => setFilterCategory('all')}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                      filterCategory === 'all' 
                        ? 'bg-primary border-primary text-primary-foreground' 
                        : 'bg-white border-black/10 text-foreground/70 hover:border-black/20'
                    }`}
                  >
                    Semua
                  </button>
                  {availableCategories.map(cat => (
                    <button 
                      key={cat}
                      onClick={() => setFilterCategory(cat)}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                        filterCategory === cat 
                          ? 'bg-primary border-primary text-primary-foreground' 
                          : 'bg-white border-black/10 text-foreground/70 hover:border-black/20'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mt-8 flex gap-3 sticky bottom-0 bg-white pt-2 pb-2">
              <button 
                onClick={() => { setFilterType('all'); setFilterDate('all'); setFilterCategory('all'); }}
                className="flex-1 py-3.5 rounded-xl font-bold text-foreground/70 border border-black/10 bg-white active:bg-black/5"
              >
                RESET
              </button>
              <button 
                onClick={() => setShowFilterModal(false)}
                className="flex-1 py-3.5 rounded-xl font-bold text-white bg-primary active:scale-[0.98] transition-transform"
              >
                TERAPKAN
              </button>
            </div>
          </div>
        </div>
      )}

      {showDownloadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDownloadModal(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-black/5 flex justify-between items-center">
              <h3 className="font-bold text-foreground">Unduh Laporan</h3>
              <button onClick={() => setShowDownloadModal(false)} className="p-1 rounded-full hover:bg-black/5 text-foreground/60">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <div className="bg-black/5 rounded-lg p-3 flex gap-2 items-start mb-4">
                <p className="text-xs text-foreground/60 leading-relaxed">
                  Pilih bulan untuk mengunduh laporan aktivitas keuangan dalam format gambar (PNG) yang mudah dibaca.
                </p>
              </div>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {availableMonths.length === 0 ? (
                  <p className="text-sm text-center text-foreground/50 py-4">Belum ada data bulan</p>
                ) : (
                  availableMonths.map(month => (
                    <button
                      key={month}
                      onClick={() => handleDownload(month)}
                      className="w-full flex items-center justify-between p-3 rounded-xl border border-black/10 hover:border-primary/50 hover:bg-primary/5 transition-colors group"
                    >
                      <span className="font-medium text-sm text-foreground/80 group-hover:text-primary">{month}</span>
                      <Download className="w-4 h-4 text-foreground/40 group-hover:text-primary" />
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TRANSACTION DETAIL MODAL */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center sm:p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedTransaction(null)} />
          <div className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-sm overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
            <div className="p-4 flex justify-between items-center absolute top-0 left-0 right-0">
              <button onClick={() => setSelectedTransaction(null)} className="p-2 rounded-full bg-black/5 hover:bg-black/10 text-foreground/70 transition-colors ml-auto">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 pt-12">
              <div className="flex flex-col items-center justify-center mb-8">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-sm ${
                  selectedTransaction.type === 'income' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
                }`}>
                  {selectedTransaction.type === 'income'
                    ? <TrendingUp className="w-8 h-8" />
                    : <TrendingDown className="w-8 h-8" />
                  }
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    selectedTransaction.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {selectedTransaction.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider">
                    {selectedTransaction.category}
                  </span>
                </div>
                <p className={`text-4xl font-bold mt-2 ${
                  selectedTransaction.type === 'income' ? 'text-green-600' : 'text-red-500'
                }`}>
                  {selectedTransaction.type === 'income' ? '+' : '-'}{formatRupiah(selectedTransaction.amount)}
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 space-y-4 border border-slate-100">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Keterangan</span>
                  <span className="text-sm font-medium text-slate-900">{selectedTransaction.description || '-'}</span>
                </div>
                
                <div className="h-px bg-slate-200" />
                
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Waktu Transaksi</span>
                  <span className="text-sm font-medium text-slate-900">
                    {selectedTransaction.createdAt?.toDate ? (
                      `${selectedTransaction.createdAt.toDate().toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}, ${selectedTransaction.createdAt.toDate().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':')}`
                    ) : '-'}
                  </span>
                </div>

                <div className="h-px bg-slate-200" />
                
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">ID Referensi</span>
                  <span className="text-xs font-medium text-slate-400 break-all">{selectedTransaction.id}</span>
                </div>
              </div>
              
              <div className="mt-6">
                 <button 
                   onClick={() => setSelectedTransaction(null)}
                   className="w-full py-3.5 rounded-xl font-bold text-white bg-primary active:scale-[0.98] transition-transform"
                 >
                   TUTUP
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
