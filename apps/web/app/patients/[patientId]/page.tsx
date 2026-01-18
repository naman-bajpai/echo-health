"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";
import logo from "@/logo.png";
import {
  ArrowLeft,
  User,
  Calendar,
  Phone,
  Mail,
  Shield,
  Activity,
  History,
  ClipboardList,
  AlertCircle,
  Pill,
  Stethoscope,
  Plus,
  ArrowUpRight,
  ChevronRight,
  ShieldAlert,
  Weight,
  Ruler,
  Droplets,
  Languages,
  Edit3,
  Save,
  X,
} from "lucide-react";
import type { Patient, Encounter } from "@/lib/types";

export default function PatientProfilePage() {
  const router = useRouter();
  const params = useParams();
  const patientId = params.patientId as string;
  const { user, isLoading: authLoading } = useAuth();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [editPatient, setEditPatient] = useState<Partial<Patient>>({});

  useEffect(() => {
    if (!authLoading && !user) router.push("/");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user || !patientId) return;

    const loadPatientData = async () => {
      setIsLoading(true);
      
      // Load patient
      const { data: patientData } = await supabase
        .from("patients")
        .select("*")
        .eq("id", patientId)
        .single();

      if (patientData) {
        setPatient(patientData);
        setEditPatient(patientData);
      }

      // Load encounters
      const { data: encountersData } = await supabase
        .from("encounters")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });

      if (encountersData) setEncounters(encountersData);
      
      setIsLoading(false);
    };

    loadPatientData();
  }, [user, patientId]);

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!editPatient.full_name?.trim()) errors.full_name = "Name is required";
    if (!editPatient.dob) errors.dob = "Birth date is required";
    
    // Phone validation
    const phoneRegex = /^\+?[\d\s-()]{7,}$/;
    if (editPatient.phone && !phoneRegex.test(editPatient.phone)) {
      errors.phone = "Invalid phone format";
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (editPatient.email && !emailRegex.test(editPatient.email)) {
      errors.email = "Invalid email format";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFieldChange = (field: keyof Patient, value: any) => {
    setEditPatient({ ...editPatient, [field]: value });
    setHasChanges(true);
    if (fieldErrors[field]) {
      setFieldErrors({ ...fieldErrors, [field]: "" });
    }
  };

  const handleSave = async () => {
    if (!validate()) return;
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("patients")
        .update(editPatient)
        .eq("id", patientId);
      
      if (error) throw error;
      
      setPatient(editPatient as Patient);
      setIsEditing(false);
      setHasChanges(false);
    } catch (e: any) {
      alert(`Error updating patient: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isLoading || !patient) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <Activity className="w-10 h-10 text-primary-500 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50/50 font-sans text-ink-900 pb-20">
      {/* Top Navbar */}
      <nav className="h-20 bg-white/80 backdrop-blur-md border-b border-surface-200 sticky top-0 z-50 px-8">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => router.back()}
              className="p-2 hover:bg-surface-100 rounded-xl transition-all text-ink-400 hover:text-ink-900"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-px h-6 bg-surface-200" />
            <Link href="/dashboard">
              <Image src={logo} alt="Echo Health" width={110} height={32} className="h-8 w-auto opacity-90" />
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                if (isEditing) handleSave();
                else setIsEditing(true);
              }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl font-bold text-sm transition-all ${
                isEditing 
                  ? "bg-emerald-500 text-white shadow-glow hover:bg-emerald-600" 
                  : "bg-surface-100 text-ink-600 hover:bg-surface-200"
              }`}
            >
              {isEditing ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
              {isEditing ? "Save Profile" : "Edit Profile"}
            </button>
            <Link
              href={`/new-encounter?patientId=${patient.id}`}
              className="flex items-center gap-2 px-6 py-2.5 bg-ink-900 text-white rounded-2xl font-bold text-sm shadow-soft hover:bg-black transition-all"
            >
              <Plus className="w-4 h-4" />
              New Clinical Session
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 py-12">
        {/* Patient Hero Header */}
        <div className="bg-white rounded-[3rem] p-12 border border-surface-200 shadow-soft-xl relative overflow-hidden mb-12">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 p-16 opacity-[0.03] pointer-events-none">
            <User className="w-64 h-64" />
          </div>
          
          <div className="relative z-10 flex flex-col lg:flex-row gap-12 items-start">
            {/* Avatar & Key Identifiers */}
            <div className="flex flex-col items-center gap-6 shrink-0">
              <div className="w-40 h-40 rounded-[2.5rem] bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-glow text-white text-5xl font-black">
                {patient.full_name?.charAt(0)}
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="text-[10px] font-black text-primary-500 uppercase tracking-[0.3em]">Patient ID</span>
                <span className="px-4 py-1.5 bg-primary-50 text-primary-700 text-xs font-bold rounded-full border border-primary-100">
                  {patient.mrn || "UNASSIGNED"}
                </span>
              </div>
            </div>

            {/* Main Details */}
            <div className="flex-1 space-y-8 w-full">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-1">
                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-black text-ink-300 uppercase tracking-widest ml-1">Full Name</label>
                        <input
                          type="text"
                          value={editPatient.full_name}
                          onChange={(e) => handleFieldChange("full_name", e.target.value)}
                          className={`text-4xl font-bold tracking-tight text-ink-900 bg-surface-50 border ${fieldErrors.full_name ? "border-red-500" : "border-surface-200"} rounded-xl px-4 py-2 w-full focus:outline-none focus:ring-2 ring-primary-100`}
                        />
                        {fieldErrors.full_name && <p className="text-xs text-red-500 mt-1 font-bold">{fieldErrors.full_name}</p>}
                      </div>
                      <div className="flex flex-wrap gap-8">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-ink-300 uppercase tracking-widest ml-1">Date of Birth</label>
                          <input
                            type="date"
                            value={editPatient.dob}
                            onChange={(e) => handleFieldChange("dob", e.target.value)}
                            className={`text-sm font-medium text-ink-700 bg-surface-50 border ${fieldErrors.dob ? "border-red-500" : "border-surface-200"} rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 ring-primary-100`}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-ink-300 uppercase tracking-widest ml-1">Gender</label>
                          <select
                            value={editPatient.gender || ""}
                            onChange={(e) => handleFieldChange("gender", e.target.value)}
                            className="text-sm font-medium text-ink-700 bg-surface-50 border border-surface-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 ring-primary-100"
                          >
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-ink-300 uppercase tracking-widest ml-1">Primary Language</label>
                          <input
                            type="text"
                            value={editPatient.primary_language || ""}
                            onChange={(e) => handleFieldChange("primary_language", e.target.value)}
                            className="text-sm font-medium text-ink-700 bg-surface-50 border border-surface-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 ring-primary-100"
                            placeholder="e.g. English"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h1 className="text-5xl font-bold tracking-tight text-ink-900 mb-3">{patient.full_name}</h1>
                      <div className="flex flex-wrap gap-8 text-ink-400 font-medium">
                        <div className="flex items-center gap-2.5">
                          <Calendar className="w-4 h-4 text-primary-400" />
                          <span>DOB: {patient.dob || "Unknown"}</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <User className="w-4 h-4 text-primary-400" />
                          <span>{patient.gender || "Not specified"}</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <Languages className="w-4 h-4 text-primary-400" />
                          <span>{patient.primary_language || "English"}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-3">
                  <div className="px-6 py-3 bg-surface-50 rounded-2xl border border-surface-100 flex flex-col items-center min-w-[100px]">
                    <span className="text-[10px] font-black text-ink-300 uppercase tracking-widest mb-1">Total Visits</span>
                    <span className="text-xl font-bold text-ink-900">{encounters.length}</span>
                  </div>
                  <div className="px-6 py-3 bg-surface-50 rounded-2xl border border-surface-100 flex flex-col items-center min-w-[100px]">
                    <span className="text-[10px] font-black text-ink-300 uppercase tracking-widest mb-1">Last Consult</span>
                    <span className="text-sm font-bold text-ink-900">
                      {encounters[0] ? new Date(encounters[0].created_at).toLocaleDateString() : "None"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Clinical Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-2 bg-surface-50 rounded-[2rem] border border-surface-100">
                {isEditing ? (
                  <>
                    <div className="flex flex-col gap-1 p-4 bg-white rounded-2xl border border-surface-100 shadow-sm">
                      <label className="text-[10px] font-black text-ink-300 uppercase tracking-widest">Weight (kg)</label>
                      <input 
                        type="number" 
                        value={editPatient.weight_kg || ""} 
                        onChange={(e) => handleFieldChange("weight_kg", parseFloat(e.target.value))}
                        className="text-sm font-bold text-ink-900 bg-surface-50 border border-surface-200 rounded-lg px-2 py-1 focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1 p-4 bg-white rounded-2xl border border-surface-100 shadow-sm">
                      <label className="text-[10px] font-black text-ink-300 uppercase tracking-widest">Height (cm)</label>
                      <input 
                        type="number" 
                        value={editPatient.height_cm || ""} 
                        onChange={(e) => handleFieldChange("height_cm", parseFloat(e.target.value))}
                        className="text-sm font-bold text-ink-900 bg-surface-50 border border-surface-200 rounded-lg px-2 py-1 focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1 p-4 bg-white rounded-2xl border border-surface-100 shadow-sm">
                      <label className="text-[10px] font-black text-ink-300 uppercase tracking-widest">Blood Type</label>
                      <select 
                        value={editPatient.blood_type || ""} 
                        onChange={(e) => handleFieldChange("blood_type", e.target.value)}
                        className="text-sm font-bold text-ink-900 bg-surface-50 border border-surface-200 rounded-lg px-2 py-1 focus:outline-none"
                      >
                        <option value="">--</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1 p-4 bg-white rounded-2xl border border-surface-100 shadow-sm">
                      <label className="text-[10px] font-black text-ink-300 uppercase tracking-widest">Allergies</label>
                      <p className="text-xs font-bold text-ink-400 italic">Edit below</p>
                    </div>
                  </>
                ) : (
                  <>
                    <VitalBadge icon={Weight} label="Weight" value={patient.weight_kg ? `${patient.weight_kg} kg` : "--"} color="text-amber-500" />
                    <VitalBadge icon={Ruler} label="Height" value={patient.height_cm ? `${patient.height_cm} cm` : "--"} color="text-blue-500" />
                    <VitalBadge icon={Droplets} label="Blood Type" value={patient.blood_type || "--"} color="text-red-500" />
                    <VitalBadge icon={ShieldAlert} label="Allergies" value={patient.allergies?.length ? `${patient.allergies.length} active` : "None"} color="text-purple-500" />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-12">
          {/* Left Column: Clinical Content */}
          <div className="lg:col-span-8 space-y-12">
            {/* Encounter History Timeline */}
            <section>
              <div className="flex items-center justify-between mb-8 px-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-ink-900 flex items-center justify-center text-white shadow-soft">
                    <History className="w-5 h-5" />
                  </div>
                  <h2 className="text-2xl font-bold text-ink-900 tracking-tight">Clinical Timeline</h2>
                </div>
                <Link href="#" className="text-xs font-black text-primary-500 uppercase tracking-widest hover:text-primary-600 transition-colors">
                  View Full Records
                </Link>
              </div>

              <div className="space-y-4">
                {encounters.length > 0 ? (
                  encounters.map((encounter, idx) => (
                    <div 
                      key={encounter.id}
                      className="group bg-white rounded-3xl p-6 border border-surface-200 shadow-soft hover:border-primary-200 transition-all cursor-pointer relative overflow-hidden"
                      onClick={() => router.push(`/encounter/${encounter.id}`)}
                    >
                      <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-6">
                          <div className="flex flex-col items-center justify-center w-16 h-16 rounded-2xl bg-surface-50 border border-surface-100 group-hover:bg-primary-50 group-hover:border-primary-100 transition-colors">
                            <span className="text-[10px] font-black text-ink-300 uppercase mb-0.5">
                              {new Date(encounter.created_at).toLocaleString('default', { month: 'short' })}
                            </span>
                            <span className="text-xl font-bold text-ink-900">
                              {new Date(encounter.created_at).getDate()}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="font-bold text-ink-900">{encounter.reason_for_visit || "General Consultation"}</h3>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${
                                encounter.urgency === 'emergent' ? 'bg-red-50 text-red-600 border-red-100' :
                                encounter.urgency === 'urgent' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                'bg-sage-50 text-sage-600 border-sage-100'
                              }`}>
                                {encounter.urgency}
                              </span>
                            </div>
                            <p className="text-sm text-ink-400 font-medium">Session Duration: -- • Provider: AI Assistant</p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-ink-200 group-hover:text-primary-400 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white rounded-[2rem] p-20 border border-dashed border-surface-200 flex flex-col items-center text-center opacity-40">
                    <History className="w-12 h-12 text-ink-200 mb-4" />
                    <p className="font-medium text-ink-600">No clinical sessions recorded for this patient.</p>
                  </div>
                )}
              </div>
            </section>

            {/* Medical History Section */}
            <div className="grid md:grid-cols-2 gap-8">
              <ClinicalCard 
                icon={ShieldAlert} 
                title="Active Allergies" 
                color="text-red-500" 
                bg="bg-red-50"
                items={isEditing ? (editPatient.allergies || []) : (patient.allergies || [])}
                emptyText="No known allergies recorded."
                isEditing={isEditing}
                onUpdate={(items: string[]) => handleFieldChange("allergies", items)}
              />
              <ClinicalCard 
                icon={Pill} 
                title="Current Medications" 
                color="text-indigo-500" 
                bg="bg-indigo-50"
                items={isEditing ? (editPatient.current_medications || []) : (patient.current_medications || [])}
                emptyText="No active prescriptions on file."
                isEditing={isEditing}
                onUpdate={(items: string[]) => handleFieldChange("current_medications", items)}
              />
            </div>
          </div>

          {/* Right Column: Information & Metadata */}
          <div className="lg:col-span-4 space-y-8">
            {/* Contact Details Card */}
            <section className="bg-white rounded-[2.5rem] p-8 border border-surface-200 shadow-soft-xl">
              <h3 className="text-xs font-black text-ink-300 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                <Phone className="w-3.5 h-3.5" /> Contact Information
              </h3>
              <div className="space-y-8">
                {isEditing ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-ink-300 uppercase tracking-widest ml-1">Primary Phone</label>
                      <input 
                        type="tel" 
                        value={editPatient.phone || ""} 
                        onChange={(e) => handleFieldChange("phone", e.target.value)}
                        className={`w-full bg-surface-50 border ${fieldErrors.phone ? "border-red-500" : "border-surface-200"} rounded-xl px-4 py-3 text-sm focus:ring-2 ring-primary-100 outline-none`}
                        placeholder="(555) 000-0000"
                      />
                      {fieldErrors.phone && <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider ml-1">{fieldErrors.phone}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-ink-300 uppercase tracking-widest ml-1">Email Address</label>
                      <input 
                        type="email" 
                        value={editPatient.email || ""} 
                        onChange={(e) => handleFieldChange("email", e.target.value)}
                        className={`w-full bg-surface-50 border ${fieldErrors.email ? "border-red-500" : "border-surface-200"} rounded-xl px-4 py-3 text-sm focus:ring-2 ring-primary-100 outline-none`}
                        placeholder="patient@example.com"
                      />
                      {fieldErrors.email && <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider ml-1">{fieldErrors.email}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-ink-300 uppercase tracking-widest ml-1">Permanent Address</label>
                      <textarea 
                        value={editPatient.address || ""} 
                        onChange={(e) => handleFieldChange("address", e.target.value)}
                        className="w-full bg-surface-50 border border-surface-200 rounded-xl px-4 py-3 text-sm focus:ring-2 ring-primary-100 outline-none resize-none"
                        rows={3}
                        placeholder="123 Medical Way..."
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <ContactItem icon={Phone} label="Primary Phone" value={patient.phone} />
                    <ContactItem icon={Mail} label="Email Address" value={patient.email} />
                    <ContactItem icon={Shield} label="Permanent Address" value={patient.address} multiline />
                  </>
                )}
              </div>
            </section>

            {/* Emergency Contact */}
            <section className="bg-ink-900 text-white rounded-[2.5rem] p-8 shadow-soft-xl relative overflow-hidden">
              <ShieldAlert className="absolute -bottom-4 -right-4 w-32 h-32 opacity-10" />
              <h3 className="text-xs font-black text-primary-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5" /> Emergency Protocol
              </h3>
              <div className="space-y-6 relative z-10">
                {isEditing ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black opacity-40 uppercase tracking-widest block mb-1">Primary Contact</label>
                      <input 
                        type="text" 
                        value={editPatient.emergency_contact || ""} 
                        onChange={(e) => handleFieldChange("emergency_contact", e.target.value)}
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-white/40 focus:outline-none"
                        placeholder="Contact Name"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black opacity-40 uppercase tracking-widest block mb-1">Contact Number</label>
                      <input 
                        type="tel" 
                        value={editPatient.emergency_phone || ""} 
                        onChange={(e) => handleFieldChange("emergency_phone", e.target.value)}
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-primary-400 placeholder-white/40 focus:outline-none"
                        placeholder="(555) 000-0000"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="text-[10px] font-black opacity-40 uppercase tracking-widest block mb-1">Primary Contact</label>
                      <p className="font-bold text-lg">{patient.emergency_contact || "Not Specified"}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-black opacity-40 uppercase tracking-widest block mb-1">Contact Number</label>
                      <p className="font-bold text-xl text-primary-400">{patient.emergency_phone || "--"}</p>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* Insurance Info */}
            <section className="bg-white rounded-[2.5rem] p-8 border border-surface-200 shadow-soft">
              <h3 className="text-xs font-black text-ink-300 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5" /> Coverage Details
              </h3>
              <div className="space-y-6">
                {isEditing ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-ink-300 uppercase tracking-widest block mb-1">Primary Provider</label>
                      <input 
                        type="text" 
                        value={editPatient.insurance_provider || ""} 
                        onChange={(e) => handleFieldChange("insurance_provider", e.target.value)}
                        className="w-full bg-surface-50 border border-surface-200 rounded-xl px-4 py-2 text-sm focus:ring-2 ring-primary-100 outline-none"
                        placeholder="e.g. Blue Cross"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-ink-300 uppercase tracking-widest block mb-1">Policy / ID Number</label>
                      <input 
                        type="text" 
                        value={editPatient.insurance_id || ""} 
                        onChange={(e) => handleFieldChange("insurance_id", e.target.value)}
                        className="w-full bg-surface-50 border border-surface-200 rounded-xl px-4 py-2 text-sm focus:ring-2 ring-primary-100 outline-none font-mono"
                        placeholder="ID Number"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="text-[10px] font-black text-ink-300 uppercase tracking-widest block mb-1">Primary Provider</label>
                      <p className="font-bold text-ink-900">{patient.insurance_provider || "Self-Pay"}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-ink-300 uppercase tracking-widest block mb-1">Policy / ID Number</label>
                      <p className="font-mono text-sm font-bold text-ink-600">{patient.insurance_id || "--"}</p>
                    </div>
                  </>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function VitalBadge({ icon: Icon, label, value, color }: any) {
  return (
    <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white border border-surface-100 shadow-sm transition-transform hover:-translate-y-1">
      <div className={`w-8 h-8 rounded-lg bg-surface-50 flex items-center justify-center ${color} shadow-inner-soft`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-center">
        <p className="text-[9px] font-black text-ink-300 uppercase tracking-widest mb-0.5">{label}</p>
        <p className="text-sm font-black text-ink-900 tracking-tight">{value}</p>
      </div>
    </div>
  );
}

function ContactItem({ icon: Icon, label, value, multiline }: any) {
  return (
    <div className="flex gap-4">
      <div className="w-10 h-10 rounded-xl bg-surface-50 flex items-center justify-center text-ink-300 shrink-0 border border-surface-100 shadow-inner-soft">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <label className="text-[10px] font-black text-ink-300 uppercase tracking-widest block mb-0.5">{label}</label>
        <p className={`text-sm font-bold text-ink-800 leading-relaxed ${multiline ? "max-w-[200px]" : ""}`}>
          {value || "Not Recorded"}
        </p>
      </div>
    </div>
  );
}

function ClinicalCard({ icon: Icon, title, color, bg, items, emptyText, isEditing, onUpdate }: any) {
  return (
    <section className="bg-white rounded-[2.5rem] p-10 border border-surface-200 shadow-soft-xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center ${color} shadow-inner-soft`}>
            <Icon className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-ink-900">{title}</h3>
        </div>
        {isEditing && (
          <button 
            onClick={() => onUpdate([...items, ""])}
            className="w-8 h-8 rounded-lg bg-surface-50 flex items-center justify-center text-ink-400 hover:text-primary-500 hover:bg-primary-50 transition-all"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>
      
      <div className="space-y-3">
        {items.length > 0 ? (
          items.map((item: string, i: number) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-surface-50 rounded-2xl border border-surface-100 group hover:border-primary-200 transition-all">
              <div className="w-1.5 h-1.5 rounded-full bg-primary-400 group-hover:scale-150 transition-transform" />
              {isEditing ? (
                <div className="flex-1 flex items-center gap-2">
                  <input 
                    type="text" 
                    value={item} 
                    onChange={(e) => {
                      const newItems = [...items];
                      newItems[i] = e.target.value;
                      onUpdate(newItems);
                    }}
                    className="flex-1 bg-transparent text-sm font-bold text-ink-700 focus:outline-none"
                    autoFocus={!item}
                  />
                  <button 
                    onClick={() => onUpdate(items.filter((_: any, idx: number) => idx !== i))}
                    className="text-ink-300 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <span className="text-sm font-bold text-ink-700">{item}</span>
              )}
            </div>
          ))
        ) : (
          <p className="text-sm font-medium text-ink-300 italic py-4">{emptyText}</p>
        )}
      </div>
    </section>
  );
}
