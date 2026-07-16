"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../components/auth-provider";
import { useToast } from "../../../components/toast";
import { useTheme } from "../../../components/theme-provider";
import api from "../../../lib/axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User,
  Users,
  Search,
  UserPlus,
  FilePlus,
  LogOut,
  Sun,
  Moon,
  ChevronRight,
  Calculator,
  Calendar,
  AlertTriangle,
  FolderOpen,
  Mail,
  Activity,
  Edit,
  Eye,
  CreditCard,
  Keyboard,
  ShieldCheck,
  CheckCircle,
  HelpCircle,
  FileText
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CustomerSchema, CustomerInput, calculatePremium, calculateAge } from "shared";
import PolicyWizard from "../../../components/policy-wizard";
import CommandPalette from "../../../components/command-palette";

interface Customer {
  _id: string;
  fullName: string;
  email: string;
  mobile: string;
  dob: string;
  aadhaar: string;
  pan?: string;
  nomineeName: string;
  nomineeRelation: string;
}

export default function AgentDashboard() {
  const { user, loading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Search and tabs
  const [customerSearch, setCustomerSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"calculator" | "policies">("calculator");

  // Modals state
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedCustForWizard, setSelectedCustForWizard] = useState<Customer | null>(null);
  const [selectedCustForEdit, setSelectedCustForEdit] = useState<Customer | null>(null);
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);

  // Quick Calculator inputs
  const [calcSumAssured, setCalcSumAssured] = useState<number>(200000);
  const [calcTerm, setCalcTerm] = useState<10 | 15 | 20 | 25 | 30>(15);
  const [calcFrequency, setCalcFrequency] = useState<"Monthly" | "Quarterly" | "Half-Yearly" | "Yearly">("Yearly");
  const [calcDob, setCalcDob] = useState("1995-01-01");

  // Keyboard shortcut listener for Command Palette (⌘K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Route guards
  useEffect(() => {
    if (!loading && (!user || user.role !== "Agent")) {
      router.push("/agent/login");
    }
  }, [user, loading, router]);

  // Queries
  const { data: customersData, isLoading: isCustomersLoading } = useQuery({
    queryKey: ["customers", customerSearch],
    queryFn: async () => {
      const res = await api.get(`/customers/search?q=${customerSearch}`);
      return res.data.data;
    },
    enabled: !!user && user.role === "Agent",
  });

  const { data: customerPoliciesData, isLoading: isPoliciesLoading } = useQuery({
    queryKey: ["customerPolicies", viewCustomer?._id],
    queryFn: async () => {
      const res = await api.get(`/policies/customer/${viewCustomer?._id}`);
      return res.data.data;
    },
    enabled: !!viewCustomer,
  });

  // Customer Form Setup
  const {
    register: registerCustomer,
    handleSubmit: handleCustomerSubmit,
    reset: resetCustomerForm,
    setValue: setCustomerValue,
    formState: { errors: customerErrors },
  } = useForm<CustomerInput>({
    resolver: zodResolver(CustomerSchema),
  });

  // Create Customer Mutation
  const createCustomerMutation = useMutation({
    mutationFn: async (data: CustomerInput) => {
      const res = await api.post("/customers", data);
      return res.data.data;
    },
    onSuccess: (newCustomer) => {
      toast("Customer onboarded successfully.", "success", "Customer Onboarded");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setIsCreateOpen(false);
      resetCustomerForm();
      // Ask agent if they want to launch wizard immediately!
      if (confirm(`Do you want to issue a policy for ${newCustomer.fullName} now?`)) {
        setSelectedCustForWizard(newCustomer);
        setIsWizardOpen(true);
      }
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || "Deduplication conflict: Aadhaar or PAN already exists.";
      toast(msg, "error", "Registration Failed");
    },
  });

  // Edit Customer Mutation (Optimistic Cache updates)
  const editCustomerMutation = useMutation({
    mutationFn: async (data: CustomerInput & { id: string }) => {
      const { id, ...body } = data;
      const res = await api.put(`/customers/${id}`, body);
      return res.data.data;
    },
    onMutate: async (updatedCust) => {
      await queryClient.cancelQueries({ queryKey: ["customers", customerSearch] });
      const previousCustomers = queryClient.getQueryData(["customers", customerSearch]);

      queryClient.setQueryData(["customers", customerSearch], (old: any) => {
        if (!old) return old;
        return old.map((c: any) => (c._id === updatedCust.id ? { ...c, ...updatedCust } : c));
      });

      return { previousCustomers };
    },
    onError: (err: any, updatedCust, context) => {
      if (context?.previousCustomers) {
        queryClient.setQueryData(["customers", customerSearch], context.previousCustomers);
      }
      const msg = err.response?.data?.error?.message || "Failed to update profile.";
      toast(msg, "error", "Update Failed");
    },
    onSuccess: () => {
      toast("Customer profile updated successfully.", "success", "Profile Updated");
      setIsEditOpen(false);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });

  const onCustomerCreateSubmit = (data: CustomerInput) => {
    createCustomerMutation.mutate(data);
  };

  const onCustomerEditSubmit = (data: CustomerInput) => {
    if (selectedCustForEdit) {
      editCustomerMutation.mutate({ ...data, id: selectedCustForEdit._id });
    }
  };

  const handleEditClick = (cust: Customer) => {
    setSelectedCustForEdit(cust);
    setCustomerValue("fullName", cust.fullName);
    setCustomerValue("email", cust.email);
    setCustomerValue("mobile", cust.mobile);
    setCustomerValue("dob", cust.dob.split("T")[0]);
    setCustomerValue("aadhaar", cust.aadhaar);
    setCustomerValue("pan", cust.pan || "");
    setCustomerValue("nomineeName", cust.nomineeName);
    setCustomerValue("nomineeRelation", cust.nomineeRelation);
    setIsEditOpen(true);
  };

  const handleCommandPaletteAction = (actionId: string) => {
    switch (actionId) {
      case "search-customer":
        document.getElementById("customer-search-input")?.focus();
        break;
      case "new-customer":
        setIsCreateOpen(true);
        break;
      case "issue-policy":
        setSelectedCustForWizard(null);
        setIsWizardOpen(true);
        break;
      case "calculator":
        setActiveTab("calculator");
        break;
    }
  };

  // Run Calculator locally
  const calculatorAge = calculateAge(calcDob);
  const calculatorQuote = calculatePremium(calcSumAssured, calcTerm, calcFrequency, calcDob);
  console.log("DEBUG INSIDE COMPONENT - inputs:", { calcSumAssured, calcTerm, calcFrequency, calcDob }, "quote:", calculatorQuote);

  if (loading || !user || user.role !== "Agent") {
    return (
      <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center text-slate-100">
        <Activity className="w-10 h-10 text-sky-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080c16] text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/40 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-45">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-extrabold shadow-lg shadow-sky-500/20">
            IF
          </div>
          <div>
            <span className="font-extrabold text-white text-lg tracking-tight">InsureFlow</span>
            <span className="text-[10px] bg-sky-500/10 border border-sky-500/20 text-sky-400 font-semibold px-2 py-0.5 rounded-full ml-2">
              AGENT
            </span>
          </div>
        </div>

        {/* Global Search command hint */}
        <div
          onClick={() => setIsPaletteOpen(true)}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950/40 text-xs text-slate-500 cursor-pointer hover:border-slate-700 transition-colors w-64 justify-between"
        >
          <span className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-500" /> Search portal actions...
          </span>
          <span className="flex items-center gap-1 text-[9px] font-bold border border-slate-800 px-1 py-0.5 rounded bg-slate-900">
            <Keyboard className="w-2.5 h-2.5" /> ⌘K
          </span>
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

      {/* Main Grid Content */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Customers List */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-400" /> Onboarded Customers
            </h2>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-lg shadow-sky-900/10"
            >
              <UserPlus className="w-4 h-4" /> Onboard Customer
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
            <input
              id="customer-search-input"
              type="text"
              placeholder="Search customers by Name, Aadhaar, PAN, Mobile..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-800 bg-slate-900/30 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500/50 transition-all"
            />
          </div>

          {/* Roster Card wrapper */}
          <div className="border border-slate-800 rounded-2xl bg-slate-900/20 backdrop-blur-md overflow-hidden flex-1 min-h-[400px] flex flex-col">
            {isCustomersLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Activity className="w-8 h-8 text-sky-400 animate-spin" />
              </div>
            ) : !customersData || customersData.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                <FolderOpen className="w-10 h-10 text-slate-700 mb-2" />
                <p className="text-sm">No onboarded customers found.</p>
                <p className="text-[10px] text-slate-600 mt-1">Start by onboarding your first client.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-850">
                {customersData.map((cust: Customer) => (
                  <div
                    key={cust._id}
                    className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-slate-900/10 transition-colors"
                  >
                    <div>
                      <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                        {cust.fullName}{" "}
                        {cust.pan ? (
                          <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5 rounded">
                            PAN
                          </span>
                        ) : (
                          <span className="text-[9px] bg-slate-500/10 border border-slate-500/20 text-slate-500 font-bold px-1.5 py-0.5 rounded">
                            NO PAN
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Email: {cust.email} &bull; Mobile: {cust.mobile} &bull; Aadhaar: {cust.aadhaar}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Nominee: {cust.nomineeName} ({cust.nomineeRelation})
                      </p>
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => setViewCustomer(cust)}
                        className="flex-1 sm:flex-initial p-1.5 border border-slate-800 hover:border-slate-700 bg-slate-900/50 hover:bg-slate-900 rounded-lg text-slate-300 inline-flex items-center justify-center align-middle"
                        title="View Policies History"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleEditClick(cust)}
                        className="flex-1 sm:flex-initial p-1.5 border border-slate-800 hover:border-slate-700 bg-slate-900/50 hover:bg-slate-900 rounded-lg text-slate-300 inline-flex items-center justify-center align-middle"
                        title="Edit Customer Profile"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedCustForWizard(cust);
                          setIsWizardOpen(true);
                        }}
                        className="flex-2 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 bg-sky-950/20 border border-sky-500/25 hover:bg-sky-950/40 text-sky-400 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <FilePlus className="w-3.5 h-3.5" /> Issue
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Premium Calculator Widget */}
        <div className="flex flex-col gap-5">
          <div className="flex border-b border-slate-800">
            <button
              onClick={() => setActiveTab("calculator")}
              className={`flex-1 py-2.5 font-bold text-xs uppercase tracking-wider transition-all relative ${
                activeTab === "calculator" ? "text-sky-400" : "text-slate-400 hover:text-white"
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <Calculator className="w-3.5 h-3.5" /> Live Quote Engine
              </div>
              {activeTab === "calculator" && (
                <motion.div layoutId="rightTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-400" />
              )}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "calculator" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-5 border border-slate-800 rounded-2xl bg-slate-900/30 backdrop-blur-md flex flex-col gap-4"
              >
                <div className="space-y-4">
                  {/* DOB Selection */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Client Date of Birth
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                      <input
                        type="date"
                        value={calcDob}
                        onChange={(e) => setCalcDob(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-xs rounded-lg border border-slate-800 bg-slate-950/60 text-white focus:outline-none focus:ring-1 focus:ring-sky-500/50"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">Calculated Age: {calculatorAge} Years</span>
                  </div>

                  {/* Sum Assured */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Sum Assured (Coverage)
                      </label>
                      <span className="text-xs font-bold text-sky-400">₹{calcSumAssured.toLocaleString()}</span>
                    </div>
                    <input
                      type="range"
                      min={50000}
                      max={1000000}
                      step={25000}
                      value={calcSumAssured}
                      onChange={(e) => setCalcSumAssured(Number(e.target.value))}
                      className="w-full accent-sky-500"
                    />
                  </div>

                  {/* Term */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Policy Term
                    </label>
                    <div className="grid grid-cols-5 gap-1">
                      {([10, 15, 20, 25, 30] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setCalcTerm(t)}
                          className={`py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                            calcTerm === t
                              ? "border-sky-500 bg-sky-950/20 text-sky-300"
                              : "border-slate-800 bg-slate-950/20 text-slate-500 hover:text-white"
                          }`}
                        >
                          {t}Y
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Frequency */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Installment Frequency
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["Monthly", "Quarterly", "Half-Yearly", "Yearly"] as const).map((freq) => (
                        <button
                          key={freq}
                          type="button"
                          onClick={() => setCalcFrequency(freq)}
                          className={`py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                            calcFrequency === freq
                              ? "border-sky-500 bg-sky-950/20 text-sky-300"
                              : "border-slate-800 bg-slate-950/20 text-slate-500 hover:text-white"
                          }`}
                        >
                          {freq}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="h-[1px] bg-slate-800 my-2" />

                {/* Estimated Premium box */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      Est. Premium Quote
                    </p>
                    <p className="text-[10px] text-slate-400">({calcFrequency} installment)</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-extrabold text-sky-400 animate-pulseCheck">
                      ₹{calculatorQuote.totalPremium.toLocaleString()}
                    </p>
                    <p className="text-[9px] text-slate-600">Includes 18% GST</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedCustForWizard(null);
                    setIsWizardOpen(true);
                  }}
                  className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-sky-900/10"
                >
                  Onboard with this Quote <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* DRAWERS & MODALS FOR AGENTS */}
      <AnimatePresence>
        {/* Create Customer Drawer Modal */}
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
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg p-6 rounded-2xl border border-slate-800 bg-slate-900 shadow-xl overflow-y-auto max-h-[90vh] z-10"
            >
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400 border border-sky-500/20">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Onboard Customer</h3>
                  <p className="text-[10px] text-slate-400">Validate PII credentials to create client record.</p>
                </div>
              </div>

              <form onSubmit={handleCustomerSubmit(onCustomerCreateSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Full Name
                    </label>
                    <input
                      {...registerCustomer("fullName")}
                      placeholder="Jane Miller"
                      className={`w-full p-2.5 text-xs rounded-lg border bg-slate-950/60 text-white focus:outline-none focus:ring-1 focus:ring-sky-500/50 ${
                        customerErrors.fullName ? "border-rose-500/60" : "border-slate-800"
                      }`}
                    />
                    {customerErrors.fullName && (
                      <p className="text-rose-400 text-[10px] mt-1">{customerErrors.fullName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Email Address
                    </label>
                    <input
                      {...registerCustomer("email")}
                      placeholder="jane@example.com"
                      className={`w-full p-2.5 text-xs rounded-lg border bg-slate-950/60 text-white focus:outline-none focus:ring-1 focus:ring-sky-500/50 ${
                        customerErrors.email ? "border-rose-500/60" : "border-slate-800"
                      }`}
                    />
                    {customerErrors.email && (
                      <p className="text-rose-400 text-[10px] mt-1">{customerErrors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Mobile Number
                    </label>
                    <input
                      {...registerCustomer("mobile")}
                      placeholder="9876543210"
                      className={`w-full p-2.5 text-xs rounded-lg border bg-slate-950/60 text-white focus:outline-none focus:ring-1 focus:ring-sky-500/50 ${
                        customerErrors.mobile ? "border-rose-500/60" : "border-slate-800"
                      }`}
                    />
                    {customerErrors.mobile && (
                      <p className="text-rose-400 text-[10px] mt-1">{customerErrors.mobile.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Date of Birth
                    </label>
                    <input
                      {...registerCustomer("dob")}
                      type="date"
                      className={`w-full p-2.5 text-xs rounded-lg border bg-slate-950/60 text-white focus:outline-none focus:ring-1 focus:ring-sky-500/50 ${
                        customerErrors.dob ? "border-rose-500/60" : "border-slate-800"
                      }`}
                    />
                    {customerErrors.dob && (
                      <p className="text-rose-400 text-[10px] mt-1">{customerErrors.dob.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Aadhaar Number (12 digits)
                    </label>
                    <input
                      {...registerCustomer("aadhaar")}
                      placeholder="123456789012"
                      className={`w-full p-2.5 text-xs rounded-lg border bg-slate-950/60 text-white focus:outline-none focus:ring-1 focus:ring-sky-500/50 ${
                        customerErrors.aadhaar ? "border-rose-500/60" : "border-slate-800"
                      }`}
                    />
                    {customerErrors.aadhaar && (
                      <p className="text-rose-400 text-[10px] mt-1">{customerErrors.aadhaar.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      PAN Card (Optional)
                    </label>
                    <input
                      {...registerCustomer("pan")}
                      placeholder="ABCDE1234F"
                      className={`w-full p-2.5 text-xs rounded-lg border bg-slate-950/60 text-white focus:outline-none focus:ring-1 focus:ring-sky-500/50 ${
                        customerErrors.pan ? "border-rose-500/60" : "border-slate-800"
                      }`}
                    />
                    {customerErrors.pan && (
                      <p className="text-rose-400 text-[10px] mt-1">{customerErrors.pan.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Nominee Name
                    </label>
                    <input
                      {...registerCustomer("nomineeName")}
                      placeholder="John Miller"
                      className={`w-full p-2.5 text-xs rounded-lg border bg-slate-950/60 text-white focus:outline-none focus:ring-1 focus:ring-sky-500/50 ${
                        customerErrors.nomineeName ? "border-rose-500/60" : "border-slate-800"
                      }`}
                    />
                    {customerErrors.nomineeName && (
                      <p className="text-rose-400 text-[10px] mt-1">{customerErrors.nomineeName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Nominee Relation
                    </label>
                    <input
                      {...registerCustomer("nomineeRelation")}
                      placeholder="Spouse"
                      className={`w-full p-2.5 text-xs rounded-lg border bg-slate-950/60 text-white focus:outline-none focus:ring-1 focus:ring-sky-500/50 ${
                        customerErrors.nomineeRelation ? "border-rose-500/60" : "border-slate-800"
                      }`}
                    />
                    {customerErrors.nomineeRelation && (
                      <p className="text-rose-400 text-[10px] mt-1">{customerErrors.nomineeRelation.message}</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="flex-1 py-2.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white font-semibold text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createCustomerMutation.isPending}
                    className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-sky-900/10"
                  >
                    {createCustomerMutation.isPending ? (
                      <Activity className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      "Register Customer"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Edit Customer Drawer Modal */}
        {isEditOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg p-6 rounded-2xl border border-slate-800 bg-slate-900 shadow-xl overflow-y-auto max-h-[90vh] z-10"
            >
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400 border border-sky-500/20">
                  <Edit className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Edit Profile</h3>
                  <p className="text-[10px] text-slate-400">Update customer parameters securely.</p>
                </div>
              </div>

              <form onSubmit={handleCustomerSubmit(onCustomerEditSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Full Name
                    </label>
                    <input
                      {...registerCustomer("fullName")}
                      className="w-full p-2.5 text-xs rounded-lg border bg-slate-950/60 text-white focus:outline-none border-slate-800"
                    />
                    {customerErrors.fullName && (
                      <p className="text-rose-400 text-[10px] mt-1">{customerErrors.fullName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Email Address
                    </label>
                    <input
                      {...registerCustomer("email")}
                      className="w-full p-2.5 text-xs rounded-lg border bg-slate-950/60 text-white focus:outline-none border-slate-800"
                    />
                    {customerErrors.email && (
                      <p className="text-rose-400 text-[10px] mt-1">{customerErrors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Mobile Number
                    </label>
                    <input
                      {...registerCustomer("mobile")}
                      className="w-full p-2.5 text-xs rounded-lg border bg-slate-950/60 text-white focus:outline-none border-slate-800"
                    />
                    {customerErrors.mobile && (
                      <p className="text-rose-400 text-[10px] mt-1">{customerErrors.mobile.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Date of Birth
                    </label>
                    <input
                      {...registerCustomer("dob")}
                      type="date"
                      className="w-full p-2.5 text-xs rounded-lg border bg-slate-950/60 text-white focus:outline-none border-slate-800"
                    />
                    {customerErrors.dob && (
                      <p className="text-rose-400 text-[10px] mt-1">{customerErrors.dob.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Aadhaar Number
                    </label>
                    <input
                      {...registerCustomer("aadhaar")}
                      className="w-full p-2.5 text-xs rounded-lg border bg-slate-950/60 text-white focus:outline-none border-slate-800"
                    />
                    {customerErrors.aadhaar && (
                      <p className="text-rose-400 text-[10px] mt-1">{customerErrors.aadhaar.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      PAN Card (Optional)
                    </label>
                    <input
                      {...registerCustomer("pan")}
                      placeholder="ABCDE1234F"
                      className="w-full p-2.5 text-xs rounded-lg border bg-slate-950/60 text-white focus:outline-none border-slate-800"
                    />
                    {customerErrors.pan && (
                      <p className="text-rose-400 text-[10px] mt-1">{customerErrors.pan.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Nominee Name
                    </label>
                    <input
                      {...registerCustomer("nomineeName")}
                      className="w-full p-2.5 text-xs rounded-lg border bg-slate-950/60 text-white focus:outline-none border-slate-800"
                    />
                    {customerErrors.nomineeName && (
                      <p className="text-rose-400 text-[10px] mt-1">{customerErrors.nomineeName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Nominee Relation
                    </label>
                    <input
                      {...registerCustomer("nomineeRelation")}
                      className="w-full p-2.5 text-xs rounded-lg border bg-slate-950/60 text-white focus:outline-none border-slate-800"
                    />
                    {customerErrors.nomineeRelation && (
                      <p className="text-rose-400 text-[10px] mt-1">{customerErrors.nomineeRelation.message}</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(false)}
                    className="flex-1 py-2.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white font-semibold text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editCustomerMutation.isPending}
                    className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-sky-900/10"
                  >
                    {editCustomerMutation.isPending ? (
                      <Activity className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      "Save Changes"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* View Customer Details and Policies Modal */}
        {viewCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewCustomer(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-xl p-6 rounded-2xl border border-slate-800 bg-slate-900 shadow-xl max-h-[85vh] overflow-y-auto z-10"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 font-bold">
                    {viewCustomer.fullName[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">{viewCustomer.fullName}</h3>
                    <p className="text-xs text-slate-400">Mobile: {viewCustomer.mobile} &bull; DOB: {viewCustomer.dob.split("T")[0]}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setViewCustomer(null);
                    setSelectedCustForWizard(viewCustomer);
                    setIsWizardOpen(true);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  <FilePlus className="w-3.5 h-3.5" /> Issue Policy
                </button>
              </div>

              {/* Customer summary */}
              <div className="grid grid-cols-2 gap-4 text-xs mb-6">
                <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Aadhaar</span>
                  <span className="font-semibold text-slate-200">{viewCustomer.aadhaar}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">PAN Card</span>
                  <span className="font-semibold text-slate-200">{viewCustomer.pan || "Not Registered"}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800 col-span-2 flex justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Nominee Name</span>
                    <span className="font-semibold text-slate-200">{viewCustomer.nomineeName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Relation</span>
                    <span className="font-semibold text-slate-200">{viewCustomer.nomineeRelation}</span>
                  </div>
                </div>
              </div>

              <div className="h-[1px] bg-slate-800 my-4" />

              {/* Policies List */}
              <div>
                <h4 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-sky-400" /> Active Contracts
                </h4>
                {isPoliciesLoading ? (
                  <div className="py-8 text-center text-xs text-slate-500 flex justify-center items-center gap-1.5">
                    <Activity className="w-4 h-4 text-sky-400 animate-spin" /> Fetching ledger...
                  </div>
                ) : !customerPoliciesData || customerPoliciesData.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                    No insurance policies registered to this customer.
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {customerPoliciesData.map((pol: any) => (
                      <div
                        key={pol._id}
                        className="p-4 rounded-xl border border-slate-800 bg-slate-950/30 flex justify-between items-center text-xs"
                      >
                        <div>
                          <p className="font-bold text-white font-mono tracking-wider">{pol.policyNumber}</p>
                          <p className="text-slate-400 mt-1">
                            Sum Assured: <span className="text-sky-400 font-bold">₹{pol.sumAssured.toLocaleString()}</span> &bull; Term: {pol.term}Y
                          </p>
                          <p className="text-slate-500 text-[10px] mt-0.5">Start Date: {pol.startDate.split("T")[0]}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-white">₹{pol.premiumAmount.toLocaleString()}</p>
                          <span className="inline-block mt-1 text-[9px] bg-teal-500/10 border border-teal-500/20 text-teal-400 font-bold px-1.5 py-0.5 rounded-full">
                            {pol.premiumFrequency.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setViewCustomer(null)}
                className="w-full py-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white font-semibold text-xs transition-colors mt-6"
              >
                Close History
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* POLICY WIZARD WRAPPER */}
      <PolicyWizard
        isOpen={isWizardOpen}
        onClose={() => {
          setIsWizardOpen(false);
          setSelectedCustForWizard(null);
        }}
        preselectedCustomer={selectedCustForWizard}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["customers"] });
        }}
      />

      {/* COMMAND PALETTE OVERLAY */}
      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        onTriggerAction={handleCommandPaletteAction}
      />
    </div>
  );
}
