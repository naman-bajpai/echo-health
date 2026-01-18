"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";
import logo from "@/logo.png";
import { kgToLbs, cmToFeetInches, formatHeight, formatWeight } from "@/lib/utils";
import {
  Search,
  Plus,
  User,
  Calendar,
  Phone,
  Mail,
  Shield,
  ChevronRight,
  Activity,
  Droplets,
  Loader2,
  MoreVertical,
  History,
} from "lucide-react";
import type { Patient } from "@/lib/types";

export default function PatientRegistryPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;

    const loadPatients = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .order("full_name", { ascending: true });

      if (data) setPatients(data);
      setIsLoading(false);
    };

    loadPatients();
  }, [user]);

  const filteredPatients = patients.filter((p) =>
    p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.mrn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.phone?.includes(searchQuery)
  );

  if (authLoading || !user) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <Activity className="w-10 h-10 text-primary-500 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50/50 font-sans text-ink-900 pb-20">
      {/* Navbar */}
      <nav className="h-20 bg-white/80 backdrop-blur-md border-b border-surface-200 sticky top-0 z-50 px-8">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Link href="/dashboard">
              <Image src={logo} alt="Echo Health" width={110} height={32} className="h-8 w-auto opacity-90" />
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link href="/dashboard" className="text-sm font-bold text-ink-400 hover:text-ink-600 transition-colors pb-1">Dashboard</Link>
              <Link href="/patients" className="text-sm font-bold text-ink-900 border-b-2 border-primary-500 pb-1">Patient Registry</Link>
              <Link href="/analytics" className="text-sm font-bold text-ink-400 hover:text-ink-600 transition-colors pb-1">Clinical Insights</Link>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/new-encounter"
              className="flex items-center gap-2 px-4 py-2 bg-ink-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-soft hover:bg-black transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              New Session
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 py-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary-500" />
              <span className="text-xs font-black text-primary-500 uppercase tracking-[0.2em]">Medical Records</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-ink-900">Patient Registry</h1>
            <p className="text-ink-400 font-medium text-lg">Centralized directory of patient identities and clinical history.</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Sidebar Search & List */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-surface-200 shadow-soft overflow-hidden">
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search patients..."
                  className="w-full bg-surface-50 border border-surface-200 rounded-2xl pl-11 pr-4 py-3 text-sm focus:ring-4 ring-primary-50 outline-none transition-all font-medium"
                />
              </div>

              <div className="space-y-1 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                {isLoading ? (
                  <div className="py-12 flex flex-col items-center gap-3 opacity-40">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">Loading Records...</p>
                  </div>
                ) : filteredPatients.length === 0 ? (
                  <div className="py-12 text-center opacity-40">
                    <p className="text-sm font-medium italic">No records found</p>
                  </div>
                ) : (
                  filteredPatients.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPatient(p)}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all border ${
                        selectedPatient?.id === p.id 
                          ? "bg-primary-50 border-primary-200 shadow-inner-soft" 
                          : "bg-white border-transparent hover:bg-surface-50 hover:border-surface-200"
                      }`}
                    >
                      <div className="flex items-center gap-3 text-left">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${
                          selectedPatient?.id === p.id ? "bg-white text-primary-600 shadow-sm" : "bg-surface-100 text-ink-400"
                        }`}>
                          {p.full_name?.charAt(0)}
                        </div>
                        <div>
                          <p className={`font-bold text-sm ${selectedPatient?.id === p.id ? "text-primary-900" : "text-ink-900"}`}>
                            {p.full_name}
                          </p>
                          <p className="text-[10px] font-bold text-ink-300 uppercase tracking-widest mt-0.5">
                            {p.mrn || "NO MRN"} • {p.gender || "U"}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <ChevronRight className={`w-4 h-4 transition-transform ${selectedPatient?.id === p.id ? "text-primary-500 translate-x-1" : "text-ink-200"}`} />
                        {selectedPatient?.id === p.id && (
                          <div className="mt-2 w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Patient Detail View */}
          <div className="lg:col-span-8">
            {selectedPatient ? (
              <div className="space-y-8 animate-fade-in">
                {/* Header Card */}
                <div className="bg-white rounded-[2.5rem] p-10 border border-surface-200 shadow-soft-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                    <User className="w-48 h-48" />
                  </div>
                  
                  <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                      <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-glow text-white">
                        <User className="w-12 h-12" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h2 className="text-3xl font-bold text-ink-900">{selectedPatient.full_name}</h2>
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-full uppercase tracking-widest border border-emerald-100">
                            Verified Case
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-6 text-sm font-medium text-ink-400">
                          <span className="flex items-center gap-2"><Shield className="w-4 h-4" /> {selectedPatient.mrn}</span>
                          <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {selectedPatient.dob}</span>
                          <span className="flex items-center gap-2"><User className="w-4 h-4" /> {selectedPatient.gender || "Not specified"}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <Link
                        href={`/patients/${selectedPatient.id}`}
                        className="px-6 py-3 bg-surface-100 text-ink-900 rounded-2xl font-bold text-sm shadow-soft hover:bg-surface-200 transition-all"
                      >
                        View Full Profile
                      </Link>
                      <Link
                        href={`/new-encounter?patientId=${selectedPatient.id}`}
                        className="px-6 py-3 bg-ink-900 text-white rounded-2xl font-bold text-sm shadow-soft hover:bg-black transition-all"
                      >
                        New Session
                      </Link>
                    </div>
                  </div>

                  <div className="mt-12 grid md:grid-cols-4 gap-8 pt-10 border-t border-surface-100">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-ink-300 uppercase tracking-widest">Phone</label>
                      <p className="text-sm font-bold text-ink-800 flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-primary-400" /> {selectedPatient.phone || "Not recorded"}</p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-ink-300 uppercase tracking-widest">Blood Type</label>
                      <p className="text-sm font-bold text-ink-800 flex items-center gap-2"><Droplets className="w-3.5 h-3.5 text-red-400" /> {selectedPatient.blood_type || "--"}</p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-ink-300 uppercase tracking-widest">Height / Weight</label>
                      <p className="text-sm font-bold text-ink-800 flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5 text-blue-400" /> 
                        {selectedPatient.height_cm ? (() => {
                          const { feet, inches } = cmToFeetInches(selectedPatient.height_cm!);
                          return formatHeight(feet, inches);
                        })() : "--"} / {selectedPatient.weight_kg ? formatWeight(kgToLbs(selectedPatient.weight_kg)) : "--"}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-ink-300 uppercase tracking-widest">Provider</label>
                      <p className="text-sm font-bold text-ink-800 flex items-center gap-2"><Shield className="w-3.5 h-3.5 text-primary-400" /> {selectedPatient.insurance_provider || "Self-pay"}</p>
                    </div>
                  </div>
                </div>

                {/* Sub-sections */}
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Address & Emergency */}
                  <section className="bg-white rounded-[2rem] p-8 border border-surface-200 shadow-soft">
                    <h3 className="text-sm font-black text-ink-900 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-surface-50 flex items-center justify-center">
                        <Activity className="w-4 h-4 text-primary-500" />
                      </div>
                      Personal Details
                    </h3>
                    <div className="space-y-8">
                      <div>
                        <label className="text-[10px] font-black text-ink-300 uppercase tracking-widest">Permanent Address</label>
                        <p className="text-sm font-medium text-ink-600 mt-2 leading-relaxed">{selectedPatient.address || "No address data available in record."}</p>
                      </div>
                      <div className="pt-6 border-t border-surface-50">
                        <label className="text-[10px] font-black text-ink-300 uppercase tracking-widest">Emergency Contact</label>
                        <div className="mt-3 flex items-center justify-between">
                          <p className="text-sm font-bold text-ink-800">{selectedPatient.emergency_contact || "Not specified"}</p>
                          <p className="text-sm font-bold text-primary-600">{selectedPatient.emergency_phone}</p>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Quick History / Stats */}
                  <section className="bg-ink-900 text-white rounded-[2rem] p-8 shadow-soft-xl relative overflow-hidden">
                    <History className="absolute -bottom-4 -right-4 w-32 h-32 opacity-10" />
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                        <History className="w-4 h-4 text-primary-400" />
                      </div>
                      Clinical History
                    </h3>
                    <div className="space-y-6 relative z-10">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium opacity-60">Total Encounters</span>
                        <span className="text-2xl font-black text-primary-400 italic">--</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium opacity-60">Last Consult</span>
                        <span className="text-sm font-bold">Never recorded</span>
                      </div>
                      <div className="pt-6 border-t border-white/10">
                        <p className="text-[10px] font-black text-primary-400 uppercase tracking-widest mb-4">Registry Actions</p>
                        <div className="flex gap-3">
                          <Link href={`/patients/${selectedPatient.id}`} className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-all border border-white/10 text-center">View Full History</Link>
                          <button className="px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/10"><MoreVertical className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center px-12 py-32 bg-white rounded-[2.5rem] border border-dashed border-surface-200 opacity-40 grayscale transition-all">
                <div className="w-20 h-20 bg-surface-50 rounded-3xl flex items-center justify-center mb-6">
                  <User className="w-10 h-10 text-ink-300" />
                </div>
                <h3 className="text-xl font-bold text-ink-900">Patient Detail Workspace</h3>
                <p className="text-sm font-medium mt-2 max-w-xs">Select a patient from the registry to view clinical details and encounter history.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
