"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { calculatePremium, calculateAge } from "shared";
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Search,
  UserCheck,
  FileSpreadsheet,
  IndianRupee,
  CheckCircle,
  AlertTriangle,
  Activity,
  X
} from "lucide-react";
import api from "../lib/axios";
import { useToast } from "./toast";

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

interface PolicyWizardProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedCustomer: Customer | null;
  onSuccess: () => void;
}

export default function PolicyWizard({
  isOpen,
  onClose,
  preselectedCustomer,
  onSuccess,
}: PolicyWizardProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);

  // Form States
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Policy Fields
  const [term, setTerm] = useState<10 | 15 | 20 | 25 | 30>(15);
  const [frequency, setFrequency] = useState<"Monthly" | "Quarterly" | "Half-Yearly" | "Yearly">("Yearly");
  const [sumAssured, setSumAssured] = useState<number>(200000);
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    today.setDate(today.getDate() + 1); // tomorrow as default
    return today.toISOString().split("T")[0];
  });

  const [issueLoading, setIssueLoading] = useState(false);
  const [issuedPolicyNumber, setIssuedPolicyNumber] = useState<string | null>(null);

  // Load preselected customer if present
  useEffect(() => {
    if (preselectedCustomer) {
      setSelectedCustomer(preselectedCustomer);
      setStep(2); // Jump directly to policy details
    } else {
      setSelectedCustomer(null);
      setStep(1);
    }
  }, [preselectedCustomer, isOpen]);

  // Search customers query
  useEffect(() => {
    if (step === 1 && searchQuery.trim().length > 1) {
      const delayDebounce = setTimeout(async () => {
        setIsSearching(true);
        try {
          const res = await api.get(`/customers/search?q=${searchQuery}`);
          if (res.data.success) {
            setCustomersList(res.data.data);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setIsSearching(false);
        }
      }, 300);
      return () => clearTimeout(delayDebounce);
    } else if (searchQuery.trim().length === 0) {
      setCustomersList([]);
    }
  }, [searchQuery, step]);

  if (!isOpen) return null;

  // Premium Calculations
  const age = selectedCustomer ? calculateAge(selectedCustomer.dob) : 30;
  const quote = selectedCustomer
    ? calculatePremium(sumAssured, term, frequency, selectedCustomer.dob)
    : { basePremium: 0, ageLoad: 0, termDiscount: 0, frequencyPremium: 0, gstAmount: 0, totalPremium: 0 };

  // Rule check: PAN is mandatory if premium > ₹50,000
  // Wait, is it base premium or total premium? The prompt states "PAN is mandatory if premium > ₹50,000".
  // Let's enforce it on the final premium amount that the policyholder pays per year.
  // Actually, standard is to base it on either raw premium or total annual premium. Checking quote.frequencyPremium or quote.totalPremium.
  // Let's check quote.frequencyPremium (amount of the premium frequency, or totalPremium). To be extremely safe, if totalPremium > 50000, PAN check is active.
  const isPanRequired = quote.totalPremium > 50000;
  const isPanMissing = isPanRequired && (!selectedCustomer?.pan || selectedCustomer.pan.trim() === "");

  const handleNext = () => {
    if (step === 1 && !selectedCustomer) {
      toast("Please select a customer first.", "error", "Selection Required");
      return;
    }
    if (step === 2) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      if (start < today) {
        toast("Policy start date cannot be in the past.", "error", "Invalid Date");
        return;
      }
    }
    if (step === 3 && isPanMissing) {
      toast(
        "PAN is mandatory for policy premiums exceeding ₹50,000. Please add PAN to customer profile first.",
        "error",
        "Constraint Blocked"
      );
      return;
    }
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (preselectedCustomer && step === 2) {
      onClose();
    } else {
      setStep((s) => s - 1);
    }
  };

  const handleIssuePolicy = async () => {
    if (!selectedCustomer) return;
    setIssueLoading(true);
    try {
      const res = await api.post("/policies/issue", {
        customerId: selectedCustomer._id,
        term,
        premiumFrequency: frequency,
        premiumAmount: quote.frequencyPremium,
        sumAssured,
        startDate,
      });

      if (res.data.success && res.data.data.policyNumber) {
        setIssuedPolicyNumber(res.data.data.policyNumber);
        setStep(5); // Success step
        toast("Insurance Policy issued successfully.", "success", "Policy Issued");
        onSuccess();
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || "Failed to issue policy.";
      toast(errMsg, "error", "Issuance Failed");
    } finally {
      setIssueLoading(false);
    }
  };

  const stepsHeader = [
    { num: 1, label: "Verification" },
    { num: 2, label: "Details" },
    { num: 3, label: "Calculation" },
    { num: 4, label: "Review" },
    { num: 5, label: "Confirm" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Background overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-xl p-6 rounded-2xl border border-slate-800 bg-slate-900 shadow-xl overflow-hidden z-10"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-slate-900 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Step Progress Bar */}
        <div className="flex items-center justify-between mb-8 border-b border-slate-800/60 pb-5 pr-8">
          {stepsHeader.map((s, idx) => (
            <div key={s.num} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs border transition-all ${
                  step >= s.num
                    ? "bg-sky-500 border-sky-500 text-slate-950 shadow-md shadow-sky-500/10"
                    : "border-slate-800 text-slate-500 bg-slate-950/20"
                }`}
              >
                {step > s.num ? <Check className="w-3.5 h-3.5" /> : s.num}
              </div>
              <span
                className={`text-xs hidden sm:inline ${
                  step === s.num ? "text-white font-semibold" : "text-slate-500"
                }`}
              >
                {s.label}
              </span>
              {idx < stepsHeader.length - 1 && (
                <div
                  className={`h-[1px] w-5 border-t border-dashed hidden sm:block ${
                    step > s.num ? "border-sky-500/50" : "border-slate-800"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Content Wizard Steps */}
        <div className="min-h-[280px]">
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <h3 className="font-bold text-white text-base">Verify Customer Identity</h3>
              <p className="text-xs text-slate-400">
                Search Aadhaar, PAN, or Name to associate this policy with an existing customer record.
              </p>

              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Enter Name, Aadhaar, or PAN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-slate-800 bg-slate-950/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500/50"
                />
              </div>

              <div className="border border-slate-800/80 rounded-xl bg-slate-950/40 p-2 max-h-48 overflow-y-auto space-y-1">
                {isSearching ? (
                  <div className="py-8 text-center text-xs text-slate-500 flex justify-center items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-sky-400 animate-spin" /> Querying index...
                  </div>
                ) : customersList.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No customers found. Try typing a query.
                  </div>
                ) : (
                  customersList.map((cust) => (
                    <div
                      key={cust._id}
                      onClick={() => setSelectedCustomer(cust)}
                      className={`p-3 rounded-lg flex items-center justify-between cursor-pointer border hover:bg-slate-900/40 transition-colors ${
                        selectedCustomer?._id === cust._id
                          ? "border-sky-500 bg-sky-950/10 text-sky-200"
                          : "border-transparent text-slate-300"
                      }`}
                    >
                      <div className="text-left">
                        <p className="text-xs font-bold">{cust.fullName}</p>
                        <p className="text-[10px] text-slate-500">
                          Aadhaar: {cust.aadhaar} &bull; Nominee: {cust.nomineeName}
                        </p>
                      </div>
                      {selectedCustomer?._id === cust._id && <CheckCircle className="w-4 h-4 text-sky-400" />}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {step === 2 && selectedCustomer && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <h3 className="font-bold text-white text-base">Enter Policy Details</h3>
              <p className="text-xs text-slate-400">
                Configure policy term and premium frequency for{" "}
                <span className="text-sky-400 font-bold">{selectedCustomer.fullName}</span> (Age: {age}).
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Policy Term (Years)
                  </label>
                  <select
                    value={term}
                    onChange={(e) => setTerm(Number(e.target.value) as any)}
                    className="w-full p-2.5 text-xs rounded-lg border border-slate-800 bg-slate-950/60 text-white focus:outline-none focus:ring-1 focus:ring-sky-500/50"
                  >
                    <option value={10}>10 Years</option>
                    <option value={15}>15 Years</option>
                    <option value={20}>20 Years</option>
                    <option value={25}>25 Years</option>
                    <option value={30}>30 Years</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Premium Frequency
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className="w-full p-2.5 text-xs rounded-lg border border-slate-800 bg-slate-950/60 text-white focus:outline-none focus:ring-1 focus:ring-sky-500/50"
                  >
                    <option value="Yearly">Yearly</option>
                    <option value="Half-Yearly">Half-Yearly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Sum Assured (₹)
                  </label>
                  <div className="flex gap-4 items-center">
                    <input
                      type="range"
                      min={50000}
                      max={1000000}
                      step={25000}
                      value={sumAssured}
                      onChange={(e) => setSumAssured(Number(e.target.value))}
                      className="flex-1 accent-sky-500"
                    />
                    <span className="w-24 text-right text-xs font-bold text-sky-400 bg-sky-950/20 border border-sky-500/25 px-2.5 py-1.5 rounded-lg">
                      ₹{sumAssured.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Policy Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-lg border border-slate-800 bg-slate-950/60 text-white focus:outline-none focus:ring-1 focus:ring-sky-500/50"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && selectedCustomer && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <h3 className="font-bold text-white text-base">Premium Calculations</h3>
              <p className="text-xs text-slate-400">
                Computed premium quote based on selected parameters (18% GST applied).
              </p>

              {/* Premium Breakdown display */}
              <div className="p-5 rounded-2xl border border-slate-800 bg-slate-950/50 space-y-3.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Base Premium (Pro-rata):</span>
                  <span className="font-semibold">₹{quote.basePremium.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Age Loading Charge:</span>
                  <span className="font-semibold text-rose-400">+{quote.ageLoad}%</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Long-term Discount:</span>
                  <span className="font-semibold text-emerald-400">-{quote.termDiscount}%</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">GST (18%):</span>
                  <span className="font-semibold text-slate-300">₹{quote.gstAmount.toLocaleString()}</span>
                </div>
                <div className="h-[1px] bg-slate-800" />
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-white">Total Premium ({frequency}):</span>
                  <span className="text-sky-400 text-lg">₹{quote.totalPremium.toLocaleString()}</span>
                </div>
              </div>

              {/* Constraint Warn Box if PAN missing */}
              {isPanMissing && (
                <div className="p-3.5 rounded-xl border border-rose-950 bg-rose-950/20 text-rose-200 flex items-start gap-2.5 text-xs">
                  <AlertTriangle className="w-5 h-5 text-rose-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-bold">PAN is Mandatory:</span>
                    <p className="opacity-90 leading-relaxed mt-0.5">
                      Because the total premium exceeds ₹50,000, you cannot proceed. Please edit the customer profile and register a valid PAN first.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {step === 4 && selectedCustomer && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <h3 className="font-bold text-white text-base">Review & Sign</h3>
              <p className="text-xs text-slate-400">
                Please double check all policy settings before issuing contract.
              </p>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                    Policyholder
                  </p>
                  <p className="font-bold text-white">{selectedCustomer.fullName}</p>
                  <p className="text-slate-400 text-[10px] mt-0.5">Mobile: {selectedCustomer.mobile}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                    Nominee
                  </p>
                  <p className="font-bold text-white">{selectedCustomer.nomineeName}</p>
                  <p className="text-slate-400 text-[10px] mt-0.5">Relation: {selectedCustomer.nomineeRelation}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                    Sum Assured
                  </p>
                  <p className="font-bold text-sky-400">₹{sumAssured.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                    Term / Frequency
                  </p>
                  <p className="font-bold text-white">
                    {term} Years &bull; {frequency}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 col-span-2 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      Premium Amount
                    </p>
                    <p className="font-bold text-white">₹{quote.frequencyPremium.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      Start Date
                    </p>
                    <p className="font-bold text-white">{startDate}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-10 space-y-4"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
                <Check className="w-8 h-8 animate-pulseCheck" />
              </div>
              <h3 className="font-extrabold text-white text-lg">Policy Issued Successfully!</h3>
              <div className="bg-slate-950/60 border border-slate-800 px-6 py-2.5 rounded-lg text-center">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  Contract Number
                </p>
                <p className="font-mono font-bold text-sky-400 text-sm tracking-widest mt-0.5">
                  {issuedPolicyNumber}
                </p>
              </div>
              <p className="text-slate-400 text-xs text-center max-w-sm leading-relaxed">
                The policy has been recorded. All details are archived under the policyholder profile.
              </p>
            </motion.div>
          )}
        </div>

        {/* Buttons Controls */}
        {step < 5 && (
          <div className="flex gap-3 border-t border-slate-800/60 pt-5 mt-6">
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 py-2.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900 text-slate-400 hover:text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Back
              </button>
            )}
            <button
              type="button"
              onClick={step === 4 ? handleIssuePolicy : handleNext}
              disabled={issueLoading || (step === 3 && isPanMissing)}
              className="flex-2 w-full py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1 shadow-lg shadow-sky-900/15 disabled:opacity-40 disabled:hover:bg-sky-600"
            >
              {issueLoading ? (
                <Activity className="w-3.5 h-3.5 animate-spin" />
              ) : step === 4 ? (
                "Issue Policy Contract"
              ) : (
                <>
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        )}

        {step === 5 && (
          <div className="mt-6">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-800 text-white font-semibold text-xs transition-colors"
            >
              Close Wizard
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
