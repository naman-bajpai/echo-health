"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";
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
  HeartPulse,
  Activity,
  TrendingUp,
  Sparkles,
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

  // Redirect if no role selected
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [authLoading, user, router]);

  // Load encounters
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

  const handleSignOut = () => {
    signOut();
    router.push("/");
  };

  // Filter encounters
  const filteredEncounters = encounters.filter((enc) => {
    const matchesSearch =
      !searchQuery ||
      enc.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      enc.reason_for_visit?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesUrgency =
      filterUrgency === "all" || enc.urgency === filterUrgency;

    return matchesSearch && matchesUrgency;
  });

  const urgencyConfig = {
    routine: {
      icon: CheckCircle,
      label: "Routine",
      bg: "bg-sage-50",
      text: "text-sage-700",
      border: "border-sage-200",
      dot: "bg-sage-500",
    },
    urgent: {
      icon: Clock,
      label: "Urgent",
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
      dot: "bg-amber-500",
    },
    emergent: {
      icon: AlertTriangle,
      label: "Emergent",
      bg: "bg-red-50",
      text: "text-red-700",
      border: "border-red-200",
      dot: "bg-red-500 animate-pulse",
    },
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
          <p className="text-ink-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  const todayEncounters = encounters.filter(
    (e) => new Date(e.created_at).toDateString() === new Date().toDateString()
  ).length;

  const urgentCases = encounters.filter((e) => e.urgency === "urgent").length;
  const needSpecialist = encounters.filter((e) => e.specialist_needed).length;

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-surface-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-20">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="relative">
                <div className="w-11 h-11 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
                  <HeartPulse className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-accent-500 rounded-full border-2 border-white" />
              </div>
              <span className="text-xl font-bold text-ink-800">
                Echo<span className="text-primary-600">Health</span>
              </span>
            </Link>

            <div className="flex items-center gap-4">
              {/* User Info */}
              <div className="flex items-center gap-3 px-4 py-2.5 bg-surface-100 rounded-2xl border border-surface-200">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    user.role === "doctor"
                      ? "bg-sage-100"
                      : "bg-primary-100"
                  }`}
                >
                  {user.role === "doctor" ? (
                    <Stethoscope className="w-5 h-5 text-sage-600" />
                  ) : (
                    <BadgeCheck className="w-5 h-5 text-primary-600" />
                  )}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-semibold text-ink-800">
                    {user.full_name}
                  </p>
                  <p className="text-xs text-ink-500 capitalize">{user.role}</p>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                className="p-2.5 text-ink-400 hover:text-ink-600 hover:bg-surface-100 rounded-xl transition-colors"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Welcome Section */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">
              {new Date().getHours() < 12 ? "☀️" : new Date().getHours() < 18 ? "🌤️" : "🌙"}
            </span>
            <h1 className="text-3xl font-bold text-ink-800">
              Welcome back, {user.full_name.split(" ")[0]}
            </h1>
          </div>
          <p className="text-ink-500 text-lg">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-10">
          <div className="stat-card card p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-4xl font-bold text-ink-800 mb-1">
                  {todayEncounters}
                </p>
                <p className="text-sm text-ink-500 font-medium">
                  Today's Encounters
                </p>
              </div>
              <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary-600" />
              </div>
            </div>
          </div>

          <div className="stat-card card p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-4xl font-bold text-ink-800 mb-1">
                  {urgentCases}
                </p>
                <p className="text-sm text-ink-500 font-medium">Urgent Cases</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="stat-card card p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-4xl font-bold text-ink-800 mb-1">
                  {needSpecialist}
                </p>
                <p className="text-sm text-ink-500 font-medium">
                  Need Specialist
                </p>
              </div>
              <div className="w-12 h-12 bg-accent-100 rounded-2xl flex items-center justify-center">
                <Stethoscope className="w-6 h-6 text-accent-600" />
              </div>
            </div>
          </div>

          <div className="stat-card card p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-4xl font-bold text-ink-800 mb-1">
                  {patients.length}
                </p>
                <p className="text-sm text-ink-500 font-medium">
                  Total Patients
                </p>
              </div>
              <div className="w-12 h-12 bg-sage-100 rounded-2xl flex items-center justify-center">
                <Users className="w-6 h-6 text-sage-600" />
              </div>
            </div>
          </div>
        </div>

        {/* New Encounter CTA */}
        <div className="mb-8">
          <Link
            href="/new-encounter"
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold rounded-2xl shadow-soft hover:shadow-glow transition-all duration-300 group"
          >
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Plus className="w-6 h-6" />
            </div>
            <div className="text-left">
              <span className="block text-lg">New Encounter</span>
              <span className="text-primary-200 text-sm font-normal">
                Start documenting a patient visit
              </span>
            </div>
            <ChevronRight className="w-5 h-5 ml-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patients or visits..."
              className="input-minimal pl-12"
            />
          </div>

          <div className="flex gap-2">
            {["all", "routine", "urgent", "emergent"].map((filter) => (
              <button
                key={filter}
                onClick={() => setFilterUrgency(filter)}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  filterUrgency === filter
                    ? "bg-primary-600 text-white shadow-soft"
                    : "bg-white text-ink-600 border border-surface-200 hover:border-primary-300"
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Encounters List */}
        <div className="card overflow-hidden">
          <div className="px-6 py-5 border-b border-surface-200 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-ink-800">
                Recent Encounters
              </h2>
              <p className="text-sm text-ink-500 mt-0.5">
                {filteredEncounters.length} encounters found
              </p>
            </div>
            <Activity className="w-5 h-5 text-ink-400" />
          </div>

          {isLoading ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
              </div>
              <p className="text-ink-500 font-medium">Loading encounters...</p>
            </div>
          ) : filteredEncounters.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-20 h-20 bg-surface-100 rounded-3xl flex items-center justify-center mx-auto mb-5">
                <Calendar className="w-10 h-10 text-ink-300" />
              </div>
              <h3 className="text-xl font-bold text-ink-800 mb-2">
                No encounters found
              </h3>
              <p className="text-ink-500 mb-6">
                Start a new encounter to get started
              </p>
              <Link
                href="/new-encounter"
                className="inline-flex items-center gap-2 text-primary-600 font-semibold hover:text-primary-700"
              >
                <Plus className="w-5 h-5" />
                New Encounter
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-surface-200">
              {filteredEncounters.map((encounter) => {
                const urgency =
                  urgencyConfig[encounter.urgency] || urgencyConfig.routine;
                const UrgencyIcon = urgency.icon;

                return (
                  <Link
                    key={encounter.id}
                    href={`/encounter/${encounter.id}`}
                    className="flex items-center justify-between p-5 hover:bg-surface-50 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-surface-100 rounded-2xl flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                        <User className="w-7 h-7 text-ink-400 group-hover:text-primary-600 transition-colors" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <p className="font-semibold text-ink-800 text-lg">
                            {encounter.patient_name || "Unknown Patient"}
                          </p>
                          {encounter.visit_number &&
                            encounter.visit_number > 1 && (
                              <span className="badge badge-primary">
                                Visit #{encounter.visit_number}
                              </span>
                            )}
                        </div>
                        <p className="text-ink-500 mt-0.5">
                          {encounter.reason_for_visit || "No reason specified"}
                        </p>
                        <p className="text-xs text-ink-400 mt-1">
                          {new Date(encounter.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {encounter.specialist_needed && (
                        <span className="badge bg-purple-100 text-purple-700">
                          <Stethoscope className="w-3.5 h-3.5" />
                          {encounter.recommended_specialist || "Specialist"}
                        </span>
                      )}

                      <span
                        className={`badge ${urgency.bg} ${urgency.text} border ${urgency.border}`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${urgency.dot}`}
                        />
                        <UrgencyIcon className="w-3.5 h-3.5" />
                        {urgency.label}
                      </span>

                      <ChevronRight className="w-5 h-5 text-ink-300 group-hover:text-primary-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
