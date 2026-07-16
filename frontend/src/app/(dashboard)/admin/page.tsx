"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../components/auth-provider";
import { useToast } from "../../../components/toast";
import { useTheme } from "../../../components/theme-provider";
import api from "../../../lib/axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  Users,
  BarChart3,
  LogOut,
  Sun,
  Moon,
  Plus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  User,
  Activity,
  Trash2,
  Lock,
  Mail,
  UserCheck,
  TrendingUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid
} from "recharts";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AgentCreateSchema, AgentCreateInput } from "shared";

export default function AdminDashboard() {
  const { user, loading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"agents" | "analytics">("analytics");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [page, setPage] = useState<number>(1);
  const [search, setSearch] = useState<string>("");

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  // Route guards
  useEffect(() => {
    if (!loading && (!user || user.role !== "Admin")) {
      router.push("/admin/login");
    }
  }, [user, loading, router]);

  // Queries
  const { data: agentsData, isLoading: isAgentsLoading } = useQuery({
    queryKey: ["agents", page, statusFilter],
    queryFn: async () => {
      const res = await api.get(`/admin/agents?page=${page}&limit=5&status=${statusFilter}`);
      return res.data;
    },
    enabled: !!user && user.role === "Admin" && activeTab === "agents",
  });

  const { data: analyticsData, isLoading: isAnalyticsLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const res = await api.get("/admin/analytics");
      return res.data.data;
    },
    enabled: !!user && user.role === "Admin",
  });

  const { data: profileData, isLoading: isProfileLoading } = useQuery({
    queryKey: ["agentProfile", selectedAgentId],
    queryFn: async () => {
      const res = await api.get(`/admin/agents/${selectedAgentId}`);
      return res.data.data;
    },
    enabled: !!selectedAgentId,
  });

  // Mutations
  const createAgentMutation = useMutation({
    mutationFn: async (data: AgentCreateInput) => {
      const res = await api.post("/admin/agents", data);
      return res.data;
    },
    onSuccess: () => {
      toast("Agent created successfully.", "success", "Agent Created");
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      setIsCreateOpen(false);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || "Failed to create agent.";
      toast(msg, "error", "Creation Failed");
    },
  });

  // Optimistic UI update on deactivation
  const deactivateMutation = useMutation({
    mutationFn: async (agentId: string) => {
      const res = await api.delete(`/admin/agents/${agentId}`);
      return res.data;
    },
    onMutate: async (deactivatedId) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ["agents"] });

      // Snapshot previous state
      const previousAgents = queryClient.getQueryData(["agents", page, statusFilter]);

      // Optimistically modify status in cache
      queryClient.setQueryData(["agents", page, statusFilter], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((agent: any) =>
            agent._id === deactivatedId ? { ...agent, isActive: false } : agent
          ),
        };
      });

      return { previousAgents };
    },
    onError: (err: any, deactivatedId, context) => {
      // Rollback to previous snapshot
      if (context?.previousAgents) {
        queryClient.setQueryData(["agents", page, statusFilter], context.previousAgents);
      }
      const msg = err.response?.data?.error?.message || "Failed to deactivate agent.";
      toast(msg, "error", "Operation Failed");
    },
    onSuccess: () => {
      toast("Agent account soft-deactivated.", "success", "Agent Deactivated");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });

  // Create Agent Form setup
  const {
    register: registerAgent,
    handleSubmit: handleAgentSubmit,
    reset: resetAgentForm,
    formState: { errors: agentErrors },
  } = useForm<AgentCreateInput>({
    resolver: zodResolver(AgentCreateSchema),
  });

  const onAgentCreateSubmit = (data: AgentCreateInput) => {
    createAgentMutation.mutate(data);
    resetAgentForm();
  };

  const handleDeactivate = (id: string, name: string) => {
    if (confirm(`Are you sure you want to deactivate ${name}?`)) {
      deactivateMutation.mutate(id);
    }
  };

  if (loading || !user || user.role !== "Admin") {
    return (
      <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center text-slate-100">
        <Activity className="w-10 h-10 text-teal-400 animate-spin" />
      </div>
    );
  }

  // Calculate aggregated stats
  const totalAgents = analyticsData
    ? analyticsData.agentsStatus.active + analyticsData.agentsStatus.inactive
    : 0;
  const activeAgents = analyticsData ? analyticsData.agentsStatus.active : 0;
  const totalPolicies = analyticsData
    ? analyticsData.agentWisePolicies.reduce((acc: number, item: any) => acc + item.policiesCount, 0)
    : 0;
  const totalPremium = analyticsData
    ? analyticsData.agentWisePolicies.reduce((acc: number, item: any) => acc + item.totalPremium, 0)
    : 0;

  // Colors for Recharts
  const PIE_COLORS = ["#0d9488", "#f43f5e"];

  // Filtered agents display (client side search helper over current page if needed)
  const displayAgents = agentsData?.data || [];

  return (
    <div className="min-h-screen bg-[#080c16] text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/40 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-teal-500 to-indigo-600 flex items-center justify-center text-white font-extrabold shadow-lg shadow-teal-500/20">
            HI
          </div>
          <div>
            <span className="font-extrabold text-white text-lg tracking-tight">HDFCINSURA</span>
            <span className="text-[10px] bg-teal-500/10 border border-teal-500/20 text-teal-400 font-semibold px-2 py-0.5 rounded-full ml-2">
              ADMIN
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-slate-900 text-slate-400 hover:text-white transition-colors"
          >
            {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
          <div className="h-6 w-[1px] bg-slate-800" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold border border-slate-700">
              {user.fullName[0].toUpperCase()}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-white leading-none">{user.fullName}</p>
              <p className="text-[10px] text-slate-400">{user.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-lg border border-rose-950/20 bg-rose-950/5 hover:bg-rose-950/10 text-rose-400 transition-colors"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Main Body */}
      <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-8">
        {/* Header Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl border border-slate-800 bg-slate-900/30 backdrop-blur-md"
          >
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Active / Total Agents
            </p>
            <h3 className="text-2xl font-extrabold text-white">
              {activeAgents} <span className="text-slate-500 font-medium text-sm">/ {totalAgents}</span>
            </h3>
            <div className="flex items-center gap-1.5 text-[10px] text-teal-400 mt-2 font-medium">
              <Users className="w-3 h-3" /> Agent Provisioning Core
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="p-5 rounded-2xl border border-slate-800 bg-slate-900/30 backdrop-blur-md"
          >
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Total Policies Issued
            </p>
            <h3 className="text-2xl font-extrabold text-white">{totalPolicies}</h3>
            <div className="flex items-center gap-1.5 text-[10px] text-sky-400 mt-2 font-medium">
              <UserCheck className="w-3 h-3" /> Across all Sales Units
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-5 rounded-2xl border border-slate-800 bg-slate-900/30 backdrop-blur-md"
          >
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Total Premium Volume
            </p>
            <h3 className="text-2xl font-extrabold text-white">₹{totalPremium.toLocaleString()}</h3>
            <div className="flex items-center gap-1.5 text-[10px] text-amber-500 mt-2 font-medium">
              <TrendingUp className="w-3 h-3" /> Sum of all frequencies
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-5 rounded-2xl border border-slate-800 bg-slate-900/30 backdrop-blur-md"
          >
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Platform Status
            </p>
            <h3 className="text-2xl font-extrabold text-emerald-400">Operational</h3>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-2 font-medium">
              <Activity className="w-3 h-3 text-emerald-400 animate-pulseCheck" /> API and Workers Healthy
            </div>
          </motion.div>
        </div>

        {/* Tab Toggle Navigation */}
        <div className="flex border-b border-slate-800">
          <button
            onClick={() => setActiveTab("analytics")}
            className={`py-3 px-6 font-semibold text-sm transition-all relative ${activeTab === "analytics" ? "text-teal-400" : "text-slate-400 hover:text-white"
              }`}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Analytics Overview
            </div>
            {activeTab === "analytics" && (
              <motion.div
                layoutId="activeTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-400"
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab("agents")}
            className={`py-3 px-6 font-semibold text-sm transition-all relative ${activeTab === "agents" ? "text-teal-400" : "text-slate-400 hover:text-white"
              }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" /> Agent Directory
            </div>
            {activeTab === "agents" && (
              <motion.div
                layoutId="activeTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-400"
              />
            )}
          </button>
        </div>

        {/* Main Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === "analytics" && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {isAnalyticsLoading ? (
                <div className="h-96 flex items-center justify-center">
                  <Activity className="w-8 h-8 text-teal-400 animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Active vs Inactive Donut Chart */}
                  <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/30 backdrop-blur-md flex flex-col h-[350px]">
                    <h4 className="font-bold text-sm tracking-tight text-white mb-4">
                      Agent Distribution (Active vs Inactive)
                    </h4>
                    <div className="flex-1 relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: "Active", value: analyticsData?.agentsStatus.active || 0 },
                              { name: "Inactive", value: analyticsData?.agentsStatus.inactive || 0 },
                            ]}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            <Cell fill={PIE_COLORS[0]} />
                            <Cell fill={PIE_COLORS[1]} />
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              background: "#0f172a",
                              borderColor: "#1e293b",
                              borderRadius: "8px",
                              color: "#f8fafc",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-3xl font-extrabold">{totalAgents}</span>
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest">
                          Total Agents
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-center gap-6 text-xs mt-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-teal-500" />
                        <span>Active ({activeAgents})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-rose-500" />
                        <span>Inactive ({analyticsData?.agentsStatus.inactive || 0})</span>
                      </div>
                    </div>
                  </div>

                  {/* Agent Policies Bar Chart */}
                  <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/30 backdrop-blur-md flex flex-col col-span-1 lg:col-span-2 h-[350px]">
                    <h4 className="font-bold text-sm tracking-tight text-white mb-4">
                      Policies Issued by Agent (Sales Funnel)
                    </h4>
                    <div className="flex-1">
                      {analyticsData?.agentWisePolicies.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                          No policies issued yet.
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analyticsData?.agentWisePolicies || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="agentName" stroke="#64748b" fontSize={11} />
                            <YAxis stroke="#64748b" fontSize={11} />
                            <Tooltip
                              contentStyle={{
                                background: "#0f172a",
                                borderColor: "#1e293b",
                                borderRadius: "8px",
                                color: "#f8fafc",
                              }}
                            />
                            <Bar dataKey="policiesCount" fill="#0d9488" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>

                  {/* Monthly Issuance Trends Line Chart */}
                  <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/30 backdrop-blur-md flex flex-col col-span-1 lg:col-span-3 h-[350px]">
                    <h4 className="font-bold text-sm tracking-tight text-white mb-4">
                      Monthly Policy Issuance Volume & Premium Collection
                    </h4>
                    <div className="flex-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analyticsData?.monthlyTrends || []}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                          <YAxis yAxisId="left" stroke="#64748b" fontSize={11} />
                          <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={11} />
                          <Tooltip
                            contentStyle={{
                              background: "#0f172a",
                              borderColor: "#1e293b",
                              borderRadius: "8px",
                              color: "#f8fafc",
                            }}
                          />
                          <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="count"
                            stroke="#0d9488"
                            strokeWidth={3}
                            activeDot={{ r: 6 }}
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="totalPremium"
                            stroke="#f59e0b"
                            strokeWidth={2}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-6 text-xs mt-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-0.5 bg-teal-500" />
                        <span>Policies Issued Count (Left Axis)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-0.5 bg-amber-500" />
                        <span>Premium Volume (Right Axis)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "agents" && (
            <motion.div
              key="agents"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Directory Filter / Creation Bar */}
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search agents..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-slate-800 bg-slate-900/30 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500/50"
                    />
                  </div>
                  <div className="flex items-center gap-1 bg-slate-900/40 border border-slate-800 rounded-lg px-3 py-2 text-xs">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <select
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setPage(1);
                      }}
                      className="bg-transparent text-slate-300 font-semibold focus:outline-none cursor-pointer"
                    >
                      <option value="All" className="bg-slate-950">All Statuses</option>
                      <option value="Active" className="bg-slate-950">Active Only</option>
                      <option value="Inactive" className="bg-slate-950">Inactive Only</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="w-full md:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-teal-900/10"
                >
                  <Plus className="w-4 h-4" /> Provision Agent
                </button>
              </div>

              {/* Table Container */}
              <div className="border border-slate-800 rounded-2xl bg-slate-900/20 backdrop-blur-md overflow-hidden">
                {isAgentsLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <Activity className="w-8 h-8 text-teal-400 animate-spin" />
                  </div>
                ) : displayAgents.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-slate-500">
                    <Users className="w-10 h-10 text-slate-700 mb-2" />
                    <p className="text-sm">No agents matching this criteria.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          <th className="py-4 px-6">Full Name</th>
                          <th className="py-4 px-6">Email</th>
                          <th className="py-4 px-6">Customers</th>
                          <th className="py-4 px-6">Policies Issued</th>
                          <th className="py-4 px-6">Status</th>
                          <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50 text-sm">
                        {displayAgents.map((agent: any) => (
                          <tr key={agent._id} className="hover:bg-slate-900/10 transition-colors">
                            <td className="py-4 px-6 font-semibold text-white">{agent.fullName}</td>
                            <td className="py-4 px-6 text-slate-400">{agent.email}</td>
                            <td className="py-4 px-6 text-slate-300">{agent.customersCount}</td>
                            <td className="py-4 px-6 text-slate-300">{agent.policiesCount}</td>
                            <td className="py-4 px-6">
                              {agent.isActive ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 border border-teal-500/20 text-teal-400">
                                  <CheckCircle className="w-3 h-3" /> ACTIVE
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 border border-rose-500/20 text-rose-400">
                                  <XCircle className="w-3 h-3" /> INACTIVE
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-right space-x-2">
                              <button
                                onClick={() => setSelectedAgentId(agent._id)}
                                className="px-3 py-1.5 border border-slate-800 hover:border-slate-700 bg-slate-900/50 hover:bg-slate-900 rounded-lg text-xs font-semibold text-slate-300 transition-colors"
                              >
                                View Stats
                              </button>
                              {agent.isActive && (
                                <button
                                  onClick={() => handleDeactivate(agent._id, agent.fullName)}
                                  className="p-1.5 border border-rose-950/20 bg-rose-950/5 hover:bg-rose-950/10 text-rose-400 rounded-lg transition-colors inline-flex items-center justify-center align-middle"
                                  title="Deactivate Agent"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Pagination controls */}
              {agentsData?.pagination && agentsData.pagination.pages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-800 pt-4">
                  <span className="text-xs text-slate-500">
                    Page {page} of {agentsData.pagination.pages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-2 border border-slate-800 bg-slate-900/40 text-slate-400 rounded-lg disabled:opacity-40"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(agentsData.pagination.pages, p + 1))}
                      disabled={page === agentsData.pagination.pages}
                      className="p-2 border border-slate-800 bg-slate-900/40 text-slate-400 rounded-lg disabled:opacity-40"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* MODALS SECTION */}
      <AnimatePresence>
        {/* Create Agent Modal */}
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md p-6 rounded-2xl border border-slate-800 bg-slate-900 shadow-xl overflow-y-auto max-h-[90vh] z-10"
            >
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400 border border-teal-500/20">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Provision New Agent</h3>
                  <p className="text-[10px] text-slate-400">Generate credentials for field agents.</p>
                </div>
              </div>

              <form onSubmit={handleAgentSubmit(onAgentCreateSubmit)} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Agent Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input
                      {...registerAgent("fullName")}
                      placeholder="Alice Smith"
                      className={`w-full pl-10 pr-4 py-2 text-sm rounded-lg border bg-slate-950/60 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-teal-500/50 ${agentErrors.fullName ? "border-rose-500/60" : "border-slate-800"
                        }`}
                    />
                  </div>
                  {agentErrors.fullName && (
                    <p className="text-rose-400 text-[10px] mt-1">{agentErrors.fullName.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input
                      {...registerAgent("email")}
                      placeholder="alice@insurance.com"
                      className={`w-full pl-10 pr-4 py-2 text-sm rounded-lg border bg-slate-950/60 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-teal-500/50 ${agentErrors.email ? "border-rose-500/60" : "border-slate-800"
                        }`}
                    />
                  </div>
                  {agentErrors.email && (
                    <p className="text-rose-400 text-[10px] mt-1">{agentErrors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Secret Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input
                      {...registerAgent("password")}
                      type="password"
                      placeholder="••••••••"
                      className={`w-full pl-10 pr-4 py-2 text-sm rounded-lg border bg-slate-950/60 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-teal-500/50 ${agentErrors.password ? "border-rose-500/60" : "border-slate-800"
                        }`}
                    />
                  </div>
                  {agentErrors.password && (
                    <p className="text-rose-400 text-[10px] mt-1">{agentErrors.password.message}</p>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="flex-1 py-2 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900 text-slate-400 hover:text-white font-semibold text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createAgentMutation.isPending}
                    className="flex-1 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-teal-900/15"
                  >
                    {createAgentMutation.isPending ? (
                      <Activity className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      "Create Account"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* View Profile / Stats Modal */}
        {selectedAgentId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAgentId(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md p-6 rounded-2xl border border-slate-800 bg-slate-900 shadow-xl z-10"
            >
              {isProfileLoading ? (
                <div className="h-48 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-teal-400 animate-spin" />
                </div>
              ) : profileData ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 font-bold">
                      {profileData.agent.fullName[0].toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base">{profileData.agent.fullName}</h3>
                      <p className="text-xs text-slate-400">{profileData.agent.email}</p>
                    </div>
                  </div>

                  <div className="h-[1px] bg-slate-800" />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1">
                        Customers Onboarded
                      </p>
                      <h4 className="text-xl font-extrabold text-white">
                        {profileData.summary.customersCount}
                      </h4>
                    </div>
                    <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1">
                        Policies Issued
                      </p>
                      <h4 className="text-xl font-extrabold text-white">
                        {profileData.summary.policiesCount}
                      </h4>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-teal-950/20 bg-teal-950/5 flex justify-between items-center text-xs">
                    <span className="text-slate-400">Account status:</span>
                    {profileData.agent.isActive ? (
                      <span className="text-teal-400 font-bold">ACTIVE</span>
                    ) : (
                      <span className="text-rose-400 font-bold">INACTIVE</span>
                    )}
                  </div>

                  <button
                    onClick={() => setSelectedAgentId(null)}
                    className="w-full py-2 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900 text-slate-400 hover:text-white font-semibold text-xs transition-colors"
                  >
                    Close Profile
                  </button>
                </div>
              ) : (
                <div className="text-center text-xs text-slate-500 py-6">
                  Failed to fetch agent profile.
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
