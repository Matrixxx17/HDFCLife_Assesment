"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/axios";

interface User {
  id: string;
  fullName: string;
  email: string;
  role: "Admin" | "Agent";
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, role: "Admin" | "Agent") => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSession = async () => {
    try {
      const res = await api.get("/auth/me");
      if (res.data.success && res.data.data.user) {
        setUser(res.data.data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const login = async (email: string, password: string, role: "Admin" | "Agent") => {
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password, role });
      if (res.data.success && res.data.data.user) {
        setUser(res.data.data.user);
      }
    } catch (error) {
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await api.post("/auth/logout");
      setUser(null);
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
