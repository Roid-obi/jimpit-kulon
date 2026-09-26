"use client";

import { getAuth, sendEmailVerification } from "firebase/auth";
import { Mail } from "lucide-react";
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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-5">
      <div className="bg-white rounded-3xl shadow-sm border border-black/5 p-8 w-full max-w-sm text-center">
        {/* Icon */}
        <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-5">
          <Mail className="w-8 h-8 text-primary" />
        </div>
        
        <h1 className="text-xl font-bold text-foreground mb-2">Verifikasi Email Anda</h1>
        <p className="text-sm text-foreground/50 leading-relaxed mb-1">
          Kami telah mengirimkan email verifikasi ke
        </p>
        <p className="text-sm font-semibold text-secondary mb-6">{user?.email}</p>
        
        {/* Error/Success messages */}
        {message && (
          <div
            className={`p-3.5 rounded-xl mb-6 text-sm border ${message.includes("Terjadi") || message.includes("Terlalu") ? "bg-red-50 text-red-600 border-red-100" : "bg-green-50 text-green-700 border-green-100"}`}
          >
            {message}
          </div>
        )}

        <div className="space-y-3">
          {/* Tombol Kirim Ulang */}
          <button
            onClick={handleResend}
            disabled={isSending || !user}
            className="w-full py-3.5 bg-primary text-[#000000] rounded-xl font-semibold text-base disabled:opacity-60 active:scale-[0.98]"
          >
            {isSending ? "Mengirim..." : "Kirim Ulang Email"}
          </button>

          {/* Tombol Kembali ke Login */}
          <button
            onClick={handleLogout}
            className="w-full py-3.5 bg-white text-foreground rounded-xl font-semibold text-base border border-black/10 shadow-sm active:scale-[0.98]"
          >
            Kembali ke Login
          </button>
        </div>
      </div>
    </div>
  );
}
