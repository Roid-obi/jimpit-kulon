"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  createUserWithEmailAndPassword,
  getAuth,
  sendEmailVerification,
} from "firebase/auth";
import { doc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { app } from "@/lib/firebase/client";
import { Eye, EyeOff, Mail, Lock, User } from "lucide-react";

const registerSchema = z
  .object({
    name: z.string().min(3, { message: "Nama minimal 3 karakter" }),
    email: z.string().email({ message: "Email tidak valid" }),
    password: z.string().min(6, { message: "Password minimal 6 karakter" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Password tidak cocok",
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
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      const auth = getAuth(app);
      const db = getFirestore(app);

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password,
      );
      const user = userCredential.user;

      // Write to firestore users collection
      await setDoc(doc(db, "users", user.uid), {
        name: data.name,
        email: data.email,
        role: "petugas",
        isActive: true, // Auto activate as requested
        emailVerified: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Send verification email
      await sendEmailVerification(user);

      router.push("/verify-email");
    } catch (err: unknown) {
      console.error(err);
      if (
        err instanceof Error &&
        "code" in err &&
        err.code === "auth/email-already-in-use"
      ) {
        setError("Email sudah digunakan.");
      } else {
        setError("Terjadi kesalahan saat pendaftaran.");
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
        <p className="text-sm text-foreground/50">Daftar akun baru</p>
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
          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Nama Lengkap</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
              <input
                {...register("name")}
                type="text"
                className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-black/10 bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
                placeholder="Nama Anda"
                autoComplete="name"
              />
            </div>
            {errors.name && <p className="text-red-500 text-xs mt-1.5">{errors.name.message}</p>}
          </div>

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
                autoComplete="new-password"
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

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Konfirmasi Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
              <input
                {...register("confirmPassword")}
                type={showConfirmPassword ? 'text' : 'password'}
                className="w-full pl-10 pr-11 py-3.5 rounded-xl border border-black/10 bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
                placeholder="Ulangi password"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground/60"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-red-500 text-xs mt-1.5">{errors.confirmPassword.message}</p>}
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
            ) : 'Daftar Akun'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-black/5 text-center">
          <p className="text-sm text-foreground/50">
            Sudah punya akun?{' '}
            <Link href="/login" className="text-primary font-semibold hover:underline">Masuk</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
