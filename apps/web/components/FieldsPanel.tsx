"use client";

import { useState, useEffect } from "react";
import {
  RefreshCw,
  User,
  Calendar,
  FileText,
  AlertCircle,
  Sparkles,
  Save,
  Edit3,
  X,
  Plus,
  ArrowRight,
  Activity,
  Mail,
  Phone,
} from "lucide-react";
import type { ExtractedFields, Encounter } from "@/lib/types";
import { validateEmail, validatePhone } from "@/lib/utils";

interface FieldsPanelProps {
  fields: ExtractedFields | null;
  encounter?: Encounter | null;
  onExtract: () => Promise<void>;
  onUpdate?: (fields: ExtractedFields) => void;
  isLoading?: boolean;
  disabled?: boolean;
  customFields?: Array<{
    name: string;
    type: "text" | "number" | "array" | "boolean" | "date";
    required?: boolean;
    placeholder?: string;
  }>;
}

export default function FieldsPanel({
  fields,
  encounter,
  onExtract,
  onUpdate,
  isLoading,
  disabled,
  customFields = [],
}: FieldsPanelProps) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [editableFields, setEditableFields] = useState<ExtractedFields | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const baseFields: ExtractedFields = {
      patient_name: encounter?.patient_name || "",
      dob: encounter?.patient_dob || "",
      reason_for_visit: encounter?.reason_for_visit || "",
    };
    if (fields) {
      setEditableFields({
        ...baseFields,
        ...fields,
        patient_name: fields.patient_name || baseFields.patient_name,
        dob: fields.dob || baseFields.dob,
        reason_for_visit: fields.reason_for_visit || baseFields.reason_for_visit,
      });
    } else if (encounter) {
      setEditableFields(baseFields);
    }
  }, [fields, encounter]);

  const validate = () => {
    if (!editableFields) return false;
    const errors: Record<string, string> = {};
    if (!editableFields.patient_name?.trim()) errors.patient_name = "Name is required";
    if (!editableFields.dob?.trim()) errors.dob = "Birth date is required";
    if (!editableFields.reason_for_visit?.trim()) errors.reason_for_visit = "Reason for visit is required";
    
    // Validate email if provided
    if (editableFields.email) {
      const emailValidation = validateEmail(editableFields.email);
      if (!emailValidation.valid) {
        errors.email = emailValidation.error || "Invalid email";
      }
    }
    
    // Validate phone if provided
    if (editableFields.phone) {
      const phoneValidation = validatePhone(editableFields.phone);
      if (!phoneValidation.valid) {
        errors.phone = phoneValidation.error || "Invalid phone";
      }
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFieldChange = (field: keyof ExtractedFields, value: any) => {
    if (!editableFields) return;
    setEditableFields({ ...editableFields, [field]: value });
    setHasChanges(true);
    if (fieldErrors[field]) {
      setFieldErrors({ ...fieldErrors, [field]: "" });
    }
  };

  const handleSave = () => {
    if (editableFields && onUpdate) {
      if (!validate()) return;
      onUpdate(editableFields);
      setHasChanges(false);
      setIsEditing(false);
    }
  };

  const loading = isLoading || isExtracting;
  const displayFields = editableFields || fields;

  return (
    <div className="h-full bg-surface-50 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-12 py-16">
        {/* Header Section */}
        <div className="flex items-end justify-between mb-12">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight text-ink-900">Clinical Data</h2>
            <p className="text-ink-400 font-medium">Extracted intelligence from patient consultation</p>
          </div>
          
          <div className="flex items-center gap-3">
            {displayFields && (
              <button
                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                disabled={isEditing && !hasChanges}
                className={`
                  flex items-center gap-2 px-4 py-2 bg-white border border-surface-200 rounded-xl font-bold text-sm transition-all
                  ${isEditing 
                    ? (hasChanges ? "bg-emerald-500 text-white border-emerald-500 shadow-glow" : "bg-surface-100 text-ink-300 cursor-not-allowed border-surface-200") 
                    : "text-ink-600 hover:bg-surface-50"}
                `}
              >
                {isEditing ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                {isEditing ? "Commit Changes" : "Refine Data"}
              </button>
            )}
            
            <button
              onClick={async () => { setIsExtracting(true); try { await onExtract(); } finally { setIsExtracting(false); } }}
              disabled={disabled || loading}
              className="flex items-center gap-2 px-6 py-3 bg-ink-900 text-white rounded-2xl font-bold text-sm shadow-soft-lg hover:bg-black transition-all disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {displayFields ? "Re-analyze" : "Run Extraction"}
            </button>
          </div>
        </div>

        {!displayFields ? (
          <div className="py-24 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-soft">
              <FileText className="w-10 h-10 text-primary-200" />
            </div>
            <h3 className="text-xl font-bold text-ink-900">Waiting for Insight</h3>
            <p className="text-ink-400 max-w-xs mt-2">Start the consultation to extract patient information and clinical fields.</p>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            {/* Basic Patient Information */}
            <section className="bg-white rounded-[2.5rem] p-10 border border-surface-200 shadow-soft-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-primary-50 rounded-2xl flex items-center justify-center">
                  <User className="w-5 h-5 text-primary-500" />
                </div>
                <h3 className="font-bold text-ink-900 text-lg">Basic Information</h3>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <EditableField 
                  label="Full Name" 
                  value={displayFields.patient_name || ""} 
                  onChange={(v: string) => handleFieldChange("patient_name", v)} 
                  isEditing={isEditing} 
                  error={fieldErrors.patient_name}
                />
                <EditableField 
                  label="Date of Birth" 
                  value={displayFields.dob || ""} 
                  onChange={(v: string) => handleFieldChange("dob", v)} 
                  isEditing={isEditing} 
                  icon={<Calendar className="w-3.5 h-3.5" />} 
                  error={fieldErrors.dob}
                  type="date"
                />
                <EditableField 
                  label="Email Address" 
                  value={displayFields.email || ""} 
                  onChange={(v: string) => handleFieldChange("email", v)} 
                  isEditing={isEditing} 
                  icon={<Mail className="w-3.5 h-3.5" />} 
                  error={fieldErrors.email}
                  type="email"
                />
                <EditableField 
                  label="Phone Number" 
                  value={displayFields.phone || ""} 
                  onChange={(v: string) => handleFieldChange("phone", v)} 
                  isEditing={isEditing} 
                  icon={<Phone className="w-3.5 h-3.5" />} 
                  error={fieldErrors.phone}
                  type="tel"
                />
                <EditableField 
                  label="Reason for Visit" 
                  value={displayFields.reason_for_visit || ""} 
                  onChange={(v: string) => handleFieldChange("reason_for_visit", v)} 
                  isEditing={isEditing} 
                  multiline 
                  error={fieldErrors.reason_for_visit}
                />
                <EditableField 
                  label="Symptom Duration" 
                  value={displayFields.symptom_duration || ""} 
                  onChange={(v: string) => handleFieldChange("symptom_duration", v)} 
                  isEditing={isEditing} 
                />
              </div>
            </section>

            {/* Symptoms */}
            {(displayFields.symptoms || []).length > 0 && (
              <section className="bg-white rounded-[2rem] p-8 border border-surface-200 shadow-soft">
                <div className="flex items-center gap-3 mb-6">
                  <AlertCircle className="w-5 h-5 text-accent-500" />
                  <h3 className="font-bold text-ink-900 text-lg">Symptoms</h3>
                </div>
                <div className="flex flex-wrap gap-3">
                  {(displayFields.symptoms || []).map((symptom, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-4 py-2.5 bg-accent-50 rounded-xl border border-accent-100 shadow-inner-soft">
                      {isEditing ? (
                        <input 
                          type="text" 
                          value={symptom} 
                          onChange={(e) => {
                            const s = [...(displayFields.symptoms || [])];
                            s[idx] = e.target.value;
                            handleFieldChange("symptoms", s);
                          }}
                          className="bg-transparent border-none focus:outline-none text-sm font-bold text-ink-800 min-w-[120px]" 
                        />
                      ) : (
                        <span className="text-sm font-bold text-ink-800">{symptom}</span>
                      )}
                      {isEditing && (
                        <button 
                          onClick={() => {
                            const s = (displayFields.symptoms || []).filter((_, i) => i !== idx);
                            handleFieldChange("symptoms", s);
                          }}
                          className="text-ink-300 hover:text-red-500 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {isEditing && (
                    <button 
                      onClick={() => handleFieldChange("symptoms", [...(displayFields.symptoms || []), ""])}
                      className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-surface-200 text-ink-400 hover:text-primary-500 hover:border-primary-200 rounded-xl transition-all text-sm font-bold hover:bg-primary-50/30"
                    >
                      <Plus className="w-4 h-4" />
                      Add Symptom
                    </button>
                  )}
                </div>
              </section>
            )}

            {/* Allergies & Medications */}
            <div className="grid md:grid-cols-2 gap-6">
              {(displayFields.allergies || []).length > 0 && (
                <SignalCard 
                  title="Allergies" 
                  items={displayFields.allergies || []} 
                  icon={<AlertCircle className="w-5 h-5" />}
                  color="red"
                  isEditing={isEditing}
                  onUpdate={(items: string[]) => handleFieldChange("allergies", items)}
                />
              )}
              {(displayFields.medications || []).length > 0 && (
                <SignalCard 
                  title="Medications" 
                  items={displayFields.medications || []} 
                  icon={<FileText className="w-5 h-5" />}
                  color="purple"
                  isEditing={isEditing}
                  onUpdate={(items: string[]) => handleFieldChange("medications", items)}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EditableField({ label, value, onChange, isEditing, icon, multiline, error, type = "text" }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  isEditing: boolean;
  icon?: React.ReactNode;
  multiline?: boolean;
  error?: string;
  type?: "text" | "email" | "tel" | "date";
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-ink-400 uppercase tracking-widest flex items-center gap-2">
        {icon}
        {label}
      </label>
      {isEditing ? (
        multiline ? (
          <textarea 
            value={value} 
            onChange={(e) => onChange(e.target.value)} 
            rows={3} 
            className={`w-full bg-surface-50 border ${error ? "border-red-500 ring-2 ring-red-50" : "border-surface-200"} rounded-xl p-4 text-sm font-medium focus:ring-2 ring-primary-100 focus:border-primary-400 transition-all resize-none`} 
          />
        ) : type === "date" ? (
          <input 
            type="date" 
            value={value} 
            onChange={(e) => onChange(e.target.value)} 
            max={new Date().toISOString().split('T')[0]}
            className={`w-full bg-surface-50 border ${error ? "border-red-500 ring-2 ring-red-50" : "border-surface-200"} rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 ring-primary-100 focus:border-primary-400 transition-all`} 
          />
        ) : (
          <input 
            type={type} 
            value={value} 
            onChange={(e) => onChange(e.target.value)} 
            placeholder={type === "email" ? "patient@example.com" : type === "tel" ? "(555) 000-0000" : ""}
            className={`w-full bg-surface-50 border ${error ? "border-red-500 ring-2 ring-red-50" : "border-surface-200"} rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 ring-primary-100 focus:border-primary-400 transition-all`} 
          />
        )
      ) : (
        <p className="text-sm font-bold text-ink-800 leading-relaxed min-h-[1.25rem]">
          {value || <span className="text-ink-200 italic font-medium">Not disclosed</span>}
        </p>
      )}
      {isEditing && error && <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider">{error}</p>}
    </div>
  );
}

function SignalCard({ title, items, icon, color, isEditing, onUpdate }: {
  title: string;
  items: string[];
  icon: React.ReactNode;
  color: "red" | "purple";
  isEditing: boolean;
  onUpdate: (items: string[]) => void;
}) {
  const baseColors: Record<string, string> = {
    red: "bg-red-50 text-red-600 border-red-100",
    purple: "bg-primary-50 text-primary-600 border-primary-100"
  };

  return (
    <div className={`p-8 rounded-[2rem] border ${baseColors[color]} shadow-soft`}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-white/80 rounded-2xl flex items-center justify-center shadow-inner-soft">
          {icon}
        </div>
        <h3 className="font-bold text-ink-900">{title}</h3>
      </div>
      
      <div className="space-y-3">
        {items.map((item: string, idx: number) => (
          <div key={idx} className="flex items-center gap-3 bg-white/80 p-4 rounded-xl border border-white/60 shadow-inner-soft">
            <div className={`w-2 h-2 rounded-full ${color === 'red' ? 'bg-red-400' : 'bg-primary-400'}`} />
            {isEditing ? (
              <input 
                type="text" 
                value={item} 
                onChange={(e) => {
                  const newItems = [...items];
                  newItems[idx] = e.target.value;
                  onUpdate(newItems);
                }}
                className="flex-1 bg-transparent focus:outline-none text-sm font-bold text-ink-800" 
              />
            ) : (
              <span className="text-sm font-bold text-ink-800">{item}</span>
            )}
            {isEditing && (
              <button onClick={() => onUpdate(items.filter((_: any, i: number) => i !== idx))} className="text-ink-300 hover:text-red-500 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
        {isEditing && (
          <button onClick={() => onUpdate([...items, ""])} className="w-full py-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest opacity-60 hover:opacity-100 transition-all bg-white/40 rounded-xl border border-dashed border-white/60 hover:border-white/80">
            <Plus className="w-3.5 h-3.5" />
            Add Entry
          </button>
        )}
        {!isEditing && items.length === 0 && <p className="text-xs italic text-ink-400/60 py-4 text-center">No signals detected</p>}
      </div>
    </div>
  );
}
