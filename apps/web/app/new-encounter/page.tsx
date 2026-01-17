"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";
import { startEncounter } from "@/lib/api";
import {
  ArrowLeft,
  User,
  Calendar,
  Phone,
  Mail,
  Search,
  Plus,
  Loader2,
  AlertCircle,
  FileText,
  UserPlus,
  Clock,
  HeartPulse,
  ChevronRight,
} from "lucide-react";
import type { Patient } from "@/lib/types";

export default function NewEncounterPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [step, setStep] = useState<"select" | "new-patient" | "reason">(
    "select"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [visitCount, setVisitCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newPatient, setNewPatient] = useState({
    full_name: "",
    dob: "",
    phone: "",
    email: "",
    insurance_provider: "",
    insurance_id: "",
  });

  const [reasonForVisit, setReasonForVisit] = useState("");

  // Redirect if no role selected
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [authLoading, user, router]);

  // Search patients
  useEffect(() => {
    const searchPatients = async () => {
      if (!searchQuery || searchQuery.length < 2) {
        setPatients([]);
        return;
      }

      setIsSearching(true);
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .or(
          `full_name.ilike.%${searchQuery}%,mrn.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`
        )
        .limit(10);

      if (data) setPatients(data);
      setIsSearching(false);
    };

    const debounce = setTimeout(searchPatients, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  // Get visit count for selected patient
  useEffect(() => {
    const getVisitCount = async () => {
      if (!selectedPatient) {
        setVisitCount(0);
        return;
      }

      const { count } = await supabase
        .from("encounters")
        .select("*", { count: "exact", head: true })
        .eq("patient_id", selectedPatient.id);

      setVisitCount(count || 0);
    };

    getVisitCount();
  }, [selectedPatient]);

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setStep("reason");
  };

  const handleCreateNewPatient = async () => {
    if (!newPatient.full_name) {
      setError("Patient name is required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Generate MRN
      const mrn = `MRN-${Date.now().toString(36).toUpperCase()}`;

      const { data, error } = await supabase
        .from("patients")
        .insert({
          ...newPatient,
          mrn,
          dob: newPatient.dob || null,
        })
        .select()
        .single();

      if (error) throw error;

      setSelectedPatient(data);
      setVisitCount(0);
      setStep("reason");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartEncounter = async () => {
    if (!reasonForVisit) {
      setError("Please enter a reason for visit");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await startEncounter(
        selectedPatient?.full_name || newPatient.full_name,
        reasonForVisit,
        selectedPatient?.id,
        user?.id
      );

      router.push(`/encounter/${result.encounterId}`);
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
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

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-surface-200 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-6">
          <div className="flex items-center h-20">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-4 py-2 text-ink-500 hover:text-ink-700 hover:bg-surface-100 rounded-xl transition-all mr-6"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back</span>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-soft">
                <HeartPulse className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-ink-800">
                New Encounter
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-10">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Progress Indicator */}
        <div className="flex items-center gap-3 mb-8">
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${
              step === "select"
                ? "bg-primary-100 text-primary-700"
                : "bg-surface-100 text-ink-500"
            }`}
          >
            <span className="w-6 h-6 rounded-full bg-current/10 flex items-center justify-center text-xs">
              1
            </span>
            Patient
          </div>
          <ChevronRight className="w-4 h-4 text-ink-300" />
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${
              step === "reason"
                ? "bg-primary-100 text-primary-700"
                : "bg-surface-100 text-ink-500"
            }`}
          >
            <span className="w-6 h-6 rounded-full bg-current/10 flex items-center justify-center text-xs">
              2
            </span>
            Visit Details
          </div>
        </div>

        {/* Step 1: Select or Create Patient */}
        {step === "select" && (
          <div className="card overflow-hidden">
            <div className="px-6 py-5 border-b border-surface-200">
              <h2 className="text-xl font-bold text-ink-800">Select Patient</h2>
              <p className="text-sm text-ink-500 mt-1">
                Search for existing patient or create new
              </p>
            </div>

            <div className="p-6">
              {/* Search */}
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, MRN, or phone..."
                  className="input pl-12"
                />
                {isSearching && (
                  <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-primary-500" />
                )}
              </div>

              {/* Search Results */}
              {patients.length > 0 && (
                <div className="space-y-3 mb-6">
                  <p className="text-sm text-ink-500 font-medium mb-3">
                    Search Results
                  </p>
                  {patients.map((patient) => (
                    <button
                      key={patient.id}
                      onClick={() => handleSelectPatient(patient)}
                      className="w-full flex items-center gap-4 p-4 border-2 border-surface-200 rounded-2xl hover:border-primary-300 hover:bg-primary-50 transition-all text-left group"
                    >
                      <div className="w-14 h-14 bg-surface-100 rounded-2xl flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                        <User className="w-7 h-7 text-ink-400 group-hover:text-primary-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-ink-800 text-lg">
                          {patient.full_name}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-ink-500 mt-1">
                          {patient.mrn && <span>MRN: {patient.mrn}</span>}
                          {patient.dob && <span>DOB: {patient.dob}</span>}
                          {patient.phone && <span>{patient.phone}</span>}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-ink-300 group-hover:text-primary-600" />
                    </button>
                  ))}
                </div>
              )}

              {/* No Results */}
              {searchQuery.length >= 2 &&
                patients.length === 0 &&
                !isSearching && (
                  <div className="text-center py-8 text-ink-500">
                    No patients found matching "{searchQuery}"
                  </div>
                )}

              {/* Divider */}
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-surface-200"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-4 text-sm text-ink-400 font-medium">
                    or
                  </span>
                </div>
              </div>

              {/* New Patient Button */}
              <button
                onClick={() => setStep("new-patient")}
                className="w-full flex items-center justify-center gap-3 py-5 border-2 border-dashed border-surface-300 rounded-2xl hover:border-primary-400 hover:bg-primary-50 transition-all text-ink-600 hover:text-primary-700 group"
              >
                <div className="w-12 h-12 bg-surface-100 rounded-xl flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                  <UserPlus className="w-6 h-6" />
                </div>
                <span className="font-bold text-lg">Create New Patient</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: New Patient Form */}
        {step === "new-patient" && (
          <div className="card overflow-hidden">
            <div className="px-6 py-5 border-b border-surface-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-ink-800">New Patient</h2>
                <p className="text-sm text-ink-500 mt-1">
                  Enter patient information
                </p>
              </div>
              <button
                onClick={() => setStep("select")}
                className="btn-ghost text-sm"
              >
                Back to Search
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-ink-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" />
                  <input
                    type="text"
                    value={newPatient.full_name}
                    onChange={(e) =>
                      setNewPatient((prev) => ({
                        ...prev,
                        full_name: e.target.value,
                      }))
                    }
                    className="input pl-12"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-ink-700 mb-2">
                    Date of Birth
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" />
                    <input
                      type="date"
                      value={newPatient.dob}
                      onChange={(e) =>
                        setNewPatient((prev) => ({
                          ...prev,
                          dob: e.target.value,
                        }))
                      }
                      className="input pl-12"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ink-700 mb-2">
                    Phone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" />
                    <input
                      type="tel"
                      value={newPatient.phone}
                      onChange={(e) =>
                        setNewPatient((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                      className="input pl-12"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" />
                  <input
                    type="email"
                    value={newPatient.email}
                    onChange={(e) =>
                      setNewPatient((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    className="input pl-12"
                    placeholder="john@email.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-ink-700 mb-2">
                    Insurance Provider
                  </label>
                  <input
                    type="text"
                    value={newPatient.insurance_provider}
                    onChange={(e) =>
                      setNewPatient((prev) => ({
                        ...prev,
                        insurance_provider: e.target.value,
                      }))
                    }
                    className="input"
                    placeholder="Blue Cross"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ink-700 mb-2">
                    Insurance ID
                  </label>
                  <input
                    type="text"
                    value={newPatient.insurance_id}
                    onChange={(e) =>
                      setNewPatient((prev) => ({
                        ...prev,
                        insurance_id: e.target.value,
                      }))
                    }
                    className="input"
                    placeholder="ABC123456"
                  />
                </div>
              </div>

              <button
                onClick={handleCreateNewPatient}
                disabled={isLoading || !newPatient.full_name}
                className="w-full btn-primary py-4 text-lg mt-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Create Patient & Continue
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Reason for Visit */}
        {step === "reason" && selectedPatient && (
          <div className="space-y-6">
            {/* Selected Patient Card */}
            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center">
                    <User className="w-8 h-8 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-bold text-2xl text-ink-800">
                      {selectedPatient.full_name}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-ink-500 mt-1">
                      {selectedPatient.mrn && (
                        <span>MRN: {selectedPatient.mrn}</span>
                      )}
                      {selectedPatient.dob && (
                        <span>DOB: {selectedPatient.dob}</span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedPatient(null);
                    setStep("select");
                  }}
                  className="btn-ghost text-sm"
                >
                  Change
                </button>
              </div>

              {/* Visit Info */}
              <div className="mt-5 pt-5 border-t border-surface-200 flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-ink-400" />
                  <span className="text-sm text-ink-600">
                    {visitCount === 0 ? (
                      <span className="badge badge-sage">First Visit</span>
                    ) : (
                      <span className="font-semibold">
                        Visit #{visitCount + 1}
                      </span>
                    )}
                  </span>
                </div>
                {visitCount > 0 && (
                  <span className="text-sm text-ink-500">
                    Previous visits: {visitCount}
                  </span>
                )}
              </div>
            </div>

            {/* Reason for Visit */}
            <div className="card p-6">
              <h3 className="text-xl font-bold text-ink-800 mb-4">
                Reason for Visit
              </h3>
              <div className="relative">
                <FileText className="absolute left-4 top-4 w-5 h-5 text-ink-400" />
                <textarea
                  value={reasonForVisit}
                  onChange={(e) => setReasonForVisit(e.target.value)}
                  rows={4}
                  className="input pl-12 resize-none"
                  placeholder="Describe the reason for today's visit..."
                />
              </div>

              {/* Common reasons quick select */}
              <div className="mt-5">
                <p className="text-sm text-ink-500 font-medium mb-3">
                  Quick select:
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Annual checkup",
                    "Follow-up visit",
                    "New symptoms",
                    "Medication refill",
                    "Lab results review",
                    "Referral follow-up",
                  ].map((reason) => (
                    <button
                      key={reason}
                      onClick={() => setReasonForVisit(reason)}
                      className={`px-4 py-2 text-sm rounded-xl transition-all ${
                        reasonForVisit === reason
                          ? "bg-primary-100 text-primary-700 font-semibold"
                          : "bg-surface-100 text-ink-600 hover:bg-primary-50 hover:text-primary-600"
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={handleStartEncounter}
              disabled={isLoading || !reasonForVisit}
              className="w-full btn-primary py-5 text-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Starting Encounter...
                </>
              ) : (
                <>
                  <HeartPulse className="w-6 h-6" />
                  Start Encounter
                </>
              )}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
