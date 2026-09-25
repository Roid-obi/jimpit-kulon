"use client";

import { getAuth, sendEmailVerification } from "firebase/auth";
import { MailCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { app } from "@/lib/firebase/client";

export default function VerifyEmailPage() {
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleResend = async () => {
    if (!user) return;
    setIsSending(true);
    setMessage(null);
    try {
      await sendEmailVerification(user);
      setMessage(
        "Email verifikasi telah dikirim ulang. Silakan periksa kotak masuk atau folder spam Anda.",
      );
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "auth/too-many-requests"
      ) {
        setMessage(
          "Terlalu banyak permintaan. Silakan tunggu beberapa saat lagi.",
        );
      } else {
        setMessage("Terjadi kesalahan saat mengirim ulang email verifikasi.");
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg text-center">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-100 p-4 rounded-full text-blue-600">
            <MailCheck className="w-12 h-12" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Verifikasi Email Anda
        </h1>
        <p className="text-gray-600 mb-8">
          Kami telah mengirimkan email verifikasi ke{" "}
          <strong>{user?.email || "email Anda"}</strong>. Silakan periksa kotak
          masuk dan klik tautan untuk mengaktifkan akun Anda.
        </p>

        {message && (
          <div
            className={`p-3 rounded-lg mb-6 text-sm ${message.includes("Terjadi") || message.includes("Terlalu") ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}
          >
            {message}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleResend}
            disabled={isSending || !user}
            className="w-full py-3 bg-primary text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-70"
          >
            {isSending ? "Mengirim..." : "Kirim Ulang Email"}
          </button>

          <button
            onClick={handleLogout}
            className="w-full py-3 bg-white text-gray-700 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            Kembali ke Login
          </button>
        </div>
      </div>
    </div>
  );
}
