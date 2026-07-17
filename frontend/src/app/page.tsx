"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../components/auth-provider";
import { Shield, UserCheck, ArrowRight, Activity } from "lucide-react";
import { motion } from "framer-motion";

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      if (user.role === "Admin") {
        router.push("/admin");
      } else {
        router.push("/agent");
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center text-slate-100">
        <Activity className="w-10 h-10 text-teal-400 animate-spin mb-4" />
        <p className="text-sm tracking-widest text-slate-400">LOADING HDFCINSURA...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080c16] relative flex flex-col items-center justify-center p-6 overflow-hidden">

      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-teal-900/10 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-blue-900/10 blur-[120px]" />

      <div className="w-full max-w-4xl z-10 flex flex-col items-center">

        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-teal-500/20 bg-teal-500/5 text-teal-400 text-xs font-semibold tracking-wider uppercase mb-4">
            <Shield className="w-3.5 h-3.5" /> SECURE POLICY MANAGEMENT SYSTEM
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-4">
            Welcome to{" "}
            <span className="bg-gradient-to-r from-teal-400 via-sky-400 to-indigo-400 bg-clip-text text-transparent">
              HDFCINSURA
            </span>
          </h1>
          <p className="text-base md:text-lg text-slate-400 max-w-xl mx-auto">
            Choose your portal to manage agents, onboard policyholders, and calculate premiums securely in real-time.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">

          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => router.push("/admin/login")}
            className="group relative cursor-pointer overflow-hidden p-8 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md hover:border-teal-500/40 hover:bg-slate-900/60 transition-all duration-300"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/10 rounded-bl-full group-hover:bg-teal-500/20 transition-colors" />
            <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400 mb-6 group-hover:scale-110 transition-transform">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-teal-400 transition-colors">
              Supervisory Admin Portal
            </h3>
            <p className="text-slate-400 text-sm mb-6">
              Create Agent accounts, soft-deactivate agents, and view real-time performance analytics.
            </p>
            <div className="flex items-center gap-2 text-teal-400 font-semibold text-sm">
              Access Admin Console{" "}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>


          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => router.push("/agent/login")}
            className="group relative cursor-pointer overflow-hidden p-8 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md hover:border-sky-500/40 hover:bg-slate-900/60 transition-all duration-300"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/10 rounded-bl-full group-hover:bg-sky-500/20 transition-colors" />
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400 mb-6 group-hover:scale-110 transition-transform">
              <UserCheck className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-sky-400 transition-colors">
              Agent Sales Portal
            </h3>
            <p className="text-slate-400 text-sm mb-6">
              Manage the customer lifecycle, calculate customized premiums, and issue insurance policies.
            </p>
            <div className="flex items-center gap-2 text-sky-400 font-semibold text-sm">
              Access Agent Console{" "}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-16 text-xs text-slate-500 tracking-wider text-center"
        >
        </motion.div>
      </div>
    </div>
  );
}
