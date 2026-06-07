"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth, signInWithEmailAndPassword } from "@/lib/firebase";
import { useToast } from "@/context/ToastContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zodResolver";
import * as z from "zod";
import { Mail, Lock, ArrowRight, Loader2 } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginPageContent() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      showToast("Admin authenticated successfully!", "success");
      router.push("/admin");
      router.refresh();
    } catch (error) {
      const err = error as Error & { code?: string };
      console.error(err);
      let errMsg = "Failed to sign in. Please check your credentials.";
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        errMsg = "Incorrect email or password.";
      }
      showToast(errMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-6 py-12 transition-colors duration-300">
      <div className="w-full max-w-md space-y-8 p-10 bg-white border border-neutral-100 rounded-[2rem] shadow-premium animate-fade-in">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="font-serif text-xl tracking-[0.15em] font-extrabold text-primary hover:opacity-80 transition-opacity">
            PRIME<span className="text-secondary font-sans font-semibold text-[10px] tracking-widest align-super">STORE</span>
          </Link>
          <h2 className="mt-6 font-serif text-2xl font-extrabold tracking-tight text-neutral-900 leading-tight">
            Admin Access Portal
          </h2>
          <p className="mt-2 text-xs font-semibold text-neutral-450 leading-relaxed max-w-xs mx-auto">
            Provide your administrator security credentials to manage inventory and verify orders.
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 rounded-md">
            {/* Email field */}
            <div>
              <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-neutral-400" />
                <input
                  type="email"
                  required
                  {...register("email")}
                  placeholder="email@example.com"
                  className="w-full pl-11 pr-4 py-3 border border-neutral-250 rounded-xl text-xs font-semibold focus:outline-none focus:border-neutral-450 bg-white text-neutral-800 placeholder-neutral-400 transition-all"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-[10px] text-red-500 font-semibold">{errors.email.message}</p>
              )}
            </div>

            {/* Password field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-neutral-400" />
                <input
                  type="password"
                  required
                  {...register("password")}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3 border border-neutral-250 rounded-xl text-xs font-semibold focus:outline-none focus:border-neutral-450 bg-white text-neutral-800 placeholder-neutral-400 transition-all"
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-[10px] text-red-500 font-semibold">{errors.password.message}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800 transition-colors disabled:bg-neutral-300 focus:outline-none cursor-pointer"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-300" />
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}
