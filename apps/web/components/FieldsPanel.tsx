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
} from "lucide-react";
import type { ExtractedFields, Encounter } from "@/lib/types";

interface FieldsPanelProps {
  fields: ExtractedFields | null;
  encounter?: Encounter | null; // Pre-populate from encounter data
  onExtract: () => Promise<void>;
  onUpdate?: (fields: ExtractedFields) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export default function FieldsPanel({
  fields,
  encounter,
  onExtract,
  onUpdate,
  isLoading,
  disabled,
}: FieldsPanelProps) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [editableFields, setEditableFields] = useState<ExtractedFields | null>(
    null
  );
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync editable fields with props, pre-populate from encounter data
  useEffect(() => {
    // Start with encounter data, then overlay AI-extracted fields
    const baseFields: ExtractedFields = {
      patient_name: encounter?.patient_name || "",
      dob: encounter?.patient_dob || "",
      reason_for_visit: encounter?.reason_for_visit || "",
    };

    if (fields) {
      // Merge AI fields, but keep encounter data for name/dob/reason if AI didn't extract them
      setEditableFields({
        ...baseFields,
        ...fields,
        patient_name: fields.patient_name || baseFields.patient_name,
        dob: fields.dob || baseFields.dob,
        reason_for_visit: fields.reason_for_visit || baseFields.reason_for_visit,
      });
    } else if (encounter) {
      // Show encounter data even before AI extraction
      setEditableFields(baseFields);
    }
  }, [fields, encounter]);

  const handleExtract = async () => {
    setIsExtracting(true);
    try {
      await onExtract();
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFieldChange = (field: keyof ExtractedFields, value: any) => {
    if (!editableFields) return;
    setEditableFields({ ...editableFields, [field]: value });
    setHasChanges(true);
  };

  const handleSymptomChange = (index: number, value: string) => {
    if (!editableFields) return;
    const currentSymptoms = editableFields.symptoms || [];
    const newSymptoms = [...currentSymptoms];
    newSymptoms[index] = value;
    setEditableFields({ ...editableFields, symptoms: newSymptoms });
    setHasChanges(true);
  };

  const handleAddSymptom = () => {
    if (!editableFields) return;
    const currentSymptoms = editableFields.symptoms || [];
    setEditableFields({
      ...editableFields,
      symptoms: [...currentSymptoms, ""],
    });
    setHasChanges(true);
  };

  const handleRemoveSymptom = (index: number) => {
    if (!editableFields) return;
    const currentSymptoms = editableFields.symptoms || [];
    const newSymptoms = currentSymptoms.filter((_, i) => i !== index);
    setEditableFields({ ...editableFields, symptoms: newSymptoms });
    setHasChanges(true);
  };

  const handleSave = () => {
    if (editableFields && onUpdate) {
      onUpdate(editableFields);
      setHasChanges(false);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    if (fields) {
      setEditableFields({ ...fields });
    }
    setHasChanges(false);
    setIsEditing(false);
  };

  const loading = isLoading || isExtracting;
  const displayFields = editableFields || fields;

  return (
    <div className="p-6 h-full overflow-y-auto bg-white">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-accent-100 rounded-2xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-accent-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-ink-800">
                Extracted Fields
              </h2>
              <p className="text-ink-500 mt-0.5">
                AI-powered field extraction from transcript
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            {displayFields && (
              <>
                {isEditing ? (
                  <>
                    <button
                      onClick={handleCancel}
                      className="btn-secondary text-sm px-4 py-2"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={!hasChanges}
                      className="btn-success text-sm px-4 py-2"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="btn-secondary text-sm px-4 py-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit
                  </button>
                )}
              </>
            )}
            <button
              onClick={handleExtract}
              disabled={disabled || loading}
              className="btn-primary text-sm px-4 py-2"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {loading
                ? "Extracting..."
                : displayFields
                ? "Re-extract"
                : "Extract Fields"}
            </button>
          </div>
        </div>

        {!displayFields ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-accent-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <FileText className="w-12 h-12 text-accent-400" />
            </div>
            <h3 className="text-xl font-bold text-ink-700 mb-3">
              No fields extracted yet
            </h3>
            <p className="text-ink-500 max-w-sm mx-auto">
              Record some conversation first, then click "Extract Fields" to
              analyze the transcript with AI.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Edit mode indicator */}
            {isEditing && (
              <div className="panel-card-primary flex items-center gap-3">
                <Edit3 className="w-5 h-5 text-primary-600" />
                <div>
                  <p className="font-semibold text-primary-800">Edit Mode</p>
                  <p className="text-sm text-primary-600">
                    Modify any field, then click "Save" when done.
                  </p>
                </div>
              </div>
            )}

            {/* Patient Info Card */}
            <div className="card p-6">
              <h3 className="font-bold text-ink-800 mb-5 flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                  <User className="w-5 h-5 text-primary-600" />
                </div>
                Patient Information
              </h3>
              <div className="grid sm:grid-cols-2 gap-6">
                <EditableField
                  label="Name"
                  value={displayFields.patient_name || ""}
                  onChange={(v) => handleFieldChange("patient_name", v)}
                  isEditing={isEditing}
                />
                <EditableField
                  label="Date of Birth"
                  value={displayFields.dob || ""}
                  onChange={(v) => handleFieldChange("dob", v)}
                  isEditing={isEditing}
                  icon={<Calendar className="w-4 h-4 text-ink-400" />}
                />
              </div>
            </div>

            {/* Visit Info Card */}
            <div className="card p-6">
              <h3 className="font-bold text-ink-800 mb-5 flex items-center gap-3">
                <div className="w-10 h-10 bg-sage-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-sage-600" />
                </div>
                Visit Information
              </h3>
              <EditableField
                label="Reason for Visit"
                value={displayFields.reason_for_visit || ""}
                onChange={(v) => handleFieldChange("reason_for_visit", v)}
                isEditing={isEditing}
                multiline
              />
              {(displayFields.symptom_duration || isEditing) && (
                <div className="mt-5">
                  <EditableField
                    label="Symptom Duration"
                    value={displayFields.symptom_duration || ""}
                    onChange={(v) => handleFieldChange("symptom_duration", v)}
                    isEditing={isEditing}
                  />
                </div>
              )}
            </div>

            {/* Symptoms Card */}
            {((displayFields.symptoms && displayFields.symptoms.length > 0) ||
              isEditing) && (
              <div className="card p-6">
                <h3 className="font-bold text-ink-800 mb-5 flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent-100 rounded-xl flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-accent-600" />
                  </div>
                  Patient-Reported Symptoms
                </h3>
                <ul className="space-y-3">
                  {(displayFields.symptoms || []).map((symptom, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-3 bg-surface-50 p-4 rounded-xl"
                    >
                      <span className="flex-shrink-0 w-7 h-7 bg-accent-100 text-accent-700 rounded-lg flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </span>
                      {isEditing ? (
                        <div className="flex-1 flex gap-2">
                          <input
                            type="text"
                            value={symptom}
                            onChange={(e) =>
                              handleSymptomChange(index, e.target.value)
                            }
                            className="input text-sm py-2"
                          />
                          <button
                            onClick={() => handleRemoveSymptom(index)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-ink-700 italic pt-1">
                          {symptom}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                {isEditing && (
                  <button
                    onClick={handleAddSymptom}
                    className="mt-4 text-sm text-accent-600 hover:text-accent-700 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add symptom
                  </button>
                )}
                <p className="text-xs text-ink-400 mt-5 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Verbatim patient statements - not clinical interpretation
                </p>
              </div>
            )}

            {/* Allergies & Medications */}
            {((displayFields.allergies && displayFields.allergies.length > 0) ||
              (displayFields.medications &&
                displayFields.medications.length > 0) ||
              isEditing) && (
              <div className="grid sm:grid-cols-2 gap-5">
                <div className="card p-5 bg-red-50/50 border-red-100">
                  <h3 className="font-bold text-red-800 mb-4">Allergies</h3>
                  {isEditing ? (
                    <EditableList
                      items={displayFields.allergies || []}
                      onChange={(items) => handleFieldChange("allergies", items)}
                      color="red"
                    />
                  ) : (
                    <ul className="space-y-2">
                      {(displayFields.allergies || []).map((allergy, index) => (
                        <li
                          key={index}
                          className="text-sm text-red-700 flex items-center gap-2"
                        >
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                          {allergy}
                        </li>
                      ))}
                      {(!displayFields.allergies ||
                        displayFields.allergies.length === 0) && (
                        <li className="text-sm text-ink-400 italic">
                          None recorded
                        </li>
                      )}
                    </ul>
                  )}
                </div>

                <div className="card p-5 bg-purple-50/50 border-purple-100">
                  <h3 className="font-bold text-purple-800 mb-4">
                    Current Medications
                  </h3>
                  {isEditing ? (
                    <EditableList
                      items={displayFields.medications || []}
                      onChange={(items) =>
                        handleFieldChange("medications", items)
                      }
                      color="purple"
                    />
                  ) : (
                    <ul className="space-y-2">
                      {(displayFields.medications || []).map((med, index) => (
                        <li
                          key={index}
                          className="text-sm text-purple-700 flex items-center gap-2"
                        >
                          <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                          {med}
                        </li>
                      ))}
                      {(!displayFields.medications ||
                        displayFields.medications.length === 0) && (
                        <li className="text-sm text-ink-400 italic">
                          None recorded
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EditableField({
  label,
  value,
  onChange,
  isEditing,
  icon,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  isEditing: boolean;
  icon?: React.ReactNode;
  multiline?: boolean;
}) {
  return (
    <div>
      <label className="text-xs text-ink-500 uppercase tracking-wider font-semibold flex items-center gap-1.5 mb-2">
        {icon}
        {label}
      </label>
      {isEditing ? (
        multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            className="input text-sm resize-none"
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="input text-sm py-2.5"
          />
        )
      ) : (
        <p className="text-ink-800 font-medium">
          {value || (
            <span className="text-ink-400 italic font-normal">Not provided</span>
          )}
        </p>
      )}
    </div>
  );
}

function EditableList({
  items,
  onChange,
  color,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  color: "red" | "purple";
}) {
  const handleItemChange = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = value;
    onChange(newItems);
  };

  const handleAdd = () => {
    onChange([...items, ""]);
  };

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const colorClasses = {
    red: "text-red-600 hover:bg-red-100",
    purple: "text-purple-600 hover:bg-purple-100",
  };

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex gap-2">
          <input
            type="text"
            value={item}
            onChange={(e) => handleItemChange(index, e.target.value)}
            className="input text-sm py-2"
          />
          <button
            onClick={() => handleRemove(index)}
            className={`p-2 rounded-xl transition-colors ${colorClasses[color]}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        onClick={handleAdd}
        className={`text-sm font-semibold flex items-center gap-1 ${colorClasses[color]}`}
      >
        <Plus className="w-4 h-4" />
        Add item
      </button>
    </div>
  );
}
