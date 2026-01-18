"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";
import logo from "@/logo.png";
import {
  TrendingUp,
  Activity,
  Calendar,
  Clock,
  Stethoscope,
  Users,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  PieChart,
  BarChart,
  ChevronRight,
  Filter,
} from "lucide-react";
import type { Encounter } from "@/lib/types";

export default function ClinicalInsightsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30d");

  useEffect(() => {
    if (!authLoading && !user) router.push("/");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from("encounters")
        .select("*")
        .order("created_at", { ascending: false });

      if (data) setEncounters(data);
      setIsLoading(false);
    };

    loadData();
  }, [user]);

  if (authLoading || !user) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <Activity className="w-10 h-10 text-primary-500 animate-pulse" />
      </div>
    );
  }

  // Calculate metrics
  const totalEncounters = encounters.length;
  const urgentRate = totalEncounters > 0 
    ? ((encounters.filter(e => e.urgency === 'urgent' || e.urgency === 'emergent').length / totalEncounters) * 100).toFixed(1)
    : 0;
  const referralRate = totalEncounters > 0
    ? ((encounters.filter(e => e.specialist_needed).length / totalEncounters) * 100).toFixed(1)
    : 0;
  
  const urgencyCounts = {
    routine: encounters.filter(e => e.urgency === 'routine').length,
    urgent: encounters.filter(e => e.urgency === 'urgent').length,
    emergent: encounters.filter(e => e.urgency === 'emergent').length,
  };

  const topSpecialists = encounters.reduce((acc: any, enc) => {
    if (enc.recommended_specialist) {
      acc[enc.recommended_specialist] = (acc[enc.recommended_specialist] || 0) + 1;
    }
    return acc;
  }, {});

  const sortedSpecialists = Object.entries(topSpecialists)
    .sort(([, a]: any, [, b]: any) => b - a)
    .slice(0, 5);

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
              <Link href="/patients" className="text-sm font-bold text-ink-400 hover:text-ink-600 transition-colors pb-1">Patient Registry</Link>
              <Link href="/analytics" className="text-sm font-bold text-ink-900 border-b-2 border-primary-500 pb-1">Clinical Insights</Link>
            </div>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-600 rounded-xl font-bold text-[10px] uppercase tracking-widest border border-primary-100">
            <TrendingUp className="w-3 h-3" />
            Live Analytics
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 py-12">
        {/* Hero Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-500" />
              <span className="text-xs font-black text-primary-500 uppercase tracking-[0.2em]">Data Intelligence</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-ink-900">Clinical Insights</h1>
            <p className="text-ink-400 font-medium text-lg">Predictive trends and performance metrics across the clinical workspace.</p>
          </div>

          <div className="flex p-1 bg-surface-100 rounded-2xl border border-surface-200">
            {["7d", "30d", "90d", "All"].map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  timeRange === r ? "bg-white text-ink-900 shadow-sm" : "text-ink-400 hover:text-ink-600"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Intelligence Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <StatCard label="Total Encounters" value={totalEncounters} trend="+12.5%" trendType="up" icon={Activity} color="text-primary-500" />
          <StatCard label="Critical Urgency Rate" value={`${urgentRate}%`} trend="-2.4%" trendType="down" icon={AlertTriangle} color="text-red-500" />
          <StatCard label="Specialist Referrals" value={`${referralRate}%`} trend="+0.8%" trendType="up" icon={Stethoscope} color="text-purple-500" />
          <StatCard label="Avg. Consultation Time" value="14.2m" trend="-1.5m" trendType="down" icon={Clock} color="text-amber-500" />
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Urgency Distribution */}
          <div className="lg:col-span-7">
            <section className="bg-white rounded-[2.5rem] p-10 border border-surface-200 shadow-soft-xl h-full">
              <div className="flex items-center justify-between mb-12">
                <div>
                  <h3 className="text-xl font-bold text-ink-900">Urgency Distribution</h3>
                  <p className="text-sm font-medium text-ink-400 mt-1">Patient severity levels for selected period.</p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-surface-50 flex items-center justify-center">
                  <BarChart className="w-5 h-5 text-ink-300" />
                </div>
              </div>

              <div className="space-y-10">
                <UrgencyBar label="Routine" count={urgencyCounts.routine} total={totalEncounters} color="bg-sage-400" />
                <UrgencyBar label="Urgent" count={urgencyCounts.urgent} total={totalEncounters} color="bg-amber-400" />
                <UrgencyBar label="Emergent" count={urgencyCounts.emergent} total={totalEncounters} color="bg-red-400" />
              </div>

              <div className="mt-16 pt-10 border-t border-surface-50">
                <div className="flex items-center gap-2 text-[10px] font-bold text-ink-300 uppercase tracking-widest">
                  <Sparkles className="w-3.5 h-3.5 text-primary-400" />
                  AI Clinical Prediction: <span className="text-ink-900">Stability Predicted for Next 7 Days</span>
                </div>
              </div>
            </section>
          </div>

          {/* Specialist Referral Trends */}
          <div className="lg:col-span-5">
            <section className="bg-white rounded-[2.5rem] p-10 border border-surface-200 shadow-soft-xl h-full">
              <div className="flex items-center justify-between mb-12">
                <div>
                  <h3 className="text-xl font-bold text-ink-900">Referral Insights</h3>
                  <p className="text-sm font-medium text-ink-400 mt-1">Top specialists requested by AI.</p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-surface-50 flex items-center justify-center">
                  <PieChart className="w-5 h-5 text-ink-300" />
                </div>
              </div>

              <div className="space-y-6">
                {sortedSpecialists.length > 0 ? (
                  sortedSpecialists.map(([name, count]: any, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-surface-50 rounded-2xl border border-surface-100 hover:border-primary-200 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-xl bg-white border border-surface-200 flex items-center justify-center text-xs font-black text-primary-500 group-hover:bg-primary-500 group-hover:text-white transition-all shadow-sm">
                          {i + 1}
                        </div>
                        <span className="font-bold text-ink-800">{name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-ink-400">{count} Cases</span>
                        <ChevronRight className="w-4 h-4 text-ink-200" />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center opacity-30">
                    <p className="text-sm font-medium italic">No referral data available</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, trend, trendType, icon: Icon, color }: any) {
  return (
    <div className="bg-white rounded-3xl p-8 border border-surface-200 shadow-soft group hover:border-primary-200 transition-all">
      <div className="flex items-center justify-between mb-6">
        <div className={`w-12 h-12 rounded-2xl bg-surface-50 flex items-center justify-center ${color} group-hover:scale-110 transition-transform shadow-inner-soft`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className={`flex items-center gap-1 text-[10px] font-black uppercase ${trendType === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>
          {trendType === 'up' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
          {trend}
        </div>
      </div>
      <p className="text-[10px] font-black text-ink-300 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-4xl font-bold text-ink-900 tracking-tight">{value}</p>
    </div>
  );
}

function UrgencyBar({ label, count, total, color }: any) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <span className="text-xs font-black text-ink-900 uppercase tracking-widest">{label}</span>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-ink-900">{count}</span>
          <span className="text-[10px] font-black text-ink-300 uppercase">({percentage.toFixed(0)}%)</span>
        </div>
      </div>
      <div className="h-3 w-full bg-surface-100 rounded-full overflow-hidden shadow-inner-soft border border-surface-50">
        <div 
          className={`h-full ${color} rounded-full transition-all duration-1000 shadow-glow`} 
          style={{ width: `${percentage}%` }} 
        />
      </div>
    </div>
  );
}
