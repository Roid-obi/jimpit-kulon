import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Ambil transaksi keuangan dengan try/catch aman
    let txDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
    try {
      const snap = await adminDb
        .collection("financial_transactions")
        .orderBy("createdAt", "desc")
        .get();
      txDocs = snap.docs;
    } catch (e) {
      console.warn("orderBy createdAt error, fallback ke query biasa:", e);
      try {
        const snap = await adminDb.collection("financial_transactions").get();
        txDocs = snap.docs;
      } catch (err2) {
        console.error("Gagal membaca financial_transactions:", err2);
      }
    }

    // 2. Ambil data rumah dengan try/catch aman
    let houseDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
    try {
      const snap = await adminDb
        .collection("houses")
        .where("isActive", "==", true)
        .get();
      houseDocs = snap.docs;
    } catch (e) {
      console.warn("Query houses isActive error, fallback ke query biasa:", e);
      try {
        const snap = await adminDb.collection("houses").get();
        houseDocs = snap.docs;
      } catch (err2) {
        console.error("Gagal membaca houses:", err2);
      }
    }

    // 3. Olah data rumah
    const housesData: any[] = [];
    const housesMap = new Map<string, string>();

    houseDocs.forEach((doc) => {
      const d = doc.data();
      const houseItem = {
        id: doc.id,
        houseNumber: d.houseNumber || "",
        headOfFamily: d.headOfFamily || "",
        address: d.address || "",
      };
      housesData.push(houseItem);
      housesMap.set(doc.id, d.headOfFamily || d.houseNumber || "Rumah Warga");
    });

    housesData.sort((a, b) => {
      const numA = parseInt(a.houseNumber, 10);
      const numB = parseInt(b.houseNumber, 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.houseNumber.localeCompare(b.houseNumber);
    });

    // 4. Kalkulasi transaksi & saldo
    let totalIncome = 0;
    let totalExpense = 0;
    const rawTx: any[] = [];

    txDocs.forEach((doc) => {
      const d = doc.data();
      const amt = Number(d.amount) || 0;
      if (d.type === "income") totalIncome += amt;
      else if (d.type === "expense") totalExpense += amt;

      const createdMillis = d.createdAt?._seconds
        ? d.createdAt._seconds * 1000
        : d.createdAt?.toMillis
          ? d.createdAt.toMillis()
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
        (cat === "payment" || cat.includes("jimpitan")) && t.type === "income";
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
          t.description = isCancel ? `Pembatalan - ${houseName}` : houseName;
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
    const recentTransactions = groupedData.slice(0, 5);

    return NextResponse.json({
      success: true,
      balance: totalIncome - totalExpense,
      totalIncome,
      totalExpense,
      totalHouses: housesData.length,
      recentTransactions,
      houses: housesData,
    });
  } catch (error: any) {
    console.error("Public landing API error:", error);
    return NextResponse.json(
      {
        error: error?.message || "Gagal memuat data landing page",
      },
      { status: 500 },
    );
  }
}
