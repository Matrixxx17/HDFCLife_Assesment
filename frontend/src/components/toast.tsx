"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, CheckCircle, AlertTriangle, Info } from "lucide-react";

interface Toast {
  id: string;
  title?: string;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContextType {
  toast: (message: string, type?: "success" | "error" | "info", title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(
    (message: string, type: "success" | "error" | "info" = "success", title?: string) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, title, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 w-full max-w-sm">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
              className={`p-4 rounded-xl shadow-lg border flex items-start gap-3 backdrop-blur-md relative overflow-hidden ${
                t.type === "success"
                  ? "bg-emerald-950/85 border-emerald-500/30 text-emerald-200"
                  : t.type === "error"
                  ? "bg-rose-950/85 border-rose-500/30 text-rose-200"
                  : "bg-slate-900/85 border-slate-700/30 text-slate-200"
              }`}
            >
              {/* Dynamic decorative line */}
              <div
                className={`absolute top-0 left-0 bottom-0 w-1.5 ${
                  t.type === "success"
                    ? "bg-emerald-500"
                    : t.type === "error"
                    ? "bg-rose-500"
                    : "bg-teal-500"
                }`}
              />
              <div className="flex-shrink-0 mt-0.5 ml-1">
                {t.type === "success" && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                {t.type === "error" && <AlertTriangle className="w-5 h-5 text-rose-400" />}
                {t.type === "info" && <Info className="w-5 h-5 text-teal-400" />}
              </div>
              <div className="flex-1 pr-6">
                {t.title && <h4 className="font-semibold text-sm mb-0.5">{t.title}</h4>}
                <p className="text-xs opacity-90 leading-relaxed">{t.message}</p>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="absolute top-3 right-3 opacity-60 hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
