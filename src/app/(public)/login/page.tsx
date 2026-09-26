"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { app } from "@/lib/firebase/client";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email({ message: "Format email tidak valid" }),
  password: z.string().min(6, { message: "Password minimal 6 karakter" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { user, loading } = useAuth();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      const auth = getAuth(app);
      await signInWithEmailAndPassword(auth, data.email, data.password);
    } catch (err: any) {
      const firebaseErrors: Record<string, string> = {
        'auth/invalid-credential': 'Email atau password salah.',
        'auth/user-not-found': 'Akun tidak ditemukan.',
        'auth/wrong-password': 'Password salah.',
        'auth/too-many-requests': 'Terlalu banyak percobaan. Coba lagi nanti.',
      };
      setError(firebaseErrors[err.code] || 'Terjadi kesalahan. Silakan coba lagi.');
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
        <p className="text-sm text-foreground/50">Masuk untuk melanjutkan</p>
      </div>

      {/* Card Form */}
      <div className="bg-white rounded-3xl shadow-sm border border-black/5 p-6 w-full max-w-sm mx-auto">
        {/* Error */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-100">
            <p className="text-sm text-red-600 text-center">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
              <input
                {...register("email")}
                type="email"
                className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-black/10 bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
                placeholder="nama@email.com"
                autoComplete="email"
              />
            </div>
            {errors.email && <p className="text-red-500 text-xs mt-1.5">{errors.email.message}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
              <input
                {...register("password")}
                type={showPassword ? 'text' : 'password'}
                className="w-full pl-10 pr-11 py-3.5 rounded-xl border border-black/10 bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
                placeholder="Minimal 6 karakter"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground/60"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1.5">{errors.password.message}</p>}
          </div>

          {/* Forgot password */}
          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-xs text-secondary font-medium hover:underline">
              Lupa Password?
            </Link>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-primary text-[#000000] rounded-xl font-bold text-base mt-2 disabled:opacity-60 active:scale-[0.98]"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Memproses...
              </span>
            ) : 'Masuk'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-black/5 text-center">
          <p className="text-sm text-foreground/50">
            Belum punya akun?{' '}
            <Link href="/register" className="text-secondary font-semibold hover:underline">Daftar Sekarang</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
