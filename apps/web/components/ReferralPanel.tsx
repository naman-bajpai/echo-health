"use client";

import { useState } from "react";
import {
  Search,
  MapPin,
  Phone,
  CheckCircle,
  Users,
  Building,
  Loader2,
} from "lucide-react";
import type { Provider } from "@/lib/types";

interface ReferralPanelProps {
  providers: Provider[];
  referrals: Array<{
    provider: Provider;
    referral: { reason: string; status: string };
    instructions: string;
  }>;
  onSearch: (specialty: string, location?: string) => Promise<void>;
  onApprove: (provider: Provider, reason: string) => Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
}

const SPECIALTIES = [
  "Cardiology",
  "Dermatology",
  "Endocrinology",
  "Gastroenterology",
  "Neurology",
  "Orthopedics",
  "Physical Therapy",
  "Psychiatry",
  "Pulmonology",
  "Rheumatology",
];

export default function ReferralPanel({
  providers,
  referrals,
  onSearch,
  onApprove,
  isLoading,
  disabled,
}: ReferralPanelProps) {
  const [specialty, setSpecialty] = useState("");
  const [location, setLocation] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [referralReason, setReferralReason] = useState("");
  const [isApproving, setIsApproving] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const loading = isLoading || isSearching;

  return (
    <div className="p-6 space-y-6">
      {/* Existing Referrals */}
      {referrals.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Approved Referrals
          </h3>
          <div className="space-y-3">
            {referrals.map((ref, index) => (
              <div
                key={index}
                className="bg-green-50 border border-green-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-green-900">
                      {ref.provider.name}
                    </p>
                    <p className="text-sm text-green-700">
                      {ref.provider.specialty}
                    </p>
                    <p className="text-sm text-green-600 mt-1">
                      Reason: {ref.referral.reason}
                    </p>
                  </div>
                  <span className="badge bg-green-100 text-green-800">
                    {ref.referral.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Form */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Search className="w-5 h-5" />
          Find Providers
        </h3>
        <form onSubmit={handleSearch} className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Specialty</label>
            <select
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              disabled={disabled || loading}
              className="input"
            >
              <option value="">Select specialty...</option>
              {SPECIALTIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Location (optional)
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City or ZIP code"
              disabled={disabled || loading}
              className="input"
            />
          </div>

          <button
            type="submit"
            disabled={disabled || loading || !specialty}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            {loading ? "Searching..." : "Search Providers"}
          </button>
        </form>
      </div>

      {/* Search Results */}
      {providers.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Available Providers ({providers.length})
          </h3>
          <div className="space-y-3">
            {providers.map((provider) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                isSelected={selectedProvider?.id === provider.id}
                onSelect={() => setSelectedProvider(provider)}
                disabled={disabled}
              />
            ))}
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {selectedProvider && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="font-semibold text-lg mb-4">Create Referral</h3>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="font-medium">{selectedProvider.name}</p>
              <p className="text-sm text-gray-600">{selectedProvider.specialty}</p>
              <p className="text-sm text-gray-600">{selectedProvider.address}</p>
            </div>

            <label className="block text-sm text-gray-600 mb-1">
              Reason for Referral
            </label>
            <textarea
              value={referralReason}
              onChange={(e) => setReferralReason(e.target.value)}
              placeholder="Enter reason for referral..."
              rows={3}
              className="input mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedProvider(null);
                  setReferralReason("");
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={!referralReason || isApproving}
                className="btn-success flex-1 flex items-center justify-center gap-2"
              >
                {isApproving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Approve Referral
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProviderCard({
  provider,
  isSelected,
  onSelect,
  disabled,
}: {
  provider: Provider;
  isSelected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      onClick={disabled ? undefined : onSelect}
      className={`
        card cursor-pointer transition-all
        ${isSelected ? "ring-2 ring-primary-500 border-primary-500" : "hover:border-gray-300"}
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-gray-900">{provider.name}</p>
          <p className="text-sm text-gray-600">{provider.specialty}</p>
        </div>
        {provider.accepting_new_patients && (
          <span className="badge bg-green-100 text-green-700">
            Accepting New
          </span>
        )}
      </div>

      <div className="mt-3 space-y-1 text-sm text-gray-500">
        <p className="flex items-center gap-2">
          <Building className="w-4 h-4" />
          {provider.address}
        </p>
        <p className="flex items-center gap-2">
          <Phone className="w-4 h-4" />
          {provider.phone}
        </p>
        {provider.distance && (
          <p className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            {provider.distance}
          </p>
        )}
      </div>
    </div>
  );
}
