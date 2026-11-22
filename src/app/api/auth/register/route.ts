import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

const REGISTRATION_DOC_PATH = "settings/registration";
const DEFAULT_FALLBACK_CODE = "JIMPIT-KULON";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body.name || "").trim();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const password = String(body.password || "").trim();
    const registrationCode = String(body.registrationCode || "")
      .trim()
      .toUpperCase();

    // 1. Validasi input dasar dengan pesan yang sangat jelas
    if (!name || name.length < 3) {
      return NextResponse.json(
        { error: "Nama lengkap harus diisi minimal 3 karakter." },
        { status: 400 },
      );
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Format email tidak valid (contoh: nama@email.com)." },
        { status: 400 },
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Password minimal 6 karakter demi keamanan akun Anda." },
        { status: 400 },
      );
    }

    if (!registrationCode) {
      return NextResponse.json(
        {
          error:
            "Kode registrasi petugas wajib diisi. Silakan hubungi Admin RT untuk mendapatkan kode (Kode default awal: JIMPIT-KULON).",
        },
        { status: 400 },
      );
    }

    // 2. Ambil setting kode registrasi aktif dari Firestore secara aman
    let expectedCode = DEFAULT_FALLBACK_CODE;
    let isRegistrationOpen = true;

    try {
      const settingsDoc = await adminDb.doc(REGISTRATION_DOC_PATH).get();
      if (settingsDoc.exists) {
        const data = settingsDoc.data();
        if (
          typeof data?.registrationCode === "string" &&
          data.registrationCode.trim() !== ""
        ) {
          expectedCode = data.registrationCode.trim().toUpperCase();
        }
        if (data?.isOpen === false) {
          isRegistrationOpen = false;
        }
      } else {
        // Coba inisialisasi default jika belum ada
        adminDb
          .doc(REGISTRATION_DOC_PATH)
          .set({
            registrationCode: DEFAULT_FALLBACK_CODE,
            isOpen: true,
            updatedAt: FieldValue.serverTimestamp(),
          })
          .catch(() => {});
      }
    } catch (settingsError) {
      console.warn(
        "Gagal membaca settings/registration, gunakan default code:",
        settingsError,
      );
    }

    // 3. Periksa apakah pendaftaran sedang dibuka
    if (!isRegistrationOpen) {
      return NextResponse.json(
        {
          error:
            "Pendaftaran petugas mandiri saat ini sedang dinonaktifkan oleh Admin RT. Silakan hubungi Admin.",
        },
        { status: 403 },
      );
    }

    // 4. Periksa kecocokan kode registrasi
    if (registrationCode !== expectedCode) {
      return NextResponse.json(
        {
          error: `Kode registrasi "${registrationCode}" tidak valid. Pastikan Anda memasukkan kode yang benar dari pengurus RT (Kode default awal: ${DEFAULT_FALLBACK_CODE}).`,
        },
        { status: 400 },
      );
    }

    // 5. Periksa duplikasi email di Firestore users
    try {
      const existingSnap = await adminDb
        .collection("users")
        .where("email", "==", email)
        .limit(1)
        .get();

      if (!existingSnap.empty) {
        return NextResponse.json(
          {
            error:
              "Email ini sudah terdaftar sebagai pengguna. Silakan langsung masuk ke menu Login.",
          },
          { status: 400 },
        );
      }
    } catch (checkEmailErr) {
      console.warn("Gagal mengecek duplikasi di firestore:", checkEmailErr);
    }

    // 6. Buat user di Firebase Auth
    let userRecord;
    try {
      userRecord = await adminAuth.createUser({
        email,
        password,
        displayName: name,
        emailVerified: true,
        disabled: false,
      });
    } catch (authError: any) {
      console.error("Firebase Auth create error:", authError);
      if (authError.code === "auth/email-already-exists") {
        return NextResponse.json(
          {
            error:
              "Email ini sudah terdaftar di Firebase Auth. Silakan gunakan menu Login atau Lupa Password.",
          },
          { status: 400 },
        );
      }
      if (authError.code === "auth/invalid-password") {
        return NextResponse.json(
          {
            error: "Password minimal 6 karakter dan tidak boleh kosong.",
          },
          { status: 400 },
        );
      }
      return NextResponse.json(
        {
          error: `Gagal membuat akun autentikasi: ${authError.message || "Layanan autentikasi gagal merespons"}`,
        },
        { status: 500 },
      );
    }

    // 7. Simpan dokumen profil di Firestore
    try {
      await adminDb.collection("users").doc(userRecord.uid).set({
        name,
        email,
        role: "petugas",
        isActive: true,
        emailVerified: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } catch (dbError: any) {
      console.error("Firestore save user profile error:", dbError);
      // Jika profile firestore gagal tapi auth berhasil, tetap informasikan dengan jelas
      return NextResponse.json(
        {
          error:
            "Akun berhasil dibuat di sistem login, namun penyimpanan profil ke database mengalami kendala. Silakan coba masuk atau hubungi Admin.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Registrasi petugas berhasil. Akun Anda langsung aktif dan dapat digunakan login.",
      user: {
        uid: userRecord.uid,
        email,
        name,
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Terjadi kesalahan internal server.";
    console.error("Registration unhandled error:", err);
    return NextResponse.json(
      { error: `Registrasi gagal: ${message}` },
      { status: 500 },
    );
  }
}
