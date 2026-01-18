"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";
import { startEncounter } from "@/lib/api";
import logo from "@/logo.png";
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
  Stethoscope,
  Shield,
  CheckCircle2,
  ChevronRight,
  History,
  Sparkles,
  Building2,
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

      // Store LiveKit credentials in sessionStorage for the encounter page
      if (result.livekitToken) {
        sessionStorage.setItem(`livekit_token_${result.encounterId}`, result.livekitToken);
      }
      if (result.roomName) {
        sessionStorage.setItem(`livekit_room_${result.encounterId}`, result.roomName);
      }

      router.push(`/encounter/${result.encounterId}`);
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50/30 via-white to-accent-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 bg-primary-100 rounded-3xl animate-pulse"></div>
            <div className="absolute inset-2 bg-white rounded-3xl flex items-center justify-center">
              <Stethoscope className="w-12 h-12 text-primary-600" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center shadow-lg">
              <Loader2 className="w-6 h-6 animate-spin text-white" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-ink-800 mb-2">Loading Echo Health</h2>
          <p className="text-ink-500">Preparing your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50/30 via-white to-accent-50/30">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-2xl border-b border-primary-100/50 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link
              href="/dashboard"
              className="group flex items-center gap-2.5 px-4 py-2.5 text-ink-600 hover:text-primary-600 bg-white hover:bg-primary-50 rounded-xl transition-all border border-primary-100 hover:border-primary-200 shadow-sm hover:shadow"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span className="font-semibold text-sm">Back to Dashboard</span>
            </Link>
            
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 rounded-2xl flex items-center justify-center shadow-lg">
                <Stethoscope className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-ink-900 leading-tight">New Patient Encounter</h1>
                <p className="text-xs text-ink-500 leading-tight">Healthcare documentation workflow</p>
              </div>
            </div>

            <div className="w-40"></div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 lg:px-8 py-10">
        {/* Error Alert */}
        {error && (
          <div className="mb-8 bg-white border-l-4 border-red-500 rounded-2xl shadow-lg overflow-hidden">
            <div className="flex items-start gap-4 p-6">
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1 pt-1">
                <h3 className="font-bold text-red-900 text-lg mb-1">Error</h3>
                <p className="text-sm text-red-700 leading-relaxed">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex items-center justify-center gap-3">
            {/* Step 1 */}
            <div className={`group relative ${step === "select" || step === "new-patient" ? "scale-105" : ""} transition-transform`}>
              <div
                className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${
                  step === "select" || step === "new-patient"
                    ? "bg-white shadow-xl border-2 border-primary-300"
                    : step === "reason"
                    ? "bg-white/80 shadow-md border-2 border-emerald-200"
                    : "bg-white/60 shadow border-2 border-slate-200"
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg transition-all ${
                    step === "select" || step === "new-patient"
                      ? "bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg"
                      : step === "reason"
                      ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-md"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {step === "reason" ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <User className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <p
                    className={`text-base font-bold leading-tight ${
                      step === "select" || step === "new-patient"
                        ? "text-primary-700"
                        : step === "reason"
                        ? "text-emerald-700"
                        : "text-slate-500"
                    }`}
                  >
                    Patient Selection
                  </p>
                  <p className="text-xs text-ink-500 leading-tight mt-0.5">Identify or register patient</p>
                </div>
              </div>
            </div>

            {/* Connector */}
            <div className="flex items-center">
              <div className={`w-16 h-1 rounded-full transition-colors ${step === "reason" ? "bg-emerald-300" : "bg-slate-200"}`}></div>
            </div>

            {/* Step 2 */}
            <div className={`group relative ${step === "reason" ? "scale-105" : ""} transition-transform`}>
              <div
                className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${
                  step === "reason"
                    ? "bg-white shadow-xl border-2 border-primary-300"
                    : "bg-white/60 shadow border-2 border-slate-200"
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg transition-all ${
                    step === "reason"
                      ? "bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <p
                    className={`text-base font-bold leading-tight ${
                      step === "reason" ? "text-primary-700" : "text-slate-500"
                    }`}
                  >
                    Visit Details
                  </p>
                  <p className="text-xs text-ink-500 leading-tight mt-0.5">Document chief complaint</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 1: Select or Create Patient */}
        {step === "select" && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-primary-100">
              {/* Header */}
              <div className="relative bg-gradient-to-br from-primary-50 via-indigo-50 to-purple-50 px-10 py-8 border-b border-primary-100/50">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 rounded-full blur-3xl"></div>
                <div className="relative">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-xl">
                      <Search className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-ink-900">Find Your Patient</h2>
                      <p className="text-ink-600 mt-1">Search existing records or register a new patient</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-10">
                {/* Search Box */}
                <div className="relative mb-8">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Search className="w-6 h-6 text-ink-400" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by patient name, MRN, or phone number..."
                    className="w-full h-16 pl-16 pr-16 bg-gradient-to-r from-primary-50/50 to-accent-50/50 border-2 border-primary-200 rounded-2xl text-ink-900 placeholder-ink-400 focus:outline-none focus:border-primary-400 focus:from-white focus:to-white transition-all text-lg font-medium shadow-inner"
                    autoFocus
                  />
                  {isSearching && (
                    <div className="absolute right-6 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                    </div>
                  )}
                </div>

                {/* Search Results */}
                {patients.length > 0 && (
                  <div className="mb-10">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-1.5 h-6 bg-gradient-to-b from-primary-500 to-primary-600 rounded-full"></div>
                      <h3 className="text-sm font-bold text-ink-700 uppercase tracking-wider">
                        Found {patients.length} {patients.length === 1 ? "Patient" : "Patients"}
                      </h3>
                    </div>
                    <div className="space-y-3">
                      {patients.map((patient) => (
                        <button
                          key={patient.id}
                          onClick={() => handleSelectPatient(patient)}
                          className="group w-full flex items-center gap-6 p-6 bg-gradient-to-r from-slate-50/50 to-transparent border-2 border-slate-200 hover:border-primary-300 rounded-2xl hover:shadow-xl hover:from-primary-50/30 hover:to-accent-50/30 transition-all text-left"
                        >
                          <div className="w-20 h-20 bg-white border-2 border-slate-200 group-hover:border-primary-300 rounded-2xl flex items-center justify-center group-hover:bg-gradient-to-br group-hover:from-primary-50 group-hover:to-accent-50 transition-all flex-shrink-0 shadow-sm">
                            <User className="w-10 h-10 text-primary-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-ink-900 text-xl mb-2">
                              {patient.full_name}
                            </p>
                            <div className="flex items-center gap-5 text-sm text-ink-600">
                              {patient.mrn && (
                                <span className="flex items-center gap-2 font-medium">
                                  <Shield className="w-4 h-4 text-ink-400" />
                                  {patient.mrn}
                                </span>
                              )}
                              {patient.dob && (
                                <span className="flex items-center gap-2 font-medium">
                                  <Calendar className="w-4 h-4 text-ink-400" />
                                  {patient.dob}
                                </span>
                              )}
                              {patient.phone && (
                                <span className="flex items-center gap-2 font-medium">
                                  <Phone className="w-4 h-4 text-ink-400" />
                                  {patient.phone}
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-7 h-7 text-ink-300 group-hover:text-primary-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Results */}
                {searchQuery.length >= 2 &&
                  patients.length === 0 &&
                  !isSearching && (
                    <div className="text-center py-16 px-6">
                      <div className="w-24 h-24 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-5">
                        <Search className="w-12 h-12 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-bold text-ink-700 mb-2">No Patients Found</h3>
                      <p className="text-ink-500">
                        No results match "<span className="font-semibold">{searchQuery}</span>"
                      </p>
                      <p className="text-sm text-ink-400 mt-2">Try a different search term or register a new patient below</p>
                    </div>
                  )}

                {/* Divider */}
                <div className="relative my-12">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t-2 border-dashed border-slate-200"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-6 py-2 text-sm text-ink-600 font-bold uppercase tracking-wider rounded-full border-2 border-slate-200">
                      or create new record
                    </span>
                  </div>
                </div>

                {/* New Patient Button */}
                <button
                  onClick={() => setStep("new-patient")}
                  className="group w-full flex items-center justify-center gap-5 py-8 border-3 border-dashed border-primary-300 hover:border-primary-400 rounded-2xl bg-gradient-to-br from-primary-50/30 to-accent-50/30 hover:from-primary-50 hover:to-accent-50 transition-all shadow-sm hover:shadow-lg"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                    <UserPlus className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-xl text-primary-700 leading-tight">Register New Patient</p>
                    <p className="text-sm text-ink-600 leading-tight mt-1">Create a new patient record in the system</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: New Patient Form */}
        {step === "new-patient" && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-primary-100">
              {/* Header */}
              <div className="relative bg-gradient-to-br from-primary-50 via-indigo-50 to-purple-50 px-10 py-8 border-b border-primary-100/50">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 rounded-full blur-3xl"></div>
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-xl">
                      <UserPlus className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-ink-900">Patient Registration</h2>
                      <p className="text-ink-600 mt-1">Enter patient information to create a new record</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setStep("select")}
                    className="group px-5 py-2.5 text-sm font-semibold text-ink-600 hover:text-primary-600 bg-white hover:bg-primary-50 rounded-xl transition-all border border-primary-200 hover:border-primary-200 shadow-sm hover:shadow flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                    Back
                  </button>
                </div>
              </div>

              <div className="p-10 space-y-8">
                {/* Personal Information Section */}
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1.5 h-7 bg-gradient-to-b from-primary-500 to-primary-600 rounded-full"></div>
                    <h3 className="text-lg font-bold text-ink-800 uppercase tracking-wide">Personal Information</h3>
                  </div>

                  <div className="space-y-6">
                    {/* Full Name */}
                    <div>
                      <label className="block text-sm font-bold text-ink-800 mb-3 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newPatient.full_name}
                        onChange={(e) =>
                          setNewPatient((prev) => ({
                            ...prev,
                            full_name: e.target.value,
                          }))
                        }
                        className="w-full h-14 px-5 bg-gradient-to-r from-primary-50/30 to-accent-50/30 border-2 border-primary-200 rounded-xl text-ink-900 placeholder-ink-400 focus:outline-none focus:border-primary-400 focus:from-white focus:to-white transition-all text-base font-medium shadow-inner"
                        placeholder="Enter patient's full legal name"
                      />
                    </div>

                    {/* DOB and Phone */}
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-ink-800 mb-3 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Date of Birth
                        </label>
                        <input
                          type="date"
                          value={newPatient.dob}
                          onChange={(e) =>
                            setNewPatient((prev) => ({
                              ...prev,
                              dob: e.target.value,
                            }))
                          }
                          className="w-full h-14 px-5 bg-gradient-to-r from-primary-50/30 to-accent-50/30 border-2 border-primary-200 rounded-xl text-ink-900 focus:outline-none focus:border-primary-400 focus:from-white focus:to-white transition-all text-base font-medium shadow-inner"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-ink-800 mb-3 flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={newPatient.phone}
                          onChange={(e) =>
                            setNewPatient((prev) => ({
                              ...prev,
                              phone: e.target.value,
                            }))
                          }
                          className="w-full h-14 px-5 bg-gradient-to-r from-primary-50/30 to-accent-50/30 border-2 border-primary-200 rounded-xl text-ink-900 placeholder-ink-400 focus:outline-none focus:border-primary-400 focus:from-white focus:to-white transition-all text-base font-medium shadow-inner"
                          placeholder="(555) 123-4567"
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-bold text-ink-800 mb-3 flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={newPatient.email}
                        onChange={(e) =>
                          setNewPatient((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        className="w-full h-14 px-5 bg-gradient-to-r from-primary-50/30 to-accent-50/30 border-2 border-primary-200 rounded-xl text-ink-900 placeholder-ink-400 focus:outline-none focus:border-primary-400 focus:from-white focus:to-white transition-all text-base font-medium shadow-inner"
                        placeholder="patient@email.com"
                      />
                    </div>
                  </div>
                </div>

                {/* Insurance Information Section */}
                <div className="pt-8 border-t-2 border-dashed border-slate-200">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1.5 h-7 bg-gradient-to-b from-primary-500 to-indigo-600 rounded-full"></div>
                    <h3 className="text-lg font-bold text-ink-800 uppercase tracking-wide">Insurance Information</h3>
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full uppercase">Optional</span>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-ink-800 mb-3 flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
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
                        className="w-full h-14 px-5 bg-gradient-to-r from-primary-50/30 to-accent-50/30 border-2 border-primary-200 rounded-xl text-ink-900 placeholder-ink-400 focus:outline-none focus:border-primary-400 focus:from-white focus:to-white transition-all text-base font-medium shadow-inner"
                        placeholder="e.g., Blue Cross Blue Shield"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-ink-800 mb-3 flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Member ID / Policy Number
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
                        className="w-full h-14 px-5 bg-gradient-to-r from-primary-50/30 to-accent-50/30 border-2 border-primary-200 rounded-xl text-ink-900 placeholder-ink-400 focus:outline-none focus:border-primary-400 focus:from-white focus:to-white transition-all text-base font-medium shadow-inner"
                        placeholder="ABC123456789"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div className="pt-8">
                  <button
                    onClick={handleCreateNewPatient}
                    disabled={isLoading || !newPatient.full_name}
                    className="group w-full h-16 bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700 hover:from-primary-600 hover:via-primary-700 hover:to-primary-800 disabled:from-slate-300 disabled:via-slate-300 disabled:to-slate-400 text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl disabled:shadow-none transition-all flex items-center justify-center gap-3 text-lg disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-7 h-7 animate-spin" />
                        <span>Creating Patient Record...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-7 h-7 group-hover:scale-110 transition-transform" />
                        <span>Create Patient & Continue</span>
                        <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Reason for Visit */}
        {step === "reason" && selectedPatient && (
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Selected Patient Card */}
            <div className="bg-white rounded-3xl shadow-lg overflow-hidden border border-emerald-100">
              <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div className="w-24 h-24 bg-white border-3 border-emerald-200 rounded-3xl flex items-center justify-center shadow-xl">
                        <User className="w-12 h-12 text-emerald-600" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-3xl text-ink-900">
                          {selectedPatient.full_name}
                        </h3>
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full uppercase flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Verified
                        </span>
                      </div>
                      <div className="flex items-center gap-6 text-base text-ink-600">
                        {selectedPatient.mrn && (
                          <span className="flex items-center gap-2 font-semibold">
                            <Shield className="w-4 h-4 text-ink-400" />
                            {selectedPatient.mrn}
                          </span>
                        )}
                        {selectedPatient.dob && (
                          <span className="flex items-center gap-2 font-semibold">
                            <Calendar className="w-4 h-4 text-ink-400" />
                            {selectedPatient.dob}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedPatient(null);
                      setStep("select");
                    }}
                    className="group px-5 py-2.5 text-sm font-semibold text-ink-600 hover:text-primary-600 bg-white hover:bg-primary-50 rounded-xl transition-all border border-emerald-200 hover:border-primary-200 shadow-sm hover:shadow flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                    Change Patient
                  </button>
                </div>

                {/* Visit Info */}
                <div className="mt-6 pt-6 border-t border-emerald-200 flex items-center gap-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                      <History className="w-5 h-5 text-emerald-600" />
                    </div>
                    {visitCount === 0 ? (
                      <div>
                        <p className="text-sm font-bold text-ink-700 uppercase tracking-wide">First Visit</p>
                        <p className="text-xs text-ink-500">No previous encounters</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-bold text-ink-700 uppercase tracking-wide">Visit #{visitCount + 1}</p>
                        <p className="text-xs text-ink-500">{visitCount} previous {visitCount === 1 ? "visit" : "visits"} on record</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Reason for Visit */}
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-primary-100">
              <div className="relative bg-gradient-to-br from-primary-50 via-indigo-50 to-purple-50 px-10 py-8 border-b border-primary-100/50">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 rounded-full blur-3xl"></div>
                <div className="relative flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-xl">
                    <FileText className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-ink-900">Chief Complaint</h3>
                    <p className="text-ink-600 mt-1">Document the primary reason for this visit</p>
                  </div>
                </div>
              </div>

              <div className="p-10">
                {/* Textarea */}
                <div className="relative mb-8">
                  <textarea
                    value={reasonForVisit}
                    onChange={(e) => setReasonForVisit(e.target.value)}
                    rows={6}
                    className="w-full px-6 py-5 bg-gradient-to-r from-primary-50/30 to-accent-50/30 border-2 border-primary-200 rounded-2xl text-ink-900 placeholder-ink-400 focus:outline-none focus:border-primary-400 focus:from-white focus:to-white transition-all resize-none text-base font-medium leading-relaxed shadow-inner"
                    placeholder="Enter the primary reason for today's visit. Include any specific symptoms, concerns, or requested services that brought the patient in..."
                  />
                  <div className="absolute bottom-5 right-6 px-3 py-1 bg-white/80 backdrop-blur-sm rounded-lg text-xs text-ink-500 font-semibold border border-primary-100">
                    {reasonForVisit.length} characters
                  </div>
                </div>

                {/* Common Reasons - Quick Select */}
                <div>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-1.5 h-6 bg-gradient-to-b from-primary-500 to-primary-600 rounded-full"></div>
                    <h4 className="text-sm font-bold text-ink-800 uppercase tracking-wider">Quick Select Common Reasons</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      "Annual physical examination",
                      "Follow-up appointment",
                      "New symptom evaluation",
                      "Medication refill request",
                      "Lab results consultation",
                      "Specialist referral follow-up",
                      "Preventive care screening",
                      "Chronic condition management",
                    ].map((reason) => (
                      <button
                        key={reason}
                        onClick={() => setReasonForVisit(reason)}
                        className={`px-5 py-4 text-sm font-semibold rounded-xl transition-all border-2 text-left ${
                          reasonForVisit === reason
                            ? "bg-gradient-to-r from-primary-500 to-primary-600 border-primary-500 text-white shadow-lg"
                            : "bg-white border-primary-200 text-ink-700 hover:border-primary-300 hover:bg-gradient-to-r hover:from-primary-50 hover:to-accent-50"
                        }`}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Start Encounter Button */}
            <div className="relative pt-4">
              <button
                onClick={handleStartEncounter}
                disabled={isLoading || !reasonForVisit}
                className="group w-full h-20 bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700 hover:from-primary-600 hover:via-primary-700 hover:to-primary-800 disabled:from-slate-300 disabled:via-slate-300 disabled:to-slate-400 text-white font-bold rounded-2xl shadow-2xl hover:shadow-3xl disabled:shadow-none transition-all flex items-center justify-center gap-4 text-xl disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span>Starting Encounter...</span>
                  </>
                ) : (
                  <>
                    <Stethoscope className="w-8 h-8 group-hover:scale-110 transition-transform" />
                    <span>Begin Patient Encounter</span>
                    <ChevronRight className="w-7 h-7 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
