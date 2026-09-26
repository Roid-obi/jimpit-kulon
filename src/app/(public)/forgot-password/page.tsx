"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import { Mail, KeyRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { app } from "@/lib/firebase/client";

const resetSchema = z.object({
  email: z.string().email({ message: "Format email tidak valid" }),
});

type ResetFormValues = z.infer<typeof resetSchema>;

export default function ForgotPasswordPage() {
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
  });

  const onSubmit = async (data: ResetFormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      const auth = getAuth(app);
      await sendPasswordResetEmail(auth, data.email);
      setIsSent(true);
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        "code" in err &&
        err.code === "auth/user-not-found"
      ) {
        setError("Akun tidak ditemukan.");
      } else {
        setError("Terjadi kesalahan saat mengirim email reset.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center px-5 py-10">
      {/* Logo */}
      <div className="text-center mb-10">
        <Image
          src="/jimpit-kulon-logo.png"
          alt="Jimpit Kulon"
          width={160}
          height={64}
          className="object-contain mx-auto mb-3"
          priority
        />
        <p className="text-sm text-foreground/50">Reset password akun Anda</p>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-black/5 p-6 w-full max-w-sm mx-auto">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
            <KeyRound className="w-8 h-8 text-primary" />
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-xl font-bold text-foreground mb-2">
            Lupa Password?
          </h1>
          <p className="text-foreground/50 text-sm">
            Masukkan email Anda dan kami akan mengirimkan tautan untuk mereset password.
          </p>
        </div>

        {isSent ? (
          <div className="bg-green-50 text-green-700 p-4 rounded-xl mb-6 text-sm text-center border border-green-100">
            Tautan reset password telah dikirim ke email Anda. Silakan periksa kotak masuk atau folder spam.
            <div className="mt-5">
              <Link
                href="/login"
                className="block w-full py-3.5 bg-primary text-[#000000] rounded-xl font-semibold text-base active:scale-[0.98]"
              >
                Kembali ke Login
              </Link>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-50 text-red-600 p-3.5 rounded-xl mb-5 border border-red-100 text-sm text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
                  <input
                    {...register("email")}
                    type="email"
                    className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-black/10 bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
                    placeholder="nama@email.com"
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1.5">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-primary text-[#000000] rounded-xl font-bold text-base mt-2 disabled:opacity-60 active:scale-[0.98]"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Mengirim...
                  </span>
                ) : (
                  "Kirim Tautan Reset"
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-black/5 text-center">
              <Link
                href="/login"
                className="text-sm text-secondary font-semibold hover:underline"
              >
                &larr; Kembali ke Login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
