"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";
import logo from "@/logo.png";
import {
  Plus,
  LogOut,
  Clock,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Stethoscope,
  BadgeCheck,
  Calendar,
  ChevronRight,
  Search,
  Users,
  User,
  Activity,
  Sparkles,
  ArrowUpRight,
  FileText,
  Brain,
} from "lucide-react";
import type { Encounter, Patient } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, signOut } = useAuth();

  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterUrgency, setFilterUrgency] = useState<string>("all");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setIsLoading(true);
      const [encountersRes, patientsRes] = await Promise.all([
        supabase
          .from("encounters")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("patients")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      if (encountersRes.data) setEncounters(encountersRes.data);
      if (patientsRes.data) setPatients(patientsRes.data);
      setIsLoading(false);
    };

    loadData();
  }, [user]);

  const filteredEncounters = encounters.filter((enc) => {
    const matchesSearch =
      !searchQuery ||
      enc.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      enc.reason_for_visit?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesUrgency = filterUrgency === "all" || enc.urgency === filterUrgency;
    return matchesSearch && matchesUrgency;
  });

  const urgencyConfig: any = {
    routine: { icon: CheckCircle, label: "Routine", color: "text-sage-600", bg: "bg-sage-50" },
    urgent: { icon: Clock, label: "Urgent", color: "text-amber-600", bg: "bg-amber-50" },
    emergent: { icon: AlertTriangle, label: "Emergent", color: "text-red-600", bg: "bg-red-50" },
  };

  if (authLoading || !user) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <Activity className="w-10 h-10 text-primary-500 animate-pulse" />
      </div>
    );
  }

  const stats = [
    { label: "Today's Visits", value: encounters.filter(e => new Date(e.created_at).toDateString() === new Date().toDateString()).length, icon: Calendar, color: "text-primary-500" },
    { label: "Urgent Cases", value: encounters.filter(e => e.urgency === "urgent").length, icon: Clock, color: "text-amber-500" },
    { label: "Pending Referrals", value: encounters.filter(e => e.specialist_needed).length, icon: Stethoscope, color: "text-purple-500" },
    { label: "Total Patients", value: patients.length, icon: Users, color: "text-accent-500" },
  ];

  return (
    <div className="min-h-screen bg-surface-50/50 font-sans text-ink-900">
      {/* Navbar */}
      <nav className="h-20 bg-white/80 backdrop-blur-md border-b border-surface-200 sticky top-0 z-50 px-8">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Image src={logo} alt="Echo Health" width={110} height={32} className="h-8 w-auto opacity-90" />
            <div className="hidden md:flex items-center gap-6">
              <Link href="/dashboard" className="text-sm font-bold text-ink-900 border-b-2 border-primary-500 pb-1">Dashboard</Link>
              <Link href="/patients" className="text-sm font-bold text-ink-400 hover:text-ink-600 transition-colors pb-1">Patient Registry</Link>
              <Link href="/templates" className="text-sm font-bold text-ink-400 hover:text-ink-600 transition-colors pb-1">Templates</Link>
              <Link href="/doctor" className="text-sm font-bold text-ink-400 hover:text-ink-600 transition-colors pb-1">Doctor Portal</Link>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 pl-4 border-l border-surface-200">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-black text-ink-900 leading-none">{user.full_name}</p>
                <p className="text-[10px] font-bold text-primary-500 uppercase tracking-widest mt-1">{user.role}</p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center shadow-inner-soft">
                <User className="w-5 h-5 text-primary-600" />
              </div>
              <button onClick={() => signOut()} className="p-2 text-ink-300 hover:text-red-500 transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 py-12">
        {/* Hero Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary-500" />
              <span className="text-xs font-black text-primary-500 uppercase tracking-[0.2em]">Clinical Workspace</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-ink-900">
              Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, {user.full_name.split(" ")[0]}
            </h1>
            <p className="text-ink-400 font-medium text-lg">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/templates"
              className="flex items-center gap-2 px-5 py-3 bg-white text-ink-700 rounded-2xl font-bold border border-surface-200 hover:border-primary-200 hover:text-primary-600 transition-all"
            >
              <FileText className="w-4 h-4" />
              <span>Templates</span>
            </Link>
            <Link
              href="/doctor"
              className="flex items-center gap-2 px-5 py-3 bg-purple-50 text-purple-700 rounded-2xl font-bold border border-purple-200 hover:bg-purple-100 transition-all"
            >
              <Brain className="w-4 h-4" />
              <span>Doctor Portal</span>
            </Link>
            <Link
              href="/new-encounter"
              className="flex items-center gap-3 px-8 py-4 bg-ink-900 text-white rounded-[2rem] font-bold shadow-soft-xl hover:bg-black hover:-translate-y-1 transition-all group"
            >
              <Plus className="w-5 h-5" />
              <span>New Encounter</span>
              <ArrowUpRight className="w-4 h-4 ml-2 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </Link>
          </div>
        </div>

        {/* Intelligence Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white rounded-3xl p-6 border border-surface-200 shadow-soft group hover:border-primary-200 transition-all">
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-10 h-10 rounded-xl bg-surface-50 flex items-center justify-center ${stat.color} group-hover:scale-110 transition-transform`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black text-ink-400 uppercase tracking-widest">{stat.label}</span>
              </div>
              <p className="text-3xl font-bold text-ink-900">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Content Section */}
        <div className="bg-white rounded-[2.5rem] shadow-soft-xl border border-surface-200 overflow-hidden">
          {/* List Toolbar */}
          <div className="p-8 border-b border-surface-100 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-surface-50/30">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-ink-900">Patient Encounters</h2>
              <div className="px-3 py-1 bg-white rounded-full border border-surface-200 text-[10px] font-black text-ink-400 uppercase tracking-widest shadow-sm">
                {filteredEncounters.length} Total
              </div>
            </div>

            <div className="flex items-center gap-3 flex-1 max-w-xl">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by patient or reason..."
                  className="w-full bg-white border border-surface-200 rounded-2xl pl-11 pr-4 py-2.5 text-sm focus:ring-4 ring-primary-50 outline-none transition-all"
                />
              </div>
              
              <div className="flex p-1 bg-surface-100 rounded-2xl border border-surface-200">
                {["all", "urgent", "emergent"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilterUrgency(f)}
                    className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      filterUrgency === f ? "bg-white text-ink-900 shadow-sm" : "text-ink-400 hover:text-ink-600"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* List Content */}
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="py-32 flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                <p className="text-xs font-bold text-ink-300 uppercase tracking-widest">Synchronizing records...</p>
              </div>
            ) : filteredEncounters.length === 0 ? (
              <div className="py-32 flex flex-col items-center text-center px-8">
                <div className="w-20 h-20 bg-surface-50 rounded-[2rem] flex items-center justify-center mb-6">
                  <Activity className="w-10 h-10 text-ink-200" />
                </div>
                <h3 className="text-lg font-bold text-ink-900">No records matching your search</h3>
                <p className="text-ink-400 text-sm mt-1">Adjust your filters or initiate a new encounter to begin documenting.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-50/50 text-[10px] font-black text-ink-300 uppercase tracking-[0.2em] border-b border-surface-100">
                    <th className="px-8 py-4 font-black">Patient Identity</th>
                    <th className="px-8 py-4 font-black">Visit Context</th>
                    <th className="px-8 py-4 font-black text-center">Urgency</th>
                    <th className="px-8 py-4 font-black text-right">Consultation Date</th>
                    <th className="px-8 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {filteredEncounters.map((enc) => {
                    const cfg = urgencyConfig[enc.urgency] || urgencyConfig.routine;
                    return (
                      <tr key={enc.id} onClick={() => router.push(`/encounter/${enc.id}`)} className="group cursor-pointer hover:bg-primary-50/30 transition-all">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-surface-50 border border-surface-100 flex items-center justify-center group-hover:bg-white group-hover:border-primary-200 group-hover:shadow-soft transition-all">
                              <User className="w-5 h-5 text-ink-400 group-hover:text-primary-500 transition-colors" />
                            </div>
                            <div>
                              <p className="font-bold text-ink-900 text-base">{enc.patient_name || "Anonymous Patient"}</p>
                              {enc.visit_number && enc.visit_number > 1 && (
                                <span className="text-[10px] font-black text-primary-500 uppercase tracking-tighter">Follow-up Visit #{enc.visit_number}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <p className="text-sm font-medium text-ink-600 line-clamp-1 max-w-xs">{enc.reason_for_visit || "General Consultation"}</p>
                          {enc.specialist_needed && (
                            <span className="flex items-center gap-1.5 mt-1 text-[10px] font-bold text-purple-600 uppercase tracking-widest">
                              <Stethoscope className="w-3 h-3" />
                              Referral: {enc.recommended_specialist}
                            </span>
                          )}
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex justify-center">
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${cfg.bg} ${cfg.color} border-current/10 shadow-sm`}>
                              <div className={`w-1 h-1 rounded-full bg-current ${enc.urgency === 'emergent' ? 'animate-pulse' : ''}`} />
                              <span className="text-[10px] font-black uppercase tracking-wider">{cfg.label}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <p className="text-sm font-bold text-ink-900">
                            {new Date(enc.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                          <p className="text-[10px] font-medium text-ink-300 uppercase tracking-widest mt-0.5">
                            {new Date(enc.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="inline-flex w-10 h-10 rounded-xl border border-surface-200 items-center justify-center opacity-0 group-hover:opacity-100 group-hover:bg-white group-hover:text-primary-500 transition-all">
                            <ChevronRight className="w-5 h-5" />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
