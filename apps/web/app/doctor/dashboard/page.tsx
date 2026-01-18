"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";
import logo from "@/logo.png";
import { useToast } from "@/components/ToastProvider";
import {
  User,
  LogOut,
  Search,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  Stethoscope,
  ChevronRight,
  Loader2,
} from "lucide-react";
import type { Encounter } from "@/lib/types";

export default function DoctorDashboardPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { showError } = useToast();
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterUrgency, setFilterUrgency] = useState<string>("all");

  useEffect(() => {
    if (!user || user.role !== "doctor") {
      router.push("/get-started");
      return;
    }

    loadEncounters();
  }, [user, router]);

  const loadEncounters = async () => {
    setIsLoading(true);
    try {
      // Get all encounters (same as regular dashboard)
      const { data, error } = await supabase
        .from("encounters")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setEncounters(data || []);
    } catch (err) {
      console.error("Error loading encounters:", err);
      showError("Failed to load encounters. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEncounters = encounters.filter((enc) => {
    const matchesSearch =
      !searchQuery ||
      enc.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      enc.reason_for_visit?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesUrgency = filterUrgency === "all" || enc.urgency === filterUrgency;
    return matchesSearch && matchesUrgency;
  });

  const getStatusBadge = (status: string) => {
    const badges = {
      intake: { label: "Intake", color: "bg-blue-50 text-blue-600 border-blue-200" },
      visit: { label: "In Progress", color: "bg-amber-50 text-amber-600 border-amber-200" },
      checkout: { label: "Checkout", color: "bg-purple-50 text-purple-600 border-purple-200" },
      completed: { label: "Completed", color: "bg-emerald-50 text-emerald-600 border-emerald-200" },
    };
    const badge = badges[status as keyof typeof badges] || badges.intake;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-surface-50">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Navbar */}
      <nav className="h-20 bg-white/80 backdrop-blur-md border-b border-surface-200 sticky top-0 z-50 px-8">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Image src={logo} alt="Echo Health" width={110} height={32} className="h-8 w-auto opacity-90" />
            <div className="flex items-center gap-6">
              <span className="text-sm font-bold text-ink-900 border-b-2 border-primary-500 pb-1">My Patients</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 pl-4 border-l border-surface-200">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-black text-ink-900 leading-none">{user?.full_name}</p>
                <p className="text-[10px] font-bold text-primary-500 uppercase tracking-widest mt-1">Doctor</p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center shadow-inner-soft">
                <Stethoscope className="w-5 h-5 text-primary-600" />
              </div>
              <button onClick={() => signOut()} className="p-2 text-ink-300 hover:text-red-500 transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-ink-900 mb-2">Dashboard</h1>
          <p className="text-ink-400">View and manage all patient encounters</p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-300" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by patient name or reason for visit..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-surface-200 rounded-2xl focus:ring-4 ring-primary-50 outline-none focus:border-primary-200"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-ink-400">Filter:</span>
            <button
              onClick={() => setFilterUrgency("all")}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                filterUrgency === "all"
                  ? "bg-primary-500 text-white"
                  : "bg-white text-ink-600 border border-surface-200 hover:bg-surface-50"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterUrgency("routine")}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                filterUrgency === "routine"
                  ? "bg-sage-500 text-white"
                  : "bg-white text-ink-600 border border-surface-200 hover:bg-surface-50"
              }`}
            >
              Routine
            </button>
            <button
              onClick={() => setFilterUrgency("urgent")}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                filterUrgency === "urgent"
                  ? "bg-amber-500 text-white"
                  : "bg-white text-ink-600 border border-surface-200 hover:bg-surface-50"
              }`}
            >
              Urgent
            </button>
            <button
              onClick={() => setFilterUrgency("emergent")}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                filterUrgency === "emergent"
                  ? "bg-red-500 text-white"
                  : "bg-white text-ink-600 border border-surface-200 hover:bg-surface-50"
              }`}
            >
              Emergent
            </button>
          </div>
        </div>

        {/* Encounters List */}
        {filteredEncounters.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-surface-200">
            <Stethoscope className="w-16 h-16 text-ink-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-ink-900 mb-2">No Encounters Found</h3>
            <p className="text-ink-400">No patient encounters match your search criteria.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEncounters.map((encounter) => (
              <Link
                key={encounter.id}
                href={`/encounter/${encounter.id}`}
                className="block bg-white rounded-2xl p-6 border border-surface-200 hover:border-primary-200 hover:shadow-soft transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6 flex-1">
                    <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                      <User className="w-8 h-8 text-primary-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-ink-900">{encounter.patient_name || "Unknown Patient"}</h3>
                        {getStatusBadge(encounter.status)}
                      </div>
                      <p className="text-sm text-ink-500 mb-1">{encounter.reason_for_visit || "No reason specified"}</p>
                      <div className="flex items-center gap-4 text-xs text-ink-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(encounter.created_at).toLocaleDateString()}
                        </span>
                        {encounter.urgency && (
                          <span className={`px-2 py-0.5 rounded-full font-bold ${
                            encounter.urgency === "urgent" ? "bg-red-50 text-red-600" :
                            encounter.urgency === "emergent" ? "bg-red-100 text-red-700" :
                            "bg-slate-50 text-slate-600"
                          }`}>
                            {encounter.urgency.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-ink-300 group-hover:text-primary-500 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
