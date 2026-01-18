"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";
import logo from "@/logo.png";
import {
  FileText,
  LogOut,
  Clock,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Stethoscope,
  Calendar,
  ChevronRight,
  Search,
  User,
  Activity,
  Eye,
  Download,
  Filter,
  BadgeCheck,
  FileCheck,
} from "lucide-react";
import type { Encounter } from "@/lib/types";

interface EncounterWithArtifacts extends Encounter {
  has_soap_note?: boolean;
  has_summary?: boolean;
  has_billing_codes?: boolean;
  nurse_name?: string;
}

export default function DoctorReviewPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, signOut } = useAuth();

  const [encounters, setEncounters] = useState<EncounterWithArtifacts[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [stats, setStats] = useState({
    pendingReview: 0,
    reviewedToday: 0,
    urgentCases: 0,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        // Fetch all completed encounters that need doctor review
        const { data: encountersData, error } = await supabase
          .from("encounters")
          .select(`
            *,
            artifacts:artifacts(type)
          `)
          .in("status", ["completed", "active"])
          .order("created_at", { ascending: false })
          .limit(50);

        if (!error && encountersData) {
          const processedEncounters: EncounterWithArtifacts[] = encountersData.map((enc: any) => ({
            ...enc,
            has_soap_note: enc.artifacts?.some((a: any) => a.type === "draft_note"),
            has_summary: enc.artifacts?.some((a: any) => a.type === "summary"),
            has_billing_codes: enc.artifacts?.some((a: any) => a.type === "billing_codes"),
          }));
          setEncounters(processedEncounters);

          // Calculate stats
          const pending = processedEncounters.filter(e => e.status !== "reviewed").length;
          const urgent = processedEncounters.filter(e => e.urgency === "emergent" || e.urgency === "urgent").length;
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          const reviewed = processedEncounters.filter(e => 
            e.status === "reviewed" && new Date(e.updated_at) >= todayStart
          ).length;

          setStats({
            pendingReview: pending,
            reviewedToday: reviewed,
            urgentCases: urgent,
          });
        }
      } catch (err) {
        console.error("Error loading encounters:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user]);

  const filteredEncounters = encounters.filter(encounter => {
    const matchesSearch = 
      encounter.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      encounter.reason_for_visit?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = 
      filterStatus === "all" || 
      (filterStatus === "urgent" && (encounter.urgency === "emergent" || encounter.urgency === "urgent")) ||
      (filterStatus === "pending" && encounter.status !== "reviewed") ||
      (filterStatus === "reviewed" && encounter.status === "reviewed");
    
    return matchesSearch && matchesFilter;
  });

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case "emergent":
        return "bg-red-100 text-red-700 border-red-200";
      case "urgent":
        return "bg-amber-100 text-amber-700 border-amber-200";
      default:
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-surface-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          <p className="text-ink-500">Loading doctor dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Header */}
      <header className="bg-white border-b border-surface-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Image src={logo} alt="Echo Health" width={40} height={40} className="rounded-xl" />
            <div>
              <h1 className="text-xl font-bold text-ink-900">Doctor Review Portal</h1>
              <p className="text-sm text-ink-400">Review patient encounters and reports</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm font-bold text-ink-600 hover:text-ink-900 transition-colors"
            >
              Switch to Nurse View
            </Link>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-3xl p-6 border border-surface-200 shadow-soft">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-ink-900">{stats.pendingReview}</p>
                <p className="text-sm text-ink-400">Pending Review</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-3xl p-6 border border-surface-200 shadow-soft">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-ink-900">{stats.urgentCases}</p>
                <p className="text-sm text-ink-400">Urgent Cases</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-3xl p-6 border border-surface-200 shadow-soft">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-ink-900">{stats.reviewedToday}</p>
                <p className="text-sm text-ink-400">Reviewed Today</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="bg-white rounded-3xl p-6 border border-surface-200 shadow-soft mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-300" />
              <input
                type="text"
                placeholder="Search by patient name or reason for visit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-surface-50 border border-surface-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-ink-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-3 bg-surface-50 border border-surface-200 rounded-2xl font-medium focus:outline-none focus:ring-2 focus:ring-primary-200"
              >
                <option value="all">All Encounters</option>
                <option value="urgent">Urgent Cases</option>
                <option value="pending">Pending Review</option>
                <option value="reviewed">Reviewed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Encounters List */}
        <div className="bg-white rounded-3xl border border-surface-200 shadow-soft overflow-hidden">
          <div className="px-6 py-4 border-b border-surface-100 bg-surface-50">
            <h2 className="font-bold text-ink-900">Patient Encounters</h2>
          </div>
          
          {filteredEncounters.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-ink-200 mx-auto mb-4" />
              <p className="text-ink-400">No encounters found matching your criteria.</p>
            </div>
          ) : (
            <div className="divide-y divide-surface-100">
              {filteredEncounters.map((encounter) => (
                <div
                  key={encounter.id}
                  className="p-6 hover:bg-surface-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
                        <User className="w-6 h-6 text-primary-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="font-bold text-ink-900">{encounter.patient_name || "Unknown Patient"}</h3>
                          <span className={`px-2 py-1 rounded-lg text-xs font-bold uppercase border ${getUrgencyBadge(encounter.urgency)}`}>
                            {encounter.urgency}
                          </span>
                          {encounter.status === "reviewed" && (
                            <span className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold">
                              <BadgeCheck className="w-3 h-3" />
                              Reviewed
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-ink-500">{encounter.reason_for_visit || "No reason specified"}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-ink-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(encounter.created_at).toLocaleDateString()}
                          </span>
                          {encounter.has_soap_note && (
                            <span className="flex items-center gap-1 text-emerald-600">
                              <FileText className="w-3 h-3" />
                              SOAP Note
                            </span>
                          )}
                          {encounter.has_summary && (
                            <span className="flex items-center gap-1 text-blue-600">
                              <FileCheck className="w-3 h-3" />
                              Summary
                            </span>
                          )}
                          {encounter.has_billing_codes && (
                            <span className="flex items-center gap-1 text-purple-600">
                              <Activity className="w-3 h-3" />
                              Billing Codes
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/doctor/review/${encounter.id}`}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl font-bold text-sm hover:bg-primary-600 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        Review
                      </Link>
                      <button
                        onClick={() => window.open(`/api/supabase/generate-pdf?encounterId=${encounter.id}`, "_blank")}
                        className="flex items-center gap-2 px-4 py-2 bg-surface-100 text-ink-600 rounded-xl font-bold text-sm hover:bg-surface-200 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        PDF
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
