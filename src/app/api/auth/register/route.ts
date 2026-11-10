import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

const REGISTRATION_DOC_PATH = "settings/registration";
const DEFAULT_FALLBACK_CODE = "JIMPIT-KULON";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "").trim();
    const registrationCode = String(body.registrationCode || "").trim().toUpperCase();

    // 1. Validasi input dasar
    if (!name || name.length < 3) {
      return NextResponse.json(
        { error: "Nama lengkap minimal 3 karakter." },
        { status: 400 }
      );
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Format email tidak valid." },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Password minimal 6 karakter." },
        { status: 400 }
      );
    }

    if (!registrationCode) {
      return NextResponse.json(
        { error: "Kode registrasi petugas wajib diisi." },
        { status: 400 }
      );
    }

    // 2. Ambil setting kode registrasi aktif dari Firestore
    const settingsDoc = await adminDb.doc(REGISTRATION_DOC_PATH).get();
    let expectedCode = DEFAULT_FALLBACK_CODE;
    let isRegistrationOpen = true;

    if (settingsDoc.exists) {
      const data = settingsDoc.data();
      if (typeof data?.registrationCode === "string" && data.registrationCode.trim() !== "") {
        expectedCode = data.registrationCode.trim().toUpperCase();
      }
      if (data?.isOpen === false) {
        isRegistrationOpen = false;
      }
    } else {
      // Inisialisasi dokumen default jika belum pernah dibuat
      await adminDb.doc(REGISTRATION_DOC_PATH).set({
        registrationCode: DEFAULT_FALLBACK_CODE,
        isOpen: true,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    // 3. Periksa apakah pendaftaran sedang dibuka
    if (!isRegistrationOpen) {
      return NextResponse.json(
        { error: "Pendaftaran petugas mandiri saat ini sedang ditutup oleh Admin RT." },
        { status: 403 }
      );
    }

    // 4. Periksa kecocokan kode registrasi
    if (registrationCode !== expectedCode) {
      return NextResponse.json(
        { error: "Kode registrasi petugas tidak valid. Silakan hubungi Admin / Ketua RT untuk meminta kode terbaru." },
        { status: 400 }
      );
    }

    // 5. Periksa duplikasi email di Firestore users
    const existingSnap = await adminDb.collection("users").where("email", "==", email).get();
    if (!existingSnap.empty) {
      return NextResponse.json(
        { error: "Email sudah terdaftar. Silakan langsung masuk ke akun Anda." },
        { status: 400 }
      );
    }

    // 6. Buat user di Firebase Auth
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
      emailVerified: true,
      disabled: false,
    });

    // 7. Simpan dokumen profil di Firestore
    await adminDb.collection("users").doc(userRecord.uid).set({
      name,
      email,
      role: "petugas",
      isActive: true,
      emailVerified: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: "Registrasi petugas berhasil. Akun Anda langsung aktif dan dapat digunakan login.",
      user: {
        uid: userRecord.uid,
        email,
        name,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan internal.";
    console.error("Registration error:", err);
    return NextResponse.json(
      { error: `Gagal melakukan registrasi: ${message}` },
      { status: 500 }
    );
  }
}
