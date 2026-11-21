import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ houseId: string }> },
) {
  try {
    const { houseId } = await params;

    if (!houseId) {
      return NextResponse.json(
        { error: "House ID wajib disertakan" },
        { status: 400 },
      );
    }

    const houseDoc = await adminDb.collection("houses").doc(houseId).get();

    if (!houseDoc.exists) {
      return NextResponse.json(
        { error: "Rumah tidak ditemukan" },
        { status: 404 },
      );
    }

    const houseData = {
      id: houseDoc.id,
      ...houseDoc.data(),
    };

    // Ambil periods dan payments secara paralel
    const [periodsSnap, paymentsSnap] = await Promise.all([
      adminDb.collection("periods").orderBy("startDate", "asc").get(),
      adminDb
        .collection("payments")
        .where("houseId", "==", houseId)
        .where("status", "==", "paid")
        .get(),
    ]);

    const periods = periodsSnap.docs.map((doc) => {
      const d = doc.data();
      const startMillis = d.startDate?._seconds
        ? d.startDate._seconds * 1000
        : d.startDate?.toMillis
          ? d.startDate.toMillis()
          : 0;
      const endMillis = d.endDate?._seconds
        ? d.endDate._seconds * 1000
        : d.endDate?.toMillis
          ? d.endDate.toMillis()
          : 0;

      return {
        id: doc.id,
        periodNumber: d.periodNumber,
        startDateMillis: startMillis,
        endDateMillis: endMillis,
        amount: d.amount || 0,
        status: d.status || "active",
      };
    });

    const payments = paymentsSnap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        periodId: d.periodId,
        status: d.status,
      };
    });

    return NextResponse.json({
      success: true,
      house: houseData,
      periods,
      payments,
    });
  } catch (error: any) {
    console.error("Public house detail API error:", error);
    return NextResponse.json(
      { error: error?.message || "Gagal memuat detail rumah" },
      { status: 500 },
    );
  }
}
