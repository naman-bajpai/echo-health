"use client";

import { useState } from "react";
import { RefreshCw, User, Calendar, FileText, AlertCircle } from "lucide-react";
import type { ExtractedFields } from "@/lib/types";

interface FieldsPanelProps {
  fields: ExtractedFields | null;
  onExtract: () => Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
}

export default function FieldsPanel({
  fields,
  onExtract,
  isLoading,
  disabled,
}: FieldsPanelProps) {
  const [isExtracting, setIsExtracting] = useState(false);

  const handleExtract = async () => {
    setIsExtracting(true);
    try {
      await onExtract();
    } finally {
      setIsExtracting(false);
    }
  };

  const loading = isLoading || isExtracting;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Extracted Fields</h2>
        <button
          onClick={handleExtract}
          disabled={disabled || loading}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Extracting..." : "Extract Fields"}
        </button>
      </div>

      {!fields ? (
        <div className="text-center py-12 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No fields extracted yet</p>
          <p className="text-sm mt-2">
            Click &quot;Extract Fields&quot; to analyze the transcript
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Patient Info */}
          <div className="card">
            <h3 className="font-medium text-gray-700 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Patient Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Name" value={fields.patient_name} />
              <Field label="Date of Birth" value={fields.dob} icon={<Calendar className="w-4 h-4" />} />
            </div>
          </div>

          {/* Visit Info */}
          <div className="card">
            <h3 className="font-medium text-gray-700 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Visit Information
            </h3>
            <Field label="Reason for Visit" value={fields.reason_for_visit} />
            {fields.timeline && (
              <Field label="Timeline" value={fields.timeline} className="mt-4" />
            )}
          </div>

          {/* Symptoms */}
          {fields.symptoms && fields.symptoms.length > 0 && (
            <div className="card">
              <h3 className="font-medium text-gray-700 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Patient-Reported Symptoms
              </h3>
              <ul className="space-y-2">
                {fields.symptoms.map((symptom, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-gray-600"
                  >
                    <span className="text-primary-500 mt-1">•</span>
                    <span className="italic">{symptom}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-gray-400 mt-4">
                Verbatim patient statements - not clinical interpretation
              </p>
            </div>
          )}

          {/* Allergies & Medications */}
          <div className="grid grid-cols-2 gap-4">
            {fields.allergies && fields.allergies.length > 0 && (
              <div className="card">
                <h3 className="font-medium text-gray-700 mb-3">Allergies</h3>
                <ul className="space-y-1">
                  {fields.allergies.map((allergy, index) => (
                    <li key={index} className="text-sm text-gray-600">
                      • {allergy}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {fields.medications && fields.medications.length > 0 && (
              <div className="card">
                <h3 className="font-medium text-gray-700 mb-3">Current Medications</h3>
                <ul className="space-y-1">
                  {fields.medications.map((med, index) => (
                    <li key={index} className="text-sm text-gray-600">
                      • {med}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  icon,
  className,
}: {
  label: string;
  value?: string | null;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1">
        {icon}
        {label}
      </label>
      <p className="mt-1 text-gray-900">
        {value || <span className="text-gray-400 italic">Not provided</span>}
      </p>
    </div>
  );
}
