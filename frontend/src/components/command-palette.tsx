"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  UserPlus,
  FilePlus,
  Calculator,
  LogOut,
  Keyboard,
  Sparkles
} from "lucide-react";
import { useAuth } from "./auth-provider";

interface CommandItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  shortcut?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerAction: (actionId: string) => void;
}

export default function CommandPalette({
  isOpen,
  onClose,
  onTriggerAction,
}: CommandPaletteProps) {
  const { logout } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands: CommandItem[] = [
    {
      id: "search-customer",
      title: "Search Customer",
      description: "Find an existing customer record by Aadhaar, PAN, or Mobile.",
      icon: <Search className="w-4 h-4" />,
      action: () => onTriggerAction("search-customer"),
      shortcut: ["S"],
    },
    {
      id: "new-customer",
      title: "Register New Customer",
      description: "Onboard a new policyholder with Aadhaar verification.",
      icon: <UserPlus className="w-4 h-4" />,
      action: () => onTriggerAction("new-customer"),
      shortcut: ["C"],
    },
    {
      id: "issue-policy",
      title: "Issue Policy Contract",
      description: "Launch the multi-step policy issuance wizard.",
      icon: <FilePlus className="w-4 h-4" />,
      action: () => onTriggerAction("issue-policy"),
      shortcut: ["P"],
    },
    {
      id: "calculator",
      title: "Live Premium Calculator",
      description: "Quickly compute quotes with custom terms and sum assured.",
      icon: <Calculator className="w-4 h-4" />,
      action: () => onTriggerAction("calculator"),
      shortcut: ["Q"],
    },
    {
      id: "logout",
      title: "Sign Out",
      description: "Safely terminate your active agent session.",
      icon: <LogOut className="w-4 h-4 text-rose-400" />,
      action: () => logout(),
      shortcut: ["Esc"],
    },
  ];

  // Filter commands by search
  const filteredCommands = commands.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase())
  );

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
      setSearch("");
    }
  }, [isOpen]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-start justify-center p-4 pt-[10vh]">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Main Palette Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: -10 }}
        className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0c1424] shadow-2xl overflow-hidden z-10"
      >
        {/* Search Input bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800 bg-slate-950/20">
          <Search className="w-5 h-5 text-slate-500" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search action..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
            aria-label="Command search input"
          />
          <div className="flex items-center gap-1 text-[10px] text-slate-600 font-bold border border-slate-800 rounded px-1.5 py-0.5 bg-slate-900">
            <Keyboard className="w-3 h-3 text-slate-500" /> ESC
          </div>
        </div>

        {/* Command List */}
        <div ref={listRef} className="max-h-72 overflow-y-auto p-2 space-y-1">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No actions match your search query.
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => (
              <div
                key={cmd.id}
                onClick={() => {
                  cmd.action();
                  onClose();
                }}
                className={`p-3 rounded-xl flex items-center justify-between cursor-pointer border transition-colors ${
                  idx === selectedIndex
                    ? "bg-sky-500/10 border-sky-500/30 text-sky-200"
                    : "border-transparent text-slate-400 hover:bg-slate-900/40 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${
                      idx === selectedIndex
                        ? "bg-sky-500/15 border-sky-500/20 text-sky-400"
                        : "bg-slate-900 border-slate-800 text-slate-500"
                    }`}
                  >
                    {cmd.icon}
                  </div>
                  <div className="text-left">
                    <p className={`text-xs font-bold ${idx === selectedIndex ? "text-sky-300" : "text-white"}`}>
                      {cmd.title}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                      {cmd.description}
                    </p>
                  </div>
                </div>

                {/* Shortcut display */}
                {cmd.shortcut && (
                  <div className="flex gap-1.5">
                    {cmd.shortcut.map((sc) => (
                      <kbd
                        key={sc}
                        className="text-[9px] font-bold text-slate-500 bg-slate-950 border border-slate-850 px-1.5 py-0.5 rounded shadow"
                      >
                        {sc}
                      </kbd>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Dynamic decorative palette hint */}
        <div className="p-3 bg-slate-950/40 border-t border-slate-850 text-[10px] text-slate-500 flex justify-between items-center px-4">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" /> Tip: Use keys ↑↓ to navigate, Enter to run.
          </span>
          <span>⌥⌘K / Ctrl+K</span>
        </div>
      </motion.div>
    </div>
  );
}
