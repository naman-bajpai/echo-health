"use client";

import { useState } from "react";
import {
  Search,
  MapPin,
  Phone,
  Star,
  CheckCircle,
  Loader2,
  Building2,
  Send,
  FileText,
  Stethoscope,
  Sparkles,
  Users,
  X,
  ChevronRight,
} from "lucide-react";
import type { Provider, Referral } from "@/lib/types";

interface ReferralPanelProps {
  providers: Provider[];
  referrals: Referral[];
  onSearch: (specialty: string, location?: string) => Promise<void>;
  onApprove: (provider: Provider, reason: string) => Promise<void>;
  recommendedSpecialist?: string;
}

const commonSpecialties = [
  "Cardiologist", "Dermatologist", "Endocrinologist", "Gastroenterologist",
  "Neurologist", "Oncologist", "Orthopedic", "Psychiatrist", "Pulmonologist", "Rheumatologist",
];

export default function ReferralPanel({
  providers,
  referrals,
  onSearch,
  onApprove,
  recommendedSpecialist,
}: ReferralPanelProps) {
  const [specialty, setSpecialty] = useState(recommendedSpecialist || "");
  const [location, setLocation] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [referralReason, setReferralReason] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSearch = async () => {
    if (!specialty.trim()) {
      setErrors({ specialty: "Specialty is required" });
      return;
    }
    setErrors({});
    setIsSearching(true);
    try { await onSearch(specialty, location || undefined); } finally { setIsSearching(false); }
  };

  const handleApprove = async () => {
    if (!selectedProvider) return;
    if (!referralReason.trim()) {
      setErrors({ referralReason: "Reason for referral is required" });
      return;
    }
    setErrors({});
    setIsApproving(true);
    try {
      await onApprove(selectedProvider, referralReason);
      setSelectedProvider(null);
      setReferralReason("");
    } finally { setIsApproving(false); }
  };

  return (
    <div className="h-full bg-surface-50 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-12 py-16">
        {/* Header */}
        <div className="flex items-end justify-between mb-12">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight text-ink-900">Specialist Referrals</h2>
            <p className="text-ink-400 font-medium">Coordinate care with trusted healthcare providers</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-10">
          {/* Left Column: Search & Filters */}
          <div className="lg:col-span-4 space-y-8">
            <section className="bg-white rounded-[2rem] p-8 shadow-soft border border-surface-200">
              <h3 className="font-bold text-ink-900 mb-6 flex items-center gap-2">
                <Search className="w-4 h-4 text-primary-500" />
                Provider Search
              </h3>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-ink-400 uppercase tracking-widest">Specialty</label>
                  <input 
                    type="text" 
                    value={specialty} 
                    onChange={(e) => {
                      setSpecialty(e.target.value);
                      if (errors.specialty) setErrors({ ...errors, specialty: "" });
                    }} 
                    placeholder="e.g. Cardiologist" 
                    className={`w-full bg-surface-50 border ${errors.specialty ? "border-red-500 ring-2 ring-red-50" : "border-surface-200"} rounded-xl px-4 py-3 text-sm focus:ring-2 ring-primary-100 outline-none transition-all`} 
                  />
                  {errors.specialty && <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider ml-1">{errors.specialty}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-ink-400 uppercase tracking-widest">Location</label>
                  <input 
                    type="text" 
                    value={location} 
                    onChange={(e) => setLocation(e.target.value)} 
                    placeholder="City or ZIP" 
                    className="w-full bg-surface-50 border border-surface-200 rounded-xl px-4 py-3 text-sm focus:ring-2 ring-primary-100 outline-none" 
                  />
                </div>
                <button 
                  onClick={handleSearch} 
                  disabled={isSearching || !specialty}
                  className="w-full bg-ink-900 text-white rounded-2xl py-4 font-bold text-sm shadow-soft hover:bg-black transition-all disabled:opacity-50"
                >
                  {isSearching ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Search Specialists"}
                </button>
              </div>
            </section>

            {recommendedSpecialist && (
              <div className="bg-primary-50 rounded-[2rem] p-8 border border-primary-100 relative overflow-hidden">
                <Sparkles className="absolute -top-4 -right-4 w-24 h-24 text-primary-200/50" />
                <h3 className="text-primary-900 font-bold mb-2">AI Recommendation</h3>
                <p className="text-sm text-primary-700/80 mb-6 font-medium leading-relaxed">
                  Based on current assessment, we suggest a consultation with a <strong>{recommendedSpecialist}</strong>.
                </p>
                <button 
                  onClick={() => { setSpecialty(recommendedSpecialist); handleSearch(); }}
                  className="w-full bg-white text-primary-600 rounded-xl py-3 font-bold text-xs uppercase tracking-widest shadow-soft hover:shadow-md transition-all"
                >
                  Auto-Search Now
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Results & Approved */}
          <div className="lg:col-span-8 space-y-10">
            {/* Results */}
            {providers.length > 0 ? (
              <section className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="font-bold text-ink-900">Found {providers.length} Specialists</h3>
                </div>
                <div className="grid gap-4">
                  {providers.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => setSelectedProvider(p)}
                      className={`
                        group p-6 rounded-3xl border transition-all cursor-pointer
                        ${selectedProvider?.id === p.id 
                          ? "bg-white border-primary-500 shadow-soft-lg ring-4 ring-primary-50" 
                          : "bg-white border-surface-200 hover:border-surface-300 hover:shadow-soft"}
                      `}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex gap-5">
                          <div className="w-16 h-16 bg-surface-50 rounded-2xl flex items-center justify-center shrink-0">
                            <Building2 className="w-8 h-8 text-ink-200" />
                          </div>
                          <div>
                            <h4 className="font-bold text-ink-900 text-lg group-hover:text-primary-600 transition-colors">{p.name}</h4>
                            <p className="text-sm font-bold text-primary-500 uppercase tracking-widest">{p.specialty}</p>
                            <div className="flex items-center gap-4 mt-3 opacity-60">
                              <span className="flex items-center gap-1 text-xs font-medium"><MapPin className="w-3.5 h-3.5" /> {p.address}</span>
                              <span className="flex items-center gap-1 text-xs font-medium"><Phone className="w-3.5 h-3.5" /> {p.phone}</span>
                            </div>
                          </div>
                        </div>
                        {p.rating && (
                          <div className="flex items-center gap-1 text-amber-500 bg-amber-50 px-2 py-1 rounded-lg">
                            <Star className="w-3.5 h-3.5 fill-current" />
                            <span className="text-xs font-black">{p.rating}</span>
                          </div>
                        )}
                      </div>
                      
                      {selectedProvider?.id === p.id && (
                        <div className="mt-8 pt-8 border-t border-surface-100 animate-fade-in" onClick={e => e.stopPropagation()}>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-ink-400 uppercase tracking-widest">Reason for Referral</label>
                              <textarea 
                                value={referralReason} 
                                onChange={e => {
                                  setReferralReason(e.target.value);
                                  if (errors.referralReason) setErrors({ ...errors, referralReason: "" });
                                }} 
                                placeholder="State the clinical reason for this referral..." 
                                className={`w-full bg-surface-50 border ${errors.referralReason ? "border-red-500 ring-2 ring-red-50" : "border-surface-200"} rounded-2xl p-4 text-sm focus:ring-2 ring-primary-100 outline-none resize-none transition-all`}
                                rows={3}
                              />
                              {errors.referralReason && <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider ml-1">{errors.referralReason}</p>}
                            </div>
                            <div className="flex gap-3">
                              <button 
                                onClick={handleApprove} 
                                disabled={isApproving}
                                className="flex-1 bg-primary-500 text-white rounded-2xl py-4 font-bold text-sm shadow-glow hover:bg-primary-600 transition-all disabled:opacity-50"
                              >
                                {isApproving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Approve & Send Referral"}
                              </button>
                              <button onClick={() => setSelectedProvider(null)} className="px-6 rounded-2xl border border-surface-200 font-bold text-sm text-ink-400 hover:bg-surface-100">Cancel</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ) : referrals.length === 0 && (
              <div className="py-32 text-center opacity-40">
                <Users className="w-16 h-16 mx-auto mb-6 text-ink-200" />
                <h3 className="text-xl font-bold">Search results will appear here</h3>
              </div>
            )}

            {/* Approved List */}
            {referrals.length > 0 && (
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-500">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-ink-900">Active Referrals</h3>
                </div>
                <div className="grid gap-4">
                  {referrals.map((r, i) => (
                    <div key={i} className="bg-white p-6 rounded-[2rem] border border-emerald-100 shadow-soft">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="font-bold text-ink-900">{r.provider.name}</h4>
                          <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mt-1">{r.provider.specialty}</p>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg">SENT</span>
                      </div>
                      <p className="text-sm text-ink-500 leading-relaxed italic">"{r.referral.reason}"</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
