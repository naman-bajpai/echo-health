"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";
import { startEncounter, uploadEhrTemplate, generateQuestions, getUserTemplates } from "@/lib/api";
import TemplateUpload from "@/components/TemplateUpload";
import logo from "@/logo.png";
import { validateEmail, validatePhone } from "@/lib/utils";
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
  Stethoscope,
  Shield,
  CheckCircle2,
  ChevronRight,
  History,
  Sparkles,
  Building2,
  ListChecks,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { Patient } from "@/lib/types";

export default function NewEncounterPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [step, setStep] = useState<"select" | "new-patient" | "template" | "reason">("select");
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [reasonForVisit, setReasonForVisit] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [showQuestionsPreview, setShowQuestionsPreview] = useState(true);

  // Load templates on mount
  useEffect(() => {
    const loadTemplates = async () => {
      setIsLoadingTemplates(true);
      try {
        const { data, error } = await supabase
          .from("ehr_templates")
          .select("id, template_name, created_at")
          .order("created_at", { ascending: false });
        if (error) throw error;
        setTemplates(data || []);
      } catch (error) {
        console.error("Error loading templates:", error);
      } finally {
        setIsLoadingTemplates(false);
      }
    };
    loadTemplates();
  }, []);

  const validateNewPatient = () => {
    const errors: Record<string, string> = {};
    if (!newPatient.full_name.trim()) errors.full_name = "Full name is required";
    if (!newPatient.dob) errors.dob = "Birth date is required";
    
    // Validate email if provided
    if (newPatient.email) {
      const emailValidation = validateEmail(newPatient.email);
      if (!emailValidation.valid) {
        errors.email = emailValidation.error || "Invalid email format";
      }
    }

    // Validate phone if provided
    if (newPatient.phone) {
      const phoneValidation = validatePhone(newPatient.phone);
      if (!phoneValidation.valid) {
        errors.phone = phoneValidation.error || "Invalid phone format";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  useEffect(() => {
    if (!authLoading && !user) router.push("/");
  }, [authLoading, user, router]);

  useEffect(() => {
    const searchPatients = async () => {
      if (!searchQuery || searchQuery.length < 2) {
        setPatients([]);
        return;
      }
      setIsSearching(true);
      const { data } = await supabase
        .from("patients")
        .select("*")
        .or(`full_name.ilike.%${searchQuery}%,mrn.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
        .limit(10);
      if (data) setPatients(data);
      setIsSearching(false);
    };
    const debounce = setTimeout(searchPatients, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

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

  const handleTemplateUploaded = async (templateId: string, questions: any[]) => {
    setSelectedTemplateId(templateId);
    setGeneratedQuestions(questions);
    // Auto-advance to reason step
    setStep("reason");
  };

  const handleTemplateSelected = async (templateId: string, questions: any[]) => {
    setSelectedTemplateId(templateId || null);
    setGeneratedQuestions(questions);
    // Auto-advance to reason step
    setStep("reason");
  };

  const handleStartEncounter = async () => {
    if (!reasonForVisit.trim()) {
      setFieldErrors({ reasonForVisit: "Please enter a reason for visit" });
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
        user?.id,
        selectedTemplateId || undefined
      );
      
      // If template was selected, generate questions for this encounter
      if (selectedTemplateId && result.encounterId) {
        try {
          await generateQuestions(selectedTemplateId, result.encounterId);
        } catch (err) {
          console.error("Failed to generate questions:", err);
          // Don't fail the encounter creation if questions fail
        }
      }
      
      if (result.livekitToken) sessionStorage.setItem(`livekit_token_${result.encounterId}`, result.livekitToken);
      if (result.roomName) sessionStorage.setItem(`livekit_room_${result.encounterId}`, result.roomName);
      router.push(`/encounter/${result.encounterId}`);
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50 font-sans text-ink-900 pb-20">
      {/* Navbar */}
      <nav className="h-20 bg-white/80 backdrop-blur-md border-b border-surface-200 sticky top-0 z-50 px-8">
        <div className="max-w-5xl mx-auto h-full flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg border border-surface-200 flex items-center justify-center group-hover:bg-surface-50 transition-colors">
              <ArrowLeft className="w-4 h-4 text-ink-400 group-hover:text-ink-900" />
            </div>
            <span className="text-sm font-bold text-ink-400 group-hover:text-ink-900 transition-colors">Return to Dashboard</span>
          </Link>
          <Image src={logo} alt="Echo Health" width={100} height={28} className="h-7 w-auto opacity-80" />
          <div className="w-32" />
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-8 py-16">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-6 bg-primary-500 rounded-full" />
            <span className="text-xs font-black text-primary-500 uppercase tracking-widest">New Session</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-ink-900">Initiate Encounter</h1>
          <p className="text-ink-400 font-medium mt-2">Identify the patient and document the primary reason for visit.</p>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center gap-4 mb-16">
          <div className={`flex items-center gap-3 px-4 py-2 rounded-2xl border transition-all ${step === 'select' || step === 'new-patient' ? "bg-white border-primary-200 shadow-soft" : "bg-surface-100 border-transparent opacity-50"}`}>
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${step === 'select' || step === 'new-patient' ? "bg-primary-500 text-white" : "bg-ink-200 text-ink-400"}`}>1</div>
            <span className="text-xs font-bold uppercase tracking-widest">Patient</span>
          </div>
          <div className="w-8 h-px bg-surface-200" />
          <div className={`flex items-center gap-3 px-4 py-2 rounded-2xl border transition-all ${step === 'template' ? "bg-white border-primary-200 shadow-soft" : "bg-surface-100 border-transparent opacity-50"}`}>
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${step === 'template' ? "bg-primary-500 text-white" : "bg-ink-200 text-ink-400"}`}>2</div>
            <span className="text-xs font-bold uppercase tracking-widest">Template</span>
          </div>
          <div className="w-8 h-px bg-surface-200" />
          <div className={`flex items-center gap-3 px-4 py-2 rounded-2xl border transition-all ${step === 'reason' ? "bg-white border-primary-200 shadow-soft" : "bg-surface-100 border-transparent opacity-50"}`}>
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${step === 'reason' ? "bg-primary-500 text-white" : "bg-ink-200 text-ink-400"}`}>3</div>
            <span className="text-xs font-bold uppercase tracking-widest">Visit Context</span>
          </div>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 animate-fade-in">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-bold">{error}</p>
          </div>
        )}

        {/* Step 1: Select or Create Patient */}
        {step === "select" && (
          <div className="space-y-10 animate-fade-in">
            <section className="bg-white rounded-[2.5rem] p-10 border border-surface-200 shadow-soft-xl">
              <h3 className="text-lg font-bold text-ink-900 mb-8">Search Patient Registry</h3>
              <div className="relative mb-8">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-300" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter name, MRN, or phone..."
                  className="w-full h-16 pl-14 pr-6 bg-surface-50 border border-surface-200 rounded-2xl text-lg font-medium focus:ring-4 ring-primary-50 outline-none border-primary-100 transition-all"
                  autoFocus
                />
                {isSearching && <Loader2 className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-500 animate-spin" />}
              </div>

              {patients.length > 0 && (
                <div className="space-y-3">
                  {patients.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedPatient(p); setStep("template"); }}
                      className="w-full flex items-center justify-between p-5 bg-white border border-surface-100 rounded-2xl hover:border-primary-300 hover:shadow-soft transition-all group"
                    >
                      <div className="flex items-center gap-4 text-left">
                        <div className="w-12 h-12 rounded-xl bg-surface-50 flex items-center justify-center group-hover:bg-primary-50 transition-colors">
                          <User className="w-6 h-6 text-ink-400 group-hover:text-primary-500 transition-colors" />
                        </div>
                        <div>
                          <p className="font-bold text-ink-900">{p.full_name}</p>
                          <p className="text-[10px] font-bold text-ink-300 uppercase tracking-widest mt-0.5">{p.mrn} • {p.dob}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-ink-200 group-hover:text-primary-500 transition-all" />
                    </button>
                  ))}
                </div>
              )}
            </section>

            <div className="text-center">
              <span className="text-xs font-black text-ink-200 uppercase tracking-[0.3em]">or</span>
            </div>

            <button
              onClick={() => setStep("new-patient")}
              className="w-full flex items-center justify-center gap-4 p-8 bg-white border-2 border-dashed border-surface-200 rounded-[2.5rem] hover:border-primary-300 hover:bg-primary-50/30 transition-all group"
            >
              <div className="w-12 h-12 rounded-2xl bg-surface-50 flex items-center justify-center group-hover:bg-white group-hover:shadow-soft transition-all">
                <UserPlus className="w-6 h-6 text-ink-400 group-hover:text-primary-500" />
              </div>
              <div className="text-left">
                <p className="font-bold text-ink-900">Register New Patient</p>
                <p className="text-sm text-ink-400 font-medium">Create a new electronic health record</p>
              </div>
            </button>
          </div>
        )}

        {/* New Patient Form */}
        {step === "new-patient" && (
          <div className="bg-white rounded-[2.5rem] p-10 border border-surface-200 shadow-soft-xl animate-fade-in">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-xl font-bold text-ink-900">New Patient Details</h3>
              <button onClick={() => setStep("select")} className="text-xs font-black text-primary-500 uppercase tracking-widest hover:text-primary-600 transition-colors">Cancel</button>
            </div>

            <div className="space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-ink-400 uppercase tracking-widest ml-1">Full Legal Name</label>
                <input
                  type="text"
                  value={newPatient.full_name}
                  onChange={(e) => {
                    setNewPatient({ ...newPatient, full_name: e.target.value });
                    if (fieldErrors.full_name) setFieldErrors({ ...fieldErrors, full_name: "" });
                  }}
                  className={`w-full h-14 px-5 bg-surface-50 border ${fieldErrors.full_name ? "border-red-500 ring-2 ring-red-50" : "border-surface-200"} rounded-2xl font-bold focus:ring-4 ring-primary-50 outline-none focus:border-primary-200 transition-all`}
                  placeholder="e.g. Johnathan Doe"
                />
                {fieldErrors.full_name && <p className="text-2xs font-bold text-red-500 ml-1 uppercase tracking-wider">{fieldErrors.full_name}</p>}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-ink-400 uppercase tracking-widest ml-1">Birth Date</label>
                  <input
                    type="date"
                    value={newPatient.dob}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => {
                      setNewPatient({ ...newPatient, dob: e.target.value });
                      if (fieldErrors.dob) setFieldErrors({ ...fieldErrors, dob: "" });
                    }}
                    className={`w-full h-14 px-5 bg-surface-50 border ${fieldErrors.dob ? "border-red-500 ring-2 ring-red-50" : "border-surface-200"} rounded-2xl font-bold focus:ring-4 ring-primary-50 outline-none focus:border-primary-200 transition-all`}
                  />
                  {fieldErrors.dob && <p className="text-2xs font-bold text-red-500 ml-1 uppercase tracking-wider">{fieldErrors.dob}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-ink-400 uppercase tracking-widest ml-1">Phone Contact</label>
                  <input
                    type="tel"
                    value={newPatient.phone}
                    onChange={(e) => {
                      setNewPatient({ ...newPatient, phone: e.target.value });
                      if (fieldErrors.phone) setFieldErrors({ ...fieldErrors, phone: "" });
                    }}
                    className={`w-full h-14 px-5 bg-surface-50 border ${fieldErrors.phone ? "border-red-500 ring-2 ring-red-50" : "border-surface-200"} rounded-2xl font-bold focus:ring-4 ring-primary-50 outline-none focus:border-primary-200 transition-all`}
                    placeholder="(555) 000-0000"
                  />
                  {fieldErrors.phone && <p className="text-2xs font-bold text-red-500 ml-1 uppercase tracking-wider">{fieldErrors.phone}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-ink-400 uppercase tracking-widest ml-1">Email Address (Optional)</label>
                <input
                  type="email"
                  value={newPatient.email}
                  onChange={(e) => {
                    setNewPatient({ ...newPatient, email: e.target.value });
                    if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: "" });
                  }}
                  className={`w-full h-14 px-5 bg-surface-50 border ${fieldErrors.email ? "border-red-500 ring-2 ring-red-50" : "border-surface-200"} rounded-2xl font-bold focus:ring-4 ring-primary-50 outline-none focus:border-primary-200 transition-all`}
                  placeholder="patient@example.com"
                />
                {fieldErrors.email && <p className="text-2xs font-bold text-red-500 ml-1 uppercase tracking-wider">{fieldErrors.email}</p>}
              </div>

              <button
                onClick={async () => {
                  if (!validateNewPatient()) return;
                  setIsLoading(true);
                  try {
                    const mrn = `MRN-${Math.random().toString(36).substring(7).toUpperCase()}`;
                    const { data, error } = await supabase.from("patients").insert({ ...newPatient, mrn }).select().single();
                    if (error) throw error;
                    setSelectedPatient(data);
                    setStep("template");
                  } catch (e: any) { setError(e.message); } finally { setIsLoading(false); }
                }}
                disabled={isLoading}
                className="w-full h-16 bg-ink-900 text-white rounded-2xl font-bold shadow-glow hover:bg-black transition-all flex items-center justify-center gap-3 mt-4"
              >
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Verify & Continue"}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Template Selection */}
        {step === "template" && selectedPatient && (
          <div className="space-y-10 animate-fade-in">
            <section className="bg-white rounded-[2.5rem] p-10 border border-surface-200 shadow-soft-xl">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-500 flex items-center justify-center shadow-glow">
                    <FileText className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-ink-900">EHR Template</h3>
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mt-1">
                      {selectedPatient.full_name} • Visit #{visitCount + 1}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => { setStep("select"); setSelectedTemplateId(null); setGeneratedQuestions([]); }} 
                  className="text-xs font-black text-ink-300 hover:text-ink-900 transition-colors uppercase tracking-widest"
                >
                  Change Patient
                </button>
              </div>

              <TemplateUpload
                onTemplateUploaded={handleTemplateUploaded}
                onTemplateSelected={handleTemplateSelected}
                existingTemplates={templates}
              />

              {selectedTemplateId && generatedQuestions.length > 0 && (
                <div className="mt-8 p-6 bg-emerald-50 border border-emerald-200 rounded-2xl">
                  <div className="flex items-center gap-3 mb-3">
                    <Sparkles className="w-5 h-5 text-emerald-600" />
                    <p className="font-bold text-emerald-900">
                      {generatedQuestions.length} questions generated
                    </p>
                  </div>
                  <p className="text-sm text-emerald-700">
                    These questions will guide your conversation with the patient.
                  </p>
                </div>
              )}

              <div className="flex items-center gap-3 mt-8">
                <button
                  onClick={() => {
                    setSelectedTemplateId(null);
                    setGeneratedQuestions([]);
                    setStep("reason");
                  }}
                  className="flex-1 h-14 bg-surface-100 text-ink-700 rounded-2xl font-bold hover:bg-surface-200 transition-all flex items-center justify-center gap-3"
                >
                  Skip Template
                </button>
                <button
                  onClick={() => setStep("reason")}
                  className="flex-1 h-14 bg-primary-500 text-white rounded-2xl font-bold hover:bg-primary-600 transition-all flex items-center justify-center gap-3"
                >
                  Continue to Visit Details
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </section>
          </div>
        )}

        {/* Step 3: Visit Details */}
        {step === "reason" && selectedPatient && (
          <div className="space-y-10 animate-fade-in">
            <section className="bg-white rounded-[2.5rem] p-10 border border-surface-200 shadow-soft-xl">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-[1.5rem] bg-primary-500 flex items-center justify-center shadow-glow">
                    <User className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-ink-900">{selectedPatient.full_name}</h3>
                    <p className="text-[10px] font-black text-primary-500 uppercase tracking-[0.2em] mt-1">Visit #{visitCount + 1} • {selectedPatient.mrn}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {selectedTemplateId && (
                    <div className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold">
                      Template Selected
                    </div>
                  )}
                  <button onClick={() => { setSelectedPatient(null); setStep("select"); setSelectedTemplateId(null); setGeneratedQuestions([]); }} className="text-xs font-black text-ink-300 hover:text-ink-900 transition-colors uppercase tracking-widest">Change Patient</button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-ink-400 uppercase tracking-widest ml-1">Chief Complaint / Visit Context</label>
                <textarea
                  value={reasonForVisit}
                  onChange={(e) => {
                    setReasonForVisit(e.target.value);
                    if (fieldErrors.reasonForVisit) setFieldErrors({ ...fieldErrors, reasonForVisit: "" });
                  }}
                  rows={5}
                  className={`w-full p-6 bg-surface-50 border ${fieldErrors.reasonForVisit ? "border-red-500 ring-2 ring-red-50" : "border-surface-200"} rounded-3xl font-medium text-lg focus:ring-4 ring-primary-50 outline-none focus:border-primary-200 transition-all resize-none`}
                  placeholder="What is the primary reason for today's visit?"
                />
                {fieldErrors.reasonForVisit && <p className="text-2xs font-bold text-red-500 ml-1 uppercase tracking-wider">{fieldErrors.reasonForVisit}</p>}
              </div>

              <div className="mt-10 grid grid-cols-2 gap-3">
                {[
                  "Annual physical examination",
                  "New symptom evaluation",
                  "Chronic condition follow-up",
                  "Preventive care visit",
                ].map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setReasonForVisit(r);
                      if (fieldErrors.reasonForVisit) setFieldErrors({ ...fieldErrors, reasonForVisit: "" });
                    }}
                    className={`p-4 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all border ${
                      reasonForVisit === r ? "bg-primary-500 text-white border-primary-500 shadow-glow" : "bg-white text-ink-400 border-surface-200 hover:border-primary-200 hover:text-primary-500"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </section>

            {/* Generated Questions Preview */}
            {generatedQuestions.length > 0 && (
              <section className="bg-white rounded-[2.5rem] border border-surface-200 shadow-soft-xl overflow-hidden animate-fade-in">
                <button
                  onClick={() => setShowQuestionsPreview(!showQuestionsPreview)}
                  className="w-full flex items-center justify-between p-6 bg-primary-50 hover:bg-primary-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary-500 flex items-center justify-center">
                      <ListChecks className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-ink-900 text-lg">
                        Generated Questions ({generatedQuestions.length})
                      </p>
                      <p className="text-xs text-ink-500">
                        Review questions that will guide your conversation
                      </p>
                    </div>
                  </div>
                  {showQuestionsPreview ? (
                    <ChevronUp className="w-5 h-5 text-primary-600" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-primary-600" />
                  )}
                </button>

                {showQuestionsPreview && (
                  <div className="p-6 bg-white max-h-96 overflow-y-auto space-y-4">
                    {/* Group questions by category */}
                    {(Object.entries(
                      generatedQuestions.reduce((acc, q) => {
                        const category = q.category || "other";
                        if (!acc[category]) acc[category] = [];
                        acc[category].push(q);
                        return acc;
                      }, {} as Record<string, any[]>)
                    ) as [string, any[]][]).map(([category, questions]) => (
                      <div key={category} className="space-y-3">
                        <h5 className="text-xs font-bold text-ink-400 uppercase tracking-wider">
                          {category.replace(/_/g, " ")}
                        </h5>
                        <div className="space-y-2">
                          {questions.map((q, idx) => (
                            <div
                              key={q.id || idx}
                              className="flex items-start gap-3 p-4 bg-surface-50 rounded-xl border border-surface-200"
                            >
                              <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                                q.required
                                  ? "bg-red-100 text-red-700 border border-red-200"
                                  : "bg-surface-200 text-ink-500"
                              }`}>
                                {q.required ? "!" : "?"}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-ink-900">
                                  {q.question}
                                </p>
                                {q.field_mapping && (
                                  <p className="text-xs text-ink-400 mt-1">
                                    Maps to: <span className="font-mono">{q.field_mapping}</span>
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            <button
              onClick={handleStartEncounter}
              disabled={isLoading}
              className="w-full h-20 bg-ink-900 text-white rounded-[2.5rem] font-bold shadow-soft-xl hover:bg-black hover:-translate-y-1 transition-all flex items-center justify-center gap-4 text-xl"
            >
              {isLoading ? <Loader2 className="w-8 h-8 animate-spin" /> : (
                <>
                  <Sparkles className="w-6 h-6 text-primary-400" />
                  <span>Begin Clinical Session</span>
                  <ChevronRight className="w-6 h-6 opacity-30" />
                </>
              )}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
