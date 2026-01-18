"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Image from "next/image";
import Link from "next/link";
import logo from "@/logo.png";
import {
  ArrowLeft,
  ArrowRight,
  Stethoscope,
  BadgeCheck,
  Sparkles,
  ChevronRight,
  Shield,
  Activity,
  Heart,
} from "lucide-react";

export default function GetStartedPage() {
  const router = useRouter();
  const { setRole } = useAuth();
  const [selectedRole, setSelectedRole] = useState<"nurse" | "doctor">("nurse");
  const [userName, setUserName] = useState("");

  const handleStart = () => {
    setRole(selectedRole, userName || undefined);
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-surface-50/50 relative overflow-hidden flex flex-col">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-300/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-accent-400/10 rounded-full blur-2xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 h-24 flex items-center px-8">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-ink-400 hover:text-ink-900 transition-colors group">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-bold text-sm">Back to Home</span>
          </Link>
          <Image src={logo} alt="Echo Health" width={110} height={32} className="h-8 w-auto opacity-90" />
          <div className="w-24" /> {/* Spacer */}
        </div>
      </header>

      <main className="flex-1 relative z-10 flex items-center justify-center px-6 py-12">
        <div className="max-w-xl w-full">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-50 text-primary-600 rounded-full text-xs font-bold uppercase tracking-widest border border-primary-100 mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Onboarding
            </div>
            <h1 className="text-4xl font-bold text-ink-900 tracking-tight mb-3">Identity Setup</h1>
            <p className="text-ink-400 font-medium">Define your role to personalize your clinical workspace.</p>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-soft-xl border border-surface-200 p-10 relative overflow-hidden">
            {/* Corner accent */}
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
              <Shield className="w-32 h-32" />
            </div>

            <div className="relative z-10 space-y-10">
              {/* Name Input */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-ink-300 uppercase tracking-widest ml-1">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-300" />
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Dr. Sarah Mitchell"
                    className="w-full bg-surface-50 border border-surface-200 rounded-2xl pl-12 pr-4 py-4 text-ink-900 focus:ring-4 ring-primary-50 outline-none transition-all font-bold placeholder:text-ink-200"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-ink-300 uppercase tracking-widest ml-1">
                  Clinical Designation
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <RoleCard
                    selected={selectedRole === "nurse"}
                    onClick={() => setSelectedRole("nurse")}
                    icon={BadgeCheck}
                    label="Nurse"
                    sublabel="RN, LPN, NP"
                    color="text-primary-500"
                  />
                  <RoleCard
                    selected={selectedRole === "doctor"}
                    onClick={() => setSelectedRole("doctor")}
                    icon={Stethoscope}
                    label="Doctor"
                    sublabel="MD, DO, Specialist"
                    color="text-indigo-500"
                  />
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleStart}
                disabled={!userName.trim()}
                className="w-full py-5 bg-ink-900 text-white font-bold text-lg rounded-[1.5rem] shadow-soft-lg hover:bg-black transition-all duration-300 flex items-center justify-center gap-3 group disabled:opacity-50 disabled:grayscale"
              >
                Enter Dashboard
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          <p className="mt-8 text-center text-[10px] font-bold text-ink-300 uppercase tracking-widest">
            Secure HIPAA-Compliant Environment
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center opacity-40">
        <p className="text-xs font-medium text-ink-400">© 2026 Echo Health. All clinical data is encrypted.</p>
      </footer>
    </div>
  );
}

function RoleCard({ selected, onClick, icon: Icon, label, sublabel, color }: any) {
  return (
    <button
      onClick={onClick}
      className={`relative p-6 rounded-[2rem] border-2 transition-all duration-500 text-left group overflow-hidden ${
        selected
          ? "border-primary-500 bg-primary-50/50 shadow-inner-soft"
          : "border-surface-200 bg-white hover:border-primary-200 hover:bg-surface-50"
      }`}
    >
      {/* Selection Glow */}
      {selected && (
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary-500/10 rounded-full blur-2xl" />
      )}
      
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-all duration-500 ${
        selected ? "bg-primary-500 text-white shadow-glow rotate-3 scale-110" : "bg-surface-100 text-ink-400 group-hover:text-primary-400"
      }`}>
        <Icon className="w-6 h-6" />
      </div>
      
      <div className="relative z-10">
        <span className={`font-black text-lg block tracking-tight ${selected ? "text-primary-900" : "text-ink-900"}`}>
          {label}
        </span>
        <span className="text-[10px] font-bold text-ink-300 uppercase tracking-widest">{sublabel}</span>
      </div>

      {selected && (
        <div className="absolute top-4 right-4 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center shadow-lg animate-fade-in">
          <ChevronRight className="w-4 h-4 text-white" />
        </div>
      )}
    </button>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}
