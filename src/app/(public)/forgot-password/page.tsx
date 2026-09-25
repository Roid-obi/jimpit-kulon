"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import { KeyRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { app } from "@/lib/firebase/client";

const resetSchema = z.object({
  email: z.string().email({ message: "Email tidak valid" }),
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
        // For security, it's often better not to reveal if an email exists, but for this app it might be fine.
        // Or just say "Jika email terdaftar, link akan dikirim."
        setError("Email tidak ditemukan.");
      } else {
        setError("Terjadi kesalahan saat mengirim email reset.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg">
        <div className="flex justify-center mb-6">
          <div className="bg-gray-100 p-4 rounded-full text-gray-700">
            <KeyRound className="w-10 h-10" />
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Lupa Password?
          </h1>
          <p className="text-gray-500 text-sm">
            Masukkan email Anda dan kami akan mengirimkan tautan untuk mereset
            password.
          </p>
        </div>

        {isSent ? (
          <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-6 text-sm text-center">
            Tautan reset password telah dikirim ke email Anda. Silakan periksa
            kotak masuk atau folder spam.
            <div className="mt-4">
              <Link
                href="/login"
                className="inline-block py-2 px-4 bg-primary text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Kembali ke Login
              </Link>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  {...register("email")}
                  type="email"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  placeholder="Masukkan email terdaftar"
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-primary text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? "Mengirim..." : "Kirim Tautan Reset"}
              </button>
            </form>

            <div className="mt-6 text-center text-sm">
              <Link
                href="/login"
                className="text-gray-500 font-medium hover:text-gray-900 transition-colors"
              >
                &larr; Kembali ke halaman Login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
