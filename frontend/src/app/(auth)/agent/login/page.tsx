"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../../../components/auth-provider";
import { useToast } from "../../../../components/toast";
import { useTheme } from "../../../../components/theme-provider";
import { UserCheck, ArrowLeft, Sun, Moon, Lock, Mail, Activity, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginSchema, LoginInput } from "shared";

function AgentLoginForm() {
  const { login, user, loading } = useAuth();
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [shake, setShake] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      if (user.role === "Agent") {
        router.push("/agent");
      }
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (searchParams.get("expired")) {
      toast("Your session has expired. Please log in again.", "error", "Session Expired");
    }
  }, [searchParams, toast]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setSubmitLoading(true);
    try {
      await login(data.email, data.password, "Agent");
      toast("Logged in successfully as Agent.", "success", "Welcome Back");
      router.push("/agent");
    } catch (err: any) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      const errMsg = err.response?.data?.error?.message || "Invalid credentials.";
      toast(errMsg, "error", "Login Failed");
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-navy-950 flex flex-col items-center justify-center text-slate-900 dark:text-slate-100">
        <Activity className="w-10 h-10 text-sky-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#080c16] relative flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-sky-900/5 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-blue-900/5 blur-[120px]" />

      {/* Floating Buttons */}
      <div className="absolute top-6 left-6 z-20">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      </div>

      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`w-full max-w-md p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/40 backdrop-blur-md relative shadow-xl ${shake ? "animate-shake" : ""
          }`}
      >
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400 mb-4 border border-sky-500/20">
            <UserCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Agent Console</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs">Enter your agent credentials to log in.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
              <input
                {...register("email")}
                type="email"
                placeholder="agent1@insurance.com"
                className={`w-full pl-10 pr-4 py-3 rounded-lg border bg-slate-100/60 dark:bg-slate-950/60 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500/50 focus:border-sky-500/50 transition-colors ${errors.email ? "border-rose-500/60" : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
              />
            </div>
            {errors.email && (
              <p className="text-rose-400 text-[11px] mt-1.5">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
              <input
                {...register("password")}
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className={`w-full pl-10 pr-10 py-3 rounded-lg border bg-slate-100/60 dark:bg-slate-950/60 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500/50 focus:border-sky-500/50 transition-colors ${errors.password ? "border-rose-500/60" : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-rose-400 text-[11px] mt-1.5">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitLoading}
            className="w-full py-3 px-4 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 mt-2 shadow-lg shadow-sky-900/10"
          >
            {submitLoading ? (
              <Activity className="w-4 h-4 animate-spin" />
            ) : (
              "Sign In to Console"
            )}
          </button>
        </form>

        {/* <div className="mt-8 text-center text-[10px] text-slate-400 dark:text-slate-600 tracking-wider">
          SECURE CONNECTION &middot; ATTEMPT RATE LIMIT ACTIVE
        </div> */}
      </motion.div>
    </div>
  );
}

export default function AgentLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#080c16] flex flex-col items-center justify-center text-slate-100">
        <Activity className="w-10 h-10 text-sky-400 animate-spin" />
      </div>
    }>
      <AgentLoginForm />
    </Suspense>
  );
}
