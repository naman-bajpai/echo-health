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
  "Cardiologist",
  "Dermatologist",
  "Endocrinologist",
  "Gastroenterologist",
  "Neurologist",
  "Oncologist",
  "Orthopedic",
  "Psychiatrist",
  "Pulmonologist",
  "Rheumatologist",
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
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(
    null
  );
  const [referralReason, setReferralReason] = useState("");
  const [isApproving, setIsApproving] = useState(false);

  const handleSearch = async () => {
    if (!specialty) return;
    setIsSearching(true);
    try {
      await onSearch(specialty, location || undefined);
    } finally {
      setIsSearching(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedProvider || !referralReason) return;
    setIsApproving(true);
    try {
      await onApprove(selectedProvider, referralReason);
      setSelectedProvider(null);
      setReferralReason("");
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-6 py-5 border-b border-surface-200">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
            <Users className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-ink-800">Referral Search</h2>
            <p className="text-sm text-ink-500 mt-0.5">
              Find and refer patients to specialists
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {/* AI Recommendation Banner */}
        {recommendedSpecialist && (
          <div className="mb-6 p-5 bg-gradient-to-r from-purple-50 to-purple-50/30 rounded-2xl border border-purple-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-purple-900">AI Recommendation</p>
                <p className="text-sm text-purple-700 mt-0.5">
                  Based on the assessment, consider referring to a{" "}
                  <strong>{recommendedSpecialist}</strong>
                </p>
              </div>
              <button
                onClick={() => {
                  setSpecialty(recommendedSpecialist);
                  handleSearch();
                }}
                className="px-5 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors shadow-soft"
              >
                Search {recommendedSpecialist}s
              </button>
            </div>
          </div>
        )}

        {/* Search Form */}
        <div className="card p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-sm font-semibold text-ink-700 mb-2">
                Specialty
              </label>
              <div className="relative">
                <Stethoscope className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" />
                <input
                  type="text"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="e.g., Cardiologist"
                  className="input pl-12"
                  list="specialties"
                />
                <datalist id="specialties">
                  {commonSpecialties.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm font-semibold text-ink-700 mb-2">
                Location (optional)
              </label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City or ZIP code"
                  className="input pl-12"
                />
              </div>
            </div>

            <div className="md:col-span-1 flex items-end">
              <button
                onClick={handleSearch}
                disabled={!specialty || isSearching}
                className="w-full btn-primary bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Search Providers
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick specialty buttons */}
          <div className="mt-5 flex flex-wrap gap-2">
            {commonSpecialties.slice(0, 6).map((s) => (
              <button
                key={s}
                onClick={() => setSpecialty(s)}
                className={`px-4 py-2 text-sm rounded-xl transition-all ${
                  specialty === s
                    ? "bg-purple-100 text-purple-700 font-semibold"
                    : "bg-surface-100 text-ink-600 hover:bg-purple-50 hover:text-purple-600"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Provider Results */}
        {providers.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-bold text-ink-800 mb-4">
              Found {providers.length} Providers
            </h3>
            <div className="space-y-3">
              {providers.map((provider) => (
                <div
                  key={provider.id}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                    selectedProvider?.id === provider.id
                      ? "border-purple-500 bg-purple-50 shadow-soft"
                      : "border-surface-200 hover:border-purple-300 hover:bg-surface-50"
                  }`}
                  onClick={() => setSelectedProvider(provider)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 bg-surface-100 rounded-2xl flex items-center justify-center">
                        <Building2 className="w-7 h-7 text-ink-400" />
                      </div>
                      <div>
                        <h4 className="font-bold text-ink-800 text-lg">
                          {provider.name}
                        </h4>
                        <p className="text-sm text-purple-600 font-semibold">
                          {provider.specialty}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-ink-500">
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4" />
                            {provider.address}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Phone className="w-4 h-4" />
                            {provider.phone}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {provider.rating && (
                        <div className="flex items-center gap-1.5 text-amber-500">
                          <Star className="w-5 h-5 fill-current" />
                          <span className="font-bold">{provider.rating}</span>
                        </div>
                      )}
                      {provider.accepting_new_patients && (
                        <span className="inline-block mt-2 px-3 py-1 bg-sage-100 text-sage-700 text-xs font-semibold rounded-lg">
                          Accepting Patients
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Referral Form (when provider selected) */}
        {selectedProvider && (
          <div className="card p-6 mb-6 bg-gradient-to-br from-purple-50/50 to-white border-purple-200">
            <h3 className="text-lg font-bold text-ink-800 mb-4">
              Create Referral to {selectedProvider.name}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-ink-700 mb-2">
                  Reason for Referral
                </label>
                <textarea
                  value={referralReason}
                  onChange={(e) => setReferralReason(e.target.value)}
                  rows={3}
                  placeholder="Describe the reason for this referral..."
                  className="input resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleApprove}
                  disabled={!referralReason || isApproving}
                  className="flex-1 btn-primary bg-gradient-to-r from-purple-600 to-purple-700"
                >
                  {isApproving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Approve Referral
                    </>
                  )}
                </button>
                <button
                  onClick={() => setSelectedProvider(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Approved Referrals */}
        {referrals.length > 0 && (
          <div>
            <h3 className="text-lg font-bold text-ink-800 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-sage-500" />
              Approved Referrals
            </h3>
            <div className="space-y-3">
              {referrals.map((r, index) => (
                <div
                  key={index}
                  className="card p-5 bg-gradient-to-br from-sage-50/50 to-white border-sage-200"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-ink-800">{r.provider.name}</h4>
                      <p className="text-sm text-sage-600 font-semibold">
                        {r.provider.specialty}
                      </p>
                      <p className="text-sm text-ink-600 mt-2">
                        <strong>Reason:</strong> {r.referral.reason}
                      </p>
                    </div>
                    <span className="badge badge-sage">
                      {r.referral.status}
                    </span>
                  </div>
                  {r.instructions && (
                    <div className="mt-4 p-4 bg-white rounded-xl border border-surface-200">
                      <p className="text-sm text-ink-600 flex items-start gap-2">
                        <FileText className="w-4 h-4 mt-0.5 text-ink-400 flex-shrink-0" />
                        {r.instructions}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {providers.length === 0 && referrals.length === 0 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-purple-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Search className="w-12 h-12 text-purple-400" />
            </div>
            <h3 className="text-xl font-bold text-ink-700 mb-3">
              Search for Specialists
            </h3>
            <p className="text-ink-500 max-w-md mx-auto">
              Enter a specialty above to find providers accepting new patients
              in your area.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
