"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, type FieldErrors } from "react-hook-form";
import * as z from "zod";
import { app } from "@/lib/firebase/client";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  KeyRound,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";

const registerSchema = z
  .object({
    name: z.string().min(3, { message: "Nama lengkap minimal 3 karakter" }),
    email: z
      .string()
      .email({ message: "Format email tidak valid (contoh: nama@email.com)" }),
    password: z.string().min(6, { message: "Password minimal 6 karakter" }),
    confirmPassword: z
      .string()
      .min(1, { message: "Konfirmasi password wajib diisi" }),
    registrationCode: z
      .string()
      .min(1, { message: "Kode registrasi petugas wajib diisi" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Konfirmasi password tidak cocok dengan password di atas",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  // Handler jika validasi form di browser gagal saat tombol submit diklik
  const onInvalid = (formErrors: FieldErrors<RegisterFormValues>) => {
    const errorList: string[] = [];
    if (formErrors.name?.message) errorList.push(formErrors.name.message);
    if (formErrors.email?.message) errorList.push(formErrors.email.message);
    if (formErrors.password?.message)
      errorList.push(formErrors.password.message);
    if (formErrors.confirmPassword?.message)
      errorList.push(formErrors.confirmPassword.message);
    if (formErrors.registrationCode?.message)
      errorList.push(formErrors.registrationCode.message);

    if (errorList.length > 0) {
      setError(`Mohon periksa data: ${errorList[0]}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    setError(null);

    const cleanCode = data.registrationCode.trim().toUpperCase();
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanName = data.name.trim();

    try {
      // 1. Coba panggil backend API register
      let res: Response | null = null;
      let result: any = null;

      try {
        res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: cleanName,
            email: cleanEmail,
            password: data.password,
            registrationCode: cleanCode,
          }),
        });
        result = await res.json().catch(() => ({}));
      } catch (networkErr) {
        console.warn("API register fetch failed, mencoba client fallback:", networkErr);
      }

      // Jika API mengembalikan error validasi yang jelas (400 atau 403)
      if (res && !res.ok) {
        if (res.status === 400 || res.status === 403) {
          throw new Error(result?.error || "Data pendaftaran tidak valid.");
        }

        // Jika server error 500 (Vercel Serverless issue), lakukan client-side fallback
        console.warn("Backend register error 500, fallback ke Client SDK...");
        if (cleanCode !== "JIMPIT-KULON") {
          throw new Error(
            `Kode registrasi "${cleanCode}" salah. Silakan hubungi Admin / Pengurus RT untuk meminta kode yang benar.`,
          );
        }

        const auth = getAuth(app);
        const userCred = await createUserWithEmailAndPassword(
          auth,
          cleanEmail,
          data.password,
        );

        await updateProfile(userCred.user, {
          displayName: cleanName,
        });

        const db = getFirestore(app);
        await setDoc(doc(db, "users", userCred.user.uid), {
          name: cleanName,
          email: cleanEmail,
          role: "petugas",
          isActive: true,
          emailVerified: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // Sign out sesi baru agar pengguna masuk secara resmi lewat halaman login
        await signOut(auth);
        router.push("/login?registered=true");
        return;
      }

      if (res && res.ok) {
        // Backend API 200 OK: langsung dialihkan ke login
        router.push("/login?registered=true");
        return;
      }

      // Jika fetch network error sama sekali
      throw new Error(
        "Koneksi ke server pendaftaran terganggu. Silakan periksa jaringan Anda.",
      );
    } catch (err: any) {
      console.error("Register error:", err);
      let msg = "Terjadi kesalahan saat pendaftaran akun.";
      if (
        err?.code === "auth/email-already-in-use" ||
        err?.message?.includes("already-exists")
      ) {
        msg =
          "Email ini sudah terdaftar sebagai pengguna. Silakan langsung masuk ke menu Login.";
      } else if (err?.code === "auth/weak-password") {
        msg = "Password terlalu lemah. Masukkan minimal 6 karakter kombinasi.";
      } else if (err?.code === "auth/invalid-email") {
        msg = "Format email tidak valid (contoh: nama@email.com).";
      } else if (err?.message) {
        msg = err.message;
      }
      setError(msg);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center px-5 py-10 relative">
      {/* Tombol Kembali ke Landing Page */}
      <div
        className="absolute top-0 left-0 p-4 sm:p-6 z-20"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 16px)" }}
      >
        <Link
          href="/"
          className="w-10 h-10 rounded-2xl bg-white border border-black/8 shadow-sm flex items-center justify-center text-foreground hover:bg-black/[0.02] active:scale-95 transition-all"
          aria-label="Kembali ke Beranda"
        >
          <ArrowLeft className="w-5 h-5 text-foreground/70" />
        </Link>
      </div>

      {/* Logo */}
      <div className="text-center mb-8">
        <Image
          src="/jimpit-kulon-logo.png"
          alt="Jimpit Kulon"
          width={160}
          height={64}
          style={{ width: "auto", height: "auto" }}
          className="object-contain mx-auto mb-3 h-10 sm:h-12 w-auto"
          priority
        />
        <h2 className="text-lg font-bold text-foreground">
          Daftar Akun Petugas
        </h2>
        <p className="text-xs text-foreground/50 mt-0.5">
          Khusus Pemuda-Pemudi Tunas Manunggal Dusun Ngowan RT 1 RW 2
        </p>
      </div>

      {/* Card Form */}
      <div className="bg-white rounded-3xl shadow-sm border border-black/8 p-6 w-full max-w-sm mx-auto">
        {/* Banner Error jika validasi atau registrasi gagal */}
        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200/80 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs text-red-700 leading-relaxed">
              <span className="font-bold">Gagal Mendaftar: </span>
              {error}
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit(onSubmit, onInvalid)}
          noValidate
          className="space-y-4"
        >
          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-foreground/80 uppercase tracking-wider mb-1.5">
              Nama Lengkap
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
              <input
                {...register("name")}
                type="text"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-black/10 bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
                placeholder="Contoh: Budi Santoso"
                autoComplete="name"
              />
            </div>
            {errors.name && (
              <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-foreground/80 uppercase tracking-wider mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
              <input
                {...register("email")}
                type="email"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-black/10 bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
                placeholder="nama@email.com"
                autoComplete="email"
              />
            </div>
            {errors.email && (
              <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-foreground/80 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
              <input
                {...register("password")}
                type={showPassword ? "text" : "password"}
                className="w-full pl-10 pr-11 py-3 rounded-xl border border-black/10 bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
                placeholder="Minimal 6 karakter"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground/60"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-bold text-foreground/80 uppercase tracking-wider mb-1.5">
              Konfirmasi Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
              <input
                {...register("confirmPassword")}
                type={showConfirmPassword ? "text" : "password"}
                className="w-full pl-10 pr-11 py-3 rounded-xl border border-black/10 bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
                placeholder="Ulangi password di atas"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground/60"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          {/* Registration Code */}
          <div className="pt-1">
            <label className="block text-xs font-bold text-foreground/80 uppercase tracking-wider mb-1.5">
              Kode Registrasi Petugas
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-600" />
              <input
                {...register("registrationCode")}
                type="text"
                onChange={(e) =>
                  setValue("registrationCode", e.target.value.toUpperCase())
                }
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-amber-300/80 bg-amber-50/40 font-mono font-bold tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm text-foreground"
                placeholder="Masukkan kode registrasi"
                autoCapitalize="characters"
              />
            </div>

            {errors.registrationCode && (
              <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.registrationCode.message}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-primary hover:brightness-105 active:scale-[0.98] transition-all text-[#000000] rounded-xl font-bold text-sm sm:text-base mt-2 disabled:opacity-60 shadow-sm"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Memproses Pendaftaran...
              </span>
            ) : (
              "Daftar Sebagai Petugas"
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-black/5 text-center">
          <p className="text-sm text-foreground/50">
            Sudah punya akun?{" "}
            <Link
              href="/login"
              className="text-secondary font-bold hover:underline"
            >
              Masuk
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}