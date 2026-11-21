import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        { error: "Kode QR tidak valid" },
        { status: 400 },
      );
    }

    const trimmedCode = code.trim();

    // 1. Coba cari by qrCode field
    let snapshot = await adminDb
      .collection("houses")
      .where("qrCode", "==", trimmedCode)
      .limit(1)
      .get();

    // 2. Jika tidak ketemu, coba cari by document id
    if (snapshot.empty) {
      const docSnap = await adminDb.collection("houses").doc(trimmedCode).get();
      if (docSnap.exists) {
        return NextResponse.json({
          success: true,
          house: {
            id: docSnap.id,
            ...docSnap.data(),
          },
        });
      }
    } else {
      const doc = snapshot.docs[0];
      return NextResponse.json({
        success: true,
        house: {
          id: doc.id,
          ...doc.data(),
        },
      });
    }

    return NextResponse.json(
      { error: "Rumah tidak ditemukan dengan QR Code tersebut" },
      { status: 404 },
    );
  } catch (error: any) {
    console.error("Public scan API error:", error);
    return NextResponse.json(
      { error: error?.message || "Gagal memproses QR Code" },
      { status: 500 },
    );
  }
}
